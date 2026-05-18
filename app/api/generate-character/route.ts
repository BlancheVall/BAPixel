import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getSessionUser, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getClientIp,
  getDataUrlByteLength,
  MAX_DESCRIPTION_LENGTH,
  MAX_REFERENCE_IMAGE_BYTES,
  readLimitedJson,
} from "@/lib/request-guard";
import { saveGeneratedImage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_STYLE_REFERENCE_IMAGES = 3;
const SUPPORTED_REFERENCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function buildPixelPrompt(description: string, characterFeaturePrompt: string) {
  const characterDescription = [
    description ? `Character description: ${description}` : "",
    characterFeaturePrompt
      ? `Additional character details extracted from the uploaded reference image: ${characterFeaturePrompt}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `Create exactly one centered full-body RPG pixel character sprite on a fully transparent background.

${characterDescription}

The character should follow the user's description and include only iconic equipment directly implied by the role, such as a simple staff for a mage, a bow for an archer, a sword or axe for a warrior, or tools for an alchemist. Do not copy any exact reference character.

Style: cute but detailed Korean RPG fantasy adventurer sprite, chibi proportions about 2.5-3 heads tall, large readable head and eyes, simplified face with eyes only and no mouth, thick black pixel outline around the full silhouette, smaller dark internal outline lines for hair, clothes, props, equipment, and limbs. Use large pixel blocks, low-resolution sprite look, chunky visible pixels, 8-bit / 16x16 / 32x32 sprite aesthetic, limited color palette, hard edges, nearest-neighbor scaling, retro game sprite style, big pixel art. Clean blocky pixel clusters with crisp square edges, readable outfit structure, layered color blocks, small highlight blocks, decorative trims, clear silhouette, and readable role equipment.

Composition: one single character only, full body, centered, near front-facing, standing pose, with a small margin around the character. The image should look like an enlarged polished 32x32 RPG sprite preview, not a raw tiny icon.

Background and exclusions: transparent alpha background outside the character silhouette. No shadows of any kind: no cast shadow, no drop shadow, no ground shadow, no soft shadow, no ambient shadow, no silhouette shadow. No glow. No background scene, no studio background, no gradient, no vignette, no UI frame. Do not create a collage, sprite sheet, character selection screen, grid, multiple characters, text, or watermark. No blurry edges, no anti-aliasing, no painterly texture, no realistic rendering.`;
}

function getMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "image/png";
}

async function dataUrlToReferenceImage(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1];

  if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType)) {
    return null;
  }

  return {
    input: {
      type: "input_image" as const,
      detail: "high" as const,
      image_url: dataUrl,
    },
  };
}

async function describeCharacterReference(client: OpenAI, characterReference: Awaited<ReturnType<typeof dataUrlToReferenceImage>>) {
  if (!characterReference) {
    return "";
  }

  const response = await client.responses.create({
    model: "gpt-5.5",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
Describe only the character's appearance and clothing from this reference image.

Return a detailed appearance-and-outfit prompt only. Include only:
- character type/species/gender presentation if visible
- face and hair/head details
- outfit, armor, accessories, props, and weapons
- clothing materials, shapes, layers, ornaments, and color placement
- main character colors and accent colors
- distinctive appearance or costume features to preserve

Do not describe art style, image style, pixel style, rendering style, quality, resolution, lighting, shadows, camera, composition, pose, gesture, action, movement, framing, background, mood, or environment.
Do not mention that this is an image. Do not explain.
`,
          },
          characterReference.input,
        ],
      },
    ],
  });

  return response.output_text?.trim() ?? "";
}

async function rewritePromptWithCharacterReference(
  client: OpenAI,
  prompt: string,
  characterReference: Awaited<ReturnType<typeof dataUrlToReferenceImage>>,
) {
  if (!characterReference) {
    return prompt;
  }

  const response = await client.responses.create({
    model: "gpt-5.5",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
You are a senior prompt writer for GPT Image API.
Use the attached reference image to refine the following image-generation prompt into one final prompt.

Rules:
- Use the attached image only to preserve character identity, outfit, palette, and any visible style details that help create a same-style RPG pixel character.
- Preserve the user's text description as the highest priority. The user's text can add or override image details.
- Keep the same output format and constraints from the source prompt.
- Keep the composition near front-facing only. Do not use the phrase front-facing by itself.
- Preserve transparent background, one character only, no shadows, no glow, no UI, no text, no watermark, no grid, no sprite sheet.
- Return only the final prompt text. Do not explain.

Source request:
${prompt}
`,
          },
          characterReference.input,
        ],
      },
    ],
  });

  const rewrittenPrompt = response.output_text?.trim();

  if (!rewrittenPrompt) {
    throw new Error("GPT-5.5 did not return a final prompt.");
  }

  return rewrittenPrompt;
}

async function loadStyleReferenceImages() {
  const referenceDir = path.join(process.cwd(), "referenceImage");
  const entries = await fs.readdir(referenceDir, { withFileTypes: true });
  const imageNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => SUPPORTED_REFERENCE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .slice(0, MAX_STYLE_REFERENCE_IMAGES);

  const images = await Promise.all(
    imageNames.map(async (name) => {
      const filePath = path.join(referenceDir, name);
      const buffer = await fs.readFile(filePath);

      return toFile(buffer, name, {
        type: getMimeType(filePath),
      });
    }),
  );

  return {
    uploadImages: images,
    count: imageNames.length,
  };
}

async function pixelPostProcess(inputBuffer: Buffer) {
  return sharp(inputBuffer)
    .resize(128, 128, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "nearest",
    })
    .png()
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);

    if (!sessionUser) {
      return NextResponse.json({ error: "Please log in before generating an image." }, { status: 401 });
    }

    if (sessionUser.points < 1) {
      return NextResponse.json({ error: "Not enough Points to generate an image." }, { status: 402 });
    }

    const userLimit = checkRateLimit({
      key: `generate:user:${sessionUser.id}`,
      limit: 80,
      windowMs: 60 * 60 * 1000,
    });

    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "Too many generations. Please try again later." },
        { status: 429 },
      );
    }

    const ipLimit = checkRateLimit({
      key: `generate:ip:${getClientIp(req)}`,
      limit: 200,
      windowMs: 60 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests from this network. Please try again later." },
        { status: 429 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Please configure OPENAI_API_KEY in .env.local first." },
        { status: 500 },
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const body = await readLimitedJson(req);
    const description = String(body.description || "").trim();
    const characterReferenceImage =
      typeof body.characterReferenceImage === "string" ? body.characterReferenceImage : "";

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Character description is too long. Please keep it under ${MAX_DESCRIPTION_LENGTH} characters.` },
        { status: 400 },
      );
    }

    if (
      characterReferenceImage &&
      getDataUrlByteLength(characterReferenceImage) > MAX_REFERENCE_IMAGE_BYTES
    ) {
      return NextResponse.json(
        { error: "Character reference image is too large. Please upload an image under 10 MB." },
        { status: 400 },
      );
    }

    const characterReference = characterReferenceImage
      ? await dataUrlToReferenceImage(characterReferenceImage)
      : null;

    if (!description && !characterReference) {
      return NextResponse.json(
        { error: "Please enter a character description or upload a character reference image." },
        { status: 400 },
      );
    }

    const characterFeaturePrompt = await describeCharacterReference(client, characterReference);
    const prompt = buildPixelPrompt(description, characterFeaturePrompt);
    const rewrittenPrompt = await rewritePromptWithCharacterReference(client, prompt, characterReference);
    const styleReferenceImages = await loadStyleReferenceImages();

    if (styleReferenceImages.count === 0) {
      return NextResponse.json(
        { error: "No png, jpg, jpeg, or webp reference images were found in referenceImage." },
        { status: 500 },
      );
    }

    const result = await client.images.edit({
      model: "gpt-image-1.5",
      image: styleReferenceImages.uploadImages,
      prompt: rewrittenPrompt,
      size: "1024x1024",
      quality: "high",
      background: "transparent",
      output_format: "png",
      input_fidelity: "high",
    });

    const imageBase64 = result.data?.[0]?.b64_json;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image generation failed. No image data was returned." },
        { status: 500 },
      );
    }

    const inputBuffer = Buffer.from(imageBase64, "base64");
    const filename = `character-${sessionUser.id}-${Date.now()}.png`;
    const outputBuffer = await pixelPostProcess(inputBuffer);
    const imageUrl = await saveGeneratedImage({
      buffer: outputBuffer,
      filename,
      contentType: "image/png",
    });

    const billingResult = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.user.updateMany({
        where: {
          id: sessionUser.id,
          points: {
            gte: 1,
          },
        },
        data: {
          points: {
            decrement: 1,
          },
        },
      });

      if (updateResult.count === 0) {
        return null;
      }

      await tx.pointTransaction.create({
        data: {
          userId: sessionUser.id,
          amount: -1,
          type: "SPEND",
          note: "AI character generation",
        },
      });

      const updatedUser = await tx.user.findUnique({
        where: {
          id: sessionUser.id,
        },
      });
      const generation = await tx.generation.create({
        data: {
          userId: sessionUser.id,
          imageUrl,
          description: description || null,
          characterFeaturePrompt: characterFeaturePrompt || null,
          prompt,
          rewrittenPrompt,
          referenceImageCount: styleReferenceImages.count,
        },
      });

      return {
        updatedUser,
        generation,
      };
    });

    if (!billingResult) {
      return NextResponse.json({ error: "Not enough Points to generate an image." }, { status: 402 });
    }

    return NextResponse.json({
      imageUrl,
      prompt,
      rewrittenPrompt,
      characterFeaturePrompt,
      referenceImageCount: styleReferenceImages.count,
      usedCharacterFeaturePrompt: Boolean(characterFeaturePrompt),
      user: billingResult.updatedUser ? publicUser(billingResult.updatedUser) : null,
      generation: {
        id: billingResult.generation.id,
        imageUrl: billingResult.generation.imageUrl,
        description: billingResult.generation.description,
        createdAt: billingResult.generation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "REQUEST_TOO_LARGE") {
      return NextResponse.json(
        { error: "Request is too large. Please use a smaller reference image." },
        { status: 413 },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Generation failed. Please check your API key, account credits, or try again later." },
      { status: 500 },
    );
  }
}

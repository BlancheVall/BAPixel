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

const MAX_REFERENCE_IMAGES = 3;
const SUPPORTED_REFERENCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function buildPixelPrompt(description: string, characterFeaturePrompt: string) {
  const combinedDescription = [
    description,
    characterFeaturePrompt
      ? `Detailed appearance and outfit features extracted from the uploaded character reference image:\n${characterFeaturePrompt}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `
Create one pixel art RPG character sprite based on the provided reference style images.
Use the reference images only for visual style, not for character identity.

Core pixel prompt:
large pixel blocks,
low resolution sprite,
chunky pixels,
visible pixels,
8bit style,
16x16 sprite aesthetic,
32x32 sprite aesthetic,
limited color palette,
hard edges,
nearest neighbor scaling,
retro game sprite,
big pixel art.

${combinedDescription ? `User text description:\n${combinedDescription}` : ""}

If both user-written text and extracted image features are provided, combine them. The user-written text can add or override details, but preserve the uploaded character's recognizable identity when possible.

Generic composition rules:
Generate exactly one character.
Full body character, centered, front-facing or near front-facing, standing pose.
Leave a small margin around the character.
Do not create a collage, sprite sheet, character selection screen, UI frame, grid, or multiple characters.
Do not copy any exact reference character.
Do not add character traits that are not requested by the user.
If the user does not ask for a wizard, staff, purple hat, pink hair, female mage, horns, animal ears, armor, or weapon, do not add those elements.
Do include iconic equipment that is directly implied by the user's role description, such as a staff for a mage, a bow for an archer, a sword or axe for a warrior, or tools for an alchemist.
If the character is human or human-like, do not draw a mouth. Use a simplified face with eyes only, matching the reference sprite style.

Style DNA to match from the references:
Cute but detailed Korean RPG fantasy adventurer sprite.
Chibi proportions, about 2.5 to 3 heads tall.
Large readable head and eyes, tiny simplified nose and mouth.
Thick black pixel outline around the whole silhouette.
Smaller dark internal outline lines for hair, clothes, props, and limbs.
Clean blocky pixel clusters with crisp square edges.
Readable outfit structure, layered color blocks, small highlight blocks, decorative trims, clear hair shape, and readable props when requested.
Limited palette, high contrast silhouette, no blurry edges, no anti-aliasing, no painterly texture, no realistic rendering, no text, no watermark.

Output look:
The image should look like an enlarged polished 32x32 RPG sprite preview, not a raw tiny icon.
The canvas background must be fully transparent alpha outside the character silhouette.
No shadows of any kind. No cast shadow, no drop shadow, no ground shadow, no soft shadow, no ambient shadow, no silhouette shadow.
No background scene, no studio background, no gradient, no vignette, no glow, no UI frame.
If the image viewer shows a checkerboard, that is correct because it means transparent background.
No background scene.
`;
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

async function loadReferenceImages() {
  const referenceDir = path.join(process.cwd(), "referenceImage");
  const entries = await fs.readdir(referenceDir, { withFileTypes: true });
  const imageNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => SUPPORTED_REFERENCE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .slice(0, MAX_REFERENCE_IMAGES);

  const images = await Promise.all(
    imageNames.map(async (name) => {
      const filePath = path.join(referenceDir, name);
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString("base64");

      return {
        input: {
          type: "input_image" as const,
          detail: "high" as const,
          image_url: `data:${getMimeType(filePath)};base64,${base64}`,
        },
        upload: toFile(buffer, name, {
          type: getMimeType(filePath),
        }),
      };
    }),
  );

  return {
    inputImages: images.map((image) => image.input),
    uploadImages: await Promise.all(images.map((image) => image.upload)),
    count: imageNames.length,
  };
}

async function rewritePromptWithGpt(
  client: OpenAI,
  prompt: string,
  referenceImages: Awaited<ReturnType<typeof loadReferenceImages>>,
) {
  const response = await client.responses.create({
    model: "gpt-5.5",
    input: [
      {
        role: "user",
        content: [
          ...referenceImages.inputImages,
          {
            type: "input_text",
            text: `
You are a senior prompt writer for GPT Image API.
Rewrite the following request into a single final image-generation prompt.

Rules:
- Preserve the user's character description exactly.
- Use the attached reference images only to describe the target visual style.
- If the user's description includes extracted appearance and outfit features from an uploaded character reference image, preserve those features as text instructions.
- Keep the prompt generic enough for any RPG character, not only a mage.
- Ask for one single centered full-body RPG pixel character sprite.
- If the character is human or human-like, explicitly request no mouth, eyes only, simplified face.
- Ask for transparent background.
- Explicitly forbid all shadows: no cast shadow, drop shadow, ground shadow, soft shadow, ambient shadow, silhouette shadow, or glow.
- Avoid collage, sprite sheet, UI frame, grid, multiple characters, text, watermark, background scene.
- Return only the final prompt text. Do not explain.

Source request:
${prompt}
`,
          },
        ],
      },
    ],
  });

  const rewrittenPrompt = response.output_text?.trim();

  if (!rewrittenPrompt) {
    throw new Error("GPT-5.5 did not return a rewritten prompt.");
  }

  return rewrittenPrompt;
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

    const referenceImages = await loadReferenceImages();
    const characterReference = characterReferenceImage
      ? await dataUrlToReferenceImage(characterReferenceImage)
      : null;

    if (!description && !characterReference) {
      return NextResponse.json(
        { error: "Please enter a character description or upload a character reference image." },
        { status: 400 },
      );
    }

    if (referenceImages.count === 0) {
      return NextResponse.json(
        { error: "No png, jpg, jpeg, or webp reference images were found in referenceImage." },
        { status: 500 },
      );
    }

    const characterFeaturePrompt = await describeCharacterReference(client, characterReference);
    const prompt = buildPixelPrompt(description, characterFeaturePrompt);
    const rewrittenPrompt = await rewritePromptWithGpt(client, prompt, referenceImages);

    const result = await client.images.edit({
      model: "gpt-image-1.5",
      image: referenceImages.uploadImages,
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
          referenceImageCount: referenceImages.count,
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
      referenceImageCount: referenceImages.count,
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

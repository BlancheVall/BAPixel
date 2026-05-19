import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
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
import { generateImageWithRunPod } from "@/lib/runpod";
import { saveGeneratedImage } from "@/lib/storage";

export const runtime = "nodejs";

const BASE_GENERATION_COST = 1;
const TEMPLATE_EXTRA_COST = 2;
const REFERENCE_IMAGE_EXTRA_COST = 1;
const PROMPT_HELPER_MODEL = process.env.PROMPT_HELPER_MODEL || "gpt-4.1-mini";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || "medium";
const TEMPLATE_STYLE_REFERENCE_FILES = [
  "001.png",
  "003.png",
  "005.png",
  "009.png",
  "010.png",
  "015.png",
  "050.png",
  "082.png",
  "083.png",
  "147.png",
];

type OpenAITextPart = {
  type: "input_text";
  text: string;
};

type OpenAIImagePart = {
  type: "input_image";
  image_url: string;
};

type OpenAIResponseContent = {
  text?: string;
};

type OpenAIResponseOutput = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponsesPayload = {
  output_text?: string;
  output?: OpenAIResponseOutput[];
};

type OpenAIImagePayload = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

function buildOpenAITemplatePrompt(characterPrompt: string) {
  return `Create exactly one centered full-body RPG pixel character sprite on a fully transparent background.

Character description: ${characterPrompt || "fantasy RPG character"}

Use the provided reference images only for the visual style, not for character identity. The character should follow the character description and include only iconic equipment directly implied by the role. Do not copy any exact reference character.

Style: cute but detailed Korean RPG fantasy adventurer sprite, chibi proportions about 2.5-3 heads tall, large readable head and eyes, simplified face with eyes only and no mouth, thick black pixel outline around the full silhouette, smaller dark internal outline lines for hair, clothes, equipment, and limbs. Use large pixel blocks, low-resolution sprite look, chunky visible pixels, 8-bit / 16x16 / 32x32 sprite aesthetic, limited color palette, hard edges, nearest-neighbor scaling, retro game sprite style, big pixel art. Clean blocky pixel clusters with crisp square edges, readable outfit structure, layered color blocks, small highlight blocks, decorative trims, and clear readable character silhouette.

Composition: one single character only, full body, centered, near front-facing 3/4 view, turned slightly toward screen right, standing pose, with a small margin around the character. The image should look like an enlarged polished 32x32 RPG sprite preview, not a raw tiny icon.

Background and exclusions: transparent alpha background outside the character silhouette. No shadows of any kind: no cast shadow, no drop shadow, no ground shadow, no soft shadow, no ambient shadow, no silhouette shadow. No glow. No background scene, no studio background, no gradient, no vignette, no UI frame. Do not create a collage, sprite sheet, character selection screen, grid, multiple characters, text, or watermark. No blurry edges, no anti-aliasing, no painterly texture, no realistic rendering.`;
}

function buildPixelPrompt(
  characterTags: string,
  usesStyleTemplate: boolean,
) {
  if (!usesStyleTemplate) {
    return [
      "(masterpiece, top quality, best quality)",
      "pixel",
      "pixel art",
      "game sprite",
      "single character",
      "full body",
      "centered",
      "solo",
      "transparent background",
      "simple background",
      "front 3/4 view",
      "standing pose",
      "clean silhouette",
      "chunky pixels",
      "limited color palette",
      "hard edges",
      characterTags || "fantasy RPG character",
    ]
      .filter(Boolean)
      .join(", ");
  }

  return [
    "(masterpiece, top quality, best quality)",
    "pixel",
    "pixel art",
    "Korean RPG fantasy adventurer sprite",
    "cute chibi character",
    "single character",
    "full body",
    "centered",
    "solo",
    "transparent background",
    "front 3/4 view",
    "standing pose",
    "clean silhouette",
    "thick outline",
    "chunky pixels",
    "limited color palette",
    "hard edges",
    characterTags || "fantasy RPG character",
  ]
    .filter(Boolean)
    .join(", ");
}

function applyRunPodPromptPrefix(prompt: string) {
  const loraTrigger = process.env.RUNPOD_LORA_TRIGGER?.trim();

  if (!loraTrigger) {
    return prompt;
  }

  if (prompt.toLowerCase().split(",").map((part) => part.trim()).includes(loraTrigger.toLowerCase())) {
    return prompt;
  }

  return `${loraTrigger}, ${prompt}`;
}

function extractResponseText(payload: OpenAIResponsesPayload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("\n") || "";
}

function cleanSdTags(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ""))
    .replace(/^tags\s*:/i, "")
    .replace(/\n+/g, ", ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^,|,$/g, "")
    .slice(0, 1200);
}

async function generateCharacterTagsWithChatGPT(description: string, characterReferenceImage: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const content: Array<OpenAITextPart | OpenAIImagePart> = [
    {
      type: "input_text",
      text: `Convert the user's character request into concise Stable Diffusion / Danbooru-style prompt tags for a pixel-art character generator.

Return one comma-separated tag line only. No markdown, no explanation, no sentence.

Rules:
- Preserve the user's intended character identity, gender presentation, hair, clothing, role, props, colors, species traits, and visible reference-image details.
- Translate Chinese or English descriptions into English SD tags.
- Prefer tags like: 1girl, 1boy, solo, long hair, pink hair, mage, staff, dress, armor, cat ears.
- Include only character/content tags. Do not include quality tags, LoRA trigger words, model names, sampler settings, aspect ratio, resolution, background instructions, or negative prompt.
- If the user asks for a scene/building/object, output suitable concise tags for that subject instead of forcing a character.
- If both text and reference image are provided, text has priority and the image is only for visual details.

User description:
${description || "(none; use the reference image if provided)"}`,
    },
  ];

  if (characterReferenceImage) {
    content.push({
      type: "input_image",
      image_url: characterReferenceImage,
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PROMPT_HELPER_MODEL,
      input: [
        {
          role: "user",
          content,
        },
      ],
      max_output_tokens: 220,
    }),
  });

  const payload = (await response.json()) as OpenAIResponsesPayload & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message || "ChatGPT prompt generation failed.");
  }

  const tags = cleanSdTags(extractResponseText(payload));

  if (!tags) {
    throw new Error("ChatGPT did not return prompt tags.");
  }

  return tags;
}

async function generateTemplateCharacterPromptWithChatGPT(description: string, characterReferenceImage: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const content: Array<OpenAITextPart | OpenAIImagePart> = [
    {
      type: "input_text",
      text: `Create a concise English character prompt for an image generator.

Return one short prompt fragment only. No markdown, no explanation.

Rules:
- Describe only the character identity, visible body traits, hair, outfit, colors, role, species traits, and key props.
- Do not include pixel-art style, quality words, camera, background, transparency, aspect ratio, model names, or negative prompt.
- If both text and image are provided, the user's text has priority and the image is only for visible character details.
- Translate Chinese into natural English.

User description:
${description || "(none; use the reference image if provided)"}`,
    },
  ];

  if (characterReferenceImage) {
    content.push({
      type: "input_image",
      image_url: characterReferenceImage,
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PROMPT_HELPER_MODEL,
      input: [
        {
          role: "user",
          content,
        },
      ],
      max_output_tokens: 220,
    }),
  });

  const payload = (await response.json()) as OpenAIResponsesPayload & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message || "ChatGPT template prompt generation failed.");
  }

  return extractResponseText(payload)
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ""))
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

async function generateImageWithOpenAITemplate(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const formData = new FormData();
  formData.append("model", OPENAI_IMAGE_MODEL);
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", "1024x1024");
  formData.append("quality", OPENAI_IMAGE_QUALITY);
  formData.append("background", "transparent");
  formData.append("output_format", "png");

  for (const filename of TEMPLATE_STYLE_REFERENCE_FILES) {
    const imagePath = path.join(process.cwd(), "referenceImage", filename);
    const buffer = await readFile(imagePath);
    formData.append("image", new Blob([buffer], { type: "image/png" }), filename);
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  const payload = (await response.json()) as OpenAIImagePayload;

  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI image generation failed.");
  }

  const image = payload.data?.[0];

  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }

  if (image?.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error("Failed to download generated OpenAI image.");
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI image generation returned no image.");
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

    const body = await readLimitedJson(req);
    const description = String(body.description || "").trim();
    const styleTemplate = body.styleTemplate === "japanese_rpg" ? "japanese_rpg" : "none";
    const usesStyleTemplate = styleTemplate !== "none";
    const characterReferenceImage =
      typeof body.characterReferenceImage === "string" ? body.characterReferenceImage : "";
    const usesReferenceImage = Boolean(characterReferenceImage);
    const generationCost =
      BASE_GENERATION_COST +
      (usesStyleTemplate ? TEMPLATE_EXTRA_COST : 0) +
      (usesReferenceImage ? REFERENCE_IMAGE_EXTRA_COST : 0);

    if (!usesStyleTemplate && (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_ENDPOINT_ID)) {
      return NextResponse.json(
        { error: "Please configure RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID in .env.local first." },
        { status: 500 },
      );
    }

    if (sessionUser.points < generationCost) {
      return NextResponse.json({ error: "Not enough Points to generate an image." }, { status: 402 });
    }

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

    if (!description && !characterReferenceImage) {
      return NextResponse.json(
        { error: "Please enter a character description or upload a character reference image." },
        { status: 400 },
      );
    }

    const characterFeaturePrompt = usesStyleTemplate
      ? usesReferenceImage
        ? await generateTemplateCharacterPromptWithChatGPT(description, characterReferenceImage)
        : description || "fantasy RPG character"
      : await generateCharacterTagsWithChatGPT(description, characterReferenceImage);
    const prompt = usesStyleTemplate
      ? buildOpenAITemplatePrompt(characterFeaturePrompt)
      : buildPixelPrompt(characterFeaturePrompt, false);
    const rewrittenPrompt = usesStyleTemplate ? prompt : applyRunPodPromptPrefix(prompt);
    const referenceImageCount = usesStyleTemplate
      ? TEMPLATE_STYLE_REFERENCE_FILES.length
      : characterReferenceImage && process.env.RUNPOD_ENABLE_INIT_IMAGE === "true"
        ? 1
        : 0;
    const inputBuffer = usesStyleTemplate
      ? await generateImageWithOpenAITemplate(rewrittenPrompt)
      : await generateImageWithRunPod({
          prompt: rewrittenPrompt,
          initImage: characterReferenceImage,
        });
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
            gte: generationCost,
          },
        },
        data: {
          points: {
            decrement: generationCost,
          },
        },
      });

      if (updateResult.count === 0) {
        return null;
      }

      await tx.pointTransaction.create({
        data: {
          userId: sessionUser.id,
          amount: -generationCost,
          type: "SPEND",
          note: `AI character generation${
            usesStyleTemplate || usesReferenceImage
              ? ` with ${[
                  usesStyleTemplate ? "style template" : "",
                  usesReferenceImage ? "reference image" : "",
                ]
                  .filter(Boolean)
                  .join(" and ")}`
              : ""
          }`,
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
          referenceImageCount,
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
      referenceImageCount,
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

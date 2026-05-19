type RunPodResponse = {
  status?: string;
  id?: string;
  delayTime?: number;
  executionTime?: number;
  output?: unknown;
  error?: string;
};

type RunPodImageInput = {
  prompt: string;
  initImage?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  loraWeight?: number;
  removeBackground?: boolean;
};

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) ? value : fallback;
}

function getSeedValue(seed: number | undefined) {
  if (Number.isFinite(seed)) {
    return seed;
  }

  return Math.floor(Math.random() * 2147483647);
}

function stripDataUrl(value: string) {
  const match = value.match(/^data:[^;]+;base64,(.+)$/);

  return match ? match[1] : value;
}

function getRunPodEndpointUrl() {
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;

  if (!endpointId) {
    throw new Error("RUNPOD_ENDPOINT_ID is not configured.");
  }

  return `https://api.runpod.ai/v2/${endpointId}/runsync`;
}

function getRunPodBaseUrl() {
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;

  if (!endpointId) {
    throw new Error("RUNPOD_ENDPOINT_ID is not configured.");
  }

  return `https://api.runpod.ai/v2/${endpointId}`;
}

function findImageValue(output: unknown): string | null {
  if (!output) {
    return null;
  }

  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      const image = findImageValue(item);

      if (image) {
        return image;
      }
    }

    return null;
  }

  if (typeof output !== "object") {
    return null;
  }

  const record = output as Record<string, unknown>;
  const directImage =
    record.image ||
    record.png ||
    record.data ||
    record.b64_json ||
    record.image_base64 ||
    record.imageBase64 ||
    record.base64 ||
    record.image_url ||
    record.imageUrl ||
    record.url;

  if (typeof directImage === "string") {
    return directImage;
  }

  return findImageValue(record.images) || findImageValue(record.result) || findImageValue(record.output);
}

async function imageValueToBuffer(imageValue: string) {
  if (imageValue.startsWith("http://") || imageValue.startsWith("https://")) {
    const response = await fetch(imageValue);

    if (!response.ok) {
      throw new Error("RunPod returned an image URL that could not be downloaded.");
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return Buffer.from(stripDataUrl(imageValue), "base64");
}

export async function generateImageWithRunPod({
  prompt,
  initImage,
  width,
  height,
  steps,
  guidanceScale,
  seed,
  loraWeight,
  removeBackground,
}: RunPodImageInput) {
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY is not configured.");
  }

  const input: Record<string, unknown> = {
    prompt,
    negative_prompt:
      process.env.RUNPOD_NEGATIVE_PROMPT ||
      "(worst quality, low quality:2), blurry, bad anatomy, deformed, extra limbs, duplicate, multiple characters, text, watermark, logo, ui, frame, cropped, out of frame, realistic, 3d render, smooth shading",
    width: width || numberFromEnv("RUNPOD_WIDTH", 512),
    height: height || numberFromEnv("RUNPOD_HEIGHT", 768),
    num_inference_steps: Number.isFinite(steps) ? steps : numberFromEnv("RUNPOD_STEPS", 28),
    guidance_scale: Number.isFinite(guidanceScale) ? guidanceScale : numberFromEnv("RUNPOD_GUIDANCE_SCALE", 7),
    seed: getSeedValue(seed),
    lora_weight: Number.isFinite(loraWeight) ? loraWeight : numberFromEnv("RUNPOD_LORA_WEIGHT", 0.5),
  };

  if (process.env.RUNPOD_MODEL_NAME) {
    input.model = process.env.RUNPOD_MODEL_NAME;
  }

  if (process.env.RUNPOD_SAMPLER_NAME) {
    input.sampler_name = process.env.RUNPOD_SAMPLER_NAME;
  }

  if (process.env.RUNPOD_SCHEDULER) {
    input.scheduler = process.env.RUNPOD_SCHEDULER;
  }

  if (process.env.RUNPOD_CLIP_SKIP) {
    input.clip_skip = numberFromEnv("RUNPOD_CLIP_SKIP", 2);
  }

  if (process.env.RUNPOD_LORA_NAME) {
    input.lora_name = process.env.RUNPOD_LORA_NAME;
  }

  input.remove_background = removeBackground ?? process.env.RUNPOD_REMOVE_BACKGROUND !== "false";

  if (initImage && process.env.RUNPOD_ENABLE_INIT_IMAGE === "true") {
    input.init_image = stripDataUrl(initImage);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    numberFromEnv("RUNPOD_TIMEOUT_MS", 120000),
  );

  try {
    const response = await fetch(getRunPodEndpointUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as RunPodResponse;

    if (!response.ok || payload.status === "FAILED") {
      throw new Error(payload.error || "RunPod image generation failed.");
    }

    const imageValue = findImageValue(payload.output);

    if (!imageValue) {
      throw new Error("RunPod did not return image data.");
    }

    return imageValueToBuffer(imageValue);
  } finally {
    clearTimeout(timeout);
  }
}

function buildRunPodInput({
  prompt,
  initImage,
  width,
  height,
  steps,
  guidanceScale,
  seed,
  loraWeight,
  removeBackground,
}: RunPodImageInput) {
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt:
      process.env.RUNPOD_NEGATIVE_PROMPT ||
      "(worst quality, low quality:2), blurry, bad anatomy, deformed, extra limbs, duplicate, multiple characters, text, watermark, logo, ui, frame, cropped, out of frame, realistic, 3d render, smooth shading",
    width: width || numberFromEnv("RUNPOD_WIDTH", 512),
    height: height || numberFromEnv("RUNPOD_HEIGHT", 768),
    num_inference_steps: Number.isFinite(steps) ? steps : numberFromEnv("RUNPOD_STEPS", 28),
    guidance_scale: Number.isFinite(guidanceScale) ? guidanceScale : numberFromEnv("RUNPOD_GUIDANCE_SCALE", 7),
    seed: getSeedValue(seed),
    lora_weight: Number.isFinite(loraWeight) ? loraWeight : numberFromEnv("RUNPOD_LORA_WEIGHT", 0.5),
  };

  if (process.env.RUNPOD_MODEL_NAME) {
    input.model = process.env.RUNPOD_MODEL_NAME;
  }

  if (process.env.RUNPOD_SAMPLER_NAME) {
    input.sampler_name = process.env.RUNPOD_SAMPLER_NAME;
  }

  if (process.env.RUNPOD_SCHEDULER) {
    input.scheduler = process.env.RUNPOD_SCHEDULER;
  }

  if (process.env.RUNPOD_CLIP_SKIP) {
    input.clip_skip = numberFromEnv("RUNPOD_CLIP_SKIP", 2);
  }

  if (process.env.RUNPOD_LORA_NAME) {
    input.lora_name = process.env.RUNPOD_LORA_NAME;
  }

  input.remove_background = removeBackground ?? process.env.RUNPOD_REMOVE_BACKGROUND !== "false";

  if (initImage && process.env.RUNPOD_ENABLE_INIT_IMAGE === "true") {
    input.init_image = stripDataUrl(initImage);
  }

  return input;
}

export async function startRunPodJob(inputData: RunPodImageInput) {
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY is not configured.");
  }

  const response = await fetch(`${getRunPodBaseUrl()}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: buildRunPodInput(inputData) }),
  });

  const payload = (await response.json()) as RunPodResponse;

  if (!response.ok || !payload.id) {
    throw new Error(payload.error || "RunPod job creation failed.");
  }

  return {
    id: payload.id,
    status: payload.status,
  };
}

export async function getRunPodJobResult(providerJobId: string) {
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY is not configured.");
  }

  const response = await fetch(`${getRunPodBaseUrl()}/status/${encodeURIComponent(providerJobId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const payload = (await response.json()) as RunPodResponse;

  if (!response.ok) {
    throw new Error(payload.error || "RunPod status check failed.");
  }

  const status = payload.status || "UNKNOWN";
  const imageValue = findImageValue(payload.output);

  return {
    status,
    error: payload.error,
    imageBuffer: imageValue ? await imageValueToBuffer(imageValue) : null,
  };
}

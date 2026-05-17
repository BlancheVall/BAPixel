import { NextRequest } from "next/server";

export const MAX_JSON_BODY_BYTES = 20 * 1024 * 1024;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

export function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function readLimitedJson(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);

  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new Error("REQUEST_TOO_LARGE");
  }

  const rawBody = await req.text();

  if (Buffer.byteLength(rawBody, "utf8") > MAX_JSON_BODY_BYTES) {
    throw new Error("REQUEST_TOO_LARGE");
  }

  return JSON.parse(rawBody) as Record<string, unknown>;
}

export function getDataUrlByteLength(dataUrl: string) {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);

  if (!match) {
    return 0;
  }

  const base64 = match[1];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;

  return Math.floor((base64.length * 3) / 4) - padding;
}

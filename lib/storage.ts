import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";

type UploadImageInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

function getObjectStorageConfig() {
  const bucket = process.env.OBJECT_STORAGE_BUCKET;
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const region = process.env.OBJECT_STORAGE_REGION || "auto";
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.OBJECT_STORAGE_PUBLIC_BASE_URL;

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    return null;
  }

  return {
    bucket,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
  };
}

async function uploadToObjectStorage(input: UploadImageInput) {
  const config = getObjectStorageConfig();

  if (!config) {
    return null;
  }

  const key = `generations/${input.filename}`;
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${config.publicBaseUrl}/${key}`;
}

async function saveToLocalPublic(input: UploadImageInput) {
  const outputsDir = path.join(process.cwd(), "public", "outputs");
  await fs.mkdir(outputsDir, { recursive: true });
  await fs.writeFile(path.join(outputsDir, input.filename), input.buffer);

  return `/outputs/${input.filename}`;
}

export async function saveGeneratedImage(input: UploadImageInput) {
  const objectUrl = await uploadToObjectStorage(input);

  if (objectUrl) {
    return objectUrl;
  }

  return saveToLocalPublic(input);
}

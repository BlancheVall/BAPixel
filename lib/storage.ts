import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

function createObjectStorageClient(config: NonNullable<ReturnType<typeof getObjectStorageConfig>>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function getObjectKeyFromUrl(imageUrl: string) {
  const config = getObjectStorageConfig();

  if (!config || !imageUrl.startsWith(`${config.publicBaseUrl}/`)) {
    return null;
  }

  return imageUrl.slice(config.publicBaseUrl.length + 1);
}

async function deleteFromObjectStorage(imageUrl: string) {
  const config = getObjectStorageConfig();
  const key = getObjectKeyFromUrl(imageUrl);

  if (!config || !key) {
    return false;
  }

  const client = createObjectStorageClient(config);
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  return true;
}

async function deleteFromLocalPublic(imageUrl: string) {
  if (!imageUrl.startsWith("/outputs/")) {
    return false;
  }

  const filename = path.basename(imageUrl);
  const outputPath = path.join(process.cwd(), "public", "outputs", filename);
  await fs.rm(outputPath, { force: true });

  return true;
}

export async function saveGeneratedImage(input: UploadImageInput) {
  const objectUrl = await uploadToObjectStorage(input);

  if (objectUrl) {
    return objectUrl;
  }

  return saveToLocalPublic(input);
}

export async function deleteGeneratedImage(imageUrl: string) {
  try {
    if (await deleteFromObjectStorage(imageUrl)) {
      return;
    }

    await deleteFromLocalPublic(imageUrl);
  } catch (error) {
    console.error("Failed to delete generated image", error);
  }
}

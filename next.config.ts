import type { NextConfig } from "next";

const objectStoragePublicBaseUrl = process.env.OBJECT_STORAGE_PUBLIC_BASE_URL;
const remotePatterns = [];

if (objectStoragePublicBaseUrl) {
  const storageUrl = new URL(objectStoragePublicBaseUrl);

  remotePatterns.push({
    protocol: storageUrl.protocol.replace(":", "") as "http" | "https",
    hostname: storageUrl.hostname,
    port: storageUrl.port,
    pathname: "/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;

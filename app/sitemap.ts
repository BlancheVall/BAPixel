import type { MetadataRoute } from "next";
import { marketingPages } from "./marketing-pages";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bapixel.win";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: appUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/terms`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...marketingPages.map((page) => ({
      url: `${appUrl}/${page.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}

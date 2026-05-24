import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bapixel.win";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "BAPixel - AI Pixel Sprite Generator",
    template: "%s | BAPixel",
  },
  description:
    "Create RPG pixel character sprites, game assets, and editable pixel art from prompts and references.",
  applicationName: "BAPixel",
  keywords: [
    "AI pixel art generator",
    "pixel sprite generator",
    "RPG character generator",
    "game asset generator",
    "pixel character creator",
    "BAPixel",
  ],
  authors: [{ name: "Blanche" }],
  creator: "Blanche",
  publisher: "BAPixel",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "BAPixel - AI Pixel Sprite Generator",
    description:
      "Create RPG pixel character sprites, game assets, and editable pixel art from prompts and references.",
    url: "/",
    siteName: "BAPixel",
    images: [
      {
        url: "/landing/pixel-map-bg.jpg",
        width: 1024,
        height: 576,
        alt: "BAPixel pixel fantasy map preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BAPixel - AI Pixel Sprite Generator",
    description:
      "Create RPG pixel character sprites, game assets, and editable pixel art from prompts and references.",
    images: ["/landing/pixel-map-bg.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

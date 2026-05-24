import type { Metadata } from "next";
import { getMarketingPage, MarketingLandingPage } from "../marketing-pages";

const page = getMarketingPage("ai-pixel-character-generator")!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: {
    canonical: `/${page.slug}`,
  },
};

export default function AiPixelCharacterGeneratorPage() {
  return <MarketingLandingPage page={page} />;
}

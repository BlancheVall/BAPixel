import type { Metadata } from "next";
import { getMarketingPage, MarketingLandingPage } from "../marketing-pages";

const page = getMarketingPage("pixel-art-generator")!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: {
    canonical: `/${page.slug}`,
  },
};

export default function PixelArtGeneratorPage() {
  return <MarketingLandingPage page={page} />;
}

import Image from "next/image";
import Link from "next/link";

type MarketingPage = {
  title: string;
  eyebrow: string;
  description: string;
  slug: string;
  primaryKeyword: string;
  examples: string[];
  features: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

export const marketingPages: MarketingPage[] = [
  {
    title: "AI Pixel Character Generator",
    eyebrow: "RPG character sprites",
    description:
      "Create transparent RPG pixel character sprites from prompts, reference images, and reusable style templates.",
    slug: "ai-pixel-character-generator",
    primaryKeyword: "AI pixel character generator",
    examples: [
      "pink-haired mage with a crystal staff",
      "armored knight with blue cape",
      "cute rogue adventurer with twin daggers",
    ],
    features: [
      "Transparent PNG output for game projects",
      "Reference image support for character direction",
      "Pixel editor and portfolio workflow",
    ],
    faqs: [
      {
        question: "Can I generate transparent character sprites?",
        answer:
          "Yes. BAPixel is designed for transparent RPG pixel sprites that can be downloaded and used in game mockups or asset workflows.",
      },
      {
        question: "Can I use a reference image?",
        answer:
          "Yes. You can upload a character reference image to help guide the prompt and preserve the intended character details.",
      },
    ],
  },
  {
    title: "RPG Sprite Generator",
    eyebrow: "Indie game asset workflow",
    description:
      "Generate RPG-style pixel sprites for fantasy characters, NPCs, monsters, and game prototypes.",
    slug: "rpg-sprite-generator",
    primaryKeyword: "RPG sprite generator",
    examples: [
      "village healer NPC in green robes",
      "small fire slime monster",
      "wandering merchant with backpack",
    ],
    features: [
      "Prompt-based RPG sprite creation",
      "Direction controls for character output",
      "Download, edit, and reuse generated sprites",
    ],
    faqs: [
      {
        question: "Is BAPixel useful for indie RPG prototypes?",
        answer:
          "Yes. It is built for quickly turning character ideas into readable pixel sprites for prototypes, concept sheets, and asset drafts.",
      },
      {
        question: "Can I edit the generated sprite?",
        answer:
          "Yes. You can open generated images in the pixel editor to make small manual changes.",
      },
    ],
  },
  {
    title: "Pixel Art Generator",
    eyebrow: "Pixel art from prompts",
    description:
      "Turn simple text ideas into pixel-style game assets with crisp edges, readable silhouettes, and downloadable PNG output.",
    slug: "pixel-art-generator",
    primaryKeyword: "pixel art generator",
    examples: [
      "golden treasure chest icon",
      "magic potion item sprite",
      "fantasy shopkeeper character",
    ],
    features: [
      "Prompt-to-pixel image generation",
      "Export sizes for previews and game assets",
      "Simple browser-based editing tools",
    ],
    faqs: [
      {
        question: "What can I generate with BAPixel?",
        answer:
          "BAPixel focuses on pixel-style game assets, especially RPG characters, icons, props, and fantasy sprite concepts.",
      },
      {
        question: "Do I need to install software?",
        answer:
          "No. BAPixel runs in the browser, so you can generate, download, and edit assets from the website.",
      },
    ],
  },
  {
    title: "Game Asset Generator",
    eyebrow: "Assets for indie developers",
    description:
      "Create pixel game assets for indie prototypes, RPG projects, and 2D game mockups without starting from a blank canvas.",
    slug: "game-asset-generator",
    primaryKeyword: "game asset generator",
    examples: [
      "fantasy inventory item set",
      "pixel mage enemy sprite",
      "small RPG town prop",
    ],
    features: [
      "Fast idea-to-asset generation",
      "Portfolio history for recent generations",
      "Point-based pricing with no subscription",
    ],
    faqs: [
      {
        question: "Who is BAPixel for?",
        answer:
          "BAPixel is for indie game developers, RPG makers, hobbyists, and creators who need fast pixel-style game asset drafts.",
      },
      {
        question: "Can I create assets from short descriptions?",
        answer:
          "Yes. A short description like 'pink-haired mage' can be converted into a generated pixel sprite.",
      },
    ],
  },
  {
    title: "Transparent Pixel Sprite Generator",
    eyebrow: "PNG sprites for games",
    description:
      "Generate transparent-background pixel sprites that are easier to place into game scenes, UI mockups, and asset folders.",
    slug: "transparent-pixel-sprite-generator",
    primaryKeyword: "transparent pixel sprite generator",
    examples: [
      "transparent mage character sprite",
      "transparent monster sprite",
      "transparent RPG item icon",
    ],
    features: [
      "Transparent PNG output",
      "Copy, download, and flip generated images",
      "Edit sprites directly in the built-in pixel editor",
    ],
    faqs: [
      {
        question: "Why use transparent sprites?",
        answer:
          "Transparent sprites are easier to place over maps, UI panels, battle screens, and prototype scenes without cleanup.",
      },
      {
        question: "Can I download the generated image?",
        answer:
          "Yes. Generated sprites can be downloaded as PNG files from the result area or portfolio.",
      },
    ],
  },
];

export function getMarketingPage(slug: string) {
  return marketingPages.find((page) => page.slug === slug);
}

export function MarketingLandingPage({ page }: { page: MarketingPage }) {
  return (
    <main className="min-h-screen bg-[#0a0d14] text-[#fafafa]">
      <nav className="border-b border-[#2a3142] bg-[#111827]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-[0.32em] text-[#f0b84f]">
              AI Pixel Sprite Tool
            </span>
            <span className="text-2xl font-black text-[#fafafa]">BAPixel</span>
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-[#d99a2b] bg-[#d99a2b] px-5 py-2 text-sm font-black text-[#18181b] transition hover:bg-[#eab54a]"
          >
            Start Creating
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-[#2a3142]">
        <Image
          src="/landing/pixel-map-bg.jpg"
          alt="Pixel fantasy map background"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070c] via-[#05070c]/88 to-[#05070c]/58" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.32em] text-[#f0b84f]">
              {page.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black leading-none text-[#fafafa] sm:text-6xl">
              {page.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#cbd5e1]">
              {page.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-lg bg-[#9f2f2b] px-6 py-3 text-sm font-black text-[#fafafa] transition hover:bg-[#b83a35]"
              >
                Generate a Sprite
              </Link>
              <a
                href="#examples"
                className="rounded-lg border border-[#2a3142] bg-[#0b1020] px-6 py-3 text-sm font-bold text-[#d9deea] transition hover:border-[#2dd4bf]"
              >
                View Prompts
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-4 lg:grid-cols-1">
            {["hero-character-1.png", "hero-character-2.png", "hero-character-3.png"].map((file) => (
              <div
                key={file}
                className="flex aspect-square items-center justify-center rounded-lg border border-[#2a3142] bg-[#080b13]/86 p-4"
              >
                <Image
                  src={`/landing/${file}`}
                  alt="Generated BAPixel sprite example"
                  width={160}
                  height={160}
                  unoptimized
                  className="h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-12 sm:px-8 lg:grid-cols-3 lg:px-10">
        {page.features.map((feature) => (
          <div key={feature} className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
            <p className="text-base font-bold text-[#fafafa]">{feature}</p>
          </div>
        ))}
      </section>

      <section id="examples" className="mx-auto max-w-7xl px-6 pb-12 sm:px-8 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.26em] text-[#f0b84f]">
              Prompt Ideas
            </p>
            <h2 className="mt-3 text-3xl font-black text-[#fafafa]">
              Try {page.primaryKeyword}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {page.examples.map((example) => (
              <Link
                key={example}
                href={`/?prompt=${encodeURIComponent(example)}`}
                className="rounded-lg border border-[#2a3142] bg-[#0b1020] p-6 text-sm font-bold leading-6 text-[#d9deea] transition hover:border-[#d99a2b]"
              >
                {example}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-2">
          {page.faqs.map((faq) => (
            <div key={faq.question} className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
              <h2 className="text-lg font-black text-[#fafafa]">{faq.question}</h2>
              <p className="mt-3 text-sm leading-6 text-[#8f9aaf]">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

import Stripe from "stripe";

export type PointPackage = {
  id: string;
  points: number;
  amountCents: number;
  currency: "usd";
  zhName: string;
  enName: string;
};

export const POINT_PACKAGES: PointPackage[] = [
  {
    id: "starter_30",
    points: 30,
    amountCents: 190,
    currency: "usd",
    zhName: "30 Point",
    enName: "30 Points",
  },
  {
    id: "creator_300",
    points: 300,
    amountCents: 990,
    currency: "usd",
    zhName: "300 Point",
    enName: "300 Points",
  },
  {
    id: "studio_800",
    points: 800,
    amountCents: 1990,
    currency: "usd",
    zhName: "800 Point",
    enName: "800 Points",
  },
];

export function getPointPackage(packageId: string) {
  return POINT_PACKAGES.find((pointPackage) => pointPackage.id === packageId) ?? null;
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(secretKey);
}

export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

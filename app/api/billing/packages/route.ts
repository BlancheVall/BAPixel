import { NextResponse } from "next/server";
import { POINT_PACKAGES } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    packages: POINT_PACKAGES,
  });
}

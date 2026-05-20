import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { publicUser, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      return errorResponse("AUTH-GOOGLE-CONFIG", "Google login is not configured. Please set GOOGLE_CLIENT_ID.", 500);
    }

    const { credential } = await req.json();

    if (!credential || typeof credential !== "string") {
      return errorResponse("AUTH-GOOGLE-CREDENTIAL", "Google credential is required.", 400);
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      return errorResponse("AUTH-GOOGLE-PAYLOAD", "Google account data was not returned.", 400);
    }

    const email = payload.email.toLowerCase();
    const user = await prisma.user.upsert({
      where: {
        email,
      },
      update: {
        googleSub: payload.sub,
        username: payload.name || email.split("@")[0],
      },
      create: {
        username: payload.name || email.split("@")[0],
        email,
        googleSub: payload.sub,
        points: 1,
      },
    });
    const response = NextResponse.json({
      user: publicUser(user),
    });

    setSessionCookie(response, user.id);

    return response;
  } catch (error) {
    console.error(error);

    return errorResponse("AUTH-GOOGLE-FAILED", "Google login failed.", 500);
  }
}

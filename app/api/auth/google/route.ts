import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { publicUser, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "Google login is not configured. Please set GOOGLE_CLIENT_ID." },
        { status: 500 },
      );
    }

    const { credential } = await req.json();

    if (!credential || typeof credential !== "string") {
      return NextResponse.json({ error: "Google credential is required." }, { status: 400 });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      return NextResponse.json({ error: "Google account data was not returned." }, { status: 400 });
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

    return NextResponse.json({ error: "Google login failed." }, { status: 500 });
  }
}

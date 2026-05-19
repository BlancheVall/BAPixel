import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { publicUser, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Please complete all fields." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await hash(password, 12),
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

    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { publicUser, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Please complete all fields." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const response = NextResponse.json({
      user: publicUser(user),
    });

    setSessionCookie(response, user.id);

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { publicUser, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!username || !email || !password) {
      return errorResponse("AUTH-REGISTER-FIELDS", "Please complete all fields.", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return errorResponse("AUTH-REGISTER-EXISTS", "This email is already registered.", 409);
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

    return errorResponse("AUTH-REGISTER-FAILED", "Registration failed.", 500);
  }
}

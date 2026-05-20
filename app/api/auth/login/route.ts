import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { publicUser, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return errorResponse("AUTH-LOGIN-FIELDS", "Please complete all fields.", 400);
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) {
      return errorResponse("AUTH-LOGIN-CREDENTIALS", "Email or password is incorrect.", 401);
    }

    const response = NextResponse.json({
      user: publicUser(user),
    });

    setSessionCookie(response, user.id);

    return response;
  } catch (error) {
    console.error(error);

    return errorResponse("AUTH-LOGIN-FAILED", "Login failed.", 500);
  }
}

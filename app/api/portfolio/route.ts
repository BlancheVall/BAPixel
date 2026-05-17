import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const generations = await prisma.generation.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        imageUrl: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      generations: generations.map((generation) => ({
        ...generation,
        createdAt: generation.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Failed to load portfolio." }, { status: 500 });
  }
}

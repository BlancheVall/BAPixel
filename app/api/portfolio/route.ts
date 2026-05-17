import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteGeneratedImage } from "@/lib/storage";

export const runtime = "nodejs";
const PORTFOLIO_RETENTION_DAYS = 7;

function getRetentionCutoff() {
  return new Date(Date.now() - PORTFOLIO_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const cutoff = getRetentionCutoff();
    const expiredGenerations = await prisma.generation.findMany({
      where: {
        userId: user.id,
        createdAt: {
          lt: cutoff,
        },
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (expiredGenerations.length > 0) {
      await prisma.generation.deleteMany({
        where: {
          id: {
            in: expiredGenerations.map((generation) => generation.id),
          },
          userId: user.id,
        },
      });
      await Promise.allSettled(
        expiredGenerations.map((generation) => deleteGeneratedImage(generation.imageUrl)),
      );
    }

    const generations = await prisma.generation.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: cutoff,
        },
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

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const { generationId } = (await req.json()) as {
      generationId?: unknown;
    };

    if (typeof generationId !== "string" || !generationId) {
      return NextResponse.json({ error: "Generation id is required." }, { status: 400 });
    }

    const generation = await prisma.generation.findFirst({
      where: {
        id: generationId,
        userId: user.id,
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!generation) {
      return NextResponse.json({ ok: true });
    }

    await prisma.generation.delete({
      where: {
        id: generation.id,
      },
    });
    await deleteGeneratedImage(generation.imageUrl);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Failed to delete portfolio item." }, { status: 500 });
  }
}

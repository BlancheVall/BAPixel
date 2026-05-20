import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteGeneratedImage } from "@/lib/storage";

export const runtime = "nodejs";
const PORTFOLIO_RETENTION_DAYS = 7;

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

function getRetentionCutoff() {
  return new Date(Date.now() - PORTFOLIO_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return errorResponse("PORT-GET-AUTH", "Please log in first.", 401);
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
        title: true,
        category: true,
        favorite: true,
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

    return errorResponse("PORT-GET-FAILED", "Failed to load portfolio.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return errorResponse("PORT-PATCH-AUTH", "Please log in first.", 401);
    }

    const { generationId, title, category, favorite } = (await req.json()) as {
      generationId?: unknown;
      title?: unknown;
      category?: unknown;
      favorite?: unknown;
    };

    if (typeof generationId !== "string" || !generationId) {
      return errorResponse("PORT-PATCH-ID", "Generation id is required.", 400);
    }

    const data: {
      title?: string | null;
      category?: string;
      favorite?: boolean;
    } = {};

    if (typeof title === "string") {
      data.title = title.trim().slice(0, 80) || null;
    }

    if (typeof category === "string" && ["character", "item", "monster", "scene"].includes(category)) {
      data.category = category;
    }

    if (typeof favorite === "boolean") {
      data.favorite = favorite;
    }

    if (Object.keys(data).length === 0) {
      return errorResponse("PORT-PATCH-EMPTY", "No valid portfolio changes were provided.", 400);
    }

    const updateResult = await prisma.generation.updateMany({
      where: {
        id: generationId,
        userId: user.id,
      },
      data,
    });

    if (updateResult.count === 0) {
      return errorResponse("PORT-PATCH-NOT-FOUND", "Portfolio item was not found.", 404);
    }

    const generation = await prisma.generation.findFirst({
      where: {
        id: generationId,
        userId: user.id,
      },
      select: {
        id: true,
        imageUrl: true,
        title: true,
        category: true,
        favorite: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      generation: generation
        ? {
            ...generation,
            createdAt: generation.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error(error);

    return errorResponse("PORT-PATCH-FAILED", "Failed to update portfolio item.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return errorResponse("PORT-DELETE-AUTH", "Please log in first.", 401);
    }

    const { generationId } = (await req.json()) as {
      generationId?: unknown;
    };

    if (typeof generationId !== "string" || !generationId) {
      return errorResponse("PORT-DELETE-ID", "Generation id is required.", 400);
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

    return errorResponse("PORT-DELETE-FAILED", "Failed to delete portfolio item.", 500);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readGeneratedImage } from "@/lib/storage";

export const runtime = "nodejs";

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return errorResponse("IMG-AUTH-401", "Please log in first.", 401);
    }

    const generationId = req.nextUrl.searchParams.get("id");

    if (!generationId) {
      return errorResponse("IMG-ID-MISSING", "Generation id is required.", 400);
    }

    const generation = await prisma.generation.findFirst({
      where: {
        id: generationId,
        userId: user.id,
      },
      select: {
        imageUrl: true,
      },
    });

    if (!generation) {
      return errorResponse("IMG-NOT-FOUND", "Image was not found.", 404);
    }

    const image = await readGeneratedImage(generation.imageUrl);

    if (!image) {
      return errorResponse("IMG-FILE-MISSING", "Image file was not found.", 404);
    }

    return new NextResponse(image.buffer, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error(error);

    return errorResponse("IMG-LOAD-FAILED", "Failed to load image.", 500);
  }
}

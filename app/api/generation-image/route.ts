import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readGeneratedImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const generationId = req.nextUrl.searchParams.get("id");

    if (!generationId) {
      return NextResponse.json({ error: "Generation id is required." }, { status: 400 });
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
      return NextResponse.json({ error: "Image was not found." }, { status: 404 });
    }

    const image = await readGeneratedImage(generation.imageUrl);

    if (!image) {
      return NextResponse.json({ error: "Image file was not found." }, { status: 404 });
    }

    return new NextResponse(image.buffer, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Failed to load image." }, { status: 500 });
  }
}

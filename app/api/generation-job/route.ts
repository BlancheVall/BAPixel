import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, publicUser } from "@/lib/auth";
import { pixelPostProcess } from "@/lib/image-postprocess";
import { prisma } from "@/lib/prisma";
import { getRunPodJobResult } from "@/lib/runpod";
import { saveGeneratedImage } from "@/lib/storage";

export const runtime = "nodejs";

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

type StoredGenerationOptions = {
  outputSize?: unknown;
  backgroundMode?: unknown;
};

function normalizeStoredOptions(value: unknown) {
  const options = (value || {}) as StoredGenerationOptions;
  const size = Number(options.outputSize);

  return {
    outputSize: size === 256 || size === 512 ? size : 128,
    backgroundMode: options.backgroundMode === "simple" ? "simple" : "transparent",
  } as const;
}

function isTerminalStatus(status: string) {
  return status === "COMPLETED" || status === "FAILED";
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return errorResponse("JOB-AUTH-401", "Please log in first.", 401);
    }

    const jobId = new URL(req.url).searchParams.get("id") || "";

    if (!jobId) {
      return errorResponse("JOB-ID-MISSING", "Generation job id is required.", 400);
    }

    const job = await prisma.generationJob.findFirst({
      where: {
        id: jobId,
        userId: user.id,
      },
    });

    if (!job) {
      return errorResponse("JOB-NOT-FOUND", "Generation job was not found.", 404);
    }

    if (job.status === "COMPLETED") {
      return NextResponse.json({
        job: {
          id: job.id,
          status: job.status,
        },
        imageUrl: job.imageUrl,
        user: publicUser(user),
        generation: job.generationId
          ? {
              id: job.generationId,
              imageUrl: job.imageUrl,
              title: job.title,
              category: job.category,
              favorite: false,
              description: job.description,
              createdAt: job.updatedAt.toISOString(),
            }
          : null,
      });
    }

    if (job.status === "FAILED") {
      return NextResponse.json(
        {
          job: {
            id: job.id,
            status: job.status,
          },
          code: "JOB-STORED-FAILED",
          error: "Generation failed.",
        },
        { status: 500 },
      );
    }

    const runPodResult = await getRunPodJobResult(job.providerJobId);
    const nextStatus = runPodResult.status === "IN_QUEUE" ? "PENDING" : runPodResult.status;

    if (!isTerminalStatus(nextStatus)) {
      await prisma.generationJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: nextStatus === "IN_PROGRESS" ? "RUNNING" : nextStatus,
        },
      });

      return NextResponse.json({
        job: {
          id: job.id,
          status: nextStatus === "IN_PROGRESS" ? "RUNNING" : nextStatus,
        },
      });
    }

    if (nextStatus === "FAILED" || !runPodResult.imageBuffer) {
      const failedJob = await prisma.generationJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: "FAILED",
          error: runPodResult.error || "RunPod did not return image data.",
        },
      });

      return NextResponse.json(
        {
          job: {
            id: failedJob.id,
            status: failedJob.status,
          },
          code: "JOB-RUNPOD-FAILED",
          error: "Generation failed.",
        },
        { status: 500 },
      );
    }

    const outputBuffer = await pixelPostProcess(runPodResult.imageBuffer, normalizeStoredOptions(job.options));
    const imageUrl = await saveGeneratedImage({
      buffer: outputBuffer,
      filename: `${job.category}-${job.userId}-${Date.now()}.png`,
      contentType: "image/png",
    });

    const billingResult = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.user.updateMany({
        where: {
          id: job.userId,
          points: {
            gte: job.cost,
          },
        },
        data: {
          points: {
            decrement: job.cost,
          },
        },
      });

      if (updateResult.count === 0) {
        await tx.generationJob.update({
          where: {
            id: job.id,
          },
          data: {
            status: "FAILED",
            error: "Not enough Points to complete this generation.",
          },
        });
        return null;
      }

      await tx.pointTransaction.create({
        data: {
          userId: job.userId,
          amount: -job.cost,
          type: "SPEND",
          note: `AI ${job.category} generation`,
        },
      });

      const generation = await tx.generation.create({
        data: {
          userId: job.userId,
          imageUrl,
          title: job.title,
          category: job.category,
          description: job.description,
          characterFeaturePrompt: job.characterFeaturePrompt,
          prompt: job.prompt,
          rewrittenPrompt: job.rewrittenPrompt,
          referenceImageCount: job.referenceImageCount,
        },
      });

      const updatedJob = await tx.generationJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: "COMPLETED",
          imageUrl,
          generationId: generation.id,
        },
      });

      const updatedUser = await tx.user.findUnique({
        where: {
          id: job.userId,
        },
      });

      return {
        generation,
        updatedJob,
        updatedUser,
      };
    });

    if (!billingResult) {
      return errorResponse("JOB-POINTS-402", "Not enough Points to generate an image.", 402);
    }

    return NextResponse.json({
      job: {
        id: billingResult.updatedJob.id,
        status: billingResult.updatedJob.status,
      },
      imageUrl,
      prompt: job.prompt,
      rewrittenPrompt: job.rewrittenPrompt,
      characterFeaturePrompt: job.characterFeaturePrompt,
      referenceImageCount: job.referenceImageCount,
      user: billingResult.updatedUser ? publicUser(billingResult.updatedUser) : null,
      generation: {
        id: billingResult.generation.id,
        imageUrl: billingResult.generation.imageUrl,
        title: billingResult.generation.title,
        category: billingResult.generation.category,
        favorite: billingResult.generation.favorite,
        description: billingResult.generation.description,
        createdAt: billingResult.generation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error(error);

    return errorResponse("JOB-CHECK-FAILED", "Failed to check generation job.", 500);
  }
}

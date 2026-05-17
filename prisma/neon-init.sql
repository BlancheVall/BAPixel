CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  "googleSub" TEXT UNIQUE,
  "points" INTEGER NOT NULL DEFAULT 20,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Generation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "description" TEXT,
  "characterFeaturePrompt" TEXT,
  "prompt" TEXT NOT NULL,
  "rewrittenPrompt" TEXT NOT NULL,
  "referenceImageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Generation_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Generation_userId_createdAt_idx"
  ON "Generation"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchaseStatus') THEN
    CREATE TYPE "PurchaseStatus" AS ENUM (
      'PENDING',
      'PAID',
      'CANCELED',
      'REFUNDED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PointTransactionType') THEN
    CREATE TYPE "PointTransactionType" AS ENUM (
      'GRANT',
      'PURCHASE',
      'SPEND',
      'REFUND',
      'ADJUSTMENT'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "PointPurchase" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "stripeCheckoutSessionId" TEXT UNIQUE,
  "stripePaymentIntentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PointPurchase_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PointTransaction" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "purchaseId" TEXT,
  "amount" INTEGER NOT NULL,
  "type" "PointTransactionType" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointTransaction_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT "PointTransaction_purchaseId_fkey"
    FOREIGN KEY ("purchaseId")
    REFERENCES "PointPurchase"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PointPurchase_userId_createdAt_idx"
  ON "PointPurchase"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "PointPurchase_status_createdAt_idx"
  ON "PointPurchase"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "PointTransaction_userId_createdAt_idx"
  ON "PointTransaction"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "PointTransaction_purchaseId_idx"
  ON "PointTransaction"("purchaseId");

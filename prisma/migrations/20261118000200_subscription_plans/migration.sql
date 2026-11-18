ALTER TABLE "Subscription"
  ADD COLUMN "stripePriceId" TEXT,
  ADD COLUMN "planId" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "billingInterval" TEXT,
  ADD COLUMN "unitAmount" INTEGER,
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- The exact original Stripe creation date is unavailable for old rows.
-- Keep an honest local approximation until a subscription is reconciled.
UPDATE "Subscription" SET "createdAt" = "updatedAt";
CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

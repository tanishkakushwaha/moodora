ALTER TABLE "User"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeCheckoutId" TEXT,
  ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reminderTime" VARCHAR(5) NOT NULL DEFAULT '20:00',
  ADD COLUMN "reminderTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "qualifies" BOOLEAN NOT NULL DEFAULT false,
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

CREATE TABLE "Couple" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "CoupleMember" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "coupleId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoupleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CoupleMember_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CoupleMember_coupleId_idx" ON "CoupleMember"("coupleId");
CREATE TABLE "CoupleInvite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoupleInvite_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CoupleInvite_ownerId_key" ON "CoupleInvite"("ownerId");
CREATE UNIQUE INDEX "CoupleInvite_tokenHash_key" ON "CoupleInvite"("tokenHash");
ALTER TABLE "Mood" ADD COLUMN "sharedCoupleId" TEXT;
ALTER TABLE "DiaryEntry" ADD COLUMN "sharedCoupleId" TEXT;
ALTER TABLE "Mood" ADD CONSTRAINT "Mood_sharedCoupleId_fkey" FOREIGN KEY ("sharedCoupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_sharedCoupleId_fkey" FOREIGN KEY ("sharedCoupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Mood_sharedCoupleId_idx" ON "Mood"("sharedCoupleId");
CREATE INDEX "DiaryEntry_sharedCoupleId_idx" ON "DiaryEntry"("sharedCoupleId");

-- CreateTable
CREATE TABLE "weekly_challenges" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_challenge_progress" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "weeklyChallengeId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_challenge_progress_profileId_weeklyChallengeId_key" ON "profile_challenge_progress"("profileId", "weeklyChallengeId");

-- AddForeignKey
ALTER TABLE "profile_challenge_progress" ADD CONSTRAINT "profile_challenge_progress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_challenge_progress" ADD CONSTRAINT "profile_challenge_progress_weeklyChallengeId_fkey" FOREIGN KEY ("weeklyChallengeId") REFERENCES "weekly_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

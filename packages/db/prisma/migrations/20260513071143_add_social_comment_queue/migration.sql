-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "CommentQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'AWAITING_GENERATION', 'DM_SENT', 'REPLIED', 'LIKED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('AGREEMENT', 'QUESTION', 'CORRECTION', 'COMBATIVE', 'APPRECIATION', 'EMOJI_ONLY', 'SPAM', 'IMAGE_REQUEST', 'OTHER');

-- AlterEnum
ALTER TYPE "GenerationType" ADD VALUE 'COMMENT_REQUEST';

-- CreateTable
CREATE TABLE "social_comment_queue" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "commentId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorUsername" TEXT,
    "commentText" TEXT NOT NULL,
    "postCaption" TEXT,
    "isThreadReply" BOOLEAN NOT NULL DEFAULT false,
    "parentCommentId" TEXT,
    "parentCommentText" TEXT,
    "status" "CommentQueueStatus" NOT NULL DEFAULT 'PENDING',
    "commentType" "CommentType",
    "processAfter" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "replyText" TEXT,
    "replyCommentId" TEXT,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "extractedPrompt" TEXT,
    "coloringImageId" TEXT,
    "dmSent" BOOLEAN NOT NULL DEFAULT false,
    "imageDmSent" BOOLEAN NOT NULL DEFAULT false,
    "slackChannelId" TEXT,
    "slackMessageTs" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_comment_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_comment_queue_commentId_key" ON "social_comment_queue"("commentId");

-- CreateIndex
CREATE INDEX "social_comment_queue_status_processAfter_idx" ON "social_comment_queue"("status", "processAfter");

-- CreateIndex
CREATE INDEX "social_comment_queue_postId_authorId_isThreadReply_status_idx" ON "social_comment_queue"("postId", "authorId", "isThreadReply", "status");

-- CreateIndex
CREATE INDEX "social_comment_queue_commentType_status_idx" ON "social_comment_queue"("commentType", "status");

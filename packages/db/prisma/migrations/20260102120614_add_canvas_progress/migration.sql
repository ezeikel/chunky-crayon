-- CreateTable
CREATE TABLE "canvas_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coloringImageId" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canvas_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "canvas_progress_userId_idx" ON "canvas_progress"("userId");

-- CreateIndex
CREATE INDEX "canvas_progress_coloringImageId_idx" ON "canvas_progress"("coloringImageId");

-- CreateIndex
CREATE UNIQUE INDEX "canvas_progress_userId_coloringImageId_key" ON "canvas_progress"("userId", "coloringImageId");

-- AddForeignKey
ALTER TABLE "canvas_progress" ADD CONSTRAINT "canvas_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_progress" ADD CONSTRAINT "canvas_progress_coloringImageId_fkey" FOREIGN KEY ("coloringImageId") REFERENCES "coloring_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

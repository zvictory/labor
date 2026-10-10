-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "commentStatus" TEXT NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "Vote_commentStatus_idx" ON "Vote"("commentStatus");


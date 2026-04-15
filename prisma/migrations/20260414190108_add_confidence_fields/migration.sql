-- AlterTable
ALTER TABLE "TestSession" ADD COLUMN     "confidenceExplanation" TEXT,
ADD COLUMN     "confidenceLevel" TEXT,
ADD COLUMN     "confidenceScore" DOUBLE PRECISION;

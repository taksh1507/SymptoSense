-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "emailReminders" BOOLEAN NOT NULL DEFAULT false,
    "whatsappReminders" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "personName" TEXT NOT NULL DEFAULT 'Myself',
    "isSelf" BOOLEAN NOT NULL DEFAULT true,
    "relation" TEXT,
    "gender" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "answers" TEXT NOT NULL,
    "assessmentPayload" TEXT,
    "ruleVersion" TEXT,
    "modelVersion" TEXT,
    "score" INTEGER,
    "urgency" TEXT,
    "factors" TEXT,
    "primaryCategory" TEXT,
    "recommendation" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "confidenceLevel" TEXT,
    "confidenceExplanation" TEXT,
    "riskReasoning" TEXT,
    "riskSummary" TEXT,
    "riskFactors" TEXT,
    "primaryAction" TEXT,
    "recommendationSteps" TEXT,
    "keyInsights" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionLog" (
    "id" TEXT NOT NULL,
    "testSessionId" TEXT,
    "userId" TEXT,
    "features" TEXT NOT NULL,
    "ruleScore" DOUBLE PRECISION,
    "predictedConfidence" DOUBLE PRECISION,
    "confidenceLevel" TEXT,
    "mlAvailable" BOOLEAN NOT NULL DEFAULT true,
    "modelVersion" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "testSessionId" TEXT NOT NULL,
    "reviewedCorrect" BOOLEAN,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "contactedDoctor" BOOLEAN,
    "diagnosis" TEXT,
    "resolved" TEXT,
    "improved" TEXT,
    "notes" TEXT,
    "reminderClaimedAt" TIMESTAMP(3),
    "lastRemindedAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "PredictionLog_testSessionId_idx" ON "PredictionLog"("testSessionId");

-- CreateIndex
CREATE INDEX "PredictionLog_createdAt_idx" ON "PredictionLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_testSessionId_key" ON "FollowUp"("testSessionId");

-- CreateIndex
CREATE INDEX "FollowUp_testSessionId_idx" ON "FollowUp"("testSessionId");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionLog" ADD CONSTRAINT "PredictionLog_testSessionId_fkey" FOREIGN KEY ("testSessionId") REFERENCES "TestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionLog" ADD CONSTRAINT "PredictionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_testSessionId_fkey" FOREIGN KEY ("testSessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

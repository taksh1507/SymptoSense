-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "emailReminders" BOOLEAN NOT NULL DEFAULT false,
    "whatsappReminders" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "image" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "confidenceScore" REAL,
    "confidenceLevel" TEXT,
    "confidenceExplanation" TEXT,
    "riskReasoning" TEXT,
    "riskSummary" TEXT,
    "riskFactors" TEXT,
    "primaryAction" TEXT,
    "recommendationSteps" TEXT,
    "keyInsights" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PredictionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testSessionId" TEXT,
    "userId" TEXT,
    "features" TEXT NOT NULL,
    "ruleScore" REAL,
    "predictedConfidence" REAL,
    "confidenceLevel" TEXT,
    "mlAvailable" BOOLEAN NOT NULL DEFAULT true,
    "modelVersion" TEXT,
    "latencyMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PredictionLog_testSessionId_fkey" FOREIGN KEY ("testSessionId") REFERENCES "TestSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PredictionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testSessionId" TEXT NOT NULL,
    "reviewedCorrect" BOOLEAN,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" DATETIME NOT NULL,
    "respondedAt" DATETIME,
    "contactedDoctor" BOOLEAN,
    "diagnosis" TEXT,
    "resolved" TEXT,
    "improved" TEXT,
    "notes" TEXT,
    "reminderClaimedAt" DATETIME,
    "lastRemindedAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUp_testSessionId_fkey" FOREIGN KEY ("testSessionId") REFERENCES "TestSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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

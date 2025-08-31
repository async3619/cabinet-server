-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activityType" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "isSuccess" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CrawlingResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "threadsCreated" INTEGER NOT NULL DEFAULT 0,
    "postsCreated" INTEGER NOT NULL DEFAULT 0,
    "attachmentsCreated" INTEGER NOT NULL DEFAULT 0,
    "boardsProcessed" INTEGER NOT NULL DEFAULT 0,
    "activityLogId" INTEGER NOT NULL,
    CONSTRAINT "CrawlingResult_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatcherResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "watcherName" TEXT NOT NULL,
    "threadsFound" INTEGER NOT NULL DEFAULT 0,
    "postsFound" INTEGER NOT NULL DEFAULT 0,
    "attachmentsFound" INTEGER NOT NULL DEFAULT 0,
    "isSuccessful" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "crawlingResultId" INTEGER NOT NULL,
    CONSTRAINT "WatcherResult_crawlingResultId_fkey" FOREIGN KEY ("crawlingResultId") REFERENCES "CrawlingResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CrawlingResult_activityLogId_key" ON "CrawlingResult"("activityLogId");

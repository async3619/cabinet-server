-- CreateTable
CREATE TABLE "AttachmentDownloadResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attachmentId" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "downloadDurationMs" INTEGER,
    "fileUri" TEXT,
    "thumbnailGenerated" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "httpStatusCode" INTEGER,
    "activityLogId" INTEGER NOT NULL,
    CONSTRAINT "AttachmentDownloadResult_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AttachmentDownloadResult_activityLogId_key" ON "AttachmentDownloadResult"("activityLogId");

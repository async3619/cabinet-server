/*
  Warnings:

  - Added the required column `extension` to the `AttachmentDownloadResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `AttachmentDownloadResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `AttachmentDownloadResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `AttachmentDownloadResult` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AttachmentDownloadResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attachmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "extension" TEXT NOT NULL,
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
INSERT INTO "new_AttachmentDownloadResult" ("activityLogId", "attachmentId", "downloadDurationMs", "fileSize", "fileUri", "httpStatusCode", "id", "mimeType", "retryCount", "thumbnailGenerated") SELECT "activityLogId", "attachmentId", "downloadDurationMs", "fileSize", "fileUri", "httpStatusCode", "id", "mimeType", "retryCount", "thumbnailGenerated" FROM "AttachmentDownloadResult";
DROP TABLE "AttachmentDownloadResult";
ALTER TABLE "new_AttachmentDownloadResult" RENAME TO "AttachmentDownloadResult";
CREATE UNIQUE INDEX "AttachmentDownloadResult_activityLogId_key" ON "AttachmentDownloadResult"("activityLogId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

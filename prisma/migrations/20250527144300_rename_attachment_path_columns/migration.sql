/*
  Warnings:

  - You are about to drop the column `filePath` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailFilePath` on the `Attachment` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER,
    "extension" TEXT NOT NULL,
    "mime" TEXT,
    "hash" TEXT,
    "createdAt" DATETIME NOT NULL,
    "timestamp" BIGINT,
    "fileUri" TEXT,
    "thumbnailWidth" INTEGER,
    "thumbnailHeight" INTEGER,
    "thumbnailFileUri" TEXT
);
INSERT INTO "new_Attachment" ("fileUri", "thumbnailFileUri", "createdAt", "extension", "hash", "height", "id", "mime", "name", "size", "thumbnailHeight", "thumbnailWidth", "timestamp", "uuid", "width") SELECT "filePath", "thumbnailFilePath", "createdAt", "extension", "hash", "height", "id", "mime", "name", "size", "thumbnailHeight", "thumbnailWidth", "timestamp", "uuid", "width" FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
CREATE UNIQUE INDEX "Attachment_uuid_key" ON "Attachment"("uuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

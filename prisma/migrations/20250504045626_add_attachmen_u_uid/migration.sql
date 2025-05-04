/*
  Warnings:

  - The required column `uuid` was added to the `Attachment` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

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
    "hash" TEXT,
    "createdAt" DATETIME NOT NULL,
    "timestamp" BIGINT,
    "filePath" TEXT,
    "thumbnailWidth" INTEGER,
    "thumbnailHeight" INTEGER,
    "thumbnailFilePath" TEXT
);
INSERT INTO "new_Attachment" ("createdAt", "extension", "filePath", "hash", "height", "id", "name", "size", "thumbnailFilePath", "thumbnailHeight", "thumbnailWidth", "timestamp", "width") SELECT "createdAt", "extension", "filePath", "hash", "height", "id", "name", "size", "thumbnailFilePath", "thumbnailHeight", "thumbnailWidth", "timestamp", "width" FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
CREATE UNIQUE INDEX "Attachment_uuid_key" ON "Attachment"("uuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - You are about to alter the column `totalSize` on the `Statistic` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Statistic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "threadCount" INTEGER NOT NULL,
    "postCount" INTEGER NOT NULL,
    "attachmentCount" INTEGER NOT NULL,
    "totalSize" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Statistic" ("attachmentCount", "createdAt", "id", "postCount", "threadCount", "totalSize") SELECT "attachmentCount", "createdAt", "id", "postCount", "threadCount", "totalSize" FROM "Statistic";
DROP TABLE "Statistic";
ALTER TABLE "new_Statistic" RENAME TO "Statistic";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

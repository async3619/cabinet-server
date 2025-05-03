/*
  Warnings:

  - Added the required column `type` to the `Watcher` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Watcher" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);
INSERT INTO "new_Watcher" ("id", "name") SELECT "id", "name" FROM "Watcher";
DROP TABLE "Watcher";
ALTER TABLE "new_Watcher" RENAME TO "Watcher";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

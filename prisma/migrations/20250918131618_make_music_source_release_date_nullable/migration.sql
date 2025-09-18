-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MusicSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "releaseDate" TEXT,
    "label" TEXT,
    "timeCode" TEXT NOT NULL,
    "offset" TEXT NOT NULL,
    "attachmentId" TEXT,
    CONSTRAINT "MusicSource_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MusicSource" ("album", "artist", "attachmentId", "id", "label", "offset", "releaseDate", "timeCode", "title") SELECT "album", "artist", "attachmentId", "id", "label", "offset", "releaseDate", "timeCode", "title" FROM "MusicSource";
DROP TABLE "MusicSource";
ALTER TABLE "new_MusicSource" RENAME TO "MusicSource";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

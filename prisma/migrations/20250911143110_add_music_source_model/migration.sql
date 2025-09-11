-- CreateTable
CREATE TABLE "MusicSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "releaseDate" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "timeCode" TEXT NOT NULL,
    "isrc" TEXT NOT NULL,
    "upc" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "offset" TEXT NOT NULL,
    "attachmentId" TEXT,
    CONSTRAINT "MusicSource_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

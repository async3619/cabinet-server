-- CreateTable
CREATE TABLE "Statistic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "threadCount" INTEGER NOT NULL,
    "postCount" INTEGER NOT NULL,
    "attachmentCount" INTEGER NOT NULL,
    "totalSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

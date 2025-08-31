-- CreateTable
CREATE TABLE "ExcludedThread" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "threadId" TEXT NOT NULL,
    "watcherId" INTEGER NOT NULL,
    CONSTRAINT "ExcludedThread_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "Watcher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

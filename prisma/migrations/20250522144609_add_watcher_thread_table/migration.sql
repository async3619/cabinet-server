-- CreateTable
CREATE TABLE "WatcherThread" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "watcherId" INTEGER NOT NULL,
    "threadId" TEXT NOT NULL,
    CONSTRAINT "WatcherThread_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "Watcher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WatcherThread_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

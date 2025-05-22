-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WatcherThread" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "watcherId" INTEGER NOT NULL,
    "threadId" TEXT,
    CONSTRAINT "WatcherThread_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "Watcher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WatcherThread_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WatcherThread" ("id", "threadId", "url", "watcherId") SELECT "id", "threadId", "url", "watcherId" FROM "WatcherThread";
DROP TABLE "WatcherThread";
ALTER TABLE "new_WatcherThread" RENAME TO "WatcherThread";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

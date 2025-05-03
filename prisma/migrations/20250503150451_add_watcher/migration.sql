-- CreateTable
CREATE TABLE "Watcher" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ThreadToWatcher" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ThreadToWatcher_A_fkey" FOREIGN KEY ("A") REFERENCES "Thread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ThreadToWatcher_B_fkey" FOREIGN KEY ("B") REFERENCES "Watcher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ThreadToWatcher_AB_unique" ON "_ThreadToWatcher"("A", "B");

-- CreateIndex
CREATE INDEX "_ThreadToWatcher_B_index" ON "_ThreadToWatcher"("B");

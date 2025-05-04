-- CreateTable
CREATE TABLE "_AttachmentToWatcher" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_AttachmentToWatcher_A_fkey" FOREIGN KEY ("A") REFERENCES "Attachment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AttachmentToWatcher_B_fkey" FOREIGN KEY ("B") REFERENCES "Watcher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_AttachmentToWatcher_AB_unique" ON "_AttachmentToWatcher"("A", "B");

-- CreateIndex
CREATE INDEX "_AttachmentToWatcher_B_index" ON "_AttachmentToWatcher"("B");

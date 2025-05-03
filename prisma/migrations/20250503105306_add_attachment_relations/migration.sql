-- CreateTable
CREATE TABLE "_AttachmentToThread" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AttachmentToThread_A_fkey" FOREIGN KEY ("A") REFERENCES "Attachment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AttachmentToThread_B_fkey" FOREIGN KEY ("B") REFERENCES "Thread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AttachmentToPost" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AttachmentToPost_A_fkey" FOREIGN KEY ("A") REFERENCES "Attachment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AttachmentToPost_B_fkey" FOREIGN KEY ("B") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_AttachmentToThread_AB_unique" ON "_AttachmentToThread"("A", "B");

-- CreateIndex
CREATE INDEX "_AttachmentToThread_B_index" ON "_AttachmentToThread"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AttachmentToPost_AB_unique" ON "_AttachmentToPost"("A", "B");

-- CreateIndex
CREATE INDEX "_AttachmentToPost_B_index" ON "_AttachmentToPost"("B");

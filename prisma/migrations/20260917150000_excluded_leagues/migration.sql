-- CreateTable
CREATE TABLE "ExcludedLeague" (
    "id" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExcludedLeague_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExcludedLeague_sleeperLeagueId_key" ON "ExcludedLeague"("sleeperLeagueId");

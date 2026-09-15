-- CreateSchema
CREATE TABLE "AppMeta" (
    "id" INTEGER NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "nflWeek" INTEGER,
    "nflSeason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppMeta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "previousSleeperLeagueId" TEXT,
    "playoffWeekStart" INTEGER NOT NULL DEFAULT 15,
    "playoffTeams" INTEGER NOT NULL DEFAULT 6,
    "totalRosters" INTEGER NOT NULL DEFAULT 12,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sleeperRosterId" INTEGER NOT NULL,
    "ownerUserId" TEXT,
    "username" TEXT,
    "displayName" TEXT,
    "teamName" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklyScore" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchupId" INTEGER,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "tied" BOOLEAN NOT NULL DEFAULT false,
    "roulette" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "blobUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "League_sleeperLeagueId_key" ON "League"("sleeperLeagueId");
CREATE INDEX "League_season_idx" ON "League"("season");
CREATE UNIQUE INDEX "Team_leagueId_sleeperRosterId_key" ON "Team"("leagueId", "sleeperRosterId");
CREATE INDEX "Team_leagueId_idx" ON "Team"("leagueId");
CREATE UNIQUE INDEX "WeeklyScore_teamId_week_key" ON "WeeklyScore"("teamId", "week");
CREATE INDEX "WeeklyScore_week_idx" ON "WeeklyScore"("week");
CREATE UNIQUE INDEX "GeneratedImage_leagueId_season_week_key" ON "GeneratedImage"("leagueId", "season", "week");
CREATE INDEX "GeneratedImage_season_week_idx" ON "GeneratedImage"("season", "week");

ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

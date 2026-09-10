-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'HARDCORE');

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" TEXT NOT NULL,
    "givens" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "difficultyScore" INTEGER NOT NULL,
    "techniques" TEXT[],
    "givensCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "puzzleId" TEXT NOT NULL,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Puzzle_difficulty_servedCount_idx" ON "Puzzle"("difficulty", "servedCount");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_date_key" ON "DailyChallenge"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_puzzleId_key" ON "DailyChallenge"("puzzleId");

-- AddForeignKey
ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

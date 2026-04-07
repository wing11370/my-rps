# 猜拳遊戲 - Rock Paper Scissors

A full-stack Rock-Paper-Scissors game built with Next.js, TypeScript, Tailwind CSS, and Prisma with SQLite.

## Features

- 🎮 Play Rock-Paper-Scissors against the computer
- 👤 Enter a username to track your stats
- 🏆 Leaderboard showing top 10 players by wins
- 💾 Game history persisted in SQLite via Prisma
- 🌐 Bilingual UI (Chinese / English)

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma v7** with SQLite (`better-sqlite3` adapter)

## Getting Started

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## API Routes

- `POST /api/users` — Create or retrieve a user by username
- `POST /api/games` — Record a game result
- `GET /api/leaderboard` — Fetch top 10 players

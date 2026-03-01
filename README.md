# Cricket Scoring Web App

A mobile-first cricket scoring app for recording local matches (not live streaming). Built with Next.js, TypeScript, Tailwind CSS, and MongoDB.

## Features

- **Players**: Create, edit, list, search
- **Teams**: Create teams from player pool, edit roster
- **Match setup wizard**: Select teams → Playing XI → Rules → Toss → Start
- **Ball-by-ball scoring**: Runs (0–6), extras (WD, NB, B, LB), wickets, undo
- **Scorecard**: Batting & bowling figures, extras
- **Match history**: Resume in-progress, view completed scorecards

## Tech Stack

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **React Hook Form** + **Zod** for forms and validation
- **MongoDB Atlas** (Mongoose), serverless-friendly connection
- **Next.js Route Handlers** (`/api/*`)

## Local run

1. Clone and install:

   ```bash
   cd nextapp
   npm install
   ```

2. Create `.env.local` and set:

   ```
   MONGODB_URI=mongodb+srv://...
   ```

3. Start dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## MongoDB Atlas setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and note username/password.
3. Network Access: add `0.0.0.0/0` (or your IP) for development.
4. Get connection string: Cluster → Connect → Drivers → copy URI.
5. Replace `<password>` with your user password and set in `.env.local` as `MONGODB_URI`.

## Vercel deploy

1. Push the repo to GitHub.
2. In Vercel: Import project, set root to this repo.
3. Environment variables: add `MONGODB_URI` (and optionally `NEXTAUTH_URL` / `NEXTAUTH_SECRET` if you add auth).
4. Deploy. Ensure MongoDB Atlas allows connections from Vercel IPs (or use `0.0.0.0/0` for simplicity).

## Seed / demo data

**Option A – API seed (empty DB only)**  
With the dev server running, open `http://localhost:3000/api/seed` in the browser. This creates 22 players and 2 teams (Tigers XI, Lions XI) only if the `players` collection is empty.

**Option B – Manual**  
1. Create a few **Players** (e.g. "Player One", "Player Two", …).  
2. Create **Teams** and assign players.  
3. Start a **New Match** via the wizard, then score from the scoring screen.

To reset: delete documents in the `players`, `teams`, and `matches` collections in MongoDB Atlas.

## Project structure

- `src/app/` – App Router pages and API routes
- `src/app/api/players`, `teams`, `matches`, `matches/[id]/events` – API handlers
- `src/lib/` – DB connection, models, types, validations
- `src/lib/engine/` – Pure calculation engine (innings summary, batting card, bowling figures, strike rotation)

## Extending

- **Auth**: Add NextAuth (e.g. credentials or Google). Set `createdByUserId` on matches and filter history by user.
- **Tournaments**: Add a `tournamentId` on matches and a tournaments collection; add grouping in history and extra rules (e.g. knockout).

## Tests

```bash
npm test
```

Runs Vitest for the calculation engine (`src/lib/engine/engine.test.ts`).

## License

MIT.

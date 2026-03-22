# Plant Platform

A separate multi-plant dashboard for the workshop. This app is designed for:

- `Next.js` App Router on Vercel
- `Neon Postgres` as the persistence layer
- UUID-based sensor ingestion at `POST /api/plants/:plantId/readings`

## Why this stack

- `Next.js` is the most natural deploy target on Vercel for a UI plus API in one codebase.
- `Neon Postgres` gives you a cheap serverless relational database with a single `DATABASE_URL`, which fits the plant + latest-reading snapshot model cleanly.
- The app keeps the current workshop calibration model:
  - dry fixed at `4095`
  - wet threshold default `1500`
  - wet threshold min `500`
  - wet threshold max `2049`

## Local development

1. Create a Neon Postgres database.
2. Copy `.env.example` to `.env.local`.
3. Add your `DATABASE_URL`.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

The database schema is created automatically on first request.

The app persists plant metadata and the latest reading snapshot for each plant. It does not keep a historical readings log.

## API overview

- `GET /api/plants`
- `POST /api/plants`
- `GET /api/plants/:plantId`
- `PATCH /api/plants/:plantId`
- `DELETE /api/plants/:plantId`
- `POST /api/plants/:plantId/readings`

Create a plant from the dashboard to get its UUID, or provide your own UUID at creation time. Then use that UUID from the ESP32 sketch.

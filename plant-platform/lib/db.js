import { neon } from "@neondatabase/serverless";

let client = null;
let schemaReadyPromise = null;

function getClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Connect a Neon Postgres database before running plant-platform."
    );
  }

  if (!client) {
    client = neon(databaseUrl);
  }

  return client;
}

async function ensureSchema() {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  const sql = getClient();

  schemaReadyPromise = (async function () {
    await sql`
      CREATE TABLE IF NOT EXISTS plants (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        wet_threshold integer NOT NULL CHECK (wet_threshold BETWEEN 500 AND 2049),
        latest_raw_value integer CHECK (latest_raw_value BETWEEN 0 AND 4095),
        latest_source text,
        latest_received_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      ALTER TABLE plants
      ADD COLUMN IF NOT EXISTS latest_raw_value integer CHECK (latest_raw_value BETWEEN 0 AND 4095)
    `;

    await sql`
      ALTER TABLE plants
      ADD COLUMN IF NOT EXISTS latest_source text
    `;

    await sql`
      ALTER TABLE plants
      ADD COLUMN IF NOT EXISTS latest_received_at timestamptz
    `;
  })();

  return schemaReadyPromise;
}

export async function withDatabase(callback) {
  await ensureSchema();
  return callback(getClient());
}

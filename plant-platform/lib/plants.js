import { randomUUID } from "node:crypto";

import {
  DEFAULT_WET_THRESHOLD,
  decorateReading,
  normalizeRawValue,
  sanitizeWetThreshold
} from "@/lib/moisture";
import { withDatabase } from "@/lib/db";

const NAME_MAX_LENGTH = 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizePlantName(name) {
  const normalizedName = String(name || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalizedName) {
    throw new Error("Plant name is required");
  }

  if (normalizedName.length > NAME_MAX_LENGTH) {
    throw new Error(`Plant name must be ${NAME_MAX_LENGTH} characters or fewer`);
  }

  return normalizedName;
}

function sanitizeSource(source) {
  const normalizedSource = String(source || "api")
    .trim()
    .slice(0, 40);

  return normalizedSource || "api";
}

function sanitizePlantId(plantId) {
  if (typeof plantId === "undefined" || plantId === null || `${plantId}`.trim() === "") {
    return randomUUID();
  }

  const normalizedPlantId = String(plantId).trim().toLowerCase();

  if (!UUID_PATTERN.test(normalizedPlantId)) {
    throw new Error("Plant UUID must be a valid UUID");
  }

  return normalizedPlantId;
}

function normalizeReceivedAt(receivedAt) {
  if (!receivedAt) {
    return new Date().toISOString();
  }

  const date = new Date(receivedAt);

  if (Number.isNaN(date.getTime())) {
    throw new Error("`receivedAt` must be a valid ISO timestamp");
  }

  return date.toISOString();
}

function mapPlantSummary(row) {
  const wetThreshold = sanitizeWetThreshold(row.wetThreshold);
  const latestReading =
    row.latestRawValue === null || typeof row.latestRawValue === "undefined"
      ? null
      : decorateReading(
          {
            rawValue: Number(row.latestRawValue),
            receivedAt: row.latestReceivedAt,
            source: row.latestSource || "api"
          },
          wetThreshold
        );

  return {
    id: row.id,
    name: row.name,
    wetThreshold,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    latestReading
  };
}

async function fetchPlantSummaryRow(sql, plantId) {
  const rows = await sql`
    SELECT
      id,
      name,
      wet_threshold AS "wetThreshold",
      latest_raw_value AS "latestRawValue",
      latest_received_at AS "latestReceivedAt",
      latest_source AS "latestSource",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM plants
    WHERE id = ${plantId}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function listPlants() {
  return withDatabase(async function (sql) {
    const rows = await sql`
      SELECT
        id,
        name,
        wet_threshold AS "wetThreshold",
        latest_raw_value AS "latestRawValue",
        latest_received_at AS "latestReceivedAt",
        latest_source AS "latestSource",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM plants
      ORDER BY created_at ASC
    `;

    return rows.map(mapPlantSummary);
  });
}

export async function getPlantDetail(plantId) {
  return withDatabase(async function (sql) {
    const plantRow = await fetchPlantSummaryRow(sql, plantId);

    if (!plantRow) {
      return null;
    }

    return {
      ...mapPlantSummary(plantRow),
      apiPath: `/api/plants/${plantId}/readings`
    };
  });
}

export async function createPlant(name, plantId) {
  return withDatabase(async function (sql) {
    const normalizedPlantId = sanitizePlantId(plantId);
    const normalizedName = sanitizePlantName(name);
    const existingRows = await sql`
      SELECT id
      FROM plants
      WHERE id = ${normalizedPlantId}
      LIMIT 1
    `;

    if (existingRows[0]) {
      throw new Error("Plant UUID already exists");
    }

    await sql`
      INSERT INTO plants (
        id,
        name,
        wet_threshold
      )
      VALUES (
        ${normalizedPlantId},
        ${normalizedName},
        ${DEFAULT_WET_THRESHOLD}
      )
    `;

    const row = await fetchPlantSummaryRow(sql, normalizedPlantId);
    return mapPlantSummary(row);
  });
}

export async function updatePlant(plantId, updates) {
  return withDatabase(async function (sql) {
    const nextName =
      typeof updates.name === "undefined" ? null : sanitizePlantName(updates.name);
    const nextWetThreshold =
      typeof updates.wetThreshold === "undefined"
        ? null
        : sanitizeWetThreshold(updates.wetThreshold);

    const rows = await sql`
      UPDATE plants
      SET
        name = COALESCE(${nextName}, name),
        wet_threshold = COALESCE(${nextWetThreshold}, wet_threshold),
        updated_at = now()
      WHERE id = ${plantId}
      RETURNING id
    `;

    if (!rows[0]) {
      return null;
    }

    const plantRow = await fetchPlantSummaryRow(sql, plantId);
    return mapPlantSummary(plantRow);
  });
}

export async function deletePlant(plantId) {
  return withDatabase(async function (sql) {
    const rows = await sql`
      DELETE FROM plants
      WHERE id = ${plantId}
      RETURNING id
    `;

    return Boolean(rows[0]);
  });
}

export async function appendPlantReading(plantId, payload) {
  return withDatabase(async function (sql) {
    const plantRows = await sql`
      SELECT
        id,
        wet_threshold AS "wetThreshold"
      FROM plants
      WHERE id = ${plantId}
      LIMIT 1
    `;

    const plant = plantRows[0];

    if (!plant) {
      return null;
    }

    const rawValue = normalizeRawValue(payload.rawValue);

    if (rawValue === null) {
      throw new Error("`rawValue` must be a number between 0 and 4095");
    }

    const source = sanitizeSource(payload.source);
    const receivedAt = normalizeReceivedAt(payload.receivedAt);

    const rows = await sql`
      UPDATE plants
      SET
        latest_raw_value = ${rawValue},
        latest_source = ${source},
        latest_received_at = ${receivedAt}
      WHERE id = ${plantId}
      RETURNING
        latest_raw_value AS "rawValue",
        latest_source AS "source",
        latest_received_at AS "receivedAt"
    `;

    return {
      plant: await getPlantDetail(plantId),
      reading: decorateReading(
        {
          rawValue: Number(rows[0].rawValue),
          receivedAt: rows[0].receivedAt,
          source: rows[0].source
        },
        sanitizeWetThreshold(plant.wetThreshold)
      )
    };
  });
}

export const DRY_VALUE = 4095;
export const DEFAULT_WET_THRESHOLD = 1500;
export const MIN_WET_THRESHOLD = 500;
export const MAX_WET_THRESHOLD = 2049;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeRawValue(rawValue) {
  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return clamp(Math.round(numericValue), 0, DRY_VALUE);
}

export function sanitizeWetThreshold(wetThreshold = DEFAULT_WET_THRESHOLD) {
  const numericValue = Number(wetThreshold);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_WET_THRESHOLD;
  }

  return clamp(Math.round(numericValue), MIN_WET_THRESHOLD, MAX_WET_THRESHOLD);
}

export function mapRawToPercent(rawValue, wetThreshold = DEFAULT_WET_THRESHOLD) {
  const normalizedRawValue = normalizeRawValue(rawValue);
  const normalizedWetThreshold = sanitizeWetThreshold(wetThreshold);

  if (normalizedRawValue === null) {
    return null;
  }

  const range = DRY_VALUE - normalizedWetThreshold;

  if (range <= 0) {
    return normalizedRawValue <= normalizedWetThreshold ? 100 : 0;
  }

  return clamp(
    ((DRY_VALUE - normalizedRawValue) / range) * 100,
    0,
    100
  );
}

export function describeMoisture(percent) {
  if (percent === null) {
    return "Waiting for reading";
  }

  if (percent < 25) {
    return "Dry";
  }

  if (percent < 60) {
    return "Comfortable";
  }

  return "Wet";
}

export function decorateReading(reading, wetThreshold = DEFAULT_WET_THRESHOLD) {
  if (!reading) {
    return null;
  }

  const moisturePercent = mapRawToPercent(reading.rawValue, wetThreshold);

  return {
    ...reading,
    moisturePercent:
      moisturePercent === null ? null : Number(moisturePercent.toFixed(1)),
    status: describeMoisture(moisturePercent)
  };
}

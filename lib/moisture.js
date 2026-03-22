const DRY_VALUE = 4095;
const DEFAULT_WET_VALUE = 1500;
const MIN_WET_VALUE = 500;
const MAX_WET_VALUE = 2049;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRawValue(rawValue) {
  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return clamp(Math.round(numericValue), 0, DRY_VALUE);
}

function sanitizeWetValue(wetValue = DEFAULT_WET_VALUE) {
  const numericValue = Number(wetValue);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_WET_VALUE;
  }

  return clamp(Math.round(numericValue), MIN_WET_VALUE, MAX_WET_VALUE);
}

function mapRawToPercent(rawValue, wetValue = DEFAULT_WET_VALUE) {
  const normalizedRawValue = normalizeRawValue(rawValue);
  const normalizedWetValue = sanitizeWetValue(wetValue);

  if (normalizedRawValue === null) {
    return null;
  }

  const range = DRY_VALUE - normalizedWetValue;

  if (range <= 0) {
    return normalizedRawValue <= normalizedWetValue ? 100 : 0;
  }

  const percent =
    ((DRY_VALUE - normalizedRawValue) / range) * 100;

  return clamp(percent, 0, 100);
}

function describeMoisture(percent) {
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

function buildReading(rawValue, options = {}) {
  const normalizedRawValue = normalizeRawValue(rawValue);

  if (normalizedRawValue === null) {
    return null;
  }

  return {
    rawValue: normalizedRawValue,
    receivedAt: options.receivedAt || new Date().toISOString(),
    source: options.source || "api"
  };
}

function calibrationConfig() {
  return {
    dryValue: DRY_VALUE,
    defaultWetValue: DEFAULT_WET_VALUE,
    wetValueRange: {
      min: MIN_WET_VALUE,
      max: MAX_WET_VALUE
    }
  };
}

function decorateReading(reading, wetValue = DEFAULT_WET_VALUE) {
  if (!reading) {
    return null;
  }

  const moisturePercent = mapRawToPercent(reading.rawValue, wetValue);

  return {
    ...reading,
    moisturePercent: Number(moisturePercent.toFixed(1)),
    status: describeMoisture(moisturePercent)
  };
}

module.exports = {
  DRY_VALUE,
  DEFAULT_WET_VALUE,
  MIN_WET_VALUE,
  MAX_WET_VALUE,
  buildReading,
  calibrationConfig,
  clamp,
  decorateReading,
  describeMoisture,
  mapRawToPercent,
  normalizeRawValue,
  sanitizeWetValue
};

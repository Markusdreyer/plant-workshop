const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_WET_VALUE,
  DRY_VALUE,
  MAX_WET_VALUE,
  MIN_WET_VALUE,
  buildReading,
  mapRawToPercent,
  sanitizeWetValue
} = require("../lib/moisture");

test("raw dry value maps to zero moisture", () => {
  assert.equal(mapRawToPercent(DRY_VALUE, DEFAULT_WET_VALUE), 0);
});

test("default wet value maps to full moisture", () => {
  assert.equal(mapRawToPercent(DEFAULT_WET_VALUE, DEFAULT_WET_VALUE), 100);
});

test("wet threshold clamps inside configured range", () => {
  assert.equal(sanitizeWetValue(499), MIN_WET_VALUE);
  assert.equal(sanitizeWetValue(2500), MAX_WET_VALUE);
});

test("readings are rounded and clamped before storing", () => {
  const reading = buildReading(4200.4, {
    source: "usb-serial"
  });

  assert.deepEqual(reading, {
    rawValue: DRY_VALUE,
    receivedAt: reading.receivedAt,
    source: "usb-serial"
  });
});

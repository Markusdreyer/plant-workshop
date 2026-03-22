const int analogPin = 36;

// Calibrated from your measurements
const int dryValue = 4095;
const int wetValue = 1500;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Moisture sensor test starting...");
}

void loop() {
  int analogValue = analogRead(analogPin);

  float moisturePercent =
      ((float)(dryValue - analogValue) / (dryValue - wetValue)) * 100.0;

  if (moisturePercent < 0) moisturePercent = 0;
  if (moisturePercent > 100) moisturePercent = 100;

  Serial.print("Raw analog: ");
  Serial.print(analogValue);
  Serial.print(" | Moisture: ");
  Serial.print(moisturePercent, 1);
  Serial.println("%");

  delay(1000);
}
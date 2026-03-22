const int analogPin = 36;
const unsigned long sampleDelayMs = 750;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Plant moisture sensor ready");
}

void loop() {
  const int rawValue = analogRead(analogPin);

  // One raw value per line keeps the browser integration simple.
  Serial.println(rawValue);

  delay(sampleDelayMs);
}

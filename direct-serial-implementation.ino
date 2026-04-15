const int analogPin = 36;
const unsigned long sampleDelayMs = 750;
const unsigned long baudRate = 115200; // Remember this number for later

void setup() {
  Serial.begin(baudRate);
  delay(1000);
  Serial.println("Plant moisture sensor ready");
}

void loop() {
  const int rawValue = analogRead(analogPin);

  Serial.println(rawValue);

  delay(sampleDelayMs);
}
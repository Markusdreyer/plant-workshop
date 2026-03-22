#include <HTTPClient.h>
#include <WiFi.h>

const int analogPin = 36;
const unsigned long sampleDelayMs = 750;
const uint16_t httpTimeoutMs = 1000;

const char* wifiSsid = "";
const char* wifiPassword = "";
const char* serverUrl = ""; // e.g. http://192.168.2.29:3000/api/readings, not localhost

bool networkConfigured() {
  return wifiSsid[0] != '\0' &&
         wifiPassword[0] != '\0' &&
         serverUrl[0] != '\0';
}

void logNetworkMessage(const char* message) {
  Serial.print("[net] ");
  Serial.println(message);
}

void startWifiIfConfigured() {
  if (!networkConfigured()) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid, wifiPassword);

  Serial.print("[net] Connecting to WiFi: ");
  Serial.println(wifiSsid);
}

void postReadingIfConnected(int rawValue) {
  if (!networkConfigured() || WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.setConnectTimeout(httpTimeoutMs);
  http.setTimeout(httpTimeoutMs);
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  const String payload =
      "{\"rawValue\":" + String(rawValue) + ",\"source\":\"esp32-wifi\"}";

  const int responseCode = http.POST(payload);

  if (responseCode <= 0 || responseCode >= 400) {
    Serial.print("[net] API post failed: ");
    Serial.println(responseCode);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Plant moisture sensor ready");

  if (networkConfigured()) {
    logNetworkMessage("WiFi/API mode enabled");
    startWifiIfConfigured();
  } else {
    logNetworkMessage("WiFi/API mode disabled; serial-only mode is active");
  }
}

void loop() {
  const int rawValue = analogRead(analogPin);

  // Keep raw values on serial in all modes so the browser workshop path still works.
  Serial.println(rawValue);

  postReadingIfConnected(rawValue);

  delay(sampleDelayMs);
}

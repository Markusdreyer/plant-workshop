## Workshop setup

Install Arduino IDE 2 from Arduino’s official site:

https://www.arduino.cc/en/software/?utm_source=chatgpt.com

Then install the ESP32 board package in Arduino IDE using Boards Manager.

![](./assets/Screenshot%202026-03-21%20at%2011.22.35.png)

![](./assets/Screenshot%202026-03-21%20at%2011.30.34.png)

## First upload

Use the usual blink sketch first to confirm the board is reachable:

```cpp
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
```

1. Click the upload button in the top left corner.
2. Confirm the ESP32 blinks blue.

If upload fails or the board does not blink blue, grab help before moving on.

## Connecting the dots

Wire diagram:

![](./assets/My%20First%20Board%20-%20Frame%201.jpg)

![](./assets/My%20First%20Board%20-%20Frame%202.jpg)

## Sensor sketch

[`direct-serial-implementation.cpp`](./direct-serial-implementation.cpp) is the minimal serial-only sketch for the basic workshop path. [`dual-mode-moisture-sensor.cpp`](./dual-mode-moisture-sensor.cpp) adds optional Wi-Fi/API posting for participants who want the board to run without a laptop attached.

Dry is fixed at `4095`.

### Two workshop levels

Basic path:

1. Leave `wifiSsid`, `wifiPassword`, and `serverUrl` empty in the sketch.
2. Upload [`direct-serial-implementation.cpp`](./direct-serial-implementation.cpp).
3. Connect the ESP32 over USB and use the dashboard's `Connect via USB` button.

Advanced path:

1. Fill in `wifiSsid`, `wifiPassword`, and `serverUrl` in [`dual-mode-moisture-sensor.cpp`](./dual-mode-moisture-sensor.cpp).
2. Upload that sketch.
3. The ESP32 will keep emitting raw values on serial and will also POST raw values to the API whenever Wi-Fi is connected.

If any of the three network values are left empty, the board stays in serial-only mode and does not attempt Wi-Fi or HTTP at all.

## Dashboard

Start the local app:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

The UI supports two ways of getting readings:

1. Click `Connect via USB` in a Chromium-based browser to read the ESP32 serial output directly.
2. POST raw values to the local API.

If the ESP32 has Wi-Fi configured and you also connect it over USB in the browser, both transports can report the same readings. For workshop use, prefer one transport per session.

The gauge computes moisture from raw values using:

- Dry value: `4095`
- Default wet value: `1500`
- Wet value slider range: `500..2049`

## API

### POST `/api/readings`

Send the raw reading as JSON:

```bash
curl -X POST http://localhost:3000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"rawValue": 1780, "source": "esp32-wifi"}'
```

### GET `/api/readings/latest`

Returns the latest reading plus the default calibration config.

### GET `/api/events`

Server-Sent Events stream for live dashboard updates.

## Tests

Run the calibration logic test with:

```bash
npm test
```


## Result
![](./assets/Screenshot%202026-03-22%20at%2013.08.33.png)

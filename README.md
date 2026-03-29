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

### Approaches

There's two appraoches, solder-free and soldering



## Plant platform

The workshop now runs through [`plant-platform/`](./plant-platform) only. It is a Next.js app intended for Vercel, backed by Neon Postgres, with one dashboard for every registered plant.

Dry is fixed at `4095`.

### Two workshop levels

Basic path:

1. Upload [`direct-serial-implementation.cpp`](./direct-serial-implementation.cpp).
2. Open the deployed Plant Platform in Chrome or Edge.
3. Create a plant, open its settings, and click `Connect via USB`.

Advanced path:

1. Fill in `wifiSsid`, `wifiPassword`, `serverBaseUrl`, and `plantId` in [`plant-platform-sensor.cpp`](./plant-platform-sensor.cpp).
2. Upload that sketch.
3. The ESP32 will keep emitting raw values on serial and will also POST raw values straight to the deployed Plant Platform whenever Wi-Fi is connected.

If any of the network values are left empty in [`plant-platform-sensor.cpp`](./plant-platform-sensor.cpp), the board stays in serial-only mode and does not attempt Wi-Fi or HTTP at all.

### Platform behavior

The deployed dashboard supports two input paths:

1. Browser USB: connect a board straight from a plant’s settings modal in a Chromium-based browser.
2. Direct device API: POST raw values to `/api/plants/<uuid>/readings`.

USB-originated readings are mirrored back through the same plant API endpoint so other viewers see the latest updates too.

The platform stores plant metadata plus the latest reading snapshot for each plant. It does not keep a historical readings table.


## Result
![](./assets/Screenshot%202026-03-22%20at%2013.08.33.png)

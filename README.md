## What to install

Install Arduino IDE 2 from Arduino’s official site. 

https://www.arduino.cc/en/software/?utm_source=chatgpt.com

Then install the ESP32 board package in Arduino IDE using Boards Manager. Espressif’s Arduino core is the standard way to program ESP32 boards in Arduino IDE.  ￼

![](./assets/Screenshot%202026-03-21%20at%2011.22.35.png)


![](./assets/Screenshot%202026-03-21%20at%2011.30.34.png)

Add some code: 

```cpp
// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);  // change state of the LED by setting the pin to the HIGH voltage level
  delay(1000);                      // wait for a second
  digitalWrite(LED_BUILTIN, LOW);   // change state of the LED by setting the pin to the LOW voltage level
  delay(1000);                      // wait for a second
}
```

1. Click Upload -button in top left corner
3. You should now see the ESP32 blink blue!
 

If upload fails/board doesn't blink blue, scream for help!

## Connecting the dots
Wire diagram
![](./assets/My%20First%20Board%20-%20Frame%201.jpg)

![](./assets/My%20First%20Board%20-%20Frame%202.jpg)

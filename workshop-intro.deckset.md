slidenumbers: true
autoscale: true
build-lists: true

# Plant Moisture Sensor Workshop
## A short intro before we start building

---

# What we're doing today

- Build a simple moisture sensor setup
- Upload code to an ESP32
- Read values from the sensor
- See those values show up in software and make it into something useful

---

# The main parts

- A probe that goes into the soil
- A sensor board connected to the probe
- An ESP32 that runs the code
- A few wires to connect everything together


---

# Four useful terms

- `3.3V`: power for the sensor board
- `GND`: the shared reference point between the sensor board and the ESP32
- `Analog`: a changing signal, not just on or off, in contrast to a digital signal
- `Serial Monitor`: the place where we can inspect what the board is doing

Without a shared `GND`, the ESP32 can't reliably interpret the sensor's output.

---

# What kind of value we get

- The board does not know "healthy plant" or "too dry"
- It only reads a raw number
- That number changes as the soil gets wetter or drier
- Caps out at 4095 (dry) and the lower it is the wetter the soil

---

# Arduino in one ~~minute~~ second

- `setup()` runs once when the board starts
- `loop()` runs over and over
    - `analogRead()` reads the sensor
    - `Serial.println()` lets us see the result


---

# How to work through the workshop

1. Get the board connected
2. Upload something simple first
3. Add the wiring
4. Check the sensor values
5. Only then move on to the dashboard part


---

# When things go wrong

- No signs of life: check power and ground
- Strange text in Serial Monitor: check the baud rate
- Values never change: check the wiring and probe connection
- Upload fails: check the selected board, port, and cable


---

---

# Two ways through the workshop

- `guided.md` if you want the direct path
- `unguided.md` if you want to figure out a bit more yourself

Both end at the same result.

---

# ✨ Let's get started ✨

![inline](assets/qr.png)

#### https://github.com/Markusdreyer/plant-workshop
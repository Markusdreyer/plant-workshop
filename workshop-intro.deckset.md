slidenumbers: true
autoscale: true
build-lists: true

# Plant Moisture Sensor Workshop
## From hardware to a shared live dashboard

---

# What we're doing

- Build a simple soil moisture sensor setup
- Solder and connect the hardware
- Upload code to an ESP32
- Watch raw readings come in on a shared UI
- Learn just enough electronics and embedded workflow to be dangerous

---

# What we'll cover

- Super basic electronics
- The embedded software dev cycle
- Arduino and ESP32 basics
- Soldering basics and safety
- The UI and how readings get there

---

# Electronics: the short version

- The board powers the circuit
- The sensor gives us a changing analog signal
- The ESP32 reads that signal as a raw number
- Dry and wet are ranges of high/low voltage

---

# A few terms

- `3.3V`: power for the sensor and board logic
- `GND`: the common return path, shared understanding of what zero is
- `Analog input`: where the board reads a changing voltage level (how wet)
- `Digital input`: Not used in this workshop, but is basically a binary reading (wet/dry)
- `Raw reading`: the number we get before turning it into a moisture percentage

---

# Embedded dev cycle

1. Change the sketch
2. Upload it to the board
3. Open Serial Monitor
4. Look at the output
5. Adjust code or wiring
6. Repeat

---

# Arduino mental model

- `setup()` runs once when the board starts
- `loop()` runs again and again forever
- `analogRead()` reads the sensor
- `Serial.println()` lets us see what the board is doing
- The serial monitor is your first debugging tool

---

# Soldering basics
- Heat the pad and the component leg together
- Feed solder into the joint, not onto the iron tip
    - But can be helpful at times
- Less is more

--- 
# Soldering basics

![inline](/Users/markusdreyer/Downloads/Lemljenje_01_2.webp)

---

# Safety

- The iron is hot even when it looks harmless
- Put it back in the stand when not in use
- Try not to breathe in fumes
- Safety glasses are available
- If something feels wrong, stop and ask for help

---

# What the UI does

- Shows the latest moisture reading for each plant
- Lets us see the readings without everyone building their own local setup first
- Keeps the workshop moving faster for less technical participants
- Still gives the raw numbers to the software so calibration stays flexible

---

# Two ways readings can reach the UI

- `USB`: easiest path during the workshop
- `API`: advanced path for boards posting directly over the network

Both paths end up on the same shared page.

---

# Why we do it this way

- Not everyone needs to install the full local dev toolchain
- Most people can focus on hardware, upload, and serial feedback
- The shared page gives immediate payoff
- Anyone who wants extra challenge can still run the UI themselves

Everyone will get access to the repo.

---

# Let's build

- Start simple
- Get one thing working at a time
- Not everyone can solder at once
- Check out the README.md for guidance


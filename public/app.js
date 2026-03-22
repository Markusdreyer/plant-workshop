(function () {
  const STORAGE_KEY = "plant-moisture-wet-value";
  const GAUGE_RADIUS = 92;
  const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
  const SERIAL_BAUD_RATE = 115200;
  const FEED_ACTIVITY_WINDOW_MS = 4000;

  const elements = {
    debugLog: document.querySelector("#debug-log"),
    feedStatus: document.querySelector("#feed-status"),
    gaugeProgress: document.querySelector("#gauge-progress"),
    moisturePercent: document.querySelector("#moisture-percent"),
    moistureStatus: document.querySelector("#moisture-status"),
    rawValue: document.querySelector("#raw-value"),
    readingSource: document.querySelector("#reading-source"),
    serialButton: document.querySelector("#serial-button"),
    transportStatus: document.querySelector("#transport-status"),
    updatedAt: document.querySelector("#updated-at"),
    wetSlider: document.querySelector("#wet-value"),
    wetThreshold: document.querySelector("#wet-threshold"),
    wetValueOutput: document.querySelector("#wet-value-output")
  };

  const state = {
    animationFrame: null,
    currentPercent: 0,
    debugEntries: [],
    feedActivityTimer: null,
    feedConnected: false,
    feedStatusMode: "standby",
    latestReading: null,
    serialBuffer: "",
    serialBusy: false,
    serialDisconnectPromise: null,
    serialPort: null,
    serialReadLoopPromise: null,
    serialReader: null,
    targetPercent: 0,
    wetValue: 1500,
    calibration: {
      defaultWetValue: 1500,
      dryValue: 4095,
      wetValueRange: {
        min: 500,
        max: 2049
      }
    }
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatDebugValue(value) {
    if (value instanceof Error) {
      return JSON.stringify({
        message: value.message,
        name: value.name
      });
    }

    if (typeof value === "string") {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function logDebug(message, details) {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const parts = [`[${timestamp}]`, message];

    if (typeof details !== "undefined") {
      parts.push(formatDebugValue(details));
    }

    const line = parts.join(" ");

    state.debugEntries.push(line);

    if (state.debugEntries.length > 120) {
      state.debugEntries.shift();
    }

    elements.debugLog.textContent = state.debugEntries.join("\n");
    elements.debugLog.scrollTop = elements.debugLog.scrollHeight;
    console.log(line);
  }

  function setSerialBusy(isBusy) {
    state.serialBusy = isBusy;
    elements.serialButton.disabled = isBusy;
  }

  function clearFeedActivityTimer() {
    if (!state.feedActivityTimer) {
      return;
    }

    window.clearTimeout(state.feedActivityTimer);
    state.feedActivityTimer = null;
  }

  function setFeedStatus(mode) {
    const labels = {
      connected: "Waiting for readings",
      live: "API live",
      standby: "API standby",
      reconnecting: "API reconnecting",
      offline: "API offline",
      "config-failed": "Config failed"
    };
    const nextMode = labels[mode] ? mode : "standby";

    state.feedStatusMode = nextMode;
    elements.feedStatus.dataset.state = nextMode;
    elements.feedStatus.textContent = labels[nextMode];
  }

  function markFeedActivity() {
    if (!state.feedConnected) {
      return;
    }

    clearFeedActivityTimer();
    setFeedStatus("live");
    state.feedActivityTimer = window.setTimeout(function () {
      state.feedActivityTimer = null;

      if (state.feedConnected) {
        setFeedStatus("connected");
      }
    }, FEED_ACTIVITY_WINDOW_MS);
  }

  function resetSerialUi(statusText) {
    state.serialBuffer = "";
    elements.serialButton.textContent = "Connect via USB";
    elements.transportStatus.textContent = statusText;
  }

  function sanitizeWetValue(value) {
    const numericValue = Number(value);
    const min = state.calibration.wetValueRange.min;
    const max = state.calibration.wetValueRange.max;

    if (!Number.isFinite(numericValue)) {
      return state.calibration.defaultWetValue;
    }

    return clamp(Math.round(numericValue), min, max);
  }

  function calculatePercent(rawValue, wetValue) {
    const numericRawValue = Number(rawValue);

    if (!Number.isFinite(numericRawValue)) {
      return 0;
    }

    const clampedRawValue = clamp(
      Math.round(numericRawValue),
      0,
      state.calibration.dryValue
    );
    const normalizedWetValue = sanitizeWetValue(wetValue);
    const range = state.calibration.dryValue - normalizedWetValue;

    if (range <= 0) {
      return clampedRawValue <= normalizedWetValue ? 100 : 0;
    }

    return clamp(
      ((state.calibration.dryValue - clampedRawValue) / range) * 100,
      0,
      100
    );
  }

  function describeMoisture(percent) {
    if (!state.latestReading) {
      return "Waiting for reading";
    }

    if (percent < 25) {
      return "Dry";
    }

    if (percent < 60) {
      return "Comfortable";
    }

    return "Wet";
  }

  function interpolate(start, end, progress) {
    return start + (end - start) * progress;
  }

  function gaugeColor(percent) {
    const progress = clamp(percent / 100, 0, 1);
    const hue = interpolate(18, 154, progress);
    const saturation = interpolate(85, 62, progress);
    const lightness = interpolate(58, 42, progress);

    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  function gaugeColorSoft(percent) {
    const progress = clamp(percent / 100, 0, 1);
    const hue = interpolate(18, 154, progress);
    const saturation = interpolate(86, 62, progress);
    const lightness = interpolate(58, 52, progress);

    return `hsl(${hue} ${saturation}% ${lightness}% / 0.16)`;
  }

  function backgroundWarmColor(percent) {
    const progress = clamp(percent / 100, 0, 1);
    const hue = interpolate(33, 78, progress);
    const saturation = interpolate(100, 70, progress);
    const lightness = interpolate(84, 80, progress);

    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  function backgroundCoolColor(percent) {
    const progress = clamp(percent / 100, 0, 1);
    const hue = interpolate(188, 164, progress);
    const saturation = interpolate(69, 48, progress);
    const lightness = interpolate(82, 78, progress);

    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  function blobWarmColor(percent) {
    const progress = clamp(percent / 100, 0, 1);
    const hue = interpolate(24, 110, progress);
    const saturation = interpolate(100, 48, progress);
    const lightness = interpolate(71, 66, progress);

    return `hsl(${hue} ${saturation}% ${lightness}% / 0.44)`;
  }

  function blobCoolColor(percent) {
    const progress = clamp(percent / 100, 0, 1);
    const hue = interpolate(178, 158, progress);
    const saturation = interpolate(62, 42, progress);
    const lightness = interpolate(64, 60, progress);

    return `hsl(${hue} ${saturation}% ${lightness}% / 0.36)`;
  }

  function sourceLabel(source) {
    if (!source) {
      return "--";
    }

    if (source === "usb-serial") {
      return "USB serial";
    }

    if (source === "esp32-wifi") {
      return "ESP32 Wi-Fi";
    }

    if (source === "api") {
      return "API";
    }

    return source.replace(/[-_]/g, " ");
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) {
      return "--";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "--";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function updateTheme(percent) {
    const accent = gaugeColor(percent);
    const accentSoft = gaugeColorSoft(percent);

    document.documentElement.style.setProperty("--gauge-accent", accent);
    document.documentElement.style.setProperty("--gauge-soft", accentSoft);
    document.documentElement.style.setProperty(
      "--gauge-deep",
      gaugeColor(clamp(percent + 12, 0, 100))
    );
    document.documentElement.style.setProperty("--bg-top-left", backgroundWarmColor(percent));
    document.documentElement.style.setProperty("--bg-bottom-right", backgroundCoolColor(percent));
    document.documentElement.style.setProperty("--blob-warm", blobWarmColor(percent));
    document.documentElement.style.setProperty("--blob-cool", blobCoolColor(percent));
    elements.gaugeProgress.style.stroke = accent;
  }

  function renderGauge(percent) {
    const normalizedPercent = clamp(percent, 0, 100);
    const dashOffset =
      GAUGE_CIRCUMFERENCE -
      (GAUGE_CIRCUMFERENCE * normalizedPercent) / 100;

    elements.gaugeProgress.style.strokeDasharray = `${GAUGE_CIRCUMFERENCE}`;
    elements.gaugeProgress.style.strokeDashoffset = `${dashOffset}`;
    elements.moisturePercent.textContent = `${Math.round(normalizedPercent)}%`;
    elements.moistureStatus.textContent = describeMoisture(state.targetPercent);
    updateTheme(normalizedPercent);
  }

  function animateToPercent(nextPercent) {
    if (state.animationFrame) {
      cancelAnimationFrame(state.animationFrame);
    }

    const startPercent = state.currentPercent;
    const endPercent = nextPercent;
    const startTime = performance.now();
    const duration = 700;

    function step(now) {
      const elapsed = now - startTime;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      state.currentPercent = interpolate(startPercent, endPercent, eased);
      renderGauge(state.currentPercent);

      if (progress < 1) {
        state.animationFrame = requestAnimationFrame(step);
      } else {
        state.animationFrame = null;
      }
    }

    state.animationFrame = requestAnimationFrame(step);
  }

  function updateReadingCards() {
    if (!state.latestReading) {
      elements.rawValue.textContent = "--";
      elements.updatedAt.textContent = "--";
      elements.readingSource.textContent = "--";
      elements.moistureStatus.textContent = "Waiting for reading";
      return;
    }

    elements.rawValue.textContent = `${state.latestReading.rawValue}`;
    elements.updatedAt.textContent = formatTimestamp(state.latestReading.receivedAt);
    elements.readingSource.textContent = sourceLabel(state.latestReading.source);
  }

  function refreshDerivedState() {
    const nextPercent = state.latestReading
      ? calculatePercent(state.latestReading.rawValue, state.wetValue)
      : 0;

    state.targetPercent = nextPercent;
    animateToPercent(nextPercent);
    updateReadingCards();
  }

  function setWetValue(value) {
    state.wetValue = sanitizeWetValue(value);
    elements.wetSlider.value = `${state.wetValue}`;
    elements.wetThreshold.textContent = `${state.wetValue}`;
    elements.wetValueOutput.textContent = `${state.wetValue}`;
    localStorage.setItem(STORAGE_KEY, `${state.wetValue}`);
    refreshDerivedState();
  }

  function applyReading(reading) {
    if (!reading || typeof reading.rawValue === "undefined") {
      return;
    }

    state.latestReading = {
      rawValue: Number(reading.rawValue),
      receivedAt: reading.receivedAt || new Date().toISOString(),
      source: reading.source || "api"
    };
    refreshDerivedState();
  }

  async function postReading(rawValue, source) {
    try {
      const response = await fetch("/api/readings", {
        body: JSON.stringify({
          rawValue,
          source
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      logDebug("Posted reading to API", {
        rawValue,
        source,
        status: response.status
      });
    } catch (error) {
      logDebug("Posting reading to API failed", error);
      setFeedStatus("offline");
    }
  }

  function parseRawValue(line) {
    const trimmed = line.trim();

    if (!trimmed) {
      return null;
    }

    const plainNumberMatch = trimmed.match(/^(\d{1,4})$/);

    if (plainNumberMatch) {
      logDebug("Parsed plain serial line", trimmed);
      return Number(plainNumberMatch[1]);
    }

    const legacyMatch = trimmed.match(/Raw analog:\s*(\d{1,4})/i);

    if (legacyMatch) {
      logDebug("Parsed legacy serial line", trimmed);
      return Number(legacyMatch[1]);
    }

    const rawValueMatch = trimmed.match(/Raw value:\s*(\d{1,4})/i);

    if (rawValueMatch) {
      logDebug("Parsed raw-value serial line", trimmed);
      return Number(rawValueMatch[1]);
    }

    const jsonMatch = trimmed.match(/"rawValue"\s*:\s*(\d{1,4})/i);

    if (jsonMatch) {
      logDebug("Parsed JSON serial line", trimmed);
      return Number(jsonMatch[1]);
    }

    logDebug("Ignored serial line", trimmed);

    return null;
  }

  function handleSerialLine(line) {
    const rawValue = parseRawValue(line);

    if (rawValue === null) {
      return;
    }

    const reading = {
      rawValue,
      receivedAt: new Date().toISOString(),
      source: "usb-serial"
    };

    logDebug("Applying USB reading", reading);
    elements.transportStatus.textContent = "USB streaming";
    applyReading(reading);
    void postReading(rawValue, "usb-serial");
  }

  async function disconnectSerial(reason) {
    if (state.serialDisconnectPromise) {
      return state.serialDisconnectPromise;
    }

    const port = state.serialPort;
    const reader = state.serialReader;

    if (!port && !state.serialReadLoopPromise) {
      resetSerialUi("USB ready");
      return;
    }

    logDebug("Disconnecting USB serial", {
      reason: reason || "user-request"
    });
    setSerialBusy(true);
    elements.transportStatus.textContent = "USB disconnecting";

    state.serialPort = null;

    state.serialDisconnectPromise = (async function () {
      if (reader) {
        try {
          await reader.cancel();
          logDebug("Serial reader cancel requested");
        } catch (error) {
          logDebug("Serial reader cancel failed", error);
        }
      }

      if (state.serialReadLoopPromise) {
        try {
          await state.serialReadLoopPromise;
        } catch (error) {
          logDebug("Serial read loop ended during disconnect", error);
        }
      }

      if (port) {
        try {
          await port.close();
          logDebug("USB port closed");
        } catch (error) {
          logDebug("USB port close failed", error);
        }
      }

      state.serialReader = null;
      state.serialReadLoopPromise = null;
      resetSerialUi("USB ready");
    })().finally(function () {
      state.serialDisconnectPromise = null;
      setSerialBusy(false);
    });

    return state.serialDisconnectPromise;
  }

  async function readSerialLoop(port) {
    const decoder = new TextDecoder();

    logDebug("Starting serial read loop");

    while (state.serialPort === port && port.readable) {
      const reader = port.readable.getReader();
      state.serialReader = reader;
      logDebug("Serial reader lock acquired");

      try {
        while (true) {
          const result = await reader.read();

          if (result.done) {
            break;
          }

          state.serialBuffer += decoder.decode(result.value, {
            stream: true
          });

          const lines = state.serialBuffer.split(/\r?\n/);
          state.serialBuffer = lines.pop() || "";

          for (const line of lines) {
            logDebug("Serial line received", line);
            handleSerialLine(line);
          }
        }
      } catch (error) {
        logDebug("Serial read failed", error);
        if (error.name !== "AbortError") {
          elements.transportStatus.textContent = "USB error";
        }
      } finally {
        if (state.serialReader === reader) {
          state.serialReader = null;
        }

        try {
          logDebug("Serial reader lock released");
          reader.releaseLock();
        } catch (error) {
          logDebug("Serial reader release failed", error);
        }
      }
    }

    logDebug("Serial read loop ended");

    if (state.serialPort === port) {
      state.serialPort = null;

      try {
        await port.close();
        logDebug("USB port closed after read loop ended");
      } catch (error) {
        logDebug("USB port close after read loop failed", error);
      }

      resetSerialUi("USB disconnected");
    }
  }

  async function toggleSerialConnection() {
    logDebug("Connect button clicked");

    if (state.serialBusy) {
      logDebug("Ignoring USB button click while a serial transition is active");
      return;
    }

    if (!("serial" in navigator)) {
      logDebug("Web Serial API is unavailable in this browser");
      elements.transportStatus.textContent = "Web Serial unsupported";
      return;
    }

    if (state.serialPort) {
      await disconnectSerial("user-request");
      return;
    }

    try {
      setSerialBusy(true);
      const knownPorts = await navigator.serial.getPorts();
      logDebug("Known serial ports before chooser", {
        count: knownPorts.length
      });
      elements.transportStatus.textContent = "USB selecting";
      logDebug("Opening USB chooser");
      state.serialPort = await navigator.serial.requestPort();
      logDebug("USB port selected");
      elements.transportStatus.textContent = "USB opening";
      logDebug("Opening selected port", {
        baudRate: SERIAL_BAUD_RATE
      });
      await state.serialPort.open({
        baudRate: SERIAL_BAUD_RATE
      });

      logDebug("USB port opened successfully");
      elements.serialButton.textContent = "Disconnect USB";
      elements.transportStatus.textContent = "USB connected";
      state.serialReadLoopPromise = readSerialLoop(state.serialPort).finally(function () {
        state.serialReadLoopPromise = null;
      });
    } catch (error) {
      logDebug("USB serial connection failed", error);
      state.serialPort = null;
      if (error && error.name === "NotFoundError") {
        elements.transportStatus.textContent = "USB selection cancelled";
        return;
      }

      if (error && error.name === "NetworkError") {
        logDebug(
          "Likely fix: close Arduino Serial Monitor, Serial Plotter, or any other app using the port"
        );
        elements.transportStatus.textContent = "USB busy, close serial monitor";
        return;
      }

      if (error && error.name === "InvalidStateError") {
        elements.transportStatus.textContent = "USB already open";
        return;
      }

      if (error && error.name === "SecurityError") {
        elements.transportStatus.textContent = "USB blocked by browser";
        return;
      }

      elements.transportStatus.textContent = "USB failed";
    } finally {
      setSerialBusy(false);
    }
  }

  function subscribeToEvents() {
    const eventSource = new EventSource("/api/events");
    logDebug("Connecting to SSE feed");

    eventSource.addEventListener("open", function () {
      state.feedConnected = true;
      logDebug("SSE connection opened");
      clearFeedActivityTimer();
      setFeedStatus("connected");
    });

    eventSource.addEventListener("snapshot", function (event) {
      const payload = JSON.parse(event.data);
      logDebug("SSE snapshot received", {
        hasReading: Boolean(payload && payload.reading)
      });

      if (payload && payload.reading && !state.serialPort) {
        applyReading(payload.reading);
      }
    });

    eventSource.addEventListener("reading", function (event) {
      const payload = JSON.parse(event.data);
      logDebug("SSE reading received", payload && payload.reading);

      if (payload && payload.reading) {
        markFeedActivity();
      }

      if (payload && payload.reading && !state.serialPort) {
        applyReading(payload.reading);
      }
    });

    eventSource.addEventListener("error", function () {
      state.feedConnected = false;
      clearFeedActivityTimer();
      logDebug("SSE connection error");
      setFeedStatus("reconnecting");
    });
  }

  async function loadConfig() {
    const response = await fetch("/api/config");
    const config = await response.json();
    logDebug("Loaded calibration config", config);

    state.calibration = config;
    elements.wetSlider.min = `${config.wetValueRange.min}`;
    elements.wetSlider.max = `${config.wetValueRange.max}`;
    elements.wetSlider.step = "1";
  }

  async function loadLatestReading() {
    const response = await fetch("/api/readings/latest");
    const payload = await response.json();
    logDebug("Loaded latest reading", payload && payload.reading);

    if (payload && payload.reading) {
      applyReading(payload.reading);
    }
  }

  async function init() {
    logDebug("App boot", {
      hasSerial: "serial" in navigator,
      isSecureContext: window.isSecureContext,
      origin: window.location.origin,
      userAgent: navigator.userAgent
    });
    renderGauge(0);
    elements.serialButton.addEventListener("click", function () {
      void toggleSerialConnection();
    });

    elements.wetSlider.addEventListener("input", function (event) {
      setWetValue(event.target.value);
    });

    try {
      await loadConfig();
    } catch (error) {
      setFeedStatus("config-failed");
    }

    const storedWetValue = localStorage.getItem(STORAGE_KEY);
    logDebug("Loaded stored wet threshold", storedWetValue);
    setWetValue(storedWetValue || state.calibration.defaultWetValue);
    subscribeToEvents();

    if ("serial" in navigator && typeof navigator.serial.addEventListener === "function") {
      navigator.serial.addEventListener("connect", function () {
        logDebug("Browser detected serial device connect event");
      });

      navigator.serial.addEventListener("disconnect", function () {
        logDebug("Browser detected serial device disconnect event");

        if (state.serialPort && !state.serialDisconnectPromise) {
          void disconnectSerial("device-disconnect-event");
        }
      });
    }

    try {
      await loadLatestReading();
    } catch (error) {
      setFeedStatus("offline");
    }
  }

  init();
})();

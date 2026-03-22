const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const {
  DEFAULT_WET_VALUE,
  buildReading,
  calibrationConfig,
  decorateReading,
  sanitizeWetValue
} = require("./lib/moisture");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

let latestReading = null;
const eventClients = new Set();

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);

  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });

  response.end(body);
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, {
    error: message
  });
}

function getState(wetValue = DEFAULT_WET_VALUE) {
  const normalizedWetValue = sanitizeWetValue(wetValue);

  return {
    calibration: calibrationConfig(),
    reading: decorateReading(latestReading, normalizedWetValue),
    selectedWetValue: normalizedWetValue
  };
}

function broadcast(eventName, payload) {
  const message =
    `event: ${eventName}\n` +
    `data: ${JSON.stringify(payload)}\n\n`;

  for (const client of eventClients) {
    client.write(message);
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Body must be valid JSON"));
      }
    });

    request.on("error", reject);
  });
}

async function serveStaticAsset(requestPath, response) {
  const requestedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    sendError(response, 403, "Forbidden");
    return true;
  }

  try {
    const fileContents = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType =
      MIME_TYPES[extension] || "application/octet-stream";

    response.writeHead(200, {
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600",
      "Content-Length": fileContents.byteLength,
      "Content-Type": contentType
    });
    response.end(fileContents);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

const server = http.createServer(async (request, response) => {
  const requestHost = request.headers.host || `localhost:${PORT}`;
  const requestUrl = new URL(request.url, `http://${requestHost}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Origin": "*"
    });
    response.end();
    return;
  }

  if (requestUrl.pathname === "/api/config" && request.method === "GET") {
    sendJson(response, 200, calibrationConfig());
    return;
  }

  if (requestUrl.pathname === "/api/readings/latest" && request.method === "GET") {
    const wetValue = requestUrl.searchParams.get("wetValue");

    sendJson(response, 200, getState(wetValue || DEFAULT_WET_VALUE));
    return;
  }

  if (requestUrl.pathname === "/api/readings" && request.method === "POST") {
    try {
      const payload = await readRequestBody(request);
      const reading = buildReading(payload.rawValue, {
        receivedAt: payload.receivedAt,
        source: payload.source || "api"
      });

      if (!reading) {
        sendError(response, 422, "`rawValue` must be a number");
        return;
      }

      latestReading = reading;
      const state = getState(payload.wetValue || DEFAULT_WET_VALUE);

      broadcast("reading", state);
      sendJson(response, 201, state, {
        Location: "/api/readings/latest"
      });
    } catch (error) {
      sendError(response, 400, error.message);
    }

    return;
  }

  if (requestUrl.pathname === "/api/events" && request.method === "GET") {
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8"
    });

    response.write("\n");
    eventClients.add(response);
    response.write(`event: snapshot\ndata: ${JSON.stringify(getState())}\n\n`);

    request.on("close", () => {
      eventClients.delete(response);
    });

    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    sendError(response, 404, "API route not found");
    return;
  }

  try {
    const served = await serveStaticAsset(requestUrl.pathname, response);

    if (!served) {
      sendError(response, 404, "Not found");
    }
  } catch (error) {
    sendError(response, 500, error.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Plant moisture app listening on http://localhost:${PORT}`);
});

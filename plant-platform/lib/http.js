const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store"
};

export function json(payload, init = {}) {
  const headers = new Headers(init.headers || {});

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return Response.json(payload, {
    ...init,
    headers
  });
}

export function error(message, status = 400, extra = {}) {
  return json(
    {
      error: message,
      ...extra
    },
    {
      status
    }
  );
}

export function empty(status = 204) {
  return new Response(null, {
    status,
    headers: CORS_HEADERS
  });
}

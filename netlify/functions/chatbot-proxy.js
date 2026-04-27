export const handler = async (event) => {
  const { API_URL, ALLOWED_ORIGINS } = process.env;

  if (!API_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API_URL not configured" })
    };
  }

  /* ---------- Require API key ---------- */
  const params = new URLSearchParams(event.queryStringParameters || {});
  const apiKey = params.get("apikey");

  if (!apiKey) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: "Missing apikey"
      })
    };
  }

  /* ---------- CORS ---------- */
  const allowedOrigins = ALLOWED_ORIGINS
    ? ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : [];

  const origin = event.headers.origin || "";
  const corsOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  /* ---------- Preflight ---------- */
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Only GET supported" })
    };
  }

  /* ---------- Proxy request ---------- */
  try {
    const url = `${API_URL}?${params.toString()}`;

    const response = await fetch(url);
    const text = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      body: text
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: true,
        message: "Proxy call to SFMC failed",
        details: err.message
      })
    };
  }
};
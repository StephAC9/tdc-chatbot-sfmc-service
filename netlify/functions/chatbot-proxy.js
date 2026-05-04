export const handler = async (event) => {
  const { API_URL, ALLOWED_ORIGINS } = process.env;

  const origin = event.headers.origin || "";

  const allowedOrigins = ALLOWED_ORIGINS
    ? ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : [];

  const isAllowedOrigin = allowedOrigins.includes(origin);

  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };

  /* ✅ 1. ALWAYS allow OPTIONS */
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: isAllowedOrigin ? 200 : 403,
      headers: corsHeaders,
      body: ""
    };
  }

  /* ✅ 2. Block disallowed origins (WITH headers) */
  if (!isAllowedOrigin) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Origin not allowed" })
    };
  }

  /* ✅ 3. Validate method */
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Only GET supported" })
    };
  }

  /* ✅ 4. Validate API key (AFTER OPTIONS) */
  const params = new URLSearchParams(event.queryStringParameters || {});
  const apiKey = params.get("apikey");

  if (!apiKey) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing apikey" })
    };
  }

  /* ✅ 5. Proxy to SFMC */
  try {
    const response = await fetch(`${API_URL}?${params.toString()}`);
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


/*export const handler = async (event) => {
  const { API_URL, ALLOWED_ORIGINS } = process.env;

  if (!API_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API_URL not configured" })
    };
  }

  
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
};*/
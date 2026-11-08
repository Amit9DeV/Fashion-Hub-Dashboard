const IS_PROD = process.env.NODE_ENV === "production";

// Fields to scrub from logged bodies
const SENSITIVE_KEYS = new Set(["password", "passwordHash", "token", "secret", "authorization"]);

function scrub(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "***" : v;
  }
  return clean;
}

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, body, query } = req;

  // In production, only log the request line (no bodies — PII risk)
  if (!IS_PROD) {
    const cleanBody = scrub(body);
    console.log(`\n---------------------------------------------------------`);
    console.log(`[--> ] ${method} ${originalUrl}`);
    if (query && typeof query === "object" && Object.keys(query).length > 0) {
      console.log(`       Query:`, JSON.stringify(query));
    }
    if (cleanBody && typeof cleanBody === "object" && Object.keys(cleanBody).length > 0) {
      const bodyStr = JSON.stringify(cleanBody);
      console.log(`       Body:`, bodyStr.length > 300 ? bodyStr.slice(0, 300) + "… (truncated)" : bodyStr);
    }
  }

  const oldSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 400 ? "\x1b[31m" : "\x1b[32m";
    const resetColor = "\x1b[0m";

    if (IS_PROD) {
      // Minimal structured log for production (no PII in body)
      if (status >= 400) {
        console.error(`[${statusColor}${status}${resetColor}] ${method} ${originalUrl} (${duration}ms)`);
      } else {
        console.log(`[${statusColor}${status}${resetColor}] ${method} ${originalUrl} (${duration}ms)`);
      }
    } else {
      console.log(`[<-- ] ${statusColor}${status}${resetColor} | ${duration}ms | ${method} ${originalUrl}`);
      try {
        if (Buffer.isBuffer(data)) {
          console.log(`       Response: [Buffer: ${data.length} bytes]`);
        } else {
          const parsed = typeof data === "string" ? JSON.parse(data) : data;
          const resStr = JSON.stringify(parsed);
          console.log(`       Response:`, resStr.length > 400 ? resStr.slice(0, 400) + "… (truncated)" : resStr);
        }
      } catch {
        console.log(`       Response: [Non-JSON]`);
      }
      console.log(`---------------------------------------------------------\n`);
    }

    res.send = oldSend;
    return res.send(data);
  };

  next();
};

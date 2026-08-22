export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, body, query } = req;
  
  // Clone body to avoid mutating the actual request
  const cleanBody = { ...body };
  // Hide sensitive fields
  if (cleanBody.password) cleanBody.password = '***';
  if (cleanBody.token) cleanBody.token = '***';

  console.log(`\n---------------------------------------------------------`);
  console.log(`[-->] ${method} ${originalUrl}`);
  if (Object.keys(query).length > 0) {
    console.log(`      Query:`, JSON.stringify(query));
  }
  if (Object.keys(cleanBody).length > 0) {
    console.log(`      Body:`, JSON.stringify(cleanBody));
  }

  // Intercept the response to log it
  const oldSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Status color (basic logic for terminal)
    const statusColor = status >= 400 ? "\x1b[31m" : "\x1b[32m"; // Red for errors, Green for success
    const resetColor = "\x1b[0m";

    console.log(`[<--] ${statusColor}${status}${resetColor} | ${duration}ms | ${method} ${originalUrl}`);
    
    // Attempt to parse and cleanly log the response data
    try {
      if (Buffer.isBuffer(data)) {
        console.log(`      Response: [Buffer Data: ${data.length} bytes]`);
      } else {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const resString = JSON.stringify(parsed);
        const cleanRes = resString.length > 500 ? resString.substring(0, 500) + '... (truncated for clean logs)' : resString;
        console.log(`      Response:`, cleanRes);
      }
    } catch(e) {
      console.log(`      Response: [Non-JSON or Binary Data]`);
    }
    console.log(`---------------------------------------------------------\n`);

    // Call the original send function
    res.send = oldSend;
    return res.send(data);
  };

  next();
};

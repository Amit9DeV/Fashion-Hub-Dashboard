import jwt from 'jsonwebtoken';

const COOKIE_NAME = "fashion_hub_session";
const PRIMARY_SECRET =
  process.env.AUTH_SECRET || "replace-with-a-long-random-secret-at-least-32-characters";
const KNOWN_SECRETS = [
  PRIMARY_SECRET,
  "replace-with-a-long-random-secret-at-least-32-characters",
  "default-fallback-secret-key-that-is-at-least-32-chars-long",
];

const IS_PROD =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  Boolean(process.env.RENDER_EXTERNAL_URL);

export function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME] || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  let payload = null;
  for (const secret of KNOWN_SECRETS) {
    try {
      payload = jwt.verify(token, secret);
      break;
    } catch (e) {
      // try next secret
    }
  }

  if (!payload) {
    return res.status(401).json({ success: false, message: "Invalid session" });
  }

  req.user = {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
  next();
}

export function createSession(res, user) {
  const token = jwt.sign(
    {
      sub: (user._id || user.id).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    PRIMARY_SECRET,
    { expiresIn: '12h' }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    // In production (HTTPS) use secure + sameSite:none for cross-origin cookies.
    // In local dev (HTTP) these flags cause browsers to silently reject the cookie.
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path: "/",
    maxAge: 12 * 60 * 60 * 1000, // 12 hours in ms
  });

  return token;
}

export function clearSession(res) {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });
}

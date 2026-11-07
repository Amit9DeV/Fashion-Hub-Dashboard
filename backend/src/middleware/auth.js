import jwt from 'jsonwebtoken';

const COOKIE_NAME = "fashion_hub_session";

function getPrimarySecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is not set. " +
      "Generate a secure secret: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\" " +
      "and add it to your .env file."
    );
  }
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long.");
  }
  return secret;
}

const IS_PROD =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  Boolean(process.env.RENDER_EXTERNAL_URL);

export function requireAuth(req, res, next) {
  const token =
    req.cookies[COOKIE_NAME] ||
    req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  let payload = null;
  try {
    payload = jwt.verify(token, getPrimarySecret());
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }

  if (!payload?.sub) {
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
  const secret = getPrimarySecret();
  const token = jwt.sign(
    {
      sub: (user._id || user.id).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn: "12h" }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path: "/",
    maxAge: 12 * 60 * 60 * 1000,
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

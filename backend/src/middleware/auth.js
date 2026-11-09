import jwt from 'jsonwebtoken';
import connectToDatabase from '../config/db.js';
import User from '../models/User.js';

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

function isProduction() {
  return process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    Boolean(process.env.RENDER_EXTERNAL_URL);
}

export async function requireAuth(req, res, next) {
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

  try {
    await connectToDatabase();
    const user = await User.findById(payload.sub).select("name email role active sessionVersion").lean();
    if (!user || !user.active || (payload.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
      return res.status(401).json({ success: false, message: "Session is no longer valid. Please sign in again." });
    }
    req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have access to this action." });
    }
    next();
  };
}

export function createSession(res, user) {
  const secret = getPrimarySecret();
  const token = jwt.sign(
    {
      sub: (user._id || user.id).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion || 0,
    },
    secret,
    { expiresIn: "12h" }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60 * 1000,
  });

  return token;
}

export function clearSession(res) {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

import jwt from 'jsonwebtoken';

const COOKIE_NAME = "fashion_hub_session";

export function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME] || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.AUTH_SECRET);
    req.user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid session" });
  }
}

export function createSession(res, user) {
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.AUTH_SECRET,
    { expiresIn: '12h' }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 12 * 60 * 60 * 1000, // 12 hours in ms
  });

  return token;
}

export function clearSession(res) {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 0,
  });
}

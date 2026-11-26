const jwt = require('jsonwebtoken');

/**
 * Extracts a JWT from either the Authorization Bearer header or the Cookie header.
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const pair of cookies) {
      const [rawName, ...rest] = pair.trim().split('=');
      if (rawName === 'token') {
        return decodeURIComponent(rest.join('='));
      }
    }
  }

  return null;
}

/**
 * Verifies the JWT on protected routes and attaches decoded payload to req.user.
 */
function verifyToken(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Restricts route access to users whose role is in allowedRoles (RBAC).
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    return next();
  };
}

module.exports = {
  extractToken,
  verifyToken,
  authorizeRoles,
};

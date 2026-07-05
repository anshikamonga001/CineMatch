// ============================================================
// middleware/auth.js — JWT Authentication Middleware
// ============================================================
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'cinematch_super_secret_jwt_key_2024';

/**
 * Extract the raw token from an Authorization: Bearer <token> header.
 * Returns null if the header is absent or malformed.
 */
function extractToken(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

/**
 * authenticate — Hard-fail middleware.
 * Returns 401 if no valid JWT is present.
 * Attaches the full user row (minus password) to req.user on success.
 */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    // Fetch fresh user data from DB to catch deactivated accounts
    const rows = await query(
      `SELECT user_id, email, first_name, last_name, country, role, created_at
       FROM users WHERE user_id = ? LIMIT 1`,
      [decoded.user_id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found or account has been removed.' });
    }

    req.user  = rows[0];
    req.token = token;
    next();
  } catch (err) {
    console.error('[authenticate] Unexpected error:', err);
    next(err);
  }
}

/**
 * optionalAuth — Soft-fail middleware.
 * Attaches req.user if a valid JWT is present, otherwise continues
 * without setting req.user (no error is thrown).
 */
async function optionalAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return next(); // Invalid / expired — just ignore
    }

    const rows = await query(
      `SELECT user_id, email, first_name, last_name, country, role, created_at
       FROM users WHERE user_id = ? LIMIT 1`,
      [decoded.user_id]
    );

    if (rows && rows.length > 0) {
      req.user  = rows[0];
      req.token = token;
    }
    next();
  } catch (err) {
    // Don't fail the request — optional auth is best-effort
    console.warn('[optionalAuth] Error:', err.message);
    next();
  }
}

/**
 * requireAdmin — Must be used AFTER authenticate.
 * Returns 403 if the authenticated user is not an admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
}

/**
 * Helper — sign a JWT for a given user row.
 * Exported so controllers can reuse it.
 */
function signToken(user) {
  return jwt.sign(
    {
      user_id:    user.user_id,
      email:      user.email,
      role:       user.role || 'user',
      first_name: user.first_name,
      last_name:  user.last_name,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { authenticate, optionalAuth, requireAdmin, signToken };

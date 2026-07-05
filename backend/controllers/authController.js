// ============================================================
// controllers/authController.js — Authentication & Profile
// ============================================================
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { query } = require('../config/db');
const { signToken } = require('../middleware/auth');

// ── Helper ─────────────────────────────────────────────────
function sendValidationErrors(res, errors) {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
  });
}

// ── register ───────────────────────────────────────────────
/**
 * POST /api/auth/register
 * Body: { email, password, first_name, last_name, country? }
 */
async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationErrors(res, errors);

    const { email, password, first_name, last_name, country = null } = req.body;

    // Check for duplicate e-mail
    const existing = await query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, country)
       VALUES (?, ?, ?, ?, ?)`,
      [email.toLowerCase().trim(), password_hash, first_name.trim(), last_name.trim(), country || null]
    );

    const user_id = result.insertId;

    // Fetch newly created user
    const [newUser] = await query(
      'SELECT user_id, email, first_name, last_name, country, role, created_at FROM users WHERE user_id = ?',
      [user_id]
    );

    const token = signToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: newUser,
    });
  } catch (err) {
    next(err);
  }
}

// ── login ──────────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationErrors(res, errors);

    const { email, password } = req.body;

    // Find user
    const rows = await query(
      'SELECT user_id, email, password_hash, first_name, last_name, country, role, created_at FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Compare password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Build safe user object (exclude password_hash)
    const { password_hash, ...safeUser } = user;

    const token = signToken(safeUser);

    return res.json({
      success: true,
      message: `Welcome back, ${safeUser.first_name}!`,
      token,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
}

// ── getProfile ─────────────────────────────────────────────
/**
 * GET /api/auth/profile
 * Auth required. Returns current user's profile.
 */
async function getProfile(req, res, next) {
  try {
    const rows = await query(
      `SELECT u.user_id, u.email, u.first_name, u.last_name, u.country, u.role, u.created_at,
              COUNT(DISTINCT r.rating_id)  AS total_ratings,
              COUNT(DISTINCT rv.review_id) AS total_reviews,
              COUNT(DISTINCT w.watchlist_id) AS watchlist_count
       FROM users u
       LEFT JOIN ratings r  ON r.user_id  = u.user_id
       LEFT JOIN reviews rv ON rv.user_id = u.user_id
       LEFT JOIN watchlist w ON w.user_id = u.user_id
       WHERE u.user_id = ?
       GROUP BY u.user_id`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ── updateProfile ──────────────────────────────────────────
/**
 * PUT /api/auth/profile
 * Auth required. Body: { first_name?, last_name?, country? }
 */
async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationErrors(res, errors);

    const { first_name, last_name, country } = req.body;
    const userId = req.user.user_id;

    // Build dynamic SET clause — only update provided fields
    const updates = [];
    const params  = [];

    if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name.trim()); }
    if (last_name  !== undefined) { updates.push('last_name = ?');  params.push(last_name.trim()); }
    if (country    !== undefined) { updates.push('country = ?');    params.push(country || null); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(userId);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, params);

    // Return updated profile
    const [updated] = await query(
      'SELECT user_id, email, first_name, last_name, country, role, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    return res.json({ success: true, message: 'Profile updated successfully.', user: updated });
  } catch (err) {
    next(err);
  }
}

// ── changePassword ─────────────────────────────────────────
/**
 * PUT /api/auth/change-password
 * Auth required. Body: { current_password, new_password }
 */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }
    if (new_password.length < 6) {
      return res.status(422).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const rows = await query('SELECT password_hash FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, req.user.user_id]);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getProfile, updateProfile, changePassword };

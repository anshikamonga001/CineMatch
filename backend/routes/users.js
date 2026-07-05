// ============================================================
// routes/users.js — User Routes
// ============================================================
const router = require('express').Router();

const {
  getAllUsers,
  getUserById,
  getUserWatchHistory,
  getUserActivity,
  getUserStats,
} = require('../controllers/userController');

const {
  getUserWatchlist,
  getUserRatings,
} = require('../controllers/interactionController');

const { authenticate } = require('../middleware/auth');

// ── Authenticated "me" Routes ──────────────────────────────
// These MUST be declared before /:id to prevent route shadowing.

// GET /api/users/me/watchlist
router.get('/me/watchlist', authenticate, getUserWatchlist);

// GET /api/users/me/ratings
router.get('/me/ratings', authenticate, getUserRatings);

// GET /api/users/me/history
router.get('/me/history', authenticate, getUserWatchHistory);

// GET /api/users/me/activity
router.get('/me/activity', authenticate, getUserActivity);

// GET /api/users/me/stats
router.get('/me/stats', authenticate, getUserStats);

// ── Collection Routes ──────────────────────────────────────
// GET /api/users  (list all — optionally admin-restricted in controller)
router.get('/', getAllUsers);

// ── Parameterised Routes ───────────────────────────────────
// GET /api/users/:id
router.get('/:id', getUserById);

module.exports = router;

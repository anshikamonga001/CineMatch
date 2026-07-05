// ============================================================
// routes/interactions.js — Ratings, Reviews, Watchlist Routes
// ============================================================
const router = require('express').Router();

const {
  rateMovie,
  reviewMovie,
  addToWatchlist,
  updateWatchlistStatus,
  removeFromWatchlist,
} = require('../controllers/interactionController');

const { authenticate } = require('../middleware/auth');

// All interaction routes require authentication
router.use(authenticate);

// ── Ratings ────────────────────────────────────────────────
// POST /api/interactions/rate
// Body: { movie_id, rating_value }
router.post('/rate', rateMovie);

// ── Reviews ────────────────────────────────────────────────
// POST /api/interactions/review
// Body: { movie_id, review_text, contains_spoiler? }
router.post('/review', reviewMovie);

// ── Watchlist ──────────────────────────────────────────────
// POST /api/interactions/watchlist
// Body: { movie_id, status? }
router.post('/watchlist', addToWatchlist);

// PUT /api/interactions/watchlist/:movie_id
// Body: { status }
router.put('/watchlist/:movie_id', updateWatchlistStatus);

// DELETE /api/interactions/watchlist/:movie_id
router.delete('/watchlist/:movie_id', removeFromWatchlist);

module.exports = router;

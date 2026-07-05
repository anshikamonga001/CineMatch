// ============================================================
// routes/movies.js — Movie Routes
// ============================================================
const router = require('express').Router();

const {
  getAllMovies,
  getMovieById,
  addMovie,
  getTopRated,
  getPopularMovies,
  searchMovies,
  getMovieStats,
} = require('../controllers/movieController');

const { getMovieRatings, getMovieReviews } = require('../controllers/interactionController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ── Static / Collection Routes ─────────────────────────────
// GET /api/movies
router.get('/', getAllMovies);

// GET /api/movies/top-rated
router.get('/top-rated', getTopRated);

// GET /api/movies/popular
router.get('/popular', getPopularMovies);

// GET /api/movies/search?q=<term>
router.get('/search', searchMovies);

// ── Admin Routes ───────────────────────────────────────────
// POST /api/movies  (admin only)
router.post('/', authenticate, requireAdmin, addMovie);

// ── Individual Movie Routes ────────────────────────────────
// Note: these must come AFTER the static routes to avoid :id
// matching 'top-rated', 'popular', 'search'.

// GET /api/movies/:id
router.get('/:id', getMovieById);

// GET /api/movies/:id/stats
router.get('/:id/stats', getMovieStats);

// GET /api/movies/:id/ratings
router.get('/:id/ratings', getMovieRatings);

// GET /api/movies/:id/reviews
router.get('/:id/reviews', getMovieReviews);

module.exports = router;

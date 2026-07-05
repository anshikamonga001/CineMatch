// ============================================================
// routes/analytics.js — Analytics Routes
// ============================================================
const router = require('express').Router();

const {
  getDashboardStats,
  getTopRatedMovies,
  getGenrePopularity,
  getMostActiveUsers,
  getTrendingMovies,
  getDirectorStats,
  getMonthlyActivity,
  getCountryDistribution,
  getLanguagePopularity,
  getWatchlistAnalytics,
  getRatingDistribution,
} = require('../controllers/analyticsController');

// All analytics routes are public (read-only aggregates).
// Add authenticate + requireAdmin here if you want to restrict access.

// GET /api/analytics/dashboard
router.get('/dashboard', getDashboardStats);

// GET /api/analytics/top-rated?limit=10
router.get('/top-rated', getTopRatedMovies);

// GET /api/analytics/genre-popularity
router.get('/genre-popularity', getGenrePopularity);

// GET /api/analytics/most-active-users?limit=10
router.get('/most-active-users', getMostActiveUsers);

// GET /api/analytics/trending?days=30&limit=10
router.get('/trending', getTrendingMovies);

// GET /api/analytics/director-stats?limit=20
router.get('/director-stats', getDirectorStats);

// GET /api/analytics/monthly-activity?months=12
router.get('/monthly-activity', getMonthlyActivity);

// GET /api/analytics/country-distribution
router.get('/country-distribution', getCountryDistribution);

// GET /api/analytics/language-popularity
router.get('/language-popularity', getLanguagePopularity);

// GET /api/analytics/watchlist
router.get('/watchlist', getWatchlistAnalytics);

// GET /api/analytics/rating-distribution
router.get('/rating-distribution', getRatingDistribution);

module.exports = router;

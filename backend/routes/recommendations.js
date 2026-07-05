// ============================================================
// routes/recommendations.js — Recommendation Routes
// ============================================================
const router = require('express').Router();

const { getRecommendations } = require('../controllers/movieController');
const { authenticate } = require('../middleware/auth');

// GET /api/recommendations/me?limit=10
// Requires authentication — recommendations are personalised.
router.get('/me', authenticate, getRecommendations);

module.exports = router;

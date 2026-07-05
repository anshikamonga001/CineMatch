// ============================================================
// controllers/analyticsController.js — Dashboard & Analytics
// ============================================================
const { query } = require('../config/db');

// ── getDashboardStats ───────────────────────────────────────
/**
 * GET /api/analytics/dashboard
 * Returns high-level platform counts.
 */
async function getDashboardStats(req, res, next) {
  try {
    const [stats] = await query(
      `SELECT
         (SELECT COUNT(*) FROM users)     AS total_users,
         (SELECT COUNT(*) FROM movies)    AS total_movies,
         (SELECT COUNT(*) FROM ratings)   AS total_ratings,
         (SELECT COUNT(*) FROM reviews)   AS total_reviews,
         (SELECT COUNT(*) FROM genres)    AS total_genres,
         (SELECT COUNT(*) FROM directors) AS total_directors,
         (SELECT COUNT(*) FROM actors)    AS total_actors,
         (SELECT COUNT(*) FROM watchlist) AS total_watchlist_entries,
         (SELECT ROUND(AVG(rating_value),2) FROM ratings) AS platform_avg_rating`
    );

    return res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// ── getTopRatedMovies ───────────────────────────────────────
/**
 * GET /api/analytics/top-rated?limit=10
 */
async function getTopRatedMovies(req, res, next) {
  try {
    const limit = Math.min(50, parseInt(req.query.limit || '10', 10));

    const rows = await query(
      `SELECT
         m.movie_id, m.title, m.release_year, m.language, m.poster_url,
         d.full_name AS director_name,
         ROUND(AVG(r.rating_value), 2) AS avg_rating,
         COUNT(r.rating_id)            AS total_ratings,
         COUNT(DISTINCT rv.review_id)  AS total_reviews
       FROM movies m
       LEFT JOIN directors d ON d.director_id = m.director_id
       LEFT JOIN ratings r   ON r.movie_id    = m.movie_id
       LEFT JOIN reviews rv  ON rv.movie_id   = m.movie_id
       GROUP BY m.movie_id, d.full_name
       HAVING total_ratings >= 1
       ORDER BY avg_rating DESC, total_ratings DESC
       LIMIT ?`,
      [limit]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── getGenrePopularity ──────────────────────────────────────
/**
 * GET /api/analytics/genre-popularity
 * Uses genre_popularity_view if available.
 */
async function getGenrePopularity(req, res, next) {
  try {
    let rows;
    try {
      rows = await query('SELECT * FROM genre_popularity_view ORDER BY total_ratings DESC');
    } catch {
      rows = await query(
        `SELECT
           g.genre_id, g.genre_name,
           COUNT(DISTINCT mg.movie_id)  AS total_movies,
           COUNT(DISTINCT r.rating_id)  AS total_ratings,
           ROUND(AVG(r.rating_value),2) AS avg_rating
         FROM genres g
         LEFT JOIN movie_genres mg ON mg.genre_id  = g.genre_id
         LEFT JOIN ratings r       ON r.movie_id   = mg.movie_id
         GROUP BY g.genre_id
         ORDER BY total_ratings DESC`
      );
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── getMostActiveUsers ──────────────────────────────────────
/**
 * GET /api/analytics/most-active-users?limit=10
 */
async function getMostActiveUsers(req, res, next) {
  try {
    const limit = Math.min(50, parseInt(req.query.limit || '10', 10));

    const rows = await query(
      `SELECT
         u.user_id, u.first_name, u.last_name, u.country, u.created_at,
         COUNT(DISTINCT r.rating_id)    AS total_ratings,
         COUNT(DISTINCT rv.review_id)   AS total_reviews,
         COUNT(DISTINCT w.watchlist_id) AS watchlist_count,
         (COUNT(DISTINCT r.rating_id) + COUNT(DISTINCT rv.review_id) + COUNT(DISTINCT w.watchlist_id)) AS activity_score
       FROM users u
       LEFT JOIN ratings r  ON r.user_id  = u.user_id
       LEFT JOIN reviews rv ON rv.user_id = u.user_id
       LEFT JOIN watchlist w ON w.user_id = u.user_id
       GROUP BY u.user_id
       ORDER BY activity_score DESC
       LIMIT ?`,
      [limit]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── getTrendingMovies ───────────────────────────────────────
/**
 * GET /api/analytics/trending?days=30&limit=10
 * Movies with the most activity (ratings + reviews + watchlist) in the last N days.
 */
async function getTrendingMovies(req, res, next) {
  try {
    const days  = Math.min(365, parseInt(req.query.days  || '30', 10));
    const limit = Math.min(50,  parseInt(req.query.limit || '10', 10));

    const rows = await query(
      `SELECT
         m.movie_id, m.title, m.release_year, m.language, m.poster_url,
         COUNT(DISTINCT r.rating_id)    AS recent_ratings,
         COUNT(DISTINCT rv.review_id)   AS recent_reviews,
         COUNT(DISTINCT w.watchlist_id) AS recent_watchlist,
         ROUND(AVG(r.rating_value), 1)  AS avg_rating,
         (COUNT(DISTINCT r.rating_id) + COUNT(DISTINCT rv.review_id) + COUNT(DISTINCT w.watchlist_id)) AS trend_score
       FROM movies m
       LEFT JOIN ratings r  ON r.movie_id  = m.movie_id AND r.rated_at   >= DATE_SUB(NOW(), INTERVAL ? DAY)
       LEFT JOIN reviews rv ON rv.movie_id = m.movie_id AND rv.reviewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       LEFT JOIN watchlist w ON w.movie_id = m.movie_id AND w.added_at    >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY m.movie_id
       HAVING trend_score > 0
       ORDER BY trend_score DESC
       LIMIT ?`,
      [days, days, days, limit]
    );

    return res.json({ success: true, data: rows, period_days: days });
  } catch (err) {
    next(err);
  }
}

// ── getDirectorStats ────────────────────────────────────────
/**
 * GET /api/analytics/director-stats
 */
async function getDirectorStats(req, res, next) {
  try {
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));

    let rows;
    try {
      rows = await query(`SELECT * FROM director_stats_view ORDER BY avg_rating DESC LIMIT ?`, [limit]);
    } catch {
      rows = await query(
        `SELECT
           d.director_id, d.full_name, d.nationality,
           COUNT(DISTINCT m.movie_id)    AS total_movies,
           ROUND(AVG(r.rating_value),2)  AS avg_rating,
           COUNT(DISTINCT r.rating_id)   AS total_ratings
         FROM directors d
         LEFT JOIN movies m  ON m.director_id = d.director_id
         LEFT JOIN ratings r ON r.movie_id    = m.movie_id
         GROUP BY d.director_id
         ORDER BY avg_rating DESC, total_movies DESC
         LIMIT ?`,
        [limit]
      );
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── getMonthlyActivity ──────────────────────────────────────
/**
 * GET /api/analytics/monthly-activity
 * Monthly ratings and reviews counts for the last 12 months.
 */
async function getMonthlyActivity(req, res, next) {
  try {
    const months = Math.min(24, parseInt(req.query.months || '12', 10));

    const ratings = await query(
      `SELECT
         DATE_FORMAT(rated_at, '%Y-%m') AS month,
         COUNT(*) AS rating_count
       FROM ratings
       WHERE rated_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
       GROUP BY month
       ORDER BY month ASC`,
      [months]
    );

    const reviews = await query(
      `SELECT
         DATE_FORMAT(reviewed_at, '%Y-%m') AS month,
         COUNT(*) AS review_count
       FROM reviews
       WHERE reviewed_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
       GROUP BY month
       ORDER BY month ASC`,
      [months]
    );

    // Merge into one array by month
    const monthMap = {};
    ratings.forEach(r => { monthMap[r.month] = { month: r.month, rating_count: r.rating_count, review_count: 0 }; });
    reviews.forEach(r => {
      if (monthMap[r.month]) {
        monthMap[r.month].review_count = r.review_count;
      } else {
        monthMap[r.month] = { month: r.month, rating_count: 0, review_count: r.review_count };
      }
    });

    const merged = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    return res.json({ success: true, data: merged, months });
  } catch (err) {
    next(err);
  }
}

// ── getCountryDistribution ──────────────────────────────────
/**
 * GET /api/analytics/country-distribution
 */
async function getCountryDistribution(req, res, next) {
  try {
    const rows = await query(
      `SELECT
         COALESCE(country, 'Unknown') AS country,
         COUNT(*) AS user_count
       FROM users
       GROUP BY country
       ORDER BY user_count DESC`
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── getLanguagePopularity ───────────────────────────────────
/**
 * GET /api/analytics/language-popularity
 */
async function getLanguagePopularity(req, res, next) {
  try {
    const rows = await query(
      `SELECT
         COALESCE(m.language, 'Unknown') AS language,
         COUNT(DISTINCT m.movie_id)       AS movie_count,
         COUNT(DISTINCT r.rating_id)      AS total_ratings,
         ROUND(AVG(r.rating_value), 2)   AS avg_rating
       FROM movies m
       LEFT JOIN ratings r ON r.movie_id = m.movie_id
       GROUP BY m.language
       ORDER BY total_ratings DESC`
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── getWatchlistAnalytics ───────────────────────────────────
/**
 * GET /api/analytics/watchlist
 */
async function getWatchlistAnalytics(req, res, next) {
  try {
    // Status distribution
    const statusDist = await query(
      `SELECT status, COUNT(*) AS count
       FROM watchlist
       GROUP BY status
       ORDER BY count DESC`
    );

    // Most watchlisted movies
    const topWatchlisted = await query(
      `SELECT
         m.movie_id, m.title, m.release_year, m.poster_url,
         COUNT(w.watchlist_id) AS watchlist_count
       FROM watchlist w
       JOIN movies m ON m.movie_id = w.movie_id
       GROUP BY m.movie_id
       ORDER BY watchlist_count DESC
       LIMIT 10`
    );

    // Completion rate
    const [completion] = await query(
      `SELECT
         COUNT(CASE WHEN status = 'watched'       THEN 1 END) AS watched,
         COUNT(CASE WHEN status = 'want_to_watch' THEN 1 END) AS want_to_watch,
         COUNT(CASE WHEN status = 'watching'      THEN 1 END) AS currently_watching,
         COUNT(*) AS total
       FROM watchlist`
    );

    return res.json({
      success: true,
      data: {
        status_distribution:   statusDist,
        most_watchlisted:      topWatchlisted,
        completion_stats:      completion,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── getRatingDistribution ───────────────────────────────────
/**
 * GET /api/analytics/rating-distribution
 */
async function getRatingDistribution(req, res, next) {
  try {
    const rows = await query(
      `SELECT rating_value, COUNT(*) AS count
       FROM ratings
       GROUP BY rating_value
       ORDER BY rating_value ASC`
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};

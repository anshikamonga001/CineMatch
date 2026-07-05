// ============================================================
// controllers/userController.js — User Management
// ============================================================
const { query, callProcedure } = require('../config/db');

// ── getAllUsers ─────────────────────────────────────────────
/**
 * GET /api/users?page=1&limit=20&search=<name>
 * Returns paginated user list with activity stats.
 */
async function getAllUsers(req, res, next) {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, parseInt(limit, 10) || 20);
    const offset   = (pageNum - 1) * limitNum;

    let whereSql = '';
    const params = [];

    if (search) {
      whereSql = 'WHERE u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const countSql = `SELECT COUNT(*) AS total FROM users u ${whereSql}`;
    const [countRow] = await query(countSql, params);
    const total = countRow ? countRow.total : 0;

    const rows = await query(
      `SELECT
         u.user_id, u.email, u.first_name, u.last_name, u.country, u.role, u.created_at,
         COUNT(DISTINCT r.rating_id)    AS total_ratings,
         COUNT(DISTINCT rv.review_id)   AS total_reviews,
         COUNT(DISTINCT w.watchlist_id) AS watchlist_count,
         MAX(r.rated_at)                AS last_active
       FROM users u
       LEFT JOIN ratings r  ON r.user_id  = u.user_id
       LEFT JOIN reviews rv ON rv.user_id = u.user_id
       LEFT JOIN watchlist w ON w.user_id = u.user_id
       ${whereSql}
       GROUP BY u.user_id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page:        pageNum,
        limit:       limitNum,
        total_pages: Math.ceil(total / limitNum),
        has_next:    pageNum * limitNum < total,
        has_prev:    pageNum > 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── getUserById ─────────────────────────────────────────────
/**
 * GET /api/users/:id
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
         u.user_id, u.email, u.first_name, u.last_name, u.country, u.role, u.created_at,
         COUNT(DISTINCT r.rating_id)    AS total_ratings,
         COUNT(DISTINCT rv.review_id)   AS total_reviews,
         COUNT(DISTINCT w.watchlist_id) AS watchlist_count,
         ROUND(AVG(r.rating_value), 1)  AS avg_rating_given,
         MAX(r.rated_at)                AS last_active
       FROM users u
       LEFT JOIN ratings r  ON r.user_id  = u.user_id
       LEFT JOIN reviews rv ON rv.user_id = u.user_id
       LEFT JOIN watchlist w ON w.user_id = u.user_id
       WHERE u.user_id = ?
       GROUP BY u.user_id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Favourite genres
    const favGenres = await query(
      `SELECT g.genre_name, COUNT(*) AS count
       FROM ratings r
       JOIN movies m         ON m.movie_id  = r.movie_id
       JOIN movie_genres mg  ON mg.movie_id = m.movie_id
       JOIN genres g         ON g.genre_id  = mg.genre_id
       WHERE r.user_id = ?
       GROUP BY g.genre_name
       ORDER BY count DESC
       LIMIT 5`,
      [id]
    );

    return res.json({
      success: true,
      data: { ...rows[0], favourite_genres: favGenres },
    });
  } catch (err) {
    next(err);
  }
}

// ── getUserWatchHistory ─────────────────────────────────────
/**
 * GET /api/users/me/history
 * Calls sp_get_user_watch_history; falls back to rated movies.
 */
async function getUserWatchHistory(req, res, next) {
  try {
    const userId = req.user.user_id;
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));

    let rows = [];
    try {
      const results = await callProcedure('sp_get_user_watch_history', [userId, limit]);
      if (results && results[0]) rows = results[0];
    } catch {
      // Fall back: treat rated movies as "watched"
      rows = await query(
        `SELECT
           m.movie_id, m.title, m.release_year, m.language, m.poster_url,
           r.rating_value, r.rated_at AS watched_at,
           d.full_name AS director_name
         FROM ratings r
         JOIN movies m    ON m.movie_id    = r.movie_id
         LEFT JOIN directors d ON d.director_id = m.director_id
         WHERE r.user_id = ?
         ORDER BY r.rated_at DESC
         LIMIT ?`,
        [userId, limit]
      );
    }

    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
}

// ── getUserActivity ─────────────────────────────────────────
/**
 * GET /api/users/me/activity
 * Returns data from user_activity_view for the authenticated user.
 */
async function getUserActivity(req, res, next) {
  try {
    const userId = req.user.user_id;

    let rows = [];
    try {
      rows = await query('SELECT * FROM user_activity_view WHERE user_id = ?', [userId]);
    } catch {
      // View doesn't exist – build inline
      rows = await query(
        `SELECT
           u.user_id, u.first_name, u.last_name, u.email,
           COUNT(DISTINCT r.rating_id)    AS total_ratings,
           COUNT(DISTINCT rv.review_id)   AS total_reviews,
           COUNT(DISTINCT w.watchlist_id) AS watchlist_count,
           ROUND(AVG(r.rating_value), 1)  AS avg_rating,
           MAX(r.rated_at)                AS last_rating_date
         FROM users u
         LEFT JOIN ratings r  ON r.user_id  = u.user_id
         LEFT JOIN reviews rv ON rv.user_id = u.user_id
         LEFT JOIN watchlist w ON w.user_id = u.user_id
         WHERE u.user_id = ?
         GROUP BY u.user_id`,
        [userId]
      );
    }

    return res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    next(err);
  }
}

// ── getUserStats ────────────────────────────────────────────
/**
 * GET /api/users/me/stats
 */
async function getUserStats(req, res, next) {
  try {
    const userId = req.user.user_id;

    const [[stats]] = await Promise.all([
      query(
        `SELECT
           (SELECT COUNT(*) FROM ratings  r  WHERE r.user_id  = ?) AS total_ratings,
           (SELECT COUNT(*) FROM reviews  rv WHERE rv.user_id = ?) AS total_reviews,
           (SELECT COUNT(*) FROM watchlist w WHERE w.user_id  = ?) AS watchlist_total,
           (SELECT COUNT(*) FROM watchlist w WHERE w.user_id  = ? AND w.status = 'watched')     AS watched_count,
           (SELECT COUNT(*) FROM watchlist w WHERE w.user_id  = ? AND w.status = 'want_to_watch') AS want_to_watch_count,
           (SELECT COUNT(*) FROM watchlist w WHERE w.user_id  = ? AND w.status = 'watching')    AS watching_count,
           (SELECT ROUND(AVG(r.rating_value),1) FROM ratings r WHERE r.user_id = ?)             AS avg_rating_given`,
        [userId, userId, userId, userId, userId, userId, userId]
      ),
    ]);

    // Genre breakdown for the user
    const genres = await query(
      `SELECT g.genre_name, COUNT(*) AS count
       FROM ratings r
       JOIN movies m        ON m.movie_id  = r.movie_id
       JOIN movie_genres mg ON mg.movie_id = m.movie_id
       JOIN genres g        ON g.genre_id  = mg.genre_id
       WHERE r.user_id = ?
       GROUP BY g.genre_name
       ORDER BY count DESC`,
      [userId]
    );

    // Recent ratings
    const recent = await query(
      `SELECT m.movie_id, m.title, m.poster_url, r.rating_value, r.rated_at
       FROM ratings r
       JOIN movies m ON m.movie_id = r.movie_id
       WHERE r.user_id = ?
       ORDER BY r.rated_at DESC
       LIMIT 5`,
      [userId]
    );

    return res.json({
      success: true,
      data: {
        ...stats,
        genre_breakdown:  genres,
        recent_ratings:   recent,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserWatchHistory,
  getUserActivity,
  getUserStats,
};

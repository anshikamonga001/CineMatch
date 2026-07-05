// ============================================================
// controllers/interactionController.js — Ratings, Reviews, Watchlist
// ============================================================
const { query, callProcedure } = require('../config/db');

// ── rateMovie ───────────────────────────────────────────────
/**
 * POST /api/interactions/rate
 * Body: { movie_id, rating_value (1-10) }
 * Calls sp_add_user_rating or falls back to UPSERT logic.
 */
async function rateMovie(req, res, next) {
  try {
    const { movie_id, rating_value } = req.body;
    const userId = req.user.user_id;

    if (!movie_id || rating_value === undefined) {
      return res.status(400).json({ success: false, message: 'movie_id and rating_value are required.' });
    }
    const rv = parseFloat(rating_value);
    if (isNaN(rv) || rv < 1 || rv > 10) {
      return res.status(422).json({ success: false, message: 'rating_value must be between 1 and 10.' });
    }

    // Verify movie exists
    const movie = await query('SELECT movie_id FROM movies WHERE movie_id = ?', [movie_id]);
    if (!movie.length) return res.status(404).json({ success: false, message: 'Movie not found.' });

    let result;
    try {
      await callProcedure('sp_add_user_rating', [userId, movie_id, rv]);
      result = { message: 'Rating recorded via stored procedure.' };
    } catch {
      // UPSERT fallback
      const existing = await query(
        'SELECT rating_id FROM ratings WHERE user_id = ? AND movie_id = ?',
        [userId, movie_id]
      );
      if (existing.length > 0) {
        await query(
          'UPDATE ratings SET rating_value = ?, rated_at = NOW() WHERE user_id = ? AND movie_id = ?',
          [rv, userId, movie_id]
        );
        result = { message: 'Rating updated successfully.' };
      } else {
        await query(
          'INSERT INTO ratings (user_id, movie_id, rating_value) VALUES (?, ?, ?)',
          [userId, movie_id, rv]
        );
        result = { message: 'Rating submitted successfully.' };
      }
    }

    // Return new aggregate
    const [agg] = await query(
      `SELECT ROUND(AVG(rating_value), 1) AS avg_rating, COUNT(*) AS total_ratings
       FROM ratings WHERE movie_id = ?`,
      [movie_id]
    );

    return res.json({ success: true, ...result, movie_id, rating_value: rv, aggregate: agg });
  } catch (err) {
    next(err);
  }
}

// ── reviewMovie ─────────────────────────────────────────────
/**
 * POST /api/interactions/review
 * Body: { movie_id, review_text, contains_spoiler? }
 */
async function reviewMovie(req, res, next) {
  try {
    const { movie_id, review_text, contains_spoiler = false } = req.body;
    const userId = req.user.user_id;

    if (!movie_id || !review_text || review_text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'movie_id and review_text are required.' });
    }
    if (review_text.trim().length < 10) {
      return res.status(422).json({ success: false, message: 'Review must be at least 10 characters.' });
    }
    if (review_text.length > 5000) {
      return res.status(422).json({ success: false, message: 'Review may not exceed 5000 characters.' });
    }

    // Check movie exists
    const movie = await query('SELECT movie_id, title FROM movies WHERE movie_id = ?', [movie_id]);
    if (!movie.length) return res.status(404).json({ success: false, message: 'Movie not found.' });

    // Check for existing review
    const existing = await query(
      'SELECT review_id FROM reviews WHERE user_id = ? AND movie_id = ?',
      [userId, movie_id]
    );

    if (existing.length > 0) {
      // Update existing review
      await query(
        `UPDATE reviews SET review_text = ?, contains_spoiler = ?, reviewed_at = NOW()
         WHERE review_id = ?`,
        [review_text.trim(), contains_spoiler ? 1 : 0, existing[0].review_id]
      );
      const [updated] = await query('SELECT * FROM reviews WHERE review_id = ?', [existing[0].review_id]);
      return res.json({ success: true, message: 'Review updated.', data: updated });
    }

    // Insert new review
    const result = await query(
      `INSERT INTO reviews (user_id, movie_id, review_text, contains_spoiler)
       VALUES (?, ?, ?, ?)`,
      [userId, movie_id, review_text.trim(), contains_spoiler ? 1 : 0]
    );

    const [created] = await query('SELECT * FROM reviews WHERE review_id = ?', [result.insertId]);

    return res.status(201).json({ success: true, message: 'Review submitted.', data: created });
  } catch (err) {
    next(err);
  }
}

// ── getMovieRatings ─────────────────────────────────────────
/**
 * GET /api/interactions/:movie_id/ratings  (also called from movieRoutes)
 */
async function getMovieRatings(req, res, next) {
  try {
    const movieId = req.params.movie_id || req.params.id;
    const limit   = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset  = Math.max(0,   parseInt(req.query.offset || '0',  10));

    const ratings = await query(
      `SELECT r.rating_id, r.rating_value, r.rated_at,
              u.user_id, u.first_name, u.last_name
       FROM ratings r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.movie_id = ?
       ORDER BY r.rated_at DESC
       LIMIT ? OFFSET ?`,
      [movieId, limit, offset]
    );

    const [agg] = await query(
      `SELECT ROUND(AVG(rating_value),1) AS avg_rating, COUNT(*) AS total
       FROM ratings WHERE movie_id = ?`,
      [movieId]
    );

    return res.json({ success: true, data: ratings, aggregate: agg });
  } catch (err) {
    next(err);
  }
}

// ── getMovieReviews ─────────────────────────────────────────
/**
 * GET /api/interactions/:movie_id/reviews  (also called from movieRoutes)
 */
async function getMovieReviews(req, res, next) {
  try {
    const movieId = req.params.movie_id || req.params.id;
    const limit   = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset  = Math.max(0,   parseInt(req.query.offset || '0',  10));

    const reviews = await query(
      `SELECT
         rv.review_id, rv.review_text, rv.contains_spoiler, rv.reviewed_at,
         u.user_id, u.first_name, u.last_name,
         r.rating_value
       FROM reviews rv
       JOIN users u       ON u.user_id  = rv.user_id
       LEFT JOIN ratings r ON r.user_id = rv.user_id AND r.movie_id = rv.movie_id
       WHERE rv.movie_id = ?
       ORDER BY rv.reviewed_at DESC
       LIMIT ? OFFSET ?`,
      [movieId, limit, offset]
    );

    const [count] = await query(
      'SELECT COUNT(*) AS total FROM reviews WHERE movie_id = ?',
      [movieId]
    );

    return res.json({ success: true, data: reviews, total: count.total });
  } catch (err) {
    next(err);
  }
}

// ── addToWatchlist ──────────────────────────────────────────
/**
 * POST /api/interactions/watchlist
 * Body: { movie_id, status? }
 */
async function addToWatchlist(req, res, next) {
  try {
    const { movie_id, status = 'want_to_watch' } = req.body;
    const userId = req.user.user_id;

    const validStatuses = ['want_to_watch', 'watching', 'watched'];
    if (!movie_id) {
      return res.status(400).json({ success: false, message: 'movie_id is required.' });
    }
    if (!validStatuses.includes(status)) {
      return res.status(422).json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}` });
    }

    // Check movie
    const movie = await query('SELECT movie_id, title FROM movies WHERE movie_id = ?', [movie_id]);
    if (!movie.length) return res.status(404).json({ success: false, message: 'Movie not found.' });

    // UPSERT watchlist entry
    const existing = await query(
      'SELECT watchlist_id FROM watchlist WHERE user_id = ? AND movie_id = ?',
      [userId, movie_id]
    );

    if (existing.length > 0) {
      await query(
        'UPDATE watchlist SET status = ?, added_at = NOW() WHERE watchlist_id = ?',
        [status, existing[0].watchlist_id]
      );
      return res.json({ success: true, message: 'Watchlist entry updated.', movie_id, status });
    }

    const result = await query(
      'INSERT INTO watchlist (user_id, movie_id, status) VALUES (?, ?, ?)',
      [userId, movie_id, status]
    );

    return res.status(201).json({
      success:     true,
      message:     `"${movie[0].title}" added to your watchlist.`,
      watchlist_id: result.insertId,
      movie_id,
      status,
    });
  } catch (err) {
    next(err);
  }
}

// ── updateWatchlistStatus ───────────────────────────────────
/**
 * PUT /api/interactions/watchlist/:movie_id
 * Body: { status }
 * Calls sp_update_user_watchlist if available.
 */
async function updateWatchlistStatus(req, res, next) {
  try {
    const { movie_id } = req.params;
    const { status }   = req.body;
    const userId       = req.user.user_id;

    const validStatuses = ['want_to_watch', 'watching', 'watched'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(422).json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}` });
    }

    try {
      await callProcedure('sp_update_user_watchlist', [userId, movie_id, status]);
    } catch {
      // Fallback
      const existing = await query(
        'SELECT watchlist_id FROM watchlist WHERE user_id = ? AND movie_id = ?',
        [userId, movie_id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Watchlist entry not found.' });
      }
      await query(
        'UPDATE watchlist SET status = ? WHERE user_id = ? AND movie_id = ?',
        [status, userId, movie_id]
      );
    }

    return res.json({ success: true, message: 'Watchlist status updated.', movie_id, status });
  } catch (err) {
    next(err);
  }
}

// ── removeFromWatchlist ─────────────────────────────────────
/**
 * DELETE /api/interactions/watchlist/:movie_id
 */
async function removeFromWatchlist(req, res, next) {
  try {
    const { movie_id } = req.params;
    const userId = req.user.user_id;

    const result = await query(
      'DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?',
      [userId, movie_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Watchlist entry not found.' });
    }

    return res.json({ success: true, message: 'Movie removed from watchlist.' });
  } catch (err) {
    next(err);
  }
}

// ── getUserWatchlist ────────────────────────────────────────
/**
 * GET /api/users/me/watchlist  (routed here via userRoutes)
 */
async function getUserWatchlist(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { status, page = '1', limit = '20' } = req.query;

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, parseInt(limit, 10) || 20);
    const offset   = (pageNum - 1) * limitNum;

    const conditions = ['w.user_id = ?'];
    const params     = [userId];

    if (status) {
      conditions.push('w.status = ?');
      params.push(status);
    }

    const where = conditions.join(' AND ');

    const [countRow] = await query(
      `SELECT COUNT(*) AS total FROM watchlist w WHERE ${where}`,
      params
    );

    const rows = await query(
      `SELECT
         w.watchlist_id, w.status, w.added_at,
         m.movie_id, m.title, m.release_year, m.language, m.poster_url, m.duration_minutes,
         GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres,
         ROUND(AVG(r.rating_value), 1) AS avg_rating,
         COUNT(DISTINCT r.rating_id)   AS total_ratings,
         ur.rating_value               AS user_rating
       FROM watchlist w
       JOIN movies m        ON m.movie_id    = w.movie_id
       LEFT JOIN movie_genres mg ON mg.movie_id = m.movie_id
       LEFT JOIN genres g        ON g.genre_id  = mg.genre_id
       LEFT JOIN ratings r       ON r.movie_id  = m.movie_id
       LEFT JOIN ratings ur      ON ur.movie_id = m.movie_id AND ur.user_id = ?
       WHERE ${where}
       GROUP BY w.watchlist_id, m.movie_id, ur.rating_value
       ORDER BY w.added_at DESC
       LIMIT ? OFFSET ?`,
      [userId, ...params, limitNum, offset]
    );

    return res.json({
      success: true,
      data:    rows,
      pagination: {
        total:       countRow.total,
        page:        pageNum,
        limit:       limitNum,
        total_pages: Math.ceil(countRow.total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── getUserRatings ──────────────────────────────────────────
/**
 * GET /api/users/me/ratings
 */
async function getUserRatings(req, res, next) {
  try {
    const userId   = req.user.user_id;
    const pageNum  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limitNum = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset   = (pageNum - 1) * limitNum;

    const [countRow] = await query(
      'SELECT COUNT(*) AS total FROM ratings WHERE user_id = ?',
      [userId]
    );

    const rows = await query(
      `SELECT
         r.rating_id, r.rating_value, r.rated_at,
         m.movie_id, m.title, m.release_year, m.language, m.poster_url,
         GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres,
         d.full_name AS director_name
       FROM ratings r
       JOIN movies m        ON m.movie_id    = r.movie_id
       LEFT JOIN directors d     ON d.director_id = m.director_id
       LEFT JOIN movie_genres mg ON mg.movie_id   = m.movie_id
       LEFT JOIN genres g        ON g.genre_id    = mg.genre_id
       WHERE r.user_id = ?
       GROUP BY r.rating_id, m.movie_id, d.full_name
       ORDER BY r.rated_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limitNum, offset]
    );

    return res.json({
      success: true,
      data:    rows,
      pagination: {
        total:       countRow.total,
        page:        pageNum,
        limit:       limitNum,
        total_pages: Math.ceil(countRow.total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  rateMovie,
  reviewMovie,
  getMovieRatings,
  getMovieReviews,
  addToWatchlist,
  updateWatchlistStatus,
  removeFromWatchlist,
  getUserWatchlist,
  getUserRatings,
};

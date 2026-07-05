// ============================================================
// controllers/movieController.js — Movie CRUD & Recommendations
// ============================================================
const { query, callProcedure } = require('../config/db');

// ── getAllMovies ────────────────────────────────────────────
/**
 * GET /api/movies
 * Supported query params:
 *   genre, language, year, search, min_rating
 *   sort  = title|rating|year|popularity (default: title)
 *   order = asc|desc  (default: asc for title, desc for others)
 *   page  = 1+  (default 1)
 *   limit = 1-100 (default 20)
 */
async function getAllMovies(req, res, next) {
  try {
    const {
      genre,
      language,
      year,
      search,
      min_rating,
      sort  = 'title',
      order,
      page  = '1',
      limit = '20',
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset   = (pageNum - 1) * limitNum;

    // Allowed sort columns (whitelist to prevent SQL injection)
    const sortMap = {
      title:      'm.title',
      rating:     'avg_rating',
      year:       'm.release_year',
      popularity: 'total_ratings',
    };
    const sortCol = sortMap[sort] || 'm.title';
    const sortDir = (order === 'desc' || (!order && sort !== 'title')) ? 'DESC' : 'ASC';

    let sql = `
      SELECT
        m.movie_id, m.title, m.release_year, m.language, m.duration_minutes,
        m.description, m.poster_url, m.trailer_url,
        GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres,
        d.full_name                     AS director_name,
        ROUND(AVG(r.rating_value), 1)   AS avg_rating,
        COUNT(DISTINCT r.rating_id)     AS total_ratings,
        COUNT(DISTINCT rv.review_id)    AS total_reviews
      FROM movies m
      LEFT JOIN movie_genres mg   ON mg.movie_id  = m.movie_id
      LEFT JOIN genres g          ON g.genre_id   = mg.genre_id
      LEFT JOIN directors d       ON d.director_id = m.director_id
      LEFT JOIN ratings r         ON r.movie_id   = m.movie_id
      LEFT JOIN reviews rv        ON rv.movie_id  = m.movie_id
    `;

    const conditions = [];
    const params     = [];

    if (genre) {
      conditions.push('g.genre_name = ?');
      params.push(genre);
    }
    if (language) {
      conditions.push('m.language = ?');
      params.push(language);
    }
    if (year) {
      conditions.push('m.release_year = ?');
      params.push(parseInt(year, 10));
    }
    if (search) {
      conditions.push('(m.title LIKE ? OR m.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY m.movie_id, m.title, m.release_year, m.language, m.duration_minutes, m.description, m.poster_url, m.trailer_url, d.full_name';

    if (min_rating) {
      sql += ' HAVING avg_rating >= ?';
      params.push(parseFloat(min_rating));
    }

    // Count query for pagination meta
    const countSql = `SELECT COUNT(*) AS total FROM (${sql}) AS sub`;
    const [countRow] = await query(countSql, params);
    const total = countRow ? countRow.total : 0;

    sql += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const movies = await query(sql, params);

    return res.json({
      success: true,
      data: movies,
      pagination: {
        total,
        page:         pageNum,
        limit:        limitNum,
        total_pages:  Math.ceil(total / limitNum),
        has_next:     pageNum * limitNum < total,
        has_prev:     pageNum > 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── getMovieById ────────────────────────────────────────────
/**
 * GET /api/movies/:id
 * Returns full movie detail: genres, director, actors, stats
 */
async function getMovieById(req, res, next) {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
         m.movie_id, m.title, m.release_year, m.language, m.duration_minutes,
         m.description, m.poster_url, m.trailer_url,
         d.director_id, d.full_name AS director_name, d.nationality AS director_nationality,
         GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ')  AS genres,
         GROUP_CONCAT(DISTINCT a.full_name  ORDER BY a.full_name  SEPARATOR ', ')  AS actors,
         ROUND(AVG(r.rating_value), 1)  AS avg_rating,
         COUNT(DISTINCT r.rating_id)    AS total_ratings,
         COUNT(DISTINCT rv.review_id)   AS total_reviews,
         COUNT(DISTINCT w.watchlist_id) AS watchlist_count
       FROM movies m
       LEFT JOIN directors d     ON d.director_id = m.director_id
       LEFT JOIN movie_genres mg ON mg.movie_id   = m.movie_id
       LEFT JOIN genres g        ON g.genre_id    = mg.genre_id
       LEFT JOIN movie_actors ma ON ma.movie_id   = m.movie_id
       LEFT JOIN actors a        ON a.actor_id    = ma.actor_id
       LEFT JOIN ratings r       ON r.movie_id    = m.movie_id
       LEFT JOIN reviews rv      ON rv.movie_id   = m.movie_id
       LEFT JOIN watchlist w     ON w.movie_id    = m.movie_id
       WHERE m.movie_id = ?
       GROUP BY m.movie_id, d.director_id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Movie not found.' });
    }

    // Rating distribution
    const distribution = await query(
      `SELECT rating_value, COUNT(*) AS count
       FROM ratings WHERE movie_id = ?
       GROUP BY rating_value ORDER BY rating_value DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: { ...rows[0], rating_distribution: distribution },
    });
  } catch (err) {
    next(err);
  }
}

// ── getRecommendations ──────────────────────────────────────
/**
 * GET /api/recommendations/me  (called from recommendationRoutes)
 * Calls sp_generate_recommendations, then returns recommended movies.
 */
async function getRecommendations(req, res, next) {
  try {
    const userId = req.user.user_id;
    const limit  = Math.min(50, parseInt(req.query.limit || '10', 10));

    // Try to call the stored procedure; if it fails (e.g., proc doesn't exist yet),
    // fall back to a simple popularity-based query
    try {
      await callProcedure('sp_generate_recommendations', [userId]);
    } catch (procErr) {
      console.warn('[getRecommendations] sp_generate_recommendations failed:', procErr.message);
    }

    // Fetch recommendations joined with movie details
    const recs = await query(
      `SELECT
         rec.recommendation_id,
         rec.score,
         rec.reason,
         rec.created_at AS recommended_at,
         m.movie_id, m.title, m.release_year, m.language, m.poster_url,
         GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres,
         d.full_name AS director_name,
         ROUND(AVG(r.rating_value), 1) AS avg_rating,
         COUNT(DISTINCT r.rating_id)   AS total_ratings
       FROM recommendations rec
       JOIN movies m        ON m.movie_id    = rec.movie_id
       LEFT JOIN movie_genres mg ON mg.movie_id = m.movie_id
       LEFT JOIN genres g        ON g.genre_id  = mg.genre_id
       LEFT JOIN directors d     ON d.director_id = m.director_id
       LEFT JOIN ratings r       ON r.movie_id    = m.movie_id
       WHERE rec.user_id = ?
       GROUP BY rec.recommendation_id, m.movie_id, d.full_name
       ORDER BY rec.score DESC, rec.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return res.json({ success: true, data: recs, count: recs.length });
  } catch (err) {
    next(err);
  }
}

// ── addMovie ────────────────────────────────────────────────
/**
 * POST /api/movies
 * Admin only. Calls sp_add_new_movie if it exists, otherwise
 * performs a direct INSERT.
 */
async function addMovie(req, res, next) {
  try {
    const {
      title, release_year, language, duration_minutes,
      description, poster_url, trailer_url, director_id,
      genre_ids = [],
    } = req.body;

    if (!title || !release_year) {
      return res.status(400).json({ success: false, message: 'title and release_year are required.' });
    }

    let movieId;

    try {
      const results = await callProcedure('sp_add_new_movie', [
        title, release_year, language || null, duration_minutes || null,
        description || null, poster_url || null, trailer_url || null,
        director_id || null,
      ]);
      // Stored proc should return new movie_id in first result set
      if (results && results[0] && results[0][0]) {
        movieId = results[0][0].movie_id || results[0][0].new_movie_id;
      }
    } catch (procErr) {
      console.warn('[addMovie] sp_add_new_movie not available, using direct INSERT:', procErr.message);
    }

    if (!movieId) {
      const result = await query(
        `INSERT INTO movies (title, release_year, language, duration_minutes, description, poster_url, trailer_url, director_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, release_year, language || null, duration_minutes || null,
         description || null, poster_url || null, trailer_url || null, director_id || null]
      );
      movieId = result.insertId;
    }

    // Link genres
    if (genre_ids.length > 0) {
      const genreValues = genre_ids.map(gid => [movieId, gid]);
      await query('INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES ?', [genreValues]);
    }

    const [created] = await query('SELECT * FROM movies WHERE movie_id = ?', [movieId]);

    return res.status(201).json({ success: true, message: 'Movie added successfully.', data: created });
  } catch (err) {
    next(err);
  }
}

// ── getTopRated ─────────────────────────────────────────────
/**
 * GET /api/movies/top-rated?limit=10
 */
async function getTopRated(req, res, next) {
  try {
    const limit = Math.min(100, parseInt(req.query.limit || '10', 10));

    let rows = [];
    try {
      const results = await callProcedure('sp_get_top_rated_movies', [limit]);
      if (results && results[0]) rows = results[0];
    } catch {
      // Fall back to direct query
      rows = await query(
        `SELECT
           m.movie_id, m.title, m.release_year, m.language, m.poster_url,
           d.full_name AS director_name,
           ROUND(AVG(r.rating_value), 2) AS avg_rating,
           COUNT(r.rating_id)            AS total_ratings
         FROM movies m
         LEFT JOIN directors d ON d.director_id = m.director_id
         LEFT JOIN ratings r   ON r.movie_id    = m.movie_id
         GROUP BY m.movie_id, d.full_name
         HAVING total_ratings >= 1
         ORDER BY avg_rating DESC, total_ratings DESC
         LIMIT ?`,
        [limit]
      );
    }

    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
}

// ── getPopularMovies ────────────────────────────────────────
/**
 * GET /api/movies/popular
 */
async function getPopularMovies(req, res, next) {
  try {
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = Math.max(0,   parseInt(req.query.offset || '0',  10));

    // Try view first; fall back to direct query
    let rows;
    try {
      rows = await query(`SELECT * FROM popular_movies_view LIMIT ? OFFSET ?`, [limit, offset]);
    } catch {
      rows = await query(
        `SELECT
           m.movie_id, m.title, m.release_year, m.language, m.poster_url,
           ROUND(AVG(r.rating_value), 2) AS avg_rating,
           COUNT(DISTINCT r.rating_id)   AS total_ratings,
           COUNT(DISTINCT rv.review_id)  AS total_reviews
         FROM movies m
         LEFT JOIN ratings r  ON r.movie_id = m.movie_id
         LEFT JOIN reviews rv ON rv.movie_id = m.movie_id
         GROUP BY m.movie_id
         ORDER BY total_ratings DESC, avg_rating DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
    }

    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
}

// ── searchMovies ────────────────────────────────────────────
/**
 * GET /api/movies/search?q=<term>
 */
async function searchMovies(req, res, next) {
  try {
    const { q, page = '1', limit = '20' } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query (q) is required.' });
    }

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, parseInt(limit, 10) || 20);
    const offset   = (pageNum - 1) * limitNum;
    const term     = `%${q.trim()}%`;

    const rows = await query(
      `SELECT
         m.movie_id, m.title, m.release_year, m.language, m.poster_url, m.description,
         d.full_name AS director_name,
         GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres,
         ROUND(AVG(r.rating_value), 1) AS avg_rating,
         COUNT(DISTINCT r.rating_id)   AS total_ratings
       FROM movies m
       LEFT JOIN directors d     ON d.director_id = m.director_id
       LEFT JOIN movie_genres mg ON mg.movie_id   = m.movie_id
       LEFT JOIN genres g        ON g.genre_id    = mg.genre_id
       LEFT JOIN ratings r       ON r.movie_id    = m.movie_id
       WHERE m.title LIKE ? OR m.description LIKE ? OR d.full_name LIKE ?
       GROUP BY m.movie_id, d.full_name
       ORDER BY
         CASE WHEN m.title LIKE ? THEN 0 ELSE 1 END,
         avg_rating DESC
       LIMIT ? OFFSET ?`,
      [term, term, term, term, limitNum, offset]
    );

    return res.json({ success: true, data: rows, count: rows.length, query: q });
  } catch (err) {
    next(err);
  }
}

// ── getMovieStats ───────────────────────────────────────────
/**
 * GET /api/movies/:id/stats
 */
async function getMovieStats(req, res, next) {
  try {
    const { id } = req.params;

    let stats;
    try {
      const rows = await query('SELECT * FROM movie_statistics_view WHERE movie_id = ?', [id]);
      stats = rows[0];
    } catch {
      // View doesn't exist — build inline
      const [row] = await query(
        `SELECT
           m.movie_id, m.title, m.release_year, m.language,
           ROUND(AVG(r.rating_value), 2) AS avg_rating,
           COUNT(DISTINCT r.rating_id)   AS total_ratings,
           COUNT(DISTINCT rv.review_id)  AS total_reviews,
           COUNT(DISTINCT w.watchlist_id) AS watchlist_count,
           MAX(r.rated_at)               AS last_rated_at
         FROM movies m
         LEFT JOIN ratings r  ON r.movie_id  = m.movie_id
         LEFT JOIN reviews rv ON rv.movie_id = m.movie_id
         LEFT JOIN watchlist w ON w.movie_id = m.movie_id
         WHERE m.movie_id = ?
         GROUP BY m.movie_id`,
        [id]
      );
      stats = row;
    }

    if (!stats) return res.status(404).json({ success: false, message: 'Movie not found.' });

    return res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllMovies,
  getMovieById,
  getRecommendations,
  addMovie,
  getTopRated,
  getPopularMovies,
  searchMovies,
  getMovieStats,
};

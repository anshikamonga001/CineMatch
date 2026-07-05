-- ============================================================
-- CineMatch Database Views
-- File: views.sql
-- Description: Creates 5 analytical views for reporting
--              and application consumption
-- ============================================================

USE cinematch_db;

-- -------------------------------------------------------
-- 1. popular_movies_view
--    Movies with avg_rating > 4.0, joined with genre/director
-- -------------------------------------------------------
CREATE OR REPLACE VIEW popular_movies_view AS
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.duration,
    m.language,
    m.imdb_rating,
    m.age_rating,
    m.description,
    m.poster_url,
    g.genre_name,
    d.director_name,
    m.avg_rating,
    m.total_ratings,
    m.engagement_count
FROM movies m
LEFT JOIN genres    g ON m.genre_id    = g.genre_id
LEFT JOIN directors d ON m.director_id = d.director_id
WHERE m.avg_rating > 4.0
ORDER BY m.avg_rating DESC, m.total_ratings DESC;

-- -------------------------------------------------------
-- 2. user_activity_view
--    Per-user counts of ratings, reviews, watchlist entries,
--    and completed movies
-- -------------------------------------------------------
CREATE OR REPLACE VIEW user_activity_view AS
SELECT
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.email,
    u.country,
    u.gender,
    u.created_at                            AS join_date,
    COUNT(DISTINCT r.rating_id)             AS ratings_given,
    COUNT(DISTINCT rv.review_id)            AS reviews_written,
    COUNT(DISTINCT w.watchlist_id)          AS watchlist_entries,
    COUNT(DISTINCT CASE
        WHEN w.watch_status = 'Completed' THEN w.watchlist_id
    END)                                    AS completed_movies
FROM users u
LEFT JOIN ratings    r  ON u.user_id = r.user_id
LEFT JOIN reviews    rv ON u.user_id = rv.user_id
LEFT JOIN watchlist  w  ON u.user_id = w.user_id
GROUP BY
    u.user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.country,
    u.gender,
    u.created_at;

-- -------------------------------------------------------
-- 3. movie_statistics_view
--    Per-movie aggregated stats plus a popularity score
--    Formula: ratings*0.4 + reviews*0.3 + watchlists*0.3
-- -------------------------------------------------------
CREATE OR REPLACE VIEW movie_statistics_view AS
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.language,
    m.imdb_rating,
    m.avg_rating,
    m.total_ratings,
    COUNT(DISTINCT rv.review_id)  AS total_reviews,
    COUNT(DISTINCT w.watchlist_id) AS watchlist_count,
    ROUND(
        (m.total_ratings * 0.4) +
        (COUNT(DISTINCT rv.review_id)   * 0.3) +
        (COUNT(DISTINCT w.watchlist_id) * 0.3),
        2
    )                              AS popularity_score
FROM movies m
LEFT JOIN reviews   rv ON m.movie_id = rv.movie_id
LEFT JOIN watchlist w  ON m.movie_id = w.movie_id
GROUP BY
    m.movie_id,
    m.title,
    m.release_year,
    m.language,
    m.imdb_rating,
    m.avg_rating,
    m.total_ratings;

-- -------------------------------------------------------
-- 4. genre_popularity_view
--    Per-genre: movie count, avg user rating, total reviews
-- -------------------------------------------------------
CREATE OR REPLACE VIEW genre_popularity_view AS
SELECT
    g.genre_id,
    g.genre_name,
    COUNT(DISTINCT m.movie_id)    AS total_movies,
    ROUND(AVG(m.avg_rating), 2)  AS avg_user_rating,
    ROUND(AVG(m.imdb_rating), 2) AS avg_imdb_rating,
    COUNT(DISTINCT rv.review_id) AS total_reviews,
    COUNT(DISTINCT r.rating_id)  AS total_ratings
FROM genres g
LEFT JOIN movies  m  ON g.genre_id = m.genre_id
LEFT JOIN reviews rv ON m.movie_id  = rv.movie_id
LEFT JOIN ratings r  ON m.movie_id  = r.movie_id
GROUP BY
    g.genre_id,
    g.genre_name
ORDER BY total_movies DESC, avg_user_rating DESC;

-- -------------------------------------------------------
-- 5. director_stats_view
--    Per-director: movie count, avg IMDb, avg user rating
-- -------------------------------------------------------
CREATE OR REPLACE VIEW director_stats_view AS
SELECT
    d.director_id,
    d.director_name,
    d.country,
    d.birth_date,
    COUNT(DISTINCT m.movie_id)     AS movie_count,
    ROUND(AVG(m.imdb_rating), 2)  AS avg_imdb_rating,
    ROUND(AVG(m.avg_rating), 2)   AS avg_user_rating,
    MIN(m.release_year)            AS first_movie_year,
    MAX(m.release_year)            AS latest_movie_year
FROM directors d
LEFT JOIN movies m ON d.director_id = m.director_id
GROUP BY
    d.director_id,
    d.director_name,
    d.country,
    d.birth_date
ORDER BY movie_count DESC, avg_imdb_rating DESC;

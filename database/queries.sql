-- ============================================================
-- CineMatch Database Analytical Queries
-- File: queries.sql
-- Description: 40 queries organised into Basic (1-10),
--              Intermediate (11-20), and Advanced (21-40)
-- ============================================================

USE cinematch_db;

-- ============================================================
-- BASIC QUERIES (1-10)
-- ============================================================

-- Query 1: All movies with their genre and director
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.duration        AS duration_min,
    m.language,
    m.imdb_rating,
    m.age_rating,
    g.genre_name,
    d.director_name
FROM   movies m
LEFT JOIN genres    g ON m.genre_id    = g.genre_id
LEFT JOIN directors d ON m.director_id = d.director_id
ORDER  BY m.title;

-- -------------------------------------------------------

-- Query 2: Movies released after 2015
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.imdb_rating,
    g.genre_name
FROM   movies m
LEFT JOIN genres g ON m.genre_id = g.genre_id
WHERE  m.release_year > 2015
ORDER  BY m.release_year DESC, m.imdb_rating DESC;

-- -------------------------------------------------------

-- Query 3: Action movies only
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.imdb_rating,
    m.avg_rating,
    d.director_name
FROM   movies m
JOIN   genres    g ON m.genre_id    = g.genre_id
LEFT JOIN directors d ON m.director_id = d.director_id
WHERE  g.genre_name = 'Action'
ORDER  BY m.imdb_rating DESC;

-- -------------------------------------------------------

-- Query 4: Movies with IMDb rating above 8.0
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.language,
    m.imdb_rating,
    g.genre_name,
    d.director_name
FROM   movies m
LEFT JOIN genres    g ON m.genre_id    = g.genre_id
LEFT JOIN directors d ON m.director_id = d.director_id
WHERE  m.imdb_rating > 8.0
ORDER  BY m.imdb_rating DESC;

-- -------------------------------------------------------

-- Query 5: All users from a specific country (India as example)
SELECT
    user_id,
    CONCAT(first_name, ' ', last_name) AS full_name,
    email,
    gender,
    date_of_birth,
    created_at
FROM   users
WHERE  country = 'India'
ORDER  BY created_at;

-- -------------------------------------------------------

-- Query 6: Movies in English language
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.duration,
    m.imdb_rating,
    g.genre_name
FROM   movies m
LEFT JOIN genres g ON m.genre_id = g.genre_id
WHERE  m.language = 'English'
ORDER  BY m.release_year DESC;

-- -------------------------------------------------------

-- Query 7: All genres with movie counts
SELECT
    g.genre_id,
    g.genre_name,
    COUNT(m.movie_id) AS movie_count
FROM   genres g
LEFT JOIN movies m ON g.genre_id = m.genre_id
GROUP  BY g.genre_id, g.genre_name
ORDER  BY movie_count DESC, g.genre_name;

-- -------------------------------------------------------

-- Query 8: Top 10 most recently registered users
SELECT
    user_id,
    CONCAT(first_name, ' ', last_name) AS full_name,
    email,
    country,
    gender,
    created_at
FROM   users
ORDER  BY created_at DESC
LIMIT  10;

-- -------------------------------------------------------

-- Query 9: Movies with duration over 120 minutes
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.duration        AS duration_min,
    m.language,
    m.imdb_rating,
    g.genre_name
FROM   movies m
LEFT JOIN genres g ON m.genre_id = g.genre_id
WHERE  m.duration > 120
ORDER  BY m.duration DESC;

-- -------------------------------------------------------

-- Query 10: Count of movies per genre
SELECT
    g.genre_name,
    COUNT(m.movie_id) AS total_movies
FROM   genres g
LEFT JOIN movies m ON g.genre_id = m.genre_id
GROUP  BY g.genre_id, g.genre_name
ORDER  BY total_movies DESC;

-- ============================================================
-- INTERMEDIATE QUERIES (11-20)
-- ============================================================

-- Query 11: Average user rating by genre
SELECT
    g.genre_name,
    COUNT(m.movie_id)            AS movies_in_genre,
    ROUND(AVG(m.avg_rating), 2)  AS avg_user_rating,
    ROUND(AVG(m.imdb_rating), 2) AS avg_imdb_rating
FROM   genres g
JOIN   movies m ON g.genre_id = m.genre_id
WHERE  m.total_ratings > 0
GROUP  BY g.genre_id, g.genre_name
ORDER  BY avg_user_rating DESC;

-- -------------------------------------------------------

-- Query 12: Number of movies directed by each director
SELECT
    d.director_id,
    d.director_name,
    d.country,
    COUNT(m.movie_id)            AS movie_count,
    ROUND(AVG(m.imdb_rating), 2) AS avg_imdb_rating,
    ROUND(AVG(m.avg_rating), 2)  AS avg_user_rating
FROM   directors d
LEFT JOIN movies m ON d.director_id = m.director_id
GROUP  BY d.director_id, d.director_name, d.country
ORDER  BY movie_count DESC, avg_imdb_rating DESC;

-- -------------------------------------------------------

-- Query 13: Movies that have never been reviewed
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.imdb_rating,
    g.genre_name
FROM   movies m
LEFT JOIN genres  g  ON m.genre_id = g.genre_id
LEFT JOIN reviews rv ON m.movie_id = rv.movie_id
WHERE  rv.review_id IS NULL
ORDER  BY m.title;

-- -------------------------------------------------------

-- Query 14: Users with the most reviews (top 10)
SELECT
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.country,
    COUNT(rv.review_id)                    AS review_count
FROM   users u
JOIN   reviews rv ON u.user_id = rv.user_id
GROUP  BY u.user_id, u.first_name, u.last_name, u.country
ORDER  BY review_count DESC
LIMIT  10;

-- -------------------------------------------------------

-- Query 15: Movies on the most watchlists
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    g.genre_name,
    COUNT(w.watchlist_id)  AS watchlist_count,
    m.avg_rating,
    m.total_ratings
FROM   movies m
LEFT JOIN genres    g ON m.genre_id = g.genre_id
JOIN   watchlist    w ON m.movie_id = w.movie_id
GROUP  BY m.movie_id, m.title, m.release_year, g.genre_name, m.avg_rating, m.total_ratings
ORDER  BY watchlist_count DESC
LIMIT  20;

-- -------------------------------------------------------

-- Query 16: Users who have never rated any movie
SELECT
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.email,
    u.country,
    u.created_at
FROM   users u
LEFT JOIN ratings r ON u.user_id = r.user_id
WHERE  r.rating_id IS NULL
ORDER  BY u.created_at;

-- -------------------------------------------------------

-- Query 17: Most common watch_status in watchlist
SELECT
    watch_status,
    COUNT(*)                          AS entry_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM   watchlist
GROUP  BY watch_status
ORDER  BY entry_count DESC;

-- -------------------------------------------------------

-- Query 18: Average IMDb rating by language
SELECT
    language,
    COUNT(*)                         AS movie_count,
    ROUND(AVG(imdb_rating), 2)       AS avg_imdb_rating,
    ROUND(AVG(avg_rating), 2)        AS avg_user_rating,
    MIN(imdb_rating)                 AS min_imdb,
    MAX(imdb_rating)                 AS max_imdb
FROM   movies
WHERE  language IS NOT NULL
GROUP  BY language
ORDER  BY avg_imdb_rating DESC;

-- -------------------------------------------------------

-- Query 19: Directors with the most movies
SELECT
    d.director_name,
    d.country,
    COUNT(m.movie_id)            AS movie_count,
    ROUND(AVG(m.imdb_rating), 2) AS avg_imdb_rating
FROM   directors d
JOIN   movies m ON d.director_id = m.director_id
GROUP  BY d.director_id, d.director_name, d.country
HAVING movie_count >= 1
ORDER  BY movie_count DESC, avg_imdb_rating DESC;

-- -------------------------------------------------------

-- Query 20: Movies with both high IMDb (>7.0) and high user rating (>4.0)
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.language,
    m.imdb_rating,
    m.avg_rating,
    m.total_ratings,
    g.genre_name,
    d.director_name
FROM   movies m
LEFT JOIN genres    g ON m.genre_id    = g.genre_id
LEFT JOIN directors d ON m.director_id = d.director_id
WHERE  m.imdb_rating > 7.0
  AND  m.avg_rating  > 4.0
ORDER  BY m.avg_rating DESC, m.imdb_rating DESC;

-- ============================================================
-- ADVANCED QUERIES (21-40)
-- ============================================================

-- Query 21: Top 10 highest-rated movies by avg user rating with genre
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.language,
    g.genre_name,
    d.director_name,
    m.avg_rating,
    m.total_ratings,
    m.imdb_rating
FROM   movies m
LEFT JOIN genres    g ON m.genre_id    = g.genre_id
LEFT JOIN directors d ON m.director_id = d.director_id
WHERE  m.total_ratings > 0
ORDER  BY m.avg_rating DESC, m.total_ratings DESC
LIMIT  10;

-- -------------------------------------------------------

-- Query 22: Monthly active users (users who rated or reviewed in last 30 days)
SELECT
    COUNT(DISTINCT active_users.user_id) AS monthly_active_users
FROM (
    SELECT user_id FROM ratings  WHERE rated_on     >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    UNION
    SELECT user_id FROM reviews  WHERE review_date  >= DATE_SUB(NOW(), INTERVAL 30 DAY)
) AS active_users;

-- -------------------------------------------------------

-- Query 23: Genre popularity over time (ratings per year per genre)
SELECT
    g.genre_name,
    YEAR(r.rated_on)        AS rating_year,
    COUNT(r.rating_id)      AS total_ratings,
    ROUND(AVG(r.rating), 2) AS avg_rating
FROM   ratings r
JOIN   movies  m ON r.movie_id  = m.movie_id
JOIN   genres  g ON m.genre_id  = g.genre_id
GROUP  BY g.genre_name, YEAR(r.rated_on)
ORDER  BY rating_year DESC, total_ratings DESC;

-- -------------------------------------------------------

-- Query 24: Most active users by combined activity (ratings + reviews + watchlist)
SELECT
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name)  AS full_name,
    u.country,
    COUNT(DISTINCT r.rating_id)             AS ratings_count,
    COUNT(DISTINCT rv.review_id)            AS reviews_count,
    COUNT(DISTINCT w.watchlist_id)          AS watchlist_count,
    COUNT(DISTINCT r.rating_id)  +
    COUNT(DISTINCT rv.review_id) +
    COUNT(DISTINCT w.watchlist_id)          AS total_activity,
    fn_user_activity_level(u.user_id)       AS activity_level
FROM   users u
LEFT JOIN ratings   r  ON u.user_id = r.user_id
LEFT JOIN reviews   rv ON u.user_id = rv.user_id
LEFT JOIN watchlist w  ON u.user_id = w.user_id
GROUP  BY u.user_id, u.first_name, u.last_name, u.country
ORDER  BY total_activity DESC
LIMIT  20;

-- -------------------------------------------------------

-- Query 25: Trending genres (most activity in last 6 months)
SELECT
    g.genre_name,
    COUNT(DISTINCT r.rating_id)  AS recent_ratings,
    COUNT(DISTINCT rv.review_id) AS recent_reviews,
    COUNT(DISTINCT w.watchlist_id) AS recent_watchlists,
    COUNT(DISTINCT r.rating_id) +
    COUNT(DISTINCT rv.review_id) +
    COUNT(DISTINCT w.watchlist_id) AS total_activity
FROM   genres g
LEFT JOIN movies    m  ON g.genre_id = m.genre_id
LEFT JOIN ratings   r  ON m.movie_id = r.movie_id  AND r.rated_on    >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
LEFT JOIN reviews   rv ON m.movie_id = rv.movie_id AND rv.review_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
LEFT JOIN watchlist w  ON m.movie_id = w.movie_id  AND w.added_on     >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
GROUP  BY g.genre_id, g.genre_name
ORDER  BY total_activity DESC;

-- -------------------------------------------------------

-- Query 26: Movies in watchlist that the user has never rated
SELECT
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    m.movie_id,
    m.title,
    w.watch_status,
    w.added_on
FROM   watchlist w
JOIN   users  u ON w.user_id  = u.user_id
JOIN   movies m ON w.movie_id = m.movie_id
WHERE  NOT EXISTS (
    SELECT 1 FROM ratings r
    WHERE  r.user_id  = w.user_id
      AND  r.movie_id = w.movie_id
)
ORDER  BY u.user_id, w.added_on;

-- -------------------------------------------------------

-- Query 27: Most common genre in watchlists
SELECT
    g.genre_name,
    COUNT(w.watchlist_id) AS watchlist_entries
FROM   watchlist w
JOIN   movies    m ON w.movie_id  = m.movie_id
JOIN   genres    g ON m.genre_id  = g.genre_id
GROUP  BY g.genre_id, g.genre_name
ORDER  BY watchlist_entries DESC;

-- -------------------------------------------------------

-- Query 28: Average user ratings grouped by country of the rating user
SELECT
    u.country,
    COUNT(DISTINCT u.user_id)       AS user_count,
    COUNT(r.rating_id)              AS total_ratings,
    ROUND(AVG(r.rating), 2)         AS avg_rating_given,
    MIN(r.rating)                   AS min_rating,
    MAX(r.rating)                   AS max_rating
FROM   users u
JOIN   ratings r ON u.user_id = r.user_id
WHERE  u.country IS NOT NULL
GROUP  BY u.country
ORDER  BY avg_rating_given DESC, total_ratings DESC;

-- -------------------------------------------------------

-- Query 29: Movie ranking using ROW_NUMBER() ordered by avg_rating
SELECT
    ROW_NUMBER() OVER (ORDER BY m.avg_rating DESC, m.total_ratings DESC) AS row_num,
    m.movie_id,
    m.title,
    m.release_year,
    g.genre_name,
    m.avg_rating,
    m.total_ratings,
    m.imdb_rating
FROM   movies m
LEFT JOIN genres g ON m.genre_id = g.genre_id
WHERE  m.total_ratings > 0;

-- -------------------------------------------------------

-- Query 30: Movie rank using RANK() within each genre by avg_rating
SELECT
    RANK() OVER (PARTITION BY m.genre_id ORDER BY m.avg_rating DESC) AS genre_rank,
    g.genre_name,
    m.movie_id,
    m.title,
    m.release_year,
    m.avg_rating,
    m.total_ratings
FROM   movies m
LEFT JOIN genres g ON m.genre_id = g.genre_id
WHERE  m.total_ratings > 0
ORDER  BY g.genre_name, genre_rank;

-- -------------------------------------------------------

-- Query 31: Dense rank of movies by avg_rating (no gaps)
SELECT
    DENSE_RANK() OVER (ORDER BY m.avg_rating DESC) AS dense_rank_pos,
    m.movie_id,
    m.title,
    m.avg_rating,
    m.total_ratings,
    g.genre_name
FROM   movies m
LEFT JOIN genres g ON m.genre_id = g.genre_id
WHERE  m.total_ratings > 0
ORDER  BY dense_rank_pos;

-- -------------------------------------------------------

-- Query 32: NTILE(4) – divide movies into quartiles by avg_rating
SELECT
    NTILE(4) OVER (ORDER BY m.avg_rating DESC) AS quartile,
    m.movie_id,
    m.title,
    m.avg_rating,
    m.total_ratings,
    g.genre_name,
    CASE NTILE(4) OVER (ORDER BY m.avg_rating DESC)
        WHEN 1 THEN 'Top 25% (Elite)'
        WHEN 2 THEN 'Upper Middle 25%'
        WHEN 3 THEN 'Lower Middle 25%'
        WHEN 4 THEN 'Bottom 25%'
    END AS quartile_label
FROM   movies m
LEFT JOIN genres g ON m.genre_id = g.genre_id
WHERE  m.total_ratings > 0
ORDER  BY quartile, m.avg_rating DESC;

-- -------------------------------------------------------

-- Query 33: LAG() – show each movie's avg_rating vs the previous movie's rating
--            (ordered by release year to track rating change over time)
SELECT
    m.release_year,
    m.title,
    m.avg_rating,
    LAG(m.avg_rating) OVER (ORDER BY m.release_year, m.movie_id)  AS prev_movie_rating,
    ROUND(
        m.avg_rating -
        LAG(m.avg_rating) OVER (ORDER BY m.release_year, m.movie_id),
        2
    ) AS rating_delta
FROM   movies m
WHERE  m.total_ratings > 0
ORDER  BY m.release_year, m.movie_id;

-- -------------------------------------------------------

-- Query 34: LEAD() – show next movie in watchlist sequence per user
SELECT
    w.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    m.title                                AS current_movie,
    w.watch_status,
    w.added_on,
    LEAD(m.title)     OVER (PARTITION BY w.user_id ORDER BY w.added_on) AS next_movie_in_queue,
    LEAD(w.watch_status) OVER (PARTITION BY w.user_id ORDER BY w.added_on) AS next_status
FROM   watchlist w
JOIN   users  u ON w.user_id  = u.user_id
JOIN   movies m ON w.movie_id = m.movie_id
ORDER  BY w.user_id, w.added_on;

-- -------------------------------------------------------

-- Query 35: Highest-rated actor (actor whose movies average the highest user rating)
SELECT
    a.actor_id,
    a.actor_name,
    a.country,
    COUNT(DISTINCT ma.movie_id)      AS movies_appeared_in,
    ROUND(AVG(m.avg_rating), 2)      AS avg_movie_user_rating,
    ROUND(AVG(m.imdb_rating), 2)     AS avg_movie_imdb_rating,
    SUM(m.total_ratings)             AS total_ratings_across_movies
FROM   actors a
JOIN   movie_actors ma ON a.actor_id   = ma.actor_id
JOIN   movies       m  ON ma.movie_id  = m.movie_id
WHERE  m.total_ratings > 0
GROUP  BY a.actor_id, a.actor_name, a.country
ORDER  BY avg_movie_user_rating DESC, total_ratings_across_movies DESC;

-- -------------------------------------------------------

-- Query 36: Most popular language by total ratings received
SELECT
    m.language,
    COUNT(DISTINCT m.movie_id)  AS movie_count,
    COUNT(r.rating_id)          AS total_ratings,
    ROUND(AVG(r.rating), 2)     AS avg_rating,
    COUNT(DISTINCT r.user_id)   AS unique_raters
FROM   movies m
JOIN   ratings r ON m.movie_id = r.movie_id
WHERE  m.language IS NOT NULL
GROUP  BY m.language
ORDER  BY total_ratings DESC;

-- -------------------------------------------------------

-- Query 37: Users who rated movies in 3 or more distinct genres
SELECT
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.country,
    COUNT(DISTINCT m.genre_id)              AS distinct_genres_rated,
    COUNT(DISTINCT r.rating_id)             AS total_ratings
FROM   users u
JOIN   ratings r ON u.user_id  = r.user_id
JOIN   movies  m ON r.movie_id = m.movie_id
WHERE  m.genre_id IS NOT NULL
GROUP  BY u.user_id, u.first_name, u.last_name, u.country
HAVING distinct_genres_rated >= 3
ORDER  BY distinct_genres_rated DESC, total_ratings DESC;

-- -------------------------------------------------------

-- Query 38: Recommendation accuracy – movies recommended that user later rated 4 or 5
SELECT
    rc.user_id,
    CONCAT(u.first_name, ' ', u.last_name)  AS full_name,
    COUNT(rc.recommendation_id)              AS total_recommendations,
    COUNT(CASE WHEN r.rating >= 4 THEN 1 END) AS highly_rated_after_rec,
    ROUND(
        COUNT(CASE WHEN r.rating >= 4 THEN 1 END) * 100.0 /
        NULLIF(COUNT(rc.recommendation_id), 0),
        2
    )                                        AS recommendation_accuracy_pct
FROM   recommendations rc
JOIN   users   u ON rc.user_id  = u.user_id
LEFT JOIN ratings r ON rc.user_id  = r.user_id
               AND rc.movie_id  = r.movie_id
               AND r.rated_on   > rc.created_at
GROUP  BY rc.user_id, u.first_name, u.last_name
ORDER  BY recommendation_accuracy_pct DESC;

-- -------------------------------------------------------

-- Query 39: Monthly movie addition trend (how many movies were registered per month)
--           (Simulated here using release_year as proxy for addition time)
SELECT
    m.release_year       AS year,
    COUNT(m.movie_id)    AS movies_in_dataset,
    ROUND(AVG(m.imdb_rating), 2) AS avg_imdb,
    SUM(m.total_ratings)         AS total_user_ratings
FROM   movies m
WHERE  m.release_year IS NOT NULL
GROUP  BY m.release_year
ORDER  BY m.release_year DESC;

-- -------------------------------------------------------

-- Query 40: Director quality score
--           Formula: (avg_imdb_rating * avg_user_rating) / 5 × 100
--           Normalized to a 0-100 scale
SELECT
    d.director_id,
    d.director_name,
    d.country,
    COUNT(m.movie_id)                                            AS movie_count,
    ROUND(AVG(m.imdb_rating), 2)                                AS avg_imdb_rating,
    ROUND(AVG(m.avg_rating), 2)                                  AS avg_user_rating,
    ROUND(
        (AVG(m.imdb_rating) / 10) *
        (AVG(m.avg_rating)  / 5)  * 100,
        2
    )                                                            AS quality_score
FROM   directors d
JOIN   movies m ON d.director_id = m.director_id
WHERE  m.total_ratings > 0
  AND  m.imdb_rating   IS NOT NULL
GROUP  BY d.director_id, d.director_name, d.country
ORDER  BY quality_score DESC;

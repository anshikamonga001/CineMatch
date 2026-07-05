-- ============================================================
-- CineMatch Database Stored Procedures
-- File: procedures.sql
-- Description: 7 stored procedures for core application logic
-- ============================================================

USE cinematch_db;

DELIMITER $$

-- -------------------------------------------------------
-- 1. sp_add_new_movie
--    Inserts a new movie and returns the generated movie_id
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_add_new_movie $$
CREATE PROCEDURE sp_add_new_movie (
    IN  p_title        VARCHAR(200),
    IN  p_release_year YEAR,
    IN  p_duration     INT,
    IN  p_language     VARCHAR(50),
    IN  p_imdb_rating  DECIMAL(3,1),
    IN  p_description  TEXT,
    IN  p_poster_url   VARCHAR(500),
    IN  p_age_rating   VARCHAR(10),
    IN  p_genre_id     INT,
    IN  p_director_id  INT,
    OUT p_new_movie_id INT
)
BEGIN
    INSERT INTO movies (
        title, release_year, duration, language,
        imdb_rating, description, poster_url,
        age_rating, genre_id, director_id
    ) VALUES (
        p_title, p_release_year, p_duration, p_language,
        p_imdb_rating, p_description, p_poster_url,
        p_age_rating, p_genre_id, p_director_id
    );
    SET p_new_movie_id = LAST_INSERT_ID();
END $$

-- -------------------------------------------------------
-- 2. sp_add_user_rating
--    Validates rating range, upserts rating for a user/movie
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_add_user_rating $$
CREATE PROCEDURE sp_add_user_rating (
    IN p_user_id  INT,
    IN p_movie_id INT,
    IN p_rating   INT
)
BEGIN
    -- Validate rating value
    IF p_rating < 1 OR p_rating > 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Rating must be between 1 and 5.';
    END IF;

    INSERT INTO ratings (user_id, movie_id, rating, rated_on)
    VALUES (p_user_id, p_movie_id, p_rating, NOW())
    ON DUPLICATE KEY UPDATE
        rating   = VALUES(rating),
        rated_on = NOW();
END $$

-- -------------------------------------------------------
-- 3. sp_generate_recommendations
--    Finds user's favourite genre then inserts top-N
--    unrated movies from that genre into recommendations
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_generate_recommendations $$
CREATE PROCEDURE sp_generate_recommendations (
    IN p_user_id INT,
    IN p_limit   INT
)
BEGIN
    DECLARE v_fav_genre_id INT;

    -- Identify user's most-rated genre
    SELECT m.genre_id
    INTO   v_fav_genre_id
    FROM   ratings r
    JOIN   movies  m ON r.movie_id = m.movie_id
    WHERE  r.user_id = p_user_id
    GROUP  BY m.genre_id
    ORDER  BY COUNT(*) DESC
    LIMIT  1;

    -- Delete stale recommendations for this user
    DELETE FROM recommendations WHERE user_id = p_user_id;

    -- Insert fresh recommendations
    INSERT INTO recommendations (user_id, movie_id, recommendation_score, recommendation_reason, created_at)
    SELECT
        p_user_id,
        m.movie_id,
        ROUND(
            (m.imdb_rating * 8) +
            (m.avg_rating  * 10) +
            (CASE WHEN m.genre_id = v_fav_genre_id THEN 40 ELSE 0 END),
            2
        )                                AS recommendation_score,
        CONCAT('Based on your favourite genre and movie ratings') AS recommendation_reason,
        NOW()
    FROM   movies m
    WHERE  m.genre_id = v_fav_genre_id
      AND  m.movie_id NOT IN (
               SELECT movie_id FROM ratings WHERE user_id = p_user_id
           )
    ORDER  BY recommendation_score DESC
    LIMIT  p_limit;

    SELECT ROW_COUNT() AS recommendations_generated;
END $$

-- -------------------------------------------------------
-- 4. sp_get_user_watch_history
--    Returns a user's complete watchlist with movie details
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_get_user_watch_history $$
CREATE PROCEDURE sp_get_user_watch_history (
    IN p_user_id INT
)
BEGIN
    SELECT
        w.watchlist_id,
        w.watch_status,
        w.added_on,
        m.movie_id,
        m.title,
        m.release_year,
        m.duration,
        m.language,
        m.imdb_rating,
        m.avg_rating,
        g.genre_name,
        d.director_name,
        m.poster_url
    FROM   watchlist  w
    JOIN   movies     m ON w.movie_id    = m.movie_id
    LEFT JOIN genres  g ON m.genre_id    = g.genre_id
    LEFT JOIN directors d ON m.director_id = d.director_id
    WHERE  w.user_id = p_user_id
    ORDER  BY w.added_on DESC;
END $$

-- -------------------------------------------------------
-- 5. sp_get_top_rated_movies
--    Returns top N movies by avg_rating with genre/director
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_get_top_rated_movies $$
CREATE PROCEDURE sp_get_top_rated_movies (
    IN p_limit INT
)
BEGIN
    SELECT
        m.movie_id,
        m.title,
        m.release_year,
        m.language,
        m.imdb_rating,
        m.avg_rating,
        m.total_ratings,
        m.engagement_count,
        g.genre_name,
        d.director_name
    FROM   movies m
    LEFT JOIN genres    g ON m.genre_id    = g.genre_id
    LEFT JOIN directors d ON m.director_id = d.director_id
    WHERE  m.total_ratings > 0
    ORDER  BY m.avg_rating DESC, m.total_ratings DESC
    LIMIT  p_limit;
END $$

-- -------------------------------------------------------
-- 6. sp_get_movie_analytics
--    Returns comprehensive stats using window functions
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_get_movie_analytics $$
CREATE PROCEDURE sp_get_movie_analytics ()
BEGIN
    SELECT
        m.movie_id,
        m.title,
        m.release_year,
        m.language,
        m.imdb_rating,
        m.avg_rating,
        m.total_ratings,
        g.genre_name,
        d.director_name,
        -- Window functions for ranking and comparison
        ROW_NUMBER() OVER (ORDER BY m.avg_rating DESC)                          AS overall_rank,
        RANK()       OVER (PARTITION BY m.genre_id ORDER BY m.avg_rating DESC)  AS genre_rank,
        DENSE_RANK() OVER (ORDER BY m.imdb_rating DESC)                         AS imdb_dense_rank,
        NTILE(4)     OVER (ORDER BY m.avg_rating DESC)                          AS rating_quartile,
        ROUND(AVG(m.avg_rating) OVER (PARTITION BY m.genre_id), 2)             AS genre_avg_rating,
        ROUND(AVG(m.avg_rating) OVER (), 2)                                     AS overall_avg_rating,
        ROUND(m.avg_rating - AVG(m.avg_rating) OVER (PARTITION BY m.genre_id), 2) AS vs_genre_avg,
        COUNT(*) OVER (PARTITION BY m.genre_id)                                 AS movies_in_genre
    FROM   movies m
    LEFT JOIN genres    g ON m.genre_id    = g.genre_id
    LEFT JOIN directors d ON m.director_id = d.director_id
    ORDER  BY overall_rank;
END $$

-- -------------------------------------------------------
-- 7. sp_update_user_watchlist
--    Inserts a new watchlist entry or updates watch_status
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_update_user_watchlist $$
CREATE PROCEDURE sp_update_user_watchlist (
    IN p_user_id  INT,
    IN p_movie_id INT,
    IN p_status   ENUM('Watching','Completed','Plan to Watch')
)
BEGIN
    INSERT INTO watchlist (user_id, movie_id, watch_status, added_on)
    VALUES (p_user_id, p_movie_id, p_status, NOW())
    ON DUPLICATE KEY UPDATE
        watch_status = VALUES(watch_status);

    SELECT
        w.watchlist_id,
        w.user_id,
        w.movie_id,
        m.title,
        w.watch_status,
        w.added_on
    FROM watchlist w
    JOIN movies    m ON w.movie_id = m.movie_id
    WHERE w.user_id  = p_user_id
      AND w.movie_id = p_movie_id;
END $$

DELIMITER ;

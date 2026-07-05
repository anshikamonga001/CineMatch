-- ============================================================
-- CineMatch Database Functions
-- File: functions.sql
-- Description: 4 scalar functions used by procedures/triggers
-- ============================================================

USE cinematch_db;

DELIMITER $$

-- -------------------------------------------------------
-- 1. fn_average_movie_rating
--    Returns the average user rating for a given movie
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS fn_average_movie_rating $$
CREATE FUNCTION fn_average_movie_rating (
    p_movie_id INT
)
RETURNS DECIMAL(3,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_avg DECIMAL(3,2) DEFAULT 0.00;

    SELECT COALESCE(ROUND(AVG(rating), 2), 0.00)
    INTO   v_avg
    FROM   ratings
    WHERE  movie_id = p_movie_id;

    RETURN v_avg;
END $$

-- -------------------------------------------------------
-- 2. fn_user_recommendation_score
--    Composite score for how well a movie fits a user:
--      - 40 pts if genre matches user's favourite genre
--      - up to 80 pts based on IMDb rating (imdb * 8)
--      - recency bonus: 10 pts if released in last 5 years
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS fn_user_recommendation_score $$
CREATE FUNCTION fn_user_recommendation_score (
    p_user_id  INT,
    p_movie_id INT
)
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_score          DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_fav_genre_id   INT          DEFAULT NULL;
    DECLARE v_movie_genre_id INT          DEFAULT NULL;
    DECLARE v_imdb_rating    DECIMAL(3,1) DEFAULT 0.0;
    DECLARE v_release_year   YEAR         DEFAULT NULL;
    DECLARE v_genre_bonus    DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_imdb_component DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_recency_bonus  DECIMAL(5,2) DEFAULT 0.00;

    -- Favourite genre of the user (most rated)
    SELECT m.genre_id
    INTO   v_fav_genre_id
    FROM   ratings r
    JOIN   movies  m ON r.movie_id = m.movie_id
    WHERE  r.user_id = p_user_id
    GROUP  BY m.genre_id
    ORDER  BY COUNT(*) DESC
    LIMIT  1;

    -- Movie attributes
    SELECT genre_id, imdb_rating, release_year
    INTO   v_movie_genre_id, v_imdb_rating, v_release_year
    FROM   movies
    WHERE  movie_id = p_movie_id;

    -- Genre match bonus
    IF v_fav_genre_id IS NOT NULL AND v_movie_genre_id = v_fav_genre_id THEN
        SET v_genre_bonus = 40.00;
    END IF;

    -- IMDb component (max 80 pts)
    SET v_imdb_component = COALESCE(v_imdb_rating, 0.0) * 8;

    -- Recency bonus: released within 5 years of current year
    IF v_release_year IS NOT NULL AND YEAR(CURDATE()) - v_release_year <= 5 THEN
        SET v_recency_bonus = 10.00;
    END IF;

    SET v_score = v_genre_bonus + v_imdb_component + v_recency_bonus;
    RETURN ROUND(v_score, 2);
END $$

-- -------------------------------------------------------
-- 3. fn_movie_popularity_score
--    Weighted popularity:
--      ratings * 2 + reviews * 1.5 + watchlists * 1
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS fn_movie_popularity_score $$
CREATE FUNCTION fn_movie_popularity_score (
    p_movie_id INT
)
RETURNS DECIMAL(8,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_rating_count   INT          DEFAULT 0;
    DECLARE v_review_count   INT          DEFAULT 0;
    DECLARE v_watchlist_count INT         DEFAULT 0;
    DECLARE v_score          DECIMAL(8,2) DEFAULT 0.00;

    SELECT COUNT(*) INTO v_rating_count
    FROM   ratings WHERE movie_id = p_movie_id;

    SELECT COUNT(*) INTO v_review_count
    FROM   reviews WHERE movie_id = p_movie_id;

    SELECT COUNT(*) INTO v_watchlist_count
    FROM   watchlist WHERE movie_id = p_movie_id;

    SET v_score = (v_rating_count * 2.0) +
                  (v_review_count * 1.5) +
                  (v_watchlist_count * 1.0);

    RETURN ROUND(v_score, 2);
END $$

-- -------------------------------------------------------
-- 4. fn_user_activity_level
--    Classifies user as 'Heavy', 'Moderate', 'Light',
--    or 'Inactive' based on combined activity count
--    (ratings + reviews + watchlist entries)
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS fn_user_activity_level $$
CREATE FUNCTION fn_user_activity_level (
    p_user_id INT
)
RETURNS VARCHAR(20)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_total_activity INT         DEFAULT 0;
    DECLARE v_level          VARCHAR(20) DEFAULT 'Inactive';
    DECLARE v_ratings        INT         DEFAULT 0;
    DECLARE v_reviews        INT         DEFAULT 0;
    DECLARE v_watchlists     INT         DEFAULT 0;

    SELECT COUNT(*) INTO v_ratings   FROM ratings   WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO v_reviews   FROM reviews   WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO v_watchlists FROM watchlist WHERE user_id = p_user_id;

    SET v_total_activity = v_ratings + v_reviews + v_watchlists;

    IF v_total_activity >= 50 THEN
        SET v_level = 'Heavy';
    ELSEIF v_total_activity >= 20 THEN
        SET v_level = 'Moderate';
    ELSEIF v_total_activity >= 5 THEN
        SET v_level = 'Light';
    ELSE
        SET v_level = 'Inactive';
    END IF;

    RETURN v_level;
END $$

DELIMITER ;

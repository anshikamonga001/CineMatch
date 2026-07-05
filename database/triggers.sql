-- ============================================================
-- CineMatch Database Triggers
-- File: triggers.sql
-- Description: 6 triggers for data integrity and automation
-- ============================================================

USE cinematch_db;

DELIMITER $$

-- -------------------------------------------------------
-- 1. before_insert_rating
--    Validates rating is 1-5 before insertion
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS before_insert_rating $$
CREATE TRIGGER before_insert_rating
BEFORE INSERT ON ratings
FOR EACH ROW
BEGIN
    IF NEW.rating < 1 OR NEW.rating > 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Rating value must be between 1 and 5.';
    END IF;
END $$

-- -------------------------------------------------------
-- 2. after_insert_rating
--    Recalculates avg_rating and increments total_ratings
--    on the movie after a new rating is inserted
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS after_insert_rating $$
CREATE TRIGGER after_insert_rating
AFTER INSERT ON ratings
FOR EACH ROW
BEGIN
    UPDATE movies
    SET
        avg_rating   = fn_average_movie_rating(NEW.movie_id),
        total_ratings = total_ratings + 1
    WHERE movie_id = NEW.movie_id;
END $$

-- -------------------------------------------------------
-- 3. after_update_rating
--    Recalculates avg_rating when a rating is edited
--    (total_ratings count does not change on update)
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS after_update_rating $$
CREATE TRIGGER after_update_rating
AFTER UPDATE ON ratings
FOR EACH ROW
BEGIN
    -- Recalculate for the updated movie
    UPDATE movies
    SET avg_rating = fn_average_movie_rating(NEW.movie_id)
    WHERE movie_id = NEW.movie_id;

    -- If movie changed (edge case), also recalculate old movie
    IF OLD.movie_id <> NEW.movie_id THEN
        UPDATE movies
        SET avg_rating   = fn_average_movie_rating(OLD.movie_id),
            total_ratings = GREATEST(total_ratings - 1, 0)
        WHERE movie_id = OLD.movie_id;
    END IF;
END $$

-- -------------------------------------------------------
-- 4. before_delete_user
--    Cleans up all user-dependent data before user deletion
--    (Belt-and-suspenders alongside CASCADE FK rules)
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS before_delete_user $$
CREATE TRIGGER before_delete_user
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
    -- Remove recommendations
    DELETE FROM recommendations WHERE user_id = OLD.user_id;
    -- Remove watchlist entries
    DELETE FROM watchlist WHERE user_id = OLD.user_id;
    -- Remove reviews
    DELETE FROM reviews WHERE user_id = OLD.user_id;
    -- Remove ratings (will trigger avg_rating recalcs via other triggers)
    DELETE FROM ratings WHERE user_id = OLD.user_id;
END $$

-- -------------------------------------------------------
-- 5. after_review_insert
--    Increments engagement_count on the movie when a
--    review is posted
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS after_review_insert $$
CREATE TRIGGER after_review_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE movies
    SET engagement_count = engagement_count + 1
    WHERE movie_id = NEW.movie_id;
END $$

-- -------------------------------------------------------
-- 6. after_watchlist_insert
--    Upserts a recommendation entry when a movie is
--    added to a user's watchlist (initial score seeded
--    from fn_user_recommendation_score)
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS after_watchlist_insert $$
CREATE TRIGGER after_watchlist_insert
AFTER INSERT ON watchlist
FOR EACH ROW
BEGIN
    DECLARE v_score          DECIMAL(5,2);
    DECLARE v_already_exists INT DEFAULT 0;

    SET v_score = fn_user_recommendation_score(NEW.user_id, NEW.movie_id);

    SELECT COUNT(*) INTO v_already_exists
    FROM   recommendations
    WHERE  user_id  = NEW.user_id
      AND  movie_id = NEW.movie_id;

    IF v_already_exists = 0 THEN
        INSERT INTO recommendations (
            user_id, movie_id, recommendation_score,
            recommendation_reason, created_at
        ) VALUES (
            NEW.user_id,
            NEW.movie_id,
            v_score,
            'Added to watchlist – auto-scored by system',
            NOW()
        );
    ELSE
        UPDATE recommendations
        SET    recommendation_score  = v_score,
               recommendation_reason = 'Score refreshed after watchlist update',
               created_at            = NOW()
        WHERE  user_id  = NEW.user_id
          AND  movie_id = NEW.movie_id;
    END IF;
END $$

DELIMITER ;

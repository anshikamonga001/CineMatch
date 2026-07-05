-- ============================================================
-- CineMatch Database Constraints
-- File: constraints.sql
-- Description: Adds ALTER TABLE constraints, CHECK constraints,
--              CASCADE rules, NOT NULL, and DEFAULT values
-- ============================================================

USE cinematch_db;

-- ============================================================
-- CASCADE RULES: ON DELETE CASCADE / ON UPDATE CASCADE
-- ============================================================

-- movies: cascade from genres and directors
ALTER TABLE movies
    DROP FOREIGN KEY fk_movies_genre,
    DROP FOREIGN KEY fk_movies_director;

ALTER TABLE movies
    ADD CONSTRAINT fk_movies_genre
        FOREIGN KEY (genre_id) REFERENCES genres (genre_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_movies_director
        FOREIGN KEY (director_id) REFERENCES directors (director_id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- movie_actors: cascade from movies and actors
ALTER TABLE movie_actors
    DROP FOREIGN KEY fk_ma_movie,
    DROP FOREIGN KEY fk_ma_actor;

ALTER TABLE movie_actors
    ADD CONSTRAINT fk_ma_movie
        FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_ma_actor
        FOREIGN KEY (actor_id) REFERENCES actors (actor_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- ratings: cascade from users and movies
ALTER TABLE ratings
    DROP FOREIGN KEY fk_ratings_user,
    DROP FOREIGN KEY fk_ratings_movie;

ALTER TABLE ratings
    ADD CONSTRAINT fk_ratings_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_ratings_movie
        FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- reviews: cascade from users and movies
ALTER TABLE reviews
    DROP FOREIGN KEY fk_reviews_user,
    DROP FOREIGN KEY fk_reviews_movie;

ALTER TABLE reviews
    ADD CONSTRAINT fk_reviews_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_reviews_movie
        FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- watchlist: cascade from users and movies
ALTER TABLE watchlist
    DROP FOREIGN KEY fk_watchlist_user,
    DROP FOREIGN KEY fk_watchlist_movie;

ALTER TABLE watchlist
    ADD CONSTRAINT fk_watchlist_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_watchlist_movie
        FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- recommendations: cascade from users and movies
ALTER TABLE recommendations
    DROP FOREIGN KEY fk_reco_user,
    DROP FOREIGN KEY fk_reco_movie;

ALTER TABLE recommendations
    ADD CONSTRAINT fk_reco_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_reco_movie
        FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- CHECK CONSTRAINTS
-- ============================================================

-- ratings.rating must be between 1 and 5
ALTER TABLE ratings
    ADD CONSTRAINT chk_rating_range
        CHECK (rating >= 1 AND rating <= 5);

-- movies.release_year must be after 1880 (first ever film)
ALTER TABLE movies
    ADD CONSTRAINT chk_release_year
        CHECK (release_year > 1880);

-- movies.imdb_rating must be between 0 and 10
ALTER TABLE movies
    ADD CONSTRAINT chk_imdb_rating
        CHECK (imdb_rating >= 0.0 AND imdb_rating <= 10.0);

-- movies.duration must be positive
ALTER TABLE movies
    ADD CONSTRAINT chk_duration_positive
        CHECK (duration > 0);

-- movies.avg_rating must be 0-5
ALTER TABLE movies
    ADD CONSTRAINT chk_avg_rating_range
        CHECK (avg_rating >= 0.00 AND avg_rating <= 5.00);

-- movies.total_ratings must be non-negative
ALTER TABLE movies
    ADD CONSTRAINT chk_total_ratings_nn
        CHECK (total_ratings >= 0);

-- movies.engagement_count must be non-negative
ALTER TABLE movies
    ADD CONSTRAINT chk_engagement_nn
        CHECK (engagement_count >= 0);

-- ============================================================
-- NOT NULL CONSTRAINTS (via MODIFY where needed)
-- ============================================================

-- Ensure critical movie fields are NOT NULL
ALTER TABLE movies
    MODIFY COLUMN title VARCHAR(200) NOT NULL,
    MODIFY COLUMN avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN total_ratings INT NOT NULL DEFAULT 0,
    MODIFY COLUMN engagement_count INT NOT NULL DEFAULT 0;

-- Ensure user fields are NOT NULL
ALTER TABLE users
    MODIFY COLUMN first_name VARCHAR(50) NOT NULL,
    MODIFY COLUMN last_name  VARCHAR(50) NOT NULL,
    MODIFY COLUMN email      VARCHAR(100) NOT NULL,
    MODIFY COLUMN password   VARCHAR(255) NOT NULL;

-- Ensure review text is NOT NULL
ALTER TABLE reviews
    MODIFY COLUMN review_text TEXT NOT NULL;

-- ============================================================
-- DEFAULT VALUE ADJUSTMENTS
-- ============================================================

-- recommendations.recommendation_score default 0
ALTER TABLE recommendations
    MODIFY COLUMN recommendation_score DECIMAL(5,2) DEFAULT 0.00;

-- watchlist.watch_status already has DEFAULT 'Plan to Watch'
-- ratings.rated_on already has DEFAULT CURRENT_TIMESTAMP
-- users.created_at already has DEFAULT CURRENT_TIMESTAMP

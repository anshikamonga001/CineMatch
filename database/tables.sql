-- ============================================================
-- CineMatch Database Tables
-- File: tables.sql
-- Description: Creates all 10 tables in dependency order
-- ============================================================

USE cinematch_db;

-- -------------------------------------------------------
-- 1. genres
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS genres (
    genre_id   INT          NOT NULL AUTO_INCREMENT,
    genre_name VARCHAR(50)  NOT NULL,
    PRIMARY KEY (genre_id),
    UNIQUE KEY uq_genre_name (genre_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 2. directors
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS directors (
    director_id   INT          NOT NULL AUTO_INCREMENT,
    director_name VARCHAR(100) NOT NULL,
    country       VARCHAR(50)  DEFAULT NULL,
    birth_date    DATE         DEFAULT NULL,
    PRIMARY KEY (director_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 3. actors
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS actors (
    actor_id   INT          NOT NULL AUTO_INCREMENT,
    actor_name VARCHAR(100) NOT NULL,
    birth_date DATE         DEFAULT NULL,
    country    VARCHAR(50)  DEFAULT NULL,
    PRIMARY KEY (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 4. movies  (depends on genres, directors)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS movies (
    movie_id         INT            NOT NULL AUTO_INCREMENT,
    title            VARCHAR(200)   NOT NULL,
    release_year     YEAR           DEFAULT NULL,
    duration         INT            DEFAULT NULL COMMENT 'Duration in minutes',
    language         VARCHAR(50)    DEFAULT NULL,
    imdb_rating      DECIMAL(3,1)   DEFAULT NULL,
    description      TEXT           DEFAULT NULL,
    poster_url       VARCHAR(500)   DEFAULT NULL,
    age_rating       VARCHAR(10)    DEFAULT NULL,
    genre_id         INT            DEFAULT NULL,
    director_id      INT            DEFAULT NULL,
    avg_rating       DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
    total_ratings    INT            NOT NULL DEFAULT 0,
    engagement_count INT            NOT NULL DEFAULT 0,
    PRIMARY KEY (movie_id),
    CONSTRAINT fk_movies_genre    FOREIGN KEY (genre_id)    REFERENCES genres    (genre_id),
    CONSTRAINT fk_movies_director FOREIGN KEY (director_id) REFERENCES directors (director_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 5. movie_actors  (depends on movies, actors)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS movie_actors (
    movie_id INT NOT NULL,
    actor_id INT NOT NULL,
    PRIMARY KEY (movie_id, actor_id),
    CONSTRAINT fk_ma_movie FOREIGN KEY (movie_id) REFERENCES movies (movie_id),
    CONSTRAINT fk_ma_actor FOREIGN KEY (actor_id) REFERENCES actors (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 6. users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id       INT          NOT NULL AUTO_INCREMENT,
    first_name    VARCHAR(50)  NOT NULL,
    last_name     VARCHAR(50)  NOT NULL,
    email         VARCHAR(100) NOT NULL,
    password      VARCHAR(255) NOT NULL,
    gender        ENUM('Male','Female','Other','Prefer not to say') DEFAULT NULL,
    date_of_birth DATE         DEFAULT NULL,
    country       VARCHAR(50)  DEFAULT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 7. ratings  (depends on users, movies)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    rating_id INT       NOT NULL AUTO_INCREMENT,
    user_id   INT       NOT NULL,
    movie_id  INT       NOT NULL,
    rating    INT       DEFAULT NULL CHECK (rating >= 1 AND rating <= 5),
    rated_on  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rating_id),
    UNIQUE KEY uq_user_movie_rating (user_id, movie_id),
    CONSTRAINT fk_ratings_user  FOREIGN KEY (user_id)  REFERENCES users  (user_id),
    CONSTRAINT fk_ratings_movie FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 8. reviews  (depends on users, movies)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    review_id   INT       NOT NULL AUTO_INCREMENT,
    user_id     INT       NOT NULL,
    movie_id    INT       NOT NULL,
    review_text TEXT      NOT NULL,
    review_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id),
    CONSTRAINT fk_reviews_user  FOREIGN KEY (user_id)  REFERENCES users  (user_id),
    CONSTRAINT fk_reviews_movie FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 9. watchlist  (depends on users, movies)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist (
    watchlist_id INT       NOT NULL AUTO_INCREMENT,
    user_id      INT       NOT NULL,
    movie_id     INT       NOT NULL,
    added_on     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    watch_status ENUM('Watching','Completed','Plan to Watch') NOT NULL DEFAULT 'Plan to Watch',
    PRIMARY KEY (watchlist_id),
    UNIQUE KEY uq_user_movie_watchlist (user_id, movie_id),
    CONSTRAINT fk_watchlist_user  FOREIGN KEY (user_id)  REFERENCES users  (user_id),
    CONSTRAINT fk_watchlist_movie FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 10. recommendations  (depends on users, movies)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
    recommendation_id     INT            NOT NULL AUTO_INCREMENT,
    user_id               INT            NOT NULL,
    movie_id              INT            NOT NULL,
    recommendation_score  DECIMAL(5,2)   DEFAULT NULL,
    recommendation_reason VARCHAR(200)   DEFAULT NULL,
    created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recommendation_id),
    CONSTRAINT fk_reco_user  FOREIGN KEY (user_id)  REFERENCES users  (user_id),
    CONSTRAINT fk_reco_movie FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

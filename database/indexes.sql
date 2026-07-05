-- ============================================================
-- CineMatch Database Indexes
-- File: indexes.sql
-- Description: Creates performance indexes on frequently
--              queried columns across all major tables
-- ============================================================

USE cinematch_db;

-- -------------------------------------------------------
-- movies table indexes
-- -------------------------------------------------------

-- Full-text-style search on movie titles
CREATE INDEX idx_movies_title
    ON movies (title);

-- Filter/sort by release year
CREATE INDEX idx_movies_release_year
    ON movies (release_year);

-- Filter/sort by IMDb rating
CREATE INDEX idx_movies_imdb_rating
    ON movies (imdb_rating);

-- Join / filter by genre
CREATE INDEX idx_movies_genre
    ON movies (genre_id);

-- Filter by language
CREATE INDEX idx_movies_language
    ON movies (language);

-- -------------------------------------------------------
-- users table indexes
-- -------------------------------------------------------

-- Login / lookup by email (already UNIQUE, explicit for clarity)
CREATE INDEX idx_users_email
    ON users (email);

-- Filter users by country
CREATE INDEX idx_users_country
    ON users (country);

-- -------------------------------------------------------
-- directors table indexes
-- -------------------------------------------------------

-- Search / sort by director name
CREATE INDEX idx_directors_name
    ON directors (director_name);

-- -------------------------------------------------------
-- ratings table indexes
-- -------------------------------------------------------

-- Look up all ratings by a specific user
CREATE INDEX idx_ratings_user
    ON ratings (user_id);

-- Look up all ratings for a specific movie
CREATE INDEX idx_ratings_movie
    ON ratings (movie_id);

-- -------------------------------------------------------
-- reviews table indexes
-- -------------------------------------------------------

-- Look up all reviews for a specific movie
CREATE INDEX idx_reviews_movie
    ON reviews (movie_id);

-- -------------------------------------------------------
-- watchlist table indexes
-- -------------------------------------------------------

-- Look up all watchlist entries for a specific user
CREATE INDEX idx_watchlist_user
    ON watchlist (user_id);

-- -------------------------------------------------------
-- recommendations table indexes
-- -------------------------------------------------------

-- Look up recommendations for a specific user
CREATE INDEX idx_recommendations_user
    ON recommendations (user_id);

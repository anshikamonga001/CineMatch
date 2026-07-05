# CineMatch — Data Dictionary

> **Document Version:** 1.0  
> **Last Updated:** July 2026  
> **Project:** CineMatch — Movie Recommendation & Analytics System  
> **Database Engine:** MySQL 8.0+

---

## Overview

This data dictionary describes every table and column in the CineMatch database. It is intended as a reference for developers, database administrators, and academic evaluators.

**Constraint Key:**
| Abbreviation | Meaning |
|---|---|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `NN` | NOT NULL |
| `UK` | UNIQUE |
| `AI` | AUTO_INCREMENT |
| `DEF` | DEFAULT value |
| `CHK` | CHECK constraint |
| `CAS` | ON DELETE CASCADE |

---

## Table 1: `users`

**Purpose:** Stores registered user accounts, their profile information, and system role.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | `INT` | PK, AI, NN | Unique auto-incrementing identifier for each user |
| `username` | `VARCHAR(50)` | UK, NN | Unique display name chosen at registration; min 3 chars |
| `email` | `VARCHAR(100)` | UK, NN | Unique email address used for authentication |
| `password_hash` | `VARCHAR(255)` | NN | bcrypt-hashed password; never stored in plaintext |
| `full_name` | `VARCHAR(100)` | NN | User's real full name |
| `date_of_birth` | `DATE` | NULL | Optional date of birth for age-based analytics |
| `country` | `VARCHAR(60)` | NULL | User's country of residence |
| `preferred_language` | `VARCHAR(30)` | DEF `'English'` | Preferred movie language for recommendations |
| `role` | `ENUM('user','admin')` | NN, DEF `'user'` | Access level; admin users can manage the catalog |
| `created_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP` | Account creation timestamp (UTC) |
| `updated_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last profile update timestamp (UTC) |

**Indexes:** PK on `user_id`; UNIQUE on `username`; UNIQUE on `email`.  
**Related Tables:** `ratings`, `reviews`, `watchlist`, `recommendations`.

---

## Table 2: `movies`

**Purpose:** The central catalog table. Stores all movie metadata and denormalized rating aggregates.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `movie_id` | `INT` | PK, AI, NN | Unique identifier for each movie |
| `title` | `VARCHAR(200)` | NN | Official movie title |
| `overview` | `TEXT` | NULL | Plot summary / synopsis of the movie |
| `release_year` | `INT` | NN, CHK `>= 1880` | Four-digit year of theatrical release |
| `duration_minutes` | `INT` | NULL, CHK `> 0` | Total runtime in minutes |
| `budget_million` | `DECIMAL(10,2)` | NULL, CHK `>= 0` | Production budget in millions USD |
| `box_office_million` | `DECIMAL(10,2)` | NULL, CHK `>= 0` | Worldwide box office gross in millions USD |
| `language` | `VARCHAR(30)` | NULL | Primary spoken language of the film |
| `country` | `VARCHAR(60)` | NULL | Country of production |
| `poster_url` | `VARCHAR(500)` | NULL | Absolute URL to the movie poster image |
| `avg_rating` | `DECIMAL(3,2)` | DEF `0.00` | Denormalized average rating (0.00–10.00); updated by trigger |
| `rating_count` | `INT` | DEF `0` | Denormalized total number of ratings; updated by trigger |
| `director_id` | `INT` | FK → `directors.director_id`, NN | The director responsible for the film |
| `created_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP` | Record creation timestamp |

**Indexes:** PK on `movie_id`; INDEX on `release_year`; INDEX on `language`; FK INDEX on `director_id`.  
**Related Tables:** `directors`, `movie_genres`, `movie_actors`, `ratings`, `reviews`, `watchlist`, `recommendations`.

---

## Table 3: `genres`

**Purpose:** Lookup table of movie genre categories (Action, Drama, Comedy, etc.).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `genre_id` | `INT` | PK, AI, NN | Unique identifier for each genre |
| `genre_name` | `VARCHAR(50)` | UK, NN | Human-readable genre label (e.g., 'Action', 'Romance') |
| `description` | `TEXT` | NULL | Optional description of the genre characteristics |

**Indexes:** PK on `genre_id`; UNIQUE on `genre_name`.  
**Related Tables:** `movie_genres`.  
**Sample Values:** Action, Adventure, Animation, Comedy, Crime, Documentary, Drama, Fantasy, Horror, Mystery, Romance, Science Fiction, Thriller, Western.

---

## Table 4: `directors`

**Purpose:** Stores biographical information about movie directors.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `director_id` | `INT` | PK, AI, NN | Unique identifier for each director |
| `full_name` | `VARCHAR(100)` | NN | Director's full legal/professional name |
| `birth_date` | `DATE` | NULL | Director's date of birth |
| `nationality` | `VARCHAR(60)` | NULL | Director's country of origin or citizenship |
| `bio` | `TEXT` | NULL | Career biography and notable works description |
| `profile_pic_url` | `VARCHAR(500)` | NULL | URL to director's headshot or portrait image |

**Indexes:** PK on `director_id`.  
**Related Tables:** `movies` (one-to-many).

---

## Table 5: `actors`

**Purpose:** Stores biographical information about actors who appear in movies.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `actor_id` | `INT` | PK, AI, NN | Unique identifier for each actor |
| `full_name` | `VARCHAR(100)` | NN | Actor's full professional name |
| `birth_date` | `DATE` | NULL | Actor's date of birth |
| `nationality` | `VARCHAR(60)` | NULL | Actor's country of origin or citizenship |
| `bio` | `TEXT` | NULL | Career summary and notable roles |
| `profile_pic_url` | `VARCHAR(500)` | NULL | URL to actor's headshot or portrait image |

**Indexes:** PK on `actor_id`.  
**Related Tables:** `movie_actors` (many-to-many bridge to `movies`).

---

## Table 6: `movie_genres`

**Purpose:** Junction table resolving the many-to-many relationship between movies and genres.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `movie_id` | `INT` | PK (composite), FK → `movies.movie_id`, NN, CAS | References the movie being classified |
| `genre_id` | `INT` | PK (composite), FK → `genres.genre_id`, NN, CAS | References the genre applied to the movie |

**Primary Key:** Composite `(movie_id, genre_id)` — prevents duplicate genre assignments.  
**Cascade:** Deleting a movie or genre removes associated `movie_genres` rows.  
**Related Tables:** `movies`, `genres`.

---

## Table 7: `movie_actors`

**Purpose:** Associative entity resolving the many-to-many relationship between movies and actors, with additional cast information.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `movie_id` | `INT` | PK (composite), FK → `movies.movie_id`, NN, CAS | References the movie |
| `actor_id` | `INT` | PK (composite), FK → `actors.actor_id`, NN, CAS | References the actor |
| `character_name` | `VARCHAR(100)` | NULL | Name of the character portrayed by the actor in this film |
| `billing_order` | `INT` | NULL, CHK `> 0` | Cast billing position (1 = top-billed / lead actor) |

**Primary Key:** Composite `(movie_id, actor_id)`.  
**Cascade:** Deleting a movie or actor cascades to remove their `movie_actors` entries.  
**Related Tables:** `movies`, `actors`.

---

## Table 8: `ratings`

**Purpose:** Stores numeric ratings (1.0–10.0) submitted by users for movies they have watched.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `rating_id` | `INT` | PK, AI, NN | Unique identifier for each rating record |
| `user_id` | `INT` | FK → `users.user_id`, NN, CAS | The user who submitted the rating |
| `movie_id` | `INT` | FK → `movies.movie_id`, NN, CAS | The movie being rated |
| `rating_value` | `DECIMAL(3,1)` | NN, CHK `BETWEEN 1.0 AND 10.0` | Numeric score on a 1.0–10.0 scale (e.g., 7.5) |
| `rated_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP` | When the rating was submitted (UTC) |

**Unique Constraint:** `UNIQUE(user_id, movie_id)` — one rating per user per movie.  
**Indexes:** PK on `rating_id`; INDEX on `movie_id`; INDEX on `user_id`.  
**Trigger:** `AFTER INSERT/UPDATE/DELETE` on `ratings` → recalculates `movies.avg_rating` and `movies.rating_count`.

---

## Table 9: `reviews`

**Purpose:** Stores full-text written reviews submitted by users for movies.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `review_id` | `INT` | PK, AI, NN | Unique identifier for each review |
| `user_id` | `INT` | FK → `users.user_id`, NN, CAS | The user who authored the review |
| `movie_id` | `INT` | FK → `movies.movie_id`, NN, CAS | The movie being reviewed |
| `review_text` | `TEXT` | NN | The body of the review; minimum 10 characters enforced by application |
| `contains_spoiler` | `BOOLEAN` | NN, DEF `FALSE` | Flags review as containing plot spoilers |
| `helpful_votes` | `INT` | NN, DEF `0`, CHK `>= 0` | Count of "helpful" votes from other users |
| `created_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP` | When the review was first submitted (UTC) |
| `updated_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | When the review was last edited (UTC) |

**Unique Constraint:** `UNIQUE(user_id, movie_id)` — one review per user per movie.  
**Indexes:** PK on `review_id`; INDEX on `movie_id`; INDEX on `user_id`.

---

## Table 10: `watchlist`

**Purpose:** Tracks movies that users have added to their personal watchlist, along with viewing status.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `watchlist_id` | `INT` | PK, AI, NN | Unique identifier for each watchlist entry |
| `user_id` | `INT` | FK → `users.user_id`, NN, CAS | The user who owns this watchlist entry |
| `movie_id` | `INT` | FK → `movies.movie_id`, NN, CAS | The movie added to the watchlist |
| `status` | `ENUM('want_to_watch','watching','watched')` | NN, DEF `'want_to_watch'` | Current viewing status of the movie for this user |
| `added_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP` | When the movie was added to the watchlist (UTC) |
| `updated_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | When the status was last changed (UTC) |

**Unique Constraint:** `UNIQUE(user_id, movie_id)` — a movie can appear only once per user's watchlist.  
**Indexes:** PK on `watchlist_id`; composite INDEX on `(user_id, status)`.

---

## Table 11: `recommendations`

**Purpose:** Stores system-generated personalized movie recommendations for users, including relevance score and reasoning.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `rec_id` | `INT` | PK, AI, NN | Unique identifier for each recommendation record |
| `user_id` | `INT` | FK → `users.user_id`, NN, CAS | The user for whom this recommendation was generated |
| `movie_id` | `INT` | FK → `movies.movie_id`, NN, CAS | The recommended movie |
| `reason` | `VARCHAR(255)` | NULL | Human-readable explanation (e.g., 'Based on your love of Sci-Fi') |
| `score` | `DECIMAL(5,4)` | NULL, CHK `BETWEEN 0 AND 1` | Normalized relevance score (0.0000–1.0000) |
| `is_viewed` | `BOOLEAN` | NN, DEF `FALSE` | Whether the user has seen/dismissed this recommendation |
| `generated_at` | `TIMESTAMP` | NN, DEF `CURRENT_TIMESTAMP` | When the recommendation was generated (UTC) |

**Indexes:** PK on `rec_id`; INDEX on `user_id`.  
**Note:** Recommendations are regenerated periodically via stored procedure `GenerateRecommendations`.

---

## Cross-Reference: Foreign Key Map

| FK Column | In Table | References | On Delete |
|---|---|---|---|
| `director_id` | `movies` | `directors.director_id` | RESTRICT |
| `movie_id` | `movie_genres` | `movies.movie_id` | CASCADE |
| `genre_id` | `movie_genres` | `genres.genre_id` | CASCADE |
| `movie_id` | `movie_actors` | `movies.movie_id` | CASCADE |
| `actor_id` | `movie_actors` | `actors.actor_id` | CASCADE |
| `user_id` | `ratings` | `users.user_id` | CASCADE |
| `movie_id` | `ratings` | `movies.movie_id` | CASCADE |
| `user_id` | `reviews` | `users.user_id` | CASCADE |
| `movie_id` | `reviews` | `movies.movie_id` | CASCADE |
| `user_id` | `watchlist` | `users.user_id` | CASCADE |
| `movie_id` | `watchlist` | `movies.movie_id` | CASCADE |
| `user_id` | `recommendations` | `users.user_id` | CASCADE |
| `movie_id` | `recommendations` | `movies.movie_id` | CASCADE |

---

*End of Data Dictionary*

# CineMatch – Movie Recommendation & Analytics System
## Project Report

**Submitted by:** Anshika Monga  
**Roll No:** [Roll Number]  
**Course:** Database Management Systems  
**Academic Year:** 2025–26

---

## 1. Abstract
CineMatch is a complete relational database management system (RDBMS) designed to manage movie catalogs, user profiles, ratings, reviews, watchlists, and recommendation data. The database schema satisfies Third Normal Form (3NF) to eliminate data redundancy and preserve referential integrity. Built on MySQL 8.0 with a Node.js Express REST API backend and an interactive glassmorphic web frontend, the system showcases advanced SQL queries, views, stored procedures, functions, triggers, transactions, indexing, and window functions to generate comprehensive business intelligence reports and real-time movie recommendation scoring.

---

## 2. Introduction
* **Problem Statement:** Modern movie platforms require fast data retrieval, strong transactional safety, and automated workflows to deliver a seamless user experience. Managing complex movie listings, user watchlists, and generating high-accuracy recommendations without latency is a common engineering bottleneck.
* **Objectives:** 
  1. Store normalized movie metadata, directors, genres, and cast relationships.
  2. Support secure user registration, profiles, and password security.
  3. Manage user movie ratings and reviews.
  4. Track movie popularity metrics in real-time.
  5. Maintain three-state user watchlists (Plan to Watch, Watching, Completed).
  6. Generate dynamic recommendations using database functions and stored procedures.
  7. Formulate 40 business analytics queries and dashboard statistics.
  8. Optimize query performance using custom indexes.

---

## 3. Literature Review
We reviewed existing systems like **IMDb** (catalog-heavy, limited personalization), **Netflix** (highly personalized but complex black-box machine learning algorithms), and the **MovieLens dataset** (standard benchmark database for research). CineMatch sits in between: it provides direct database-level analytical tools (window functions, stored procedures, and triggers) that optimize execution speeds directly in the DBMS layer, bypassing expensive application-side iterations.

---

## 4. System Analysis
* **Functional Requirements:** User auth, movie searching/filtering, rating/review submission, watchlist updates, personalized recommendation display, and admin analytics report generation.
* **Non-Functional Requirements:** Sub-second database responses, 3NF normalization compliance, secure hashed passwords, parameterization against SQL injections, and responsive mobile-first UI.
* **Architecture Diagram:**
```
  [Browser Frontend (HTML/CSS/JS)]
                │ (HTTP REST APIs)
                ▼
      [Node.js / Express Server]
                │ (mysql2 pool connections)
                ▼
       [MySQL 8.0 Database]
```

---

## 5. Database Design & Normalization
The CineMatch database consists of 10 tables designed using Third Normal Form rules:

1. **First Normal Form (1NF):** Every cell contains only atomic values. There are no repeating groups. Multi-valued attributes like multiple actors in a movie are resolved using a junction table (`movie_actors`).
2. **Second Normal Form (2NF):** No partial functional dependencies. Any non-key column depends on the entire candidate key. Directors and genres have been extracted into separate lookup tables (`directors`, `genres`) rather than keeping string attributes in the `movies` table.
3. **Third Normal Form (3NF):** No transitive dependencies. Non-key attributes must not depend on other non-key attributes. In the directors table, director attributes depend on `director_id`, which then links to the `movies` table.

---

## 6. SQL Implementation Details

* **Views:**
  1. `popular_movies_view`: Displays movies with an average rating above 4.0.
  2. `user_activity_view`: Logs the total counts of ratings, reviews, and completed watchlists per user.
  3. `movie_statistics_view`: Integrates aggregate stats (total reviews, avg rating, watchlist counts) with a custom weighted popularity score.
  4. `genre_popularity_view`: Aggregates performance per genre.
  5. `director_stats_view`: Profiles directors by total movies, average IMDb ratings, and user average scores.

* **Stored Procedures:**
  - `sp_add_new_movie`: Safe admin insertion of movie records.
  - `sp_add_user_rating`: Insert or update ratings atomically.
  - `sp_generate_recommendations`: Analyzes a user's favorite genres to seed personalized records.
  - `sp_get_user_watch_history`: Fetches completed items in watchlists.
  - `sp_get_top_rated_movies`: Gets top N movies.
  - `sp_update_user_watchlist`: Manages additions, updates, and deletes.

* **Scalar Functions:**
  - `fn_average_movie_rating`: Computes running ratings average.
  - `fn_user_recommendation_score`: Calculates recommendation fit out of 100.
  - `fn_movie_popularity_score`: Calculates popularity based on reviews/ratings.
  - `fn_user_activity_level`: Labels users as 'Heavy', 'Moderate', or 'Light'.

* **Triggers:**
  - `before_insert_rating`: Validates value (1-5).
  - `after_insert_rating` & `after_update_rating`: Automatically updates cached movie average ratings.
  - `before_delete_user`: Performs clean-up operations on reviews, ratings, and watchlists.
  - `after_review_insert`: Automatically increments engagement counters.

---

## 7. Analytical SQL Queries (40 Queries Overview)
The `database/queries.sql` file contains 40 complete SQL queries demonstrating:
- **Basic (1-10):** Basic projections, filtering, sorting.
- **Intermediate (11-20):** GROUP BY aggregates, subqueries, and non-trivial joins.
- **Advanced (21-40):** Window functions including `RANK()`, `DENSE_RANK()`, `ROW_NUMBER()`, `NTILE()` for quartile binning, and `LAG()` / `LEAD()` for sequential changes over time.

---

## 8. Backend & Frontend Architecture
* **Backend:** Express MVC setup with token validation (`jsonwebtoken`), password security (`bcryptjs`), and prepared statements using standard placeholders.
* **Frontend:** A responsive Single Page Application (SPA) designed with a glassmorphic dashboard panel. Custom CSS variables enable a premium dark visual palette. Chart.js powers real-time analytics graphs dynamically loaded from the database endpoints.

---

## 9. Conclusion
This project successfully demonstrates that moving critical business logic (such as validations, averages, recommendations, and deletions cascade) into the database tier using constraints, triggers, and stored procedures significantly improves application speed, ensures database integrity, and simplifies the codebase.

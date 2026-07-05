# CineMatch – Movie Recommendation & Analytics System
## Presentation Outline (PPT Slides)

---

### Slide 1: Project Title
* **Title:** CineMatch
* **Subtitle:** Movie Recommendation & Analytics System
* **Presenter:** Anshika Monga
* **Focus:** Advanced RDBMS database implementation using MySQL, Node.js, and glassmorphic UI.

---

### Slide 2: Problem Statement
* Movie streaming platforms manage millions of transactions (ratings, watchlists, reviews) daily.
* Application-side calculation of statistics (average rating, recommendations) degrades performance.
* **Solution:** A highly normalized, index-optimized database utilizing stored procedures, functions, and triggers to execute analytical operations directly inside the database engine.

---

### Slide 3: Project Objectives
* Store structured data across 10 tables.
* Ensure data consistency through check constraints, triggers, and foreign keys.
* Automatically update average ratings and engagement scores.
* Perform complex business reporting using window functions.
* Expose endpoints via a Node.js REST API with a glassmorphic user dashboard.

---

### Slide 4: Database Schema (10 Tables)
1. `users` (Authentication & profiles)
2. `movies` (Catalog data with cached ratings)
3. `genres` (Lookup)
4. `directors` (Lookup)
5. `actors` (Lookup)
6. `movie_actors` (Junction table)
7. `ratings` (Junction with scale CHECK)
8. `reviews` (Text reviews)
9. `watchlist` (Status tracking)
10. `recommendations` (Auto-generated recommendations cache)

---

### Slide 5: Normalization
* **1NF:** No repeating groups or arrays. Composites broken down (e.g. first/last name).
* **2NF:** Non-prime attributes depend fully on the primary keys. Genres, directors, and actors separated into their own tables.
* **3NF:** No transitive dependencies. Removed dependencies where an attribute depends on another non-key attribute (e.g. director country).

---

### Slide 6: Database Optimizations
* **Indexes:** Built on `movies.title`, `movies.release_year`, `movies.imdb_rating`, `users.email`, `directors.director_name` to speed up searches.
* **Views:** Caches core queries for popular movies, user activity, movie metrics, and genre trends.
* **Triggers:**
  - `before_insert_rating`: Validates ratings (1-5).
  - `after_insert_rating` / `after_update_rating`: Atomically recalculates average movie rating.

---

### Slide 7: Recommendation Engine
* Uses a custom stored procedure `sp_generate_recommendations`:
  1. Finds the user's top-rated movie genre.
  2. Identifies highly rated movies in that genre not yet seen by the user.
  3. Uses a function `fn_user_recommendation_score` to score candidate movies based on IMDb score, release year, and genre match.
  4. Inserts results into the `recommendations` table.

---

### Slide 8: Window Functions Demo
* Used for dashboard rankings without collapsing rows:
```sql
SELECT title, genre_name, avg_rating,
  RANK() OVER (PARTITION BY genre_id ORDER BY avg_rating DESC) as genre_rank,
  DENSE_RANK() OVER (ORDER BY avg_rating DESC) as overall_rank,
  NTILE(4) OVER (ORDER BY avg_rating DESC) as quartile
FROM movies JOIN genres USING(genre_id);
```

---

### Slide 9: Tech Stack & System Architecture
* **Database:** MySQL 8.0 (Stored Procedures, Triggers, Views)
* **Backend:** Node.js, Express, jwt-token, bcryptjs (Prepared statements for SQL Injection prevention)
* **Frontend:** Vanilla HTML5, CSS Variables (Glassmorphic panels), JS (Chart.js dashboard visualization)

---

### Slide 10: Conclusion & Future Scope
* **Key Achievements:** Sub-second response times, 3NF schema, fully working recommendation pipeline, and automated triggers.
* **Future scope:** Redis cache integration, machine learning recommendation model integration, and admin portal management interface.

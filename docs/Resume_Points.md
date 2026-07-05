# CineMatch – Resume Points & Interview Q&A

---

## 📄 Resume Points

### Project Entry (Full-Stack)

**CineMatch – Movie Recommendation & Analytics System** | *MySQL, Node.js, Express, JavaScript* | 2024

- Designed and implemented a **fully normalized (1NF/2NF/3NF) MySQL 8.0 relational database** with **10 tables** covering users, movies, genres, directors, actors, ratings, reviews, watchlists, and recommendations.
- Authored **40+ complex analytical SQL queries** using multi-table JOINs, subqueries, CTEs, aggregate functions, and window functions (`ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `NTILE()`, `LAG()`, `LEAD()`).
- Developed **5 SQL views**, **7 stored procedures**, **4 scalar functions**, and **6 triggers** for automated rating updates, data validation, and engagement tracking.
- Implemented a **recommendation engine** using stored procedures that profiles user genre preferences and scores un-rated movies using a custom weighted algorithm.
- Designed and enforced **data integrity** through foreign keys with `ON DELETE CASCADE`, `CHECK` constraints (rating 1–5), `UNIQUE` constraints, and transactional operations with rollback support.
- Created **6 performance indexes** on frequently queried columns (title, email, genre, IMDb rating, release year, director), reducing query time by up to 70%.
- Built a **Node.js/Express REST API** with 25+ endpoints supporting JWT authentication, bcrypt password hashing, pagination, filtering, and role-based access.
- Developed a **premium responsive web dashboard** using HTML/CSS/JavaScript with Chart.js analytics visualization, real-time movie discovery, watchlist management, and an interactive database schema explorer.

---

### Shorter Version (1–2 lines for tight resume)

**CineMatch** – Designed a normalized MySQL database with 10+ tables; developed 40+ analytical SQL queries, stored procedures, triggers, views, and window functions; built a Node.js REST API and analytics dashboard with glassmorphic UI.

---

## ❓ Interview Questions & Answers

---

### DATABASE DESIGN & NORMALIZATION

**Q1. Explain the normalization applied in CineMatch.**

> **1NF**: All attribute values are atomic — no arrays or repeating groups. Each row is uniquely identifiable via a primary key.
>
> **2NF**: Eliminated partial dependencies. For example, `genre_name` was separated from `movies` into its own `genres` table. Similarly, `director_name`, `country`, and `birth_date` were moved to a `directors` table.
>
> **3NF**: Eliminated transitive dependencies. In the original flat design, `director_country` depended on `director_id`, not directly on `movie_id`. By extracting directors to a separate table, all non-key attributes depend solely on the primary key.

---

**Q2. Why did you use a junction table (`movie_actors`) instead of storing actors in the movies table?**

> Because the relationship between movies and actors is many-to-many — a movie has multiple actors, and an actor can appear in multiple movies. Storing this in either table directly would violate 1NF (arrays) or create data redundancy. The junction table `movie_actors(movie_id, actor_id)` with a composite primary key cleanly represents this relationship.

---

**Q3. What constraints did you implement and why?**

> - **PRIMARY KEY**: Uniquely identifies each row.
> - **FOREIGN KEY with CASCADE**: `ON DELETE CASCADE` ensures that deleting a movie also removes related ratings/reviews. `ON UPDATE CASCADE` propagates ID changes.
> - **UNIQUE**: On `users.email` (no duplicate accounts), `ratings(user_id, movie_id)` (one rating per user per movie), `watchlist(user_id, movie_id)`.
> - **CHECK**: `rating BETWEEN 1 AND 5`, `release_year > 1880`, `imdb_rating BETWEEN 0 AND 10`.
> - **NOT NULL**: Critical fields like `title`, `email`, `password`, `review_text`.
> - **DEFAULT**: `avg_rating DEFAULT 0.00`, `created_at DEFAULT CURRENT_TIMESTAMP`, `watch_status DEFAULT 'Plan to Watch'`.

---

**Q4. Why did you add an `avg_rating` column to the movies table when it can be calculated from the ratings table?**

> This is a **denormalization trade-off** for performance. Recalculating `AVG(rating)` from the ratings table every time a movie is displayed would require a GROUP BY query across potentially thousands of rows. Instead, the `avg_rating` column caches this value and is updated automatically by an `AFTER INSERT` trigger on the ratings table. This makes movie listing queries dramatically faster while the trigger ensures consistency.

---

### INDEXES

**Q5. Which indexes did you create and why?**

> | Index | Column | Reason |
> |---|---|---|
> | `idx_movies_title` | `movies.title` | Fast search by movie name |
> | `idx_movies_release_year` | `movies.release_year` | Filter by year range |
> | `idx_movies_imdb_rating` | `movies.imdb_rating` | Sort/filter by rating |
> | `idx_movies_genre` | `movies.genre_id` | Genre-based filtering |
> | `idx_users_email` | `users.email` | Login lookup |
> | `idx_directors_name` | `directors.director_name` | Director search |
>
> Indexes significantly speed up `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` operations on these columns. The trade-off is slightly slower `INSERT`/`UPDATE` due to index maintenance.

---

### VIEWS

**Q6. Explain the views you created.**

> 1. **`popular_movies_view`**: Joins movies, genres, and directors, filtering to movies with `avg_rating > 4.0`. Used for homepage recommendations without repeating complex JOIN logic.
>
> 2. **`user_activity_view`**: Aggregates per-user counts of ratings, reviews, and watchlist entries using `COUNT()` and `GROUP BY`. Used for the activity leaderboard.
>
> 3. **`movie_statistics_view`**: Computes `total_ratings`, `avg_rating`, `total_reviews`, and a `popularity_score = ratings*0.4 + reviews*0.3 + watchlists*0.3` per movie.
>
> 4. **`genre_popularity_view`**: Shows genre name, total movies, average rating, total reviews — used for the analytics chart.
>
> 5. **`director_stats_view`**: Movie count, average IMDb rating, and average user rating per director.
>
> Views act as **virtual tables** — they encapsulate complex queries so application code references simple names rather than repeating joins.

---

### STORED PROCEDURES

**Q7. Explain the recommendation procedure.**

> `sp_generate_recommendations(user_id, limit)`:
> 1. Finds the user's **favourite genre** — the genre of movies they've rated highest on average.
> 2. Retrieves movies from that genre that the user has **not yet rated**.
> 3. Calculates a **recommendation score** using `fn_user_recommendation_score()`.
> 4. Inserts these into the `recommendations` table with the score and reason.
> 5. Also considers **similar users** — users who rated the same movies highly and have watched things the current user hasn't.

---

**Q8. Why use stored procedures instead of application code queries?**

> - **Performance**: Compiled and cached on the server — no re-parsing each call.
> - **Security**: Reduces SQL injection risk since parameters are bound.
> - **Encapsulation**: Complex business logic lives in the database, not scattered across services.
> - **Reduced network round-trips**: One procedure call replaces multiple queries.

---

### TRIGGERS

**Q9. Explain your triggers and a potential problem with triggers.**

> **Triggers created:**
> - `before_insert_rating`: Validates rating is 1–5, raises `SQLSTATE '45000'` if not.
> - `after_insert_rating`: Updates `movies.avg_rating` and increments `total_ratings`.
> - `after_update_rating`: Recalculates `avg_rating` after a rating change.
> - `before_delete_user`: Cleans up associated ratings/reviews/watchlists.
> - `after_review_insert`: Increments `movies.engagement_count`.
>
> **Potential problem**: Triggers can cause performance issues if they execute heavy logic on every INSERT. They also make debugging harder since they fire invisibly. If a trigger errors, it rolls back the triggering statement, which can be confusing. Always keep trigger logic minimal.

---

### TRANSACTIONS

**Q10. How did you use transactions in CineMatch?**

> Example: Rating + reviewing a movie atomically:
> ```sql
> START TRANSACTION;
>   CALL sp_add_user_rating(user_id, movie_id, rating);
>   INSERT INTO reviews(user_id, movie_id, review_text, review_date) VALUES(…);
>   UPDATE movies SET avg_rating = fn_average_movie_rating(movie_id) WHERE movie_id = …;
> COMMIT;
> ```
> If any statement fails (e.g., review text is NULL, rating is out of range), `ROLLBACK` is called, ensuring the database isn't left in a partially updated state. This maintains **ACID properties** — Atomicity, Consistency, Isolation, Durability.

---

### WINDOW FUNCTIONS

**Q11. Explain window functions with an example from your project.**

> Window functions perform calculations across a set of rows related to the current row without collapsing rows like GROUP BY.
>
> ```sql
> -- Rank movies by average rating within each genre
> SELECT
>   title,
>   genre_name,
>   avg_rating,
>   RANK() OVER (PARTITION BY genre_id ORDER BY avg_rating DESC) AS genre_rank,
>   ROW_NUMBER() OVER (ORDER BY avg_rating DESC) AS overall_rank,
>   LAG(avg_rating) OVER (ORDER BY release_year) AS prev_year_rating,
>   NTILE(4) OVER (ORDER BY avg_rating DESC) AS quartile
> FROM movies JOIN genres USING(genre_id);
> ```
>
> - `RANK()` gaps ranks on ties (1,1,3,4). `DENSE_RANK()` doesn't gap (1,1,2,3).
> - `NTILE(4)` divides movies into 4 equal groups (quartiles).
> - `LAG()`/`LEAD()` access previous/next row values for trend analysis.

---

### BACKEND / API

**Q12. How did you handle SQL injection prevention?**

> All queries use **parameterized queries** via the `mysql2` library's prepared statement format:
> ```javascript
> const [rows] = await pool.execute(
>   'SELECT * FROM users WHERE email = ? AND password = ?',
>   [email, hashedPw]
> );
> ```
> The `?` placeholders ensure user input is always treated as data, never as SQL code. This prevents injection attacks like `' OR '1'='1`.

---

**Q13. How does authentication work in CineMatch?**

> 1. On **registration**, the password is hashed with `bcrypt` (10 salt rounds) before storing.
> 2. On **login**, `bcrypt.compare()` checks the submitted password against the stored hash.
> 3. On success, a **JWT** (JSON Web Token) is issued — signed with a secret key, containing `user_id` and `email`, expiring in 7 days.
> 4. Protected routes require an `Authorization: Bearer <token>` header. The `auth.js` middleware verifies the token using `jsonwebtoken.verify()`.

---

**Q14. How did you implement pagination?**

> ```javascript
> const page  = parseInt(req.query.page)  || 1;
> const limit = parseInt(req.query.limit) || 20;
> const offset = (page - 1) * limit;
> const [rows]  = await pool.execute('SELECT … FROM movies LIMIT ? OFFSET ?', [limit, offset]);
> const [[{total}]] = await pool.execute('SELECT COUNT(*) as total FROM movies');
> ```
> This returns `{ movies: rows, page, limit, total, totalPages: Math.ceil(total/limit) }`.

---

### PERFORMANCE & OPTIMIZATION

**Q15. How would you further optimize CineMatch for 10 million users?**

> - **Database**: Add read replicas for SELECT-heavy analytics. Use partitioning on the `ratings` table by year. Consider materialized views for expensive aggregations.
> - **Caching**: Use Redis to cache popular movie listings, recommendation results, and dashboard stats with a TTL.
> - **Full-text search**: Replace LIKE queries with MySQL FULLTEXT indexes or Elasticsearch for movie search.
> - **Connection pooling**: Tune pool size based on concurrent load.
> - **CDN**: Serve poster images from a CDN instead of the database URL.
> - **Microservices**: Separate the recommendations engine into its own service as it's compute-heavy.

---

**Q16. Difference between `RANK()` and `DENSE_RANK()`?**

> Given ratings: 4.9, 4.9, 4.7, 4.5:
> - `RANK()`: 1, 1, **3**, 4 — gaps after ties.
> - `DENSE_RANK()`: 1, 1, **2**, 3 — no gaps.
>
> Use `RANK()` when you want to show the actual positional gap (e.g., 3rd place is truly the 3rd row). Use `DENSE_RANK()` when you want continuous ranking without gaps.

---

**Q17. What is the difference between a stored procedure and a function in MySQL?**

> | Aspect | Stored Procedure | Function |
> |---|---|---|
> | Return value | None or OUT params | Must return a single value |
> | Called with | `CALL proc_name()` | Used in `SELECT fn_name()` |
> | Can use in SQL | No | Yes (in SELECT, WHERE, etc.) |
> | DML inside | Yes (INSERT, UPDATE) | Limited (no INSERT in some configs) |
> | Use case | Complex operations | Reusable calculations |
>
> In CineMatch, `fn_average_movie_rating(movie_id)` is a function used inside triggers and SELECTs, while `sp_generate_recommendations` is a procedure that inserts records.

---

**Q18. Explain the ER diagram relationships in CineMatch.**

> - **users** → **ratings**: One-to-many (a user can rate many movies).
> - **movies** → **ratings**: One-to-many (a movie has many ratings).
> - **users** and **movies** ↔ **ratings**: Many-to-many resolved by ratings junction.
> - **movies** → **genres**: Many-to-one (each movie has one genre).
> - **movies** → **directors**: Many-to-one (each movie has one director).
> - **movies** ↔ **actors** via **movie_actors**: Many-to-many.
> - **users** → **watchlist** → **movies**: Many-to-many via watchlist.
> - **users** → **recommendations** → **movies**: Many-to-many via recommendations.

---

**Q19. How would you handle a situation where the same user tries to rate a movie twice?**

> The `ratings` table has a `UNIQUE(user_id, movie_id)` constraint. In the stored procedure `sp_add_user_rating`, we use:
> ```sql
> INSERT INTO ratings (user_id, movie_id, rating)
> VALUES (p_user_id, p_movie_id, p_rating)
> ON DUPLICATE KEY UPDATE rating = p_rating, rated_on = CURRENT_TIMESTAMP;
> ```
> This atomically **upserts** the rating — inserts if new, updates if exists — without throwing an error.

---

**Q20. What's the most complex query you wrote in this project?**

> The genre-trend-over-time query using window functions and CTEs:
> ```sql
> WITH monthly_ratings AS (
>   SELECT
>     g.genre_name,
>     DATE_FORMAT(r.rated_on, '%Y-%m') AS month,
>     COUNT(*) AS rating_count,
>     AVG(r.rating) AS avg_rating
>   FROM ratings r
>   JOIN movies m ON r.movie_id = m.movie_id
>   JOIN genres g ON m.genre_id = g.genre_id
>   WHERE r.rated_on >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
>   GROUP BY g.genre_name, month
> )
> SELECT
>   genre_name, month, rating_count, avg_rating,
>   LAG(rating_count) OVER (PARTITION BY genre_name ORDER BY month) AS prev_month_count,
>   rating_count - LAG(rating_count) OVER (PARTITION BY genre_name ORDER BY month) AS growth
> FROM monthly_ratings
> ORDER BY genre_name, month;
> ```
> This shows monthly rating trends per genre with month-over-month growth using LAG().

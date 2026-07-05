# CineMatch 🎬

> **Movie Recommendation & Analytics System** — A full-stack application featuring a normalized MySQL 8.0 database, a Node.js/Express REST API, and a premium glassmorphic web frontend.

[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-blue?logo=mysql)](https://www.mysql.com/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green?logo=node.js)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-yellow?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Design](#database-design)
- [Installation & Setup](#installation--setup)
- [API Endpoints](#api-endpoints)
- [SQL Concepts Demonstrated](#sql-concepts-demonstrated)
- [Sample Data](#sample-data)
- [Running the Application](#running-the-application)
- [Screenshots](#screenshots)
- [Contributing](#contributing)

---

## Overview

CineMatch is a **relational database management system** built for managing movie information, user profiles, ratings, reviews, watchlists, and personalized recommendations. The system provides:

- **Users** can discover movies, rate/review them, manage watchlists, and receive personalized recommendations.
- **Administrators** can view detailed analytical reports on user engagement and movie popularity.
- **Developers** can explore the complete normalized database schema and run complex analytical queries.

This project demonstrates advanced SQL concepts including normalization (1NF/2NF/3NF), complex joins, views, stored procedures, triggers, transactions, indexing, window functions, and analytical queries.

---

## Features

| Feature | Description |
|---|---|
| 🎬 Movie Catalog | 1,000+ movies with genre, director, actors, ratings |
| ⭐ User Ratings | 1–5 scale with automatic average calculation via triggers |
| 💬 Reviews | User-written text reviews with engagement tracking |
| 📋 Watchlist | Three-state tracking: Plan to Watch, Watching, Completed |
| 🎯 Recommendations | Personalized picks via stored procedures and scoring |
| 📊 Analytics | 40+ SQL queries, 5 views, business intelligence reports |
| 🔐 Auth | JWT-based authentication with bcrypt password hashing |
| 🚀 REST API | Full CRUD API with pagination, filtering, and sorting |
| 💻 Frontend | Premium glassmorphic UI with Chart.js analytics dashboard |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Database** | MySQL 8.0 |
| **Backend** | Node.js 18+, Express 4, mysql2, JWT, bcryptjs |
| **Frontend** | HTML5, Vanilla CSS (glassmorphism), JavaScript ES6+, Chart.js |
| **Tools** | MySQL Workbench, Postman, nodemon |

---

## Project Structure

```
CineMatch/
│
├── database/
│   ├── schema.sql          # Database creation
│   ├── tables.sql          # All 10 table definitions
│   ├── constraints.sql     # FK, CHECK, UNIQUE constraints
│   ├── indexes.sql         # Performance indexes
│   ├── views.sql           # 5 analytical views
│   ├── procedures.sql      # 7 stored procedures
│   ├── functions.sql       # 4 scalar functions
│   ├── triggers.sql        # 6 triggers
│   ├── sample_data.sql     # Seed data
│   └── queries.sql         # 40 analytical queries
│
├── backend/
│   ├── server.js           # Express entry point
│   ├── package.json
│   ├── .env                # Environment config
│   ├── config/db.js        # MySQL connection pool
│   ├── middleware/auth.js  # JWT middleware
│   ├── routes/             # Express routers
│   ├── controllers/        # Business logic
│   └── scripts/seed.js     # Data seeding script
│
├── frontend/
│   ├── index.html          # SPA layout
│   ├── style.css           # Design system
│   └── app.js              # Application logic
│
├── docs/
│   ├── ER_Diagram.md
│   ├── Data_Dictionary.md
│   ├── User_Manual.md
│   ├── Project_Report.md
│   ├── API_Documentation.md
│   ├── Presentation.md
│   ├── Resume_Points.md
│   └── Interview_Questions.md
│
└── README.md
```

---

## Database Design

### Tables (10)

| Table | Description | Key Relationships |
|---|---|---|
| `users` | Registered users | — |
| `movies` | Movie catalog | → genres, directors |
| `genres` | Genre categories | ← movies |
| `directors` | Film directors | ← movies |
| `actors` | Film actors | ↔ movies (M:N) |
| `movie_actors` | Junction table | movies ↔ actors |
| `ratings` | User ratings (1–5) | users → movies |
| `reviews` | User text reviews | users → movies |
| `watchlist` | Watch status tracking | users → movies |
| `recommendations` | Generated picks | users → movies |

### Normalization
- **1NF**: Atomic values, no repeating groups.
- **2NF**: No partial dependencies — genres/directors extracted from movies.
- **3NF**: No transitive dependencies — all non-key attributes depend only on PK.

---

## Installation & Setup

### Prerequisites
- MySQL 8.0+
- Node.js 18+
- npm 9+

### 1. Clone the Repository
```bash
git clone https://github.com/anshikamonga001/CineMatch.git
cd CineMatch
```

### 2. Set Up the Database
Open MySQL Workbench or CLI and run the scripts in order:
```sql
SOURCE database/schema.sql;
SOURCE database/tables.sql;
SOURCE database/constraints.sql;
SOURCE database/indexes.sql;
SOURCE database/views.sql;
SOURCE database/procedures.sql;
SOURCE database/functions.sql;
SOURCE database/triggers.sql;
SOURCE database/sample_data.sql;
```

### 3. Configure the Backend
```bash
cd backend
cp .env .env.local  # Edit with your MySQL credentials
```

Edit `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cinematch_db
DB_PORT=3306
JWT_SECRET=your_secret_key
PORT=5000
```

### 4. Install Dependencies & Run
```bash
cd backend
npm install
npm run dev   # Development mode with nodemon
```

### 5. Open the Frontend
Open `frontend/index.html` in your browser, or serve it:
```bash
# Simple HTTP server (Python)
cd frontend
python -m http.server 3000
```
Then navigate to `http://localhost:3000`

### 6. (Optional) Seed Large Dataset
```bash
cd backend
npm run seed
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and get JWT |
| `GET` | `/api/auth/profile` | Get current user profile |
| `PUT` | `/api/auth/profile` | Update profile |

### Movies
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/movies` | List movies (with filters/pagination) |
| `GET` | `/api/movies/:id` | Movie detail with actors/reviews |
| `GET` | `/api/movies/search?q=` | Full-text search |
| `GET` | `/api/movies/top-rated` | Top N rated movies |
| `GET` | `/api/movies/popular` | Popular movies (avg_rating > 4) |
| `POST` | `/api/movies` | Add movie (admin) |

### Interactions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/interactions/rate` | Rate a movie (1–5) |
| `POST` | `/api/interactions/review` | Write a review |
| `POST` | `/api/interactions/watchlist` | Add to watchlist |
| `PUT` | `/api/interactions/watchlist/:id` | Update watch status |
| `DELETE` | `/api/interactions/watchlist/:id` | Remove from watchlist |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/dashboard-stats` | Overview counts |
| `GET` | `/api/analytics/top-rated-movies` | Top movies by rating |
| `GET` | `/api/analytics/genre-popularity` | Genre statistics |
| `GET` | `/api/analytics/most-active-users` | User activity ranking |
| `GET` | `/api/analytics/trending-movies` | Trending (last 30 days) |
| `GET` | `/api/analytics/monthly-activity` | Monthly trend data |
| `GET` | `/api/analytics/country-distribution` | User geography |
| `GET` | `/api/analytics/language-popularity` | Movie languages |
| `GET` | `/api/analytics/director-stats` | Director analytics |
| `GET` | `/api/analytics/watchlist-analytics` | Watchlist insights |

### Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/me/watchlist` | Get my watchlist |
| `GET` | `/api/users/me/ratings` | Get my ratings |
| `GET` | `/api/users/me/history` | Watch history |
| `GET` | `/api/users/me/stats` | My activity stats |

---

## SQL Concepts Demonstrated

| Concept | Implementation |
|---|---|
| **Normalization** | 1NF, 2NF, 3NF across all 10 tables |
| **Joins** | INNER, LEFT, MULTI-table joins in views & queries |
| **Views** | `popular_movies_view`, `user_activity_view`, `movie_statistics_view`, `genre_popularity_view`, `director_stats_view` |
| **Stored Procedures** | `sp_add_new_movie`, `sp_add_user_rating`, `sp_generate_recommendations`, `sp_get_top_rated_movies` |
| **Functions** | `fn_average_movie_rating`, `fn_movie_popularity_score`, `fn_user_recommendation_score` |
| **Triggers** | Rating validation, avg_rating auto-update, engagement tracking |
| **Transactions** | Rate + Review + Update Movie in atomic block |
| **Indexes** | On title, genre, rating, email, release year, director name |
| **Window Functions** | `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `NTILE()`, `LAG()`, `LEAD()` |
| **Analytical Queries** | 40 queries from basic selects to complex CTEs and window functions |

---

## Sample Data

The `database/sample_data.sql` file includes:
- **20 genres** (Action, Drama, Sci-Fi, Comedy, Thriller, etc.)
- **30 directors** (Christopher Nolan, Spielberg, Scorsese, etc.)
- **30 actors** with biographical data
- **50 movies** (iconic real films with realistic metadata)
- **50 users** from 20+ countries
- **200 ratings**, **80 reviews**, **100 watchlist entries**
- **30 recommendation records**

For larger datasets, run the seeder:
```bash
npm run seed   # Generates ~2,000 users, ~1,000 movies, ~20,000 ratings
```

---

## Running the Application

```bash
# Backend (from /backend directory)
npm run dev

# Frontend (from /frontend directory)
# Just open index.html in any modern browser
# Or use a local dev server:
npx serve .
```

The frontend gracefully degrades to demo data if the backend is offline, so you can preview the UI without a database connection.

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for learning advanced SQL and full-stack development.*

# CineMatch – User & Installation Manual

This manual guides you through installation, database setup, running the server, and navigating the CineMatch user interface.

---

## 1. Installation & Setup

### Prerequisites
1. **MySQL Server 8.0** installed and running.
2. **Node.js** (v18 or higher) installed.

### Step 1: Initialize Database
Open MySQL Workbench or your favorite SQL terminal and run the database setup scripts in this order:
1. `database/schema.sql` (Creates database)
2. `database/tables.sql` (Creates tables)
3. `database/functions.sql` (Creates functions needed by triggers)
4. `database/triggers.sql` (Creates triggers)
5. `database/constraints.sql` (Applies foreign keys & cascade rules)
6. `database/indexes.sql` (Creates indexes)
7. `database/views.sql` (Creates views)
8. `database/procedures.sql` (Creates stored procedures)
9. `database/sample_data.sql` (Loads 50 movies, genres, users, reviews)

### Step 2: Configure Backend Server
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Open the `.env` file and verify or update your database connection credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=cinematch_db
   DB_PORT=3306
   JWT_SECRET=cinematch_super_secret_jwt_key_2024
   PORT=5000
   ```
3. Install backend packages:
   ```bash
   npm install
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *You should see a message in the console: `Server is running on port 5000` and `Database connected successfully!`.*

### Step 3: Run the Frontend App
1. Open the file `frontend/index.html` directly in any modern web browser (Double-click the file).
2. Alternatively, serve it using a lightweight dev server in the `frontend` folder:
   ```bash
   npx serve .
   ```
3. Look at the API indicator dot in the top right. If the backend is running, the dot will turn **green** and say **API Online**.

---

## 2. Navigating the Web Dashboard

### 1. Dashboard Overview
* Displays real-time database counts (Total Users, Movies, Ratings, Reviews, Genres, Directors).
* Visual charts:
  - **Genre Popularity:** Displays number of movies in each genre.
  - **Monthly Activity:** Line chart showing total reviews and ratings submitted.
* Leaderboards for **Top Rated Movies** and **Most Active Users**.

### 2. Discover Movies
* Navigate to the **Discover** tab in the sidebar.
* Use filters at the top (Genre, Language, Year, Minimum IMDb rating, and sorting criteria) and click **Apply Filters**.
* Click on any movie card to open the detail modal. Here you can read descriptions, view directors, cast list, and user reviews.

### 3. Ratings and Reviews (User login required)
* Click **Sign In** in the top right or sidebar footer to register or log in.
* Once logged in, open a movie detail card.
* **To Rate:** Click **Rate**, choose stars (1-5), and click **Submit**.
* **To Review:** Write text in the box and click **Post Review**.

### 4. Watchlist
* Click **Watchlist** on a movie card to add it to your profile.
* View your list in the **My Watchlist** tab, where you can sort by status: *Plan to Watch*, *Watching*, or *Completed*.

### 5. AI Recommendations
* Log in, rate a few movies, and navigate to the **Recommendations** tab.
* CineMatch runs its stored procedures on the fly to deliver scored recommendations based on your favorite genres.

### 6. Analytics Portal
* Click **Analytics** in the sidebar.
* View tabular reports for:
  - Top 20 user-rated movies.
  - User activity leaderboard.
  - Genre distribution statistics.
  - Watchlist status distributions.

### 7. Database Explorer
* The **Database** tab displays the internal MySQL table specifications. Click on any table name (e.g. `users`, `ratings`) to view its data types, keys, and description, along with an interactive Entity-Relationship layout.

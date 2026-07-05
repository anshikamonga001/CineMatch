# CineMatch – REST API Documentation

This document provides detailed documentation for the CineMatch REST API backend. The API is built using Node.js and Express, interacting with a MySQL database.

## Base URL
All API requests are made to the following base URL:
`http://localhost:5000/api`

## Authentication
CineMatch uses JSON Web Tokens (JWT) for authentication. 
- Protected routes require a valid JWT token sent in the HTTP `Authorization` header.
- Format: `Authorization: Bearer <jwt_token>`

---

## 1. Authentication Endpoints

### Register User
* **Method:** `POST`
* **URL:** `/auth/register`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane.doe@example.com",
    "password": "securepassword123",
    "gender": "Female",
    "country": "India"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "user_id": 51,
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane.doe@example.com",
      "gender": "Female",
      "country": "India"
    }
  }
  ```

### Login User
* **Method:** `POST`
* **URL:** `/auth/login`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "email": "jane.doe@example.com",
    "password": "securepassword123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "user_id": 51,
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane.doe@example.com",
      "gender": "Female",
      "country": "India"
    }
  }
  ```

### Get Current User Profile
* **Method:** `GET`
* **URL:** `/auth/profile`
* **Auth Required:** Yes
* **Success Response (200 OK):**
  ```json
  {
    "user": {
      "user_id": 51,
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane.doe@example.com",
      "gender": "Female",
      "country": "India",
      "created_at": "2026-07-06T00:00:00.000Z"
    }
  }
  ```

### Update User Profile
* **Method:** `PUT`
* **URL:** `/auth/profile`
* **Auth Required:** Yes
* **Request Body:**
  ```json
  {
    "first_name": "Janice",
    "last_name": "Doe",
    "country": "Germany"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "message": "Profile updated successfully",
    "user": {
      "first_name": "Janice",
      "last_name": "Doe",
      "country": "Germany"
    }
  }
  ```

---

## 2. Movies Endpoints

### List Movies (with Filters & Pagination)
* **Method:** `GET`
* **URL:** `/movies`
* **Auth Required:** No
* **Query Parameters:**
  - `page` (optional, default: `1`): Page number
  - `limit` (optional, default: `20`): Items per page
  - `genre` (optional): Filter by genre name
  - `language` (optional): Filter by movie language
  - `year` (optional): Filter by release year
  - `min_rating` (optional): Filter by minimum IMDb rating
  - `sort` (optional, default: `rating`): Sort parameter (`title`, `year`, `rating`)
* **Success Response (200 OK):**
  ```json
  {
    "movies": [
      {
        "movie_id": 1,
        "title": "The Dark Knight",
        "release_year": 2008,
        "duration": 152,
        "language": "English",
        "imdb_rating": "9.0",
        "genre_name": "Action",
        "director_name": "Christopher Nolan"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
  ```

### Get Movie Details By ID
* **Method:** `GET`
* **URL:** `/movies/:id`
* **Auth Required:** No
* **Success Response (200 OK):**
  ```json
  {
    "movie": {
      "movie_id": 1,
      "title": "The Dark Knight",
      "release_year": 2008,
      "duration": 152,
      "language": "English",
      "imdb_rating": "9.0",
      "description": "When the menace known as the Joker wreaks havoc...",
      "poster_url": "https://example.com/poster.jpg",
      "age_rating": "PG-13",
      "genre_name": "Action",
      "director_name": "Christopher Nolan",
      "avg_rating": "4.8",
      "total_ratings": 32,
      "actors": [
        { "actor_id": 1, "actor_name": "Christian Bale" },
        { "actor_id": 2, "actor_name": "Heath Ledger" }
      ]
    }
  }
  ```

### Search Movies
* **Method:** `GET`
* **URL:** `/movies/search`
* **Auth Required:** No
* **Query Parameters:**
  - `q` (required): Search query string
* **Success Response (200 OK):**
  ```json
  [
    {
      "movie_id": 1,
      "title": "The Dark Knight",
      "release_year": 2008,
      "imdb_rating": "9.0",
      "genre_name": "Action"
    }
  ]
  ```

---

## 3. Interactions Endpoints (Auth Required)

### Rate a Movie
* **Method:** `POST`
* **URL:** `/interactions/rate`
* **Request Body:**
  ```json
  {
    "movie_id": 1,
    "rating": 5
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "message": "Rating saved successfully"
  }
  ```

### Write a Review
* **Method:** `POST`
* **URL:** `/interactions/review`
* **Request Body:**
  ```json
  {
    "movie_id": 1,
    "review_text": "An absolute masterpiece. Heath Ledger is phenomenal."
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "message": "Review posted successfully",
    "review": {
      "review_id": 81,
      "user_id": 51,
      "movie_id": 1,
      "review_text": "An absolute masterpiece. Heath Ledger is phenomenal."
    }
  }
  ```

### Add Movie to Watchlist
* **Method:** `POST`
* **URL:** `/interactions/watchlist`
* **Request Body:**
  ```json
  {
    "movie_id": 1,
    "watch_status": "Plan to Watch"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "message": "Watchlist updated successfully"
  }
  ```

### Update Watchlist Status
* **Method:** `PUT`
* **URL:** `/interactions/watchlist/:movie_id`
* **Request Body:**
  ```json
  {
    "watch_status": "Completed"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "message": "Watch status updated"
  }
  ```

### Remove from Watchlist
* **Method:** `DELETE`
* **URL:** `/interactions/watchlist/:movie_id`
* **Success Response (200 OK):**
  ```json
  {
    "message": "Removed from watchlist"
  }
  ```

---

## 4. Analytics Endpoints

### Dashboard Stats Overview
* **Method:** `GET`
* **URL:** `/analytics/dashboard-stats`
* **Auth Required:** No
* **Success Response (200 OK):**
  ```json
  {
    "total_users": 150,
    "total_movies": 50,
    "total_ratings": 232,
    "total_reviews": 85,
    "total_genres": 20,
    "total_directors": 30
  }
  ```

### Genre Popularity Stats
* **Method:** `GET`
* **URL:** `/analytics/genre-popularity`
* **Auth Required:** No
* **Success Response (200 OK):**
  ```json
  [
    {
      "genre_name": "Action",
      "total_movies": 12,
      "avg_rating": "4.43",
      "total_reviews": 25
    }
  ]
  ```

---

## 5. Recommendations Endpoints (Auth Required)

### Get Personalized Recommendations
* **Method:** `GET`
* **URL:** `/recommendations/me`
* **Success Response (200 OK):**
  ```json
  [
    {
      "movie_id": 4,
      "title": "Interstellar",
      "release_year": 2014,
      "avg_rating": "4.70",
      "imdb_rating": "8.6",
      "recommendation_score": "88.80",
      "recommendation_reason": "Based on your top genre preference: Sci-Fi"
    }
  ]
  ```

---

## Error Handling
Standard error responses return an object formatted as:
```json
{
  "message": "Detailed error message"
}
```
* **400 Bad Request:** Missing fields or validation errors.
* **401 Unauthorized:** Missing or invalid Bearer JWT.
* **404 Not Found:** Requested movie, user, or route does not exist.
* **500 Internal Server Error:** Database failure or server-side exception.

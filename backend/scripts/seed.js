// ============================================================
// scripts/seed.js — CineMatch Database Seeder
// ============================================================
// Run with: npm run seed
// Generates: 100 users, ratings, reviews, watchlist entries,
//            recommendation entries; calls sp_generate_recommendations
//            for the first 20 users.
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt   = require('bcryptjs');
const mysql    = require('mysql2/promise');

// ── Connection ─────────────────────────────────────────────
const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'cinematch_db',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: false,
};

// ── Data pools ─────────────────────────────────────────────
const FIRST_NAMES = [
  'Aarav','Aisha','Arjun','Priya','Ravi','Sana','Karan','Neha','Rahul','Pooja',
  'James','Emma','Liam','Olivia','Noah','Ava','William','Sophia','Oliver','Mia',
  'Lucas','Isabella','Mason','Charlotte','Ethan','Amelia','Aiden','Harper','Logan','Evelyn',
  'Mohammed','Fatima','Ali','Zara','Omar','Layla','Hassan','Nour','Ahmed','Amal',
  'Hiroshi','Yuki','Kenji','Sakura','Taro','Hana','Akira','Emi','Ryota','Yuna',
  'Carlos','Maria','Luis','Ana','Jorge','Carmen','Miguel','Rosa','Juan','Elena',
  'Luca','Sofia','Marco','Giulia','Paolo','Chiara','Antonio','Valentina','Giovanni','Francesca',
  'Pierre','Claire','Antoine','Marie','Thomas','Julie','Nicolas','Camille','Alexandre','Chloé',
  'Wei','Xiao','Ming','Jing','Hao','Ying','Feng','Ling','Tao','Mei',
  'Kwame','Amara','Kofi','Ama','Yaw','Abena','Kojo','Akosua','Nana','Adwoa',
];

const LAST_NAMES = [
  'Sharma','Patel','Singh','Gupta','Kumar','Shah','Joshi','Mehta','Reddy','Iyer',
  'Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Wilson','Taylor',
  'Al-Rashid','Hassan','Malik','Khan','Ibrahim','Al-Farsi','Qureshi','Siddiqui','Chaudhry','Mirza',
  'Tanaka','Yamamoto','Nakamura','Sato','Kobayashi','Watanabe','Ito','Kato','Suzuki','Hashimoto',
  'Martinez','Rodriguez','Lopez','Hernandez','Gonzalez','Perez','Sanchez','Ramirez','Torres','Flores',
  'Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco',
  'Dupont','Durand','Leroy','Bernard','Moreau','Lefebvre','Simon','Laurent','Michel','Fontaine',
  'Wang','Li','Zhang','Chen','Liu','Yang','Huang','Wu','Zhao','Sun',
  'Mensah','Asante','Boateng','Owusu','Acheampong','Amoah','Appiah','Darko','Frimpong','Osei',
  'Silva','Oliveira','Souza','Costa','Ferreira','Santos','Pereira','Alves','Lima','Carvalho',
];

const COUNTRIES = [
  'India','United States','United Kingdom','Canada','Australia','Germany','France','Japan',
  'South Korea','Brazil','Mexico','Spain','Italy','Netherlands','Sweden','Norway',
  'Ghana','Nigeria','Egypt','South Africa','China','Singapore','Malaysia','Thailand',
  'Pakistan','Bangladesh','Sri Lanka','Nepal','Turkey','Argentina','Colombia','Chile',
  'United Arab Emirates','Saudi Arabia','Qatar','Iran','Iraq','Portugal','Poland','Ukraine',
];

const REVIEW_TEMPLATES = [
  "An absolute masterpiece! The storytelling is top-notch and the performances are exceptional. Highly recommend.",
  "I was completely captivated from the first scene. The director's vision shines through every frame.",
  "A must-watch for any cinema enthusiast. The cinematography alone is worth the experience.",
  "Brilliantly crafted film that stays with you long after the credits roll.",
  "The plot was somewhat predictable but the performances elevated the material significantly.",
  "Good film overall, though the pacing felt a bit slow in the second act.",
  "Entertaining enough but nothing groundbreaking. Worth watching once.",
  "The acting was stellar but the script let the film down in places.",
  "Visually stunning with a compelling narrative. One of the best films of its era.",
  "A deeply moving story told with remarkable restraint and sensitivity.",
  "The ensemble cast delivers uniformly excellent performances in this gripping drama.",
  "An underrated gem that deserves far more attention than it received on release.",
  "This film reinvented the genre and set a new standard for its peers.",
  "While technically impressive, the emotional core of the story failed to resonate with me.",
  "A flawed but fascinating piece of cinema that rewards patient viewing.",
  "The director demonstrates incredible command of visual storytelling throughout.",
  "Compelling characters and sharp dialogue make this an engaging watch.",
  "Somewhat overrated in my opinion, though I can see why many people love it.",
  "A powerful and thought-provoking film that tackles difficult subjects with courage.",
  "The film's unique atmosphere and sense of place set it apart from similar works.",
  "A dazzling display of cinematic craft and storytelling ambition.",
  "Not my usual genre, but this film won me over with its heart and sincerity.",
  "The cinematography and production design are breathtaking throughout.",
  "A slow burn that pays off magnificently in the final act.",
  "An intellectually stimulating film that challenges the audience at every turn.",
];

const WATCHLIST_STATUSES = ['want_to_watch', 'watching', 'watched'];
const WATCHLIST_WEIGHTS  = [0.4, 0.15, 0.45]; // Distribution probabilities

// ── Utility helpers ─────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(items, weights) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/** Generate a realistic rating skewed towards higher values */
function realisticRating() {
  // Normally distributed around 7, clamped to [1, 10]
  const mean = 6.8, std = 1.8;
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const val = Math.round(mean + n * std);
  return Math.max(1, Math.min(10, val));
}

/** Shuffle an array (Fisher-Yates) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Chunked insert helper to avoid huge IN queries */
async function batchInsert(conn, table, columns, rows, chunkSize = 100) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  const colStr = `(${columns.join(', ')})`;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const flat = chunk.flat();
    await conn.execute(`INSERT IGNORE INTO ${table} ${colStr} VALUES ${placeholders}`, flat);
    inserted += chunk.length;
  }
  return inserted;
}

// ── Progress logger ─────────────────────────────────────────
function log(msg) {
  console.log(`  [${new Date().toLocaleTimeString()}] ${msg}`);
}

function section(title) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(50)}`);
}

// ── Main seeder ─────────────────────────────────────────────
async function seed() {
  console.log('\n🎬  CineMatch Database Seeder');
  console.log(`    Connecting to ${DB_CONFIG.database}@${DB_CONFIG.host}...\n`);

  const conn = await mysql.createConnection(DB_CONFIG);
  log('✅  Connected to MySQL');

  try {
    // ──────────────────────────────────────────────────────
    // 0. Fetch existing data (movies, existing users)
    // ──────────────────────────────────────────────────────
    section('0 / 6  Loading existing data');

    const [existingMovies] = await conn.execute('SELECT movie_id FROM movies');
    const movieIds = existingMovies.map(r => r.movie_id);
    log(`Found ${movieIds.length} movies in the database.`);

    if (movieIds.length === 0) {
      console.warn('\n⚠️  No movies found. Please run the main SQL seed first.\n');
      await conn.end();
      process.exit(0);
    }

    const [existingUsers] = await conn.execute('SELECT user_id, email FROM users');
    const existingEmails  = new Set(existingUsers.map(u => u.email));
    const existingUserIds = existingUsers.map(u => u.user_id);
    log(`Found ${existingUsers.length} existing users.`);

    // ──────────────────────────────────────────────────────
    // 1. Generate 100 new users
    // ──────────────────────────────────────────────────────
    section('1 / 6  Generating 100 users');

    const TARGET_USERS    = 100;
    const passwordHash    = await bcrypt.hash('password123', 10);   // same hash for all seed users
    const newUserRows     = [];
    const newUserEmails   = [];

    for (let i = 0; i < TARGET_USERS; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName  = pick(LAST_NAMES);
      const country   = pick(COUNTRIES);
      const rand      = randInt(1000, 9999);
      const email     = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rand}@cinematch.dev`;

      if (existingEmails.has(email) || newUserEmails.includes(email)) {
        i--; // retry on collision
        continue;
      }

      newUserEmails.push(email);
      newUserRows.push([email, passwordHash, firstName, lastName, country, 'user']);
    }

    const inserted = await batchInsert(conn, 'users',
      ['email', 'password', 'first_name', 'last_name', 'country', 'role'],
      newUserRows
    );
    log(`Inserted ${inserted} new users.`);

    // Refresh full user list
    const [allUsersRaw] = await conn.execute('SELECT user_id FROM users');
    const allUserIds    = allUsersRaw.map(r => r.user_id);
    const seedUserIds   = allUserIds.filter(id => !existingUserIds.includes(id));
    log(`Total users now: ${allUserIds.length}  (${seedUserIds.length} newly seeded)`);

    // ──────────────────────────────────────────────────────
    // 2. Generate Ratings
    // ──────────────────────────────────────────────────────
    section('2 / 6  Generating ratings');

    // Fetch already-rated pairs to avoid duplicates
    const [existingRatings] = await conn.execute('SELECT user_id, movie_id FROM ratings');
    const ratedPairs = new Set(existingRatings.map(r => `${r.user_id}-${r.movie_id}`));

    const ratingRows = [];
    const MIN_RATINGS_PER_USER = 5;
    const MAX_RATINGS_PER_USER = 30;

    for (const userId of seedUserIds) {
      const count       = randInt(MIN_RATINGS_PER_USER, MAX_RATINGS_PER_USER);
      const shuffled    = shuffle(movieIds);
      const toRate      = shuffled.slice(0, Math.min(count, movieIds.length));

      for (const movieId of toRate) {
        const key = `${userId}-${movieId}`;
        if (!ratedPairs.has(key)) {
          ratedPairs.add(key);
          const daysAgo = randInt(1, 730);
          ratingRows.push([userId, movieId, realisticRating(), `NOW() - INTERVAL ${daysAgo} DAY`]);
        }
      }
    }

    // Insert ratings with dynamic date expressions
    let ratingCount = 0;
    const CHUNK = 200;
    for (let i = 0; i < ratingRows.length; i += CHUNK) {
      const chunk = ratingRows.slice(i, i + CHUNK);
      // Build per-row expressions (dates need to be inline SQL, not params)
      for (const [uid, mid, rv] of chunk) {
        const daysAgo = randInt(1, 730);
        try {
          await conn.execute(
            `INSERT IGNORE INTO ratings (user_id, movie_id, rating_value, rated_at)
             VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
            [uid, mid, rv, daysAgo]
          );
          ratingCount++;
        } catch { /* skip constraint violations */ }
      }
    }
    log(`Inserted ~${ratingCount} ratings.`);

    // ──────────────────────────────────────────────────────
    // 3. Generate Reviews
    // ──────────────────────────────────────────────────────
    section('3 / 6  Generating reviews');

    const [existingReviews] = await conn.execute('SELECT user_id, movie_id FROM reviews');
    const reviewedPairs     = new Set(existingReviews.map(r => `${r.user_id}-${r.movie_id}`));

    let reviewCount = 0;
    // ~40% of seed users write at least one review
    const reviewers = shuffle(seedUserIds).slice(0, Math.floor(seedUserIds.length * 0.4));

    for (const userId of reviewers) {
      const numReviews = randInt(1, 5);
      const moviesToReview = shuffle(movieIds).slice(0, numReviews);

      for (const movieId of moviesToReview) {
        const key = `${userId}-${movieId}`;
        if (reviewedPairs.has(key)) continue;
        reviewedPairs.add(key);

        const text         = pick(REVIEW_TEMPLATES);
        const hasSpoiler   = Math.random() < 0.1 ? 1 : 0;
        const daysAgo      = randInt(1, 365);

        try {
          await conn.execute(
            `INSERT IGNORE INTO reviews (user_id, movie_id, review_text, contains_spoiler, reviewed_at)
             VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
            [userId, movieId, text, hasSpoiler, daysAgo]
          );
          reviewCount++;
        } catch { /* skip */ }
      }
    }
    log(`Inserted ${reviewCount} reviews.`);

    // ──────────────────────────────────────────────────────
    // 4. Generate Watchlist Entries
    // ──────────────────────────────────────────────────────
    section('4 / 6  Generating watchlist entries');

    const [existingWatchlist] = await conn.execute('SELECT user_id, movie_id FROM watchlist');
    const watchlistPairs      = new Set(existingWatchlist.map(r => `${r.user_id}-${r.movie_id}`));

    let watchlistCount = 0;
    for (const userId of seedUserIds) {
      const numEntries = randInt(3, 20);
      const movies     = shuffle(movieIds).slice(0, numEntries);

      for (const movieId of movies) {
        const key = `${userId}-${movieId}`;
        if (watchlistPairs.has(key)) continue;
        watchlistPairs.add(key);

        const status  = pickWeighted(WATCHLIST_STATUSES, WATCHLIST_WEIGHTS);
        const daysAgo = randInt(1, 400);

        try {
          await conn.execute(
            `INSERT IGNORE INTO watchlist (user_id, movie_id, status, added_at)
             VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
            [userId, movieId, status, daysAgo]
          );
          watchlistCount++;
        } catch { /* skip */ }
      }
    }
    log(`Inserted ${watchlistCount} watchlist entries.`);

    // ──────────────────────────────────────────────────────
    // 5. Generate Recommendation Entries
    // ──────────────────────────────────────────────────────
    section('5 / 6  Generating recommendation entries');

    const reasons = [
      'Based on your highly-rated films in this genre',
      'Popular among users with similar taste',
      'Highly rated by critics and audiences alike',
      'Similar director to movies you enjoyed',
      'Features actors from your favourite films',
      'Top-rated in a language you frequently watch',
      'Trending in your region this week',
      'You may enjoy this based on your watch history',
    ];

    let recCount = 0;
    const [existingRecs] = await conn.execute('SELECT user_id, movie_id FROM recommendations');
    const recPairs       = new Set(existingRecs.map(r => `${r.user_id}-${r.movie_id}`));

    // Generate recommendations for all seed users
    for (const userId of seedUserIds) {
      const numRecs = randInt(5, 15);
      const movies  = shuffle(movieIds).slice(0, numRecs);

      for (const movieId of movies) {
        const key = `${userId}-${movieId}`;
        if (recPairs.has(key)) continue;
        recPairs.add(key);

        const score  = randFloat(0.5, 1.0, 4);
        const reason = pick(reasons);

        try {
          await conn.execute(
            `INSERT IGNORE INTO recommendations (user_id, movie_id, score, reason)
             VALUES (?, ?, ?, ?)`,
            [userId, movieId, score, reason]
          );
          recCount++;
        } catch { /* skip — table may have different schema */ }
      }
    }
    log(`Inserted ${recCount} recommendation entries.`);

    // ──────────────────────────────────────────────────────
    // 6. Call sp_generate_recommendations for first 20 users
    // ──────────────────────────────────────────────────────
    section('6 / 6  Calling sp_generate_recommendations');

    const procUsers = allUserIds.slice(0, 20);
    let procSuccess = 0;
    let procFail    = 0;

    for (const userId of procUsers) {
      try {
        await conn.execute('CALL sp_generate_recommendations(?)', [userId]);
        procSuccess++;
        process.stdout.write(`\r    Processed ${procSuccess}/${procUsers.length} users...`);
      } catch (err) {
        procFail++;
        // Only log on first failure to avoid noise
        if (procFail === 1) {
          console.warn(`\n    ⚠️  sp_generate_recommendations not available: ${err.message}`);
        }
      }
    }
    console.log(); // newline after progress
    log(`Procedure calls: ${procSuccess} success, ${procFail} skipped/failed.`);

    // ──────────────────────────────────────────────────────
    // Summary
    // ──────────────────────────────────────────────────────
    section('Seeding Complete ✅');

    const [[{ total_users }]]    = await conn.execute('SELECT COUNT(*) AS total_users FROM users');
    const [[{ total_movies }]]   = await conn.execute('SELECT COUNT(*) AS total_movies FROM movies');
    const [[{ total_ratings }]]  = await conn.execute('SELECT COUNT(*) AS total_ratings FROM ratings');
    const [[{ total_reviews }]]  = await conn.execute('SELECT COUNT(*) AS total_reviews FROM reviews');
    const [[{ total_watchlist }]]= await conn.execute('SELECT COUNT(*) AS total_watchlist FROM watchlist');
    const [[{ total_recs }]]     = await conn.execute('SELECT COUNT(*) AS total_recs FROM recommendations').catch(() => [[{ total_recs: 'N/A' }]]);

    console.log(`
  ┌──────────────────────────────────────┐
  │       CineMatch Database Summary     │
  ├──────────────────────────────────────┤
  │  Users         : ${String(total_users).padEnd(20)} │
  │  Movies        : ${String(total_movies).padEnd(20)} │
  │  Ratings       : ${String(total_ratings).padEnd(20)} │
  │  Reviews       : ${String(total_reviews).padEnd(20)} │
  │  Watchlist     : ${String(total_watchlist).padEnd(20)} │
  │  Recommendations: ${String(total_recs).padEnd(19)} │
  └──────────────────────────────────────┘
    `);

    console.log('  🎉  Seeding finished successfully!\n');
  } catch (err) {
    console.error('\n❌  Seeding failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();

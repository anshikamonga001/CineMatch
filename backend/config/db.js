// ============================================================
// config/db.js — MySQL2 Connection Pool for CineMatch
// ============================================================
require('dotenv').config();
const mysql = require('mysql2');

// Create a pool for efficient connection management
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'cinematch_db',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit:    20,          // max concurrent connections
  queueLimit:         0,           // unlimited queue
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
  timezone:           '+00:00',    // store/retrieve dates as UTC
  decimalNumbers:     true,        // return DECIMAL as JS number
  charset:            'utf8mb4',
});

// Wrap the pool with promise support so we can use async/await
const promisePool = pool.promise();

/**
 * Quick connectivity test — called during server bootstrap.
 * Throws if the database is unreachable.
 */
async function testConnection() {
  try {
    const [rows] = await promisePool.query('SELECT 1 AS connected');
    if (rows[0].connected === 1) {
      console.log('✅  MySQL connected successfully to', process.env.DB_NAME);
    }
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    throw err;
  }
}

/**
 * Convenience wrapper — execute a query and return the rows.
 * @param {string}  sql    Parameterised SQL string
 * @param {Array}   params Values to bind
 * @returns {Promise<Array>}
 */
async function query(sql, params = []) {
  const [rows] = await promisePool.execute(sql, params);
  return rows;
}

/**
 * Execute a stored procedure and return all result sets.
 * mysql2 returns an array of result arrays for CALL statements.
 * @param {string} name   Stored procedure name
 * @param {Array}  params IN parameters
 */
async function callProcedure(name, params = []) {
  const placeholders = params.map(() => '?').join(', ');
  const sql = `CALL ${name}(${placeholders})`;
  const [results] = await promisePool.execute(sql, params);
  return results;
}

module.exports = { pool: promisePool, query, callProcedure, testConnection };

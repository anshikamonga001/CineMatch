// ============================================================
// server.js — CineMatch Express Application Entry Point
// ============================================================
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { testConnection } = require('./config/db');

// ── Route imports ──────────────────────────────────────────
const authRoutes            = require('./routes/auth');
const movieRoutes           = require('./routes/movies');
const userRoutes            = require('./routes/users');
const interactionRoutes     = require('./routes/interactions');
const analyticsRoutes       = require('./routes/analytics');
const recommendationRoutes  = require('./routes/recommendations');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global Middleware ──────────────────────────────────────
// Allow all origins in development; tighten for production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logger (simple dev logger) ────────────────────
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Health Check ───────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'CineMatch API is running 🎬',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth:            '/api/auth',
      movies:          '/api/movies',
      users:           '/api/users',
      interactions:    '/api/interactions',
      analytics:       '/api/analytics',
      recommendations: '/api/recommendations',
    },
  });
});

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/movies',          movieRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/interactions',    interactionRoutes);
app.use('/api/analytics',       analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);

// ── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ── Global Error Handler ───────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry — resource already exists' });
  }

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, message });
});

// ── Bootstrap ──────────────────────────────────────────────
async function bootstrap() {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log('════════════════════════════════════════');
      console.log(`  🎬  CineMatch API Server`);
      console.log(`  🚀  Listening on port ${PORT}`);
      console.log(`  🌐  http://localhost:${PORT}`);
      console.log(`  📅  ${new Date().toLocaleString()}`);
      console.log('════════════════════════════════════════');
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

bootstrap();

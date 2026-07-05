// ============================================================
// routes/auth.js — Authentication Routes
// ============================================================
const router = require('express').Router();
const { body } = require('express-validator');

const { register, login, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// ── Validation rules ────────────────────────────────────────
const registerValidation = [
  body('email')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('first_name')
    .notEmpty().withMessage('First name is required.')
    .trim()
    .isLength({ max: 100 }).withMessage('First name must not exceed 100 characters.'),
  body('last_name')
    .notEmpty().withMessage('Last name is required.')
    .trim()
    .isLength({ max: 100 }).withMessage('Last name must not exceed 100 characters.'),
  body('country')
    .optional({ nullable: true })
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters.'),
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

const profileUpdateValidation = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters.'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters.'),
  body('country')
    .optional({ nullable: true })
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters.'),
];

// ── Routes ──────────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', registerValidation, register);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// GET /api/auth/profile  (auth required)
router.get('/profile', authenticate, getProfile);

// PUT /api/auth/profile  (auth required)
router.put('/profile', authenticate, profileUpdateValidation, updateProfile);

// PUT /api/auth/change-password  (auth required)
router.put('/change-password', authenticate, changePassword);

module.exports = router;

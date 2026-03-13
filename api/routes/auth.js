'use strict';

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { generateToken, authenticate } = require('../middleware/auth');

/**
 * Local user store — swap with DB in production
 * In production: use mysql2 to query a `crm_users` table
 */
const USERS = [
  {
    id: '1',
    email: process.env.ADMIN_EMAIL || 'admin@company.com',
    // Default password: RecruiterAdmin2026! — CHANGE IN .env
    passwordHash: process.env.ADMIN_PASSWORD_HASH ||
      '$2a$12$examplehashchangeme.placeholder.hash.value.here.x',
    name: 'Admin',
    role: 'admin',
  },
];

// POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = USERS.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.json({
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  }
);

// GET /api/auth/me — get current user from token
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/refresh — refresh token
router.post('/refresh', authenticate, (req, res) => {
  const { id, email, name, role } = req.user;
  const token = generateToken({ id, email, name, role });
  res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
});

module.exports = router;

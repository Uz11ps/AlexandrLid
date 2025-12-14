import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

// Simple login endpoint (MVP - no registration endpoint yet)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM managers WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const manager = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, manager.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE managers SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [manager.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: manager.id, email: manager.email, role: manager.role },
      process.env.JWT_SECRET || 'default_secret_change_in_production',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: manager.id,
        email: manager.email,
        name: manager.name,
        role: manager.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || 'default_secret_change_in_production',
    (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    }
  );
};

export default router;


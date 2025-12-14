import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Получить список менеджеров
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, created_at FROM managers ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


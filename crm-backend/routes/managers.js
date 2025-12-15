import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcrypt';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * @swagger
 * /managers:
 *   get:
 *     summary: Получить список менеджеров
 *     tags: [Managers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список менеджеров
 */
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

// Получить менеджера по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, created_at FROM managers WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching manager:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить менеджера
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, is_active, password } = req.body;

    // Проверка прав доступа (только админ может изменять роли)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (password !== undefined && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(parseInt(id));
    const result = await pool.query(
      `UPDATE managers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, email, name, role, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating manager:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить менеджера
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Проверка прав доступа
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Нельзя удалить самого себя
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const result = await pool.query(
      'DELETE FROM managers WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting manager:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

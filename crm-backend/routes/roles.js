import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Получить список всех ролей
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список ролей
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, is_system, created_at FROM roles ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Создать новую роль (только админ)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Роль создана
 */
router.post('/', async (req, res) => {
  try {
    // Проверка прав доступа (только админ может создавать роли)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Проверка существования роли
    const existingRole = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      [name]
    );

    if (existingRole.rows.length > 0) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    // Создание роли
    const result = await pool.query(
      `INSERT INTO roles (name, description, is_system)
       VALUES ($1, $2, FALSE)
       RETURNING id, name, description, is_system, created_at`,
      [name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Обновить роль (только админ, системные роли нельзя изменять)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Роль обновлена
 */
router.put('/:id', async (req, res) => {
  try {
    // Проверка прав доступа
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    // Проверка, что роль не системная
    const roleCheck = await pool.query(
      'SELECT is_system FROM roles WHERE id = $1',
      [id]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system) {
      return res.status(400).json({ error: 'Cannot modify system roles' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, description, is_system, created_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Удалить роль (только админ, системные роли нельзя удалять)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Роль удалена
 */
router.delete('/:id', async (req, res) => {
  try {
    // Проверка прав доступа
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Проверка, что роль не системная
    const roleCheck = await pool.query(
      'SELECT is_system FROM roles WHERE id = $1',
      [id]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system) {
      return res.status(400).json({ error: 'Cannot delete system roles' });
    }

    // Проверка, что роль не используется
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM managers WHERE role = (SELECT name FROM roles WHERE id = $1)',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete role that is in use' });
    }

    await pool.query('DELETE FROM roles WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


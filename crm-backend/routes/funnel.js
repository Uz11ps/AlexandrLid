import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * @swagger
 * /funnel/stages:
 *   get:
 *     summary: Получить все этапы воронки
 *     tags: [Funnel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список этапов воронки
 */
router.get('/stages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM funnel_stages WHERE is_active = TRUE ORDER BY order_index'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching funnel stages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create funnel stage
router.post('/stages', async (req, res) => {
  try {
    const { name, order_index, color } = req.body;

    const result = await pool.query(
      `INSERT INTO funnel_stages (name, order_index, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, order_index, color || '#3498db']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating funnel stage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update funnel stage
router.put('/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order_index, color, is_active } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      values.push(order_index);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE funnel_stages SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funnel stage not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating funnel stage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete funnel stage
router.delete('/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE funnel_stages SET is_active = FALSE WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funnel stage not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting funnel stage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead funnel stage (for drag & drop)
router.put('/leads/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { funnel_stage } = req.body;

    if (!funnel_stage) {
      return res.status(400).json({ error: 'funnel_stage is required' });
    }

    const result = await pool.query(
      `UPDATE leads 
       SET funnel_stage = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [funnel_stage, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Log interaction
    await pool.query(
      `INSERT INTO lead_interactions (lead_id, manager_id, interaction_type, notes)
       VALUES ($1, $2, $3, $4)`,
      [parseInt(id), req.user.id, 'stage_change', `Changed stage to ${funnel_stage}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lead stage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get message templates
router.get('/messages', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM message_templates WHERE is_active = TRUE';
    const params = [];

    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching message templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create message template
router.post('/messages', async (req, res) => {
  try {
    const { name, category, template_text, variables } = req.body;

    const result = await pool.query(
      `INSERT INTO message_templates (name, category, template_text, variables, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        category,
        template_text,
        JSON.stringify(variables || {}),
        req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating message template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update message template
router.put('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, template_text, variables, is_active } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (template_text !== undefined) {
      updates.push(`template_text = $${paramIndex++}`);
      values.push(template_text);
    }
    if (variables !== undefined) {
      updates.push(`variables = $${paramIndex++}`);
      values.push(JSON.stringify(variables));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE message_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get objection responses
router.get('/objections', async (req, res) => {
  try {
    const { objection_type } = req.query;
    let query = 'SELECT * FROM objection_responses';
    const params = [];

    if (objection_type) {
      query += ' WHERE objection_type = $1';
      params.push(objection_type);
    }

    query += ' ORDER BY effectiveness_rating DESC, usage_count DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching objection responses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create objection response
router.post('/objections', async (req, res) => {
  try {
    const { objection_type, response_text, category, effectiveness_rating } = req.body;

    const result = await pool.query(
      `INSERT INTO objection_responses (objection_type, response_text, category, effectiveness_rating)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [objection_type, response_text, category || null, effectiveness_rating || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating objection response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


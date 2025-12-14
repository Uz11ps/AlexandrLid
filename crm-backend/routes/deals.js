import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all deals
router.get('/', async (req, res) => {
  try {
    const { stage, manager_id, lead_id } = req.query;
    let query = `
      SELECT d.*, 
             l.fio as lead_name, l.phone as lead_phone,
             s.contract_number,
             m.name as manager_name
      FROM deals d
      LEFT JOIN leads l ON d.lead_id = l.id
      LEFT JOIN students s ON d.student_id = s.id
      LEFT JOIN managers m ON d.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (stage) {
      query += ` AND d.stage = $${paramIndex++}`;
      params.push(stage);
    }

    if (manager_id) {
      query += ` AND d.manager_id = $${paramIndex++}`;
      params.push(parseInt(manager_id));
    }

    if (lead_id) {
      query += ` AND d.lead_id = $${paramIndex++}`;
      params.push(parseInt(lead_id));
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single deal
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.*, 
              l.*,
              s.*,
              m.name as manager_name
       FROM deals d
       LEFT JOIN leads l ON d.lead_id = l.id
       LEFT JOIN students s ON d.student_id = s.id
       LEFT JOIN managers m ON d.manager_id = m.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create deal
router.post('/', async (req, res) => {
  try {
    const {
      lead_id, student_id, product_id, product_type,
      amount, currency, stage, probability_percent,
      expected_close_date, source, payment_method
    } = req.body;

    const result = await pool.query(
      `INSERT INTO deals (
        lead_id, student_id, product_id, product_type,
        amount, currency, stage, probability_percent,
        expected_close_date, manager_id, source, payment_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        lead_id, student_id || null, product_id, product_type,
        amount, currency || 'RUB', stage || 'draft', probability_percent || 0,
        expected_close_date || null, req.user.id, source || null, payment_method || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update deal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const allowedFields = [
      'stage', 'probability_percent', 'expected_close_date', 'actual_close_date',
      'amount', 'currency', 'payment_method', 'commission', 'net_profit', 'acquisition_cost'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updateFields.hasOwnProperty(field)) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(updateFields[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE deals SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


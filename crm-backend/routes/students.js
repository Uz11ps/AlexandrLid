import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all students
router.get('/', async (req, res) => {
  try {
    const { course_id, group_id, payment_status } = req.query;
    let query = `
      SELECT s.*, 
             l.*,
             c.name as course_name,
             p.name as package_name,
             g.name as group_name,
             m.name as curator_name
      FROM students s
      LEFT JOIN leads l ON s.lead_id = l.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN packages p ON s.package_id = p.id
      LEFT JOIN study_groups g ON s.group_id = g.id
      LEFT JOIN managers m ON s.curator_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (course_id) {
      query += ` AND s.course_id = $${paramIndex++}`;
      params.push(parseInt(course_id));
    }

    if (group_id) {
      query += ` AND s.group_id = $${paramIndex++}`;
      params.push(parseInt(group_id));
    }

    if (payment_status) {
      query += ` AND s.payment_status = $${paramIndex++}`;
      params.push(payment_status);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single student
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get student with lead info
    const studentResult = await pool.query(
      `SELECT s.*, l.*, c.name as course_name, p.name as package_name
       FROM students s
       LEFT JOIN leads l ON s.lead_id = l.id
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN packages p ON s.package_id = p.id
       WHERE s.id = $1`,
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get payments
    const paymentsResult = await pool.query(
      'SELECT * FROM payments WHERE student_id = $1 ORDER BY payment_date DESC',
      [id]
    );

    // Get debts
    const debtsResult = await pool.query(
      'SELECT * FROM debts WHERE student_id = $1 AND status = $2 ORDER BY due_date',
      [id, 'active']
    );

    res.json({
      ...studentResult.rows[0],
      payments: paymentsResult.rows,
      debts: debtsResult.rows
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Convert lead to student
router.post('/convert', async (req, res) => {
  try {
    const {
      lead_id, course_id, package_id, payment_amount,
      payment_currency, payment_method, contract_number
    } = req.body;

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create student record
      const studentResult = await pool.query(
        `INSERT INTO students (
          lead_id, course_id, package_id, payment_amount,
          payment_currency, payment_method, contract_number,
          start_date, payment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8)
        RETURNING *`,
        [
          lead_id, course_id, package_id, payment_amount,
          payment_currency || 'RUB', payment_method, contract_number,
          'pending'
        ]
      );

      // Update lead
      await pool.query(
        `UPDATE leads 
         SET is_student = TRUE, 
             converted_to_student_at = CURRENT_TIMESTAMP,
             funnel_stage = 'Конвертирован в студента',
             status = 'Студент'
         WHERE id = $1`,
        [lead_id]
      );

      await pool.query('COMMIT');

      res.status(201).json(studentResult.rows[0]);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error converting lead to student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const allowedFields = [
      'progress_percent', 'materials_access', 'group_id',
      'curator_id', 'payment_status', 'installment_plan'
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
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add payment
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount, currency, payment_method, payment_date,
      payment_type, installment_number, transaction_id, notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO payments (
        student_id, amount, currency, payment_method, payment_date,
        payment_type, installment_number, transaction_id, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        parseInt(id), amount, currency || 'RUB', payment_method, payment_date,
        payment_type || 'full', installment_number || null, transaction_id || null,
        notes || null, req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


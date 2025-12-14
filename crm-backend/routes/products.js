import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all courses
router.get('/courses', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM courses ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single course
router.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM courses WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create course
router.post('/courses', async (req, res) => {
  try {
    const {
      name, description, format, duration_weeks,
      program_structure, base_price, currency, status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO courses (name, description, format, duration_weeks, program_structure, base_price, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, format, duration_weeks, JSON.stringify(program_structure || {}), base_price, currency, status || 'active']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update course
router.put('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const allowedFields = ['name', 'description', 'format', 'duration_weeks', 'program_structure', 'base_price', 'currency', 'status'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updateFields.hasOwnProperty(field)) {
        if (field === 'program_structure') {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(JSON.stringify(updateFields[field]));
        } else {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(updateFields[field]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all packages
router.get('/packages', async (req, res) => {
  try {
    const { course_id } = req.query;
    let query = 'SELECT p.*, c.name as course_name FROM packages p LEFT JOIN courses c ON p.course_id = c.id';
    const params = [];

    if (course_id) {
      query += ' WHERE p.course_id = $1';
      params.push(course_id);
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create package
router.post('/packages', async (req, res) => {
  try {
    const {
      course_id, name, description, price, currency,
      duration_days, features, additional_services, installment_available, status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO packages (course_id, name, description, price, currency, duration_days, features, additional_services, installment_available, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        course_id, name, description, price, currency, duration_days,
        JSON.stringify(features || []), additional_services || [], installment_available || false, status || 'active'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get additional services
router.get('/services', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM additional_services WHERE status = $1 ORDER BY created_at DESC',
      ['active']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create additional service
router.post('/services', async (req, res) => {
  try {
    const { name, description, price, currency, duration_hours, service_type, status } = req.body;

    const result = await pool.query(
      `INSERT INTO additional_services (name, description, price, currency, duration_hours, service_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, price, currency, duration_hours, service_type, status || 'active']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


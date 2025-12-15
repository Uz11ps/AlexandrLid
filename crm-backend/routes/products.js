import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * @swagger
 * /products/courses:
 *   get:
 *     summary: Получить список курсов
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список курсов
 */
router.get('/courses', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, format, duration_weeks, status, created_at, updated_at FROM courses ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /products/courses/{id}:
 *   get:
 *     summary: Получить курс с тарифами
 *     tags: [Products]
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
 *         description: Данные курса
 */
router.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Валидация ID
    const courseId = parseInt(id);
    if (isNaN(courseId) || courseId <= 0) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }
    
    const courseResult = await pool.query(
      'SELECT * FROM courses WHERE id = $1',
      [courseId]
    );
    
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Course not found',
        message: `Курс с ID ${id} не найден в базе данных`
      });
    }
    
    // Get tariffs for this course (включая неактивные для админов)
    const tariffsResult = await pool.query(
      'SELECT * FROM course_tariffs WHERE course_id = $1 ORDER BY order_index, id',
      [courseId]
    );
    
    const course = courseResult.rows[0];
    
    // Парсим JSON поля если они есть
    if (course.program_structure && typeof course.program_structure === 'string') {
      try {
        course.program_structure = JSON.parse(course.program_structure);
      } catch (e) {
        console.error('Error parsing program_structure:', e);
      }
    }
    
    course.tariffs = tariffsResult.rows || [];
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Произошла ошибка при загрузке курса',
      details: error.message 
    });
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

// CRUD for Course Tariffs
// Get tariffs for a course
router.get('/courses/:courseId/tariffs', async (req, res) => {
  try {
    const { courseId } = req.params;
    const result = await pool.query(
      'SELECT * FROM course_tariffs WHERE course_id = $1 AND is_active = TRUE ORDER BY order_index, id',
      [courseId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tariffs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create tariff for a course
router.post('/courses/:courseId/tariffs', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { name, description, price, currency, features, installment_available, order_index } = req.body;
    
    const result = await pool.query(
      `INSERT INTO course_tariffs (course_id, name, description, price, currency, features, installment_available, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        courseId, name, description, price, currency || 'RUB',
        JSON.stringify(features || []), installment_available || false, order_index || 0
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tariff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tariff
router.put('/tariffs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, currency, features, installment_available, order_index, is_active } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (price !== undefined) { updates.push(`price = $${paramIndex++}`); values.push(price); }
    if (currency !== undefined) { updates.push(`currency = $${paramIndex++}`); values.push(currency); }
    if (features !== undefined) { updates.push(`features = $${paramIndex++}`); values.push(JSON.stringify(features)); }
    if (installment_available !== undefined) { updates.push(`installment_available = $${paramIndex++}`); values.push(installment_available); }
    if (order_index !== undefined) { updates.push(`order_index = $${paramIndex++}`); values.push(order_index); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(parseInt(id));
    
    const result = await pool.query(
      `UPDATE course_tariffs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tariff not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tariff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete tariff (soft delete by setting is_active = false)
router.delete('/tariffs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE course_tariffs SET is_active = FALSE WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tariff not found' });
    }
    
    res.json({ message: 'Tariff deleted', tariff: result.rows[0] });
  } catch (error) {
    console.error('Error deleting tariff:', error);
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


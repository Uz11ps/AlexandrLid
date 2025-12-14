import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Get tasks with filtering
router.get('/', async (req, res) => {
  try {
    const {
      manager_id,
      lead_id,
      status,
      due_date_from,
      due_date_to,
      date_filter // 'today', 'tomorrow', 'upcoming'
    } = req.query;

    let query = `
      SELECT t.*, 
             l.fio as lead_name, l.phone as lead_phone,
             m.name as manager_name
      FROM tasks t
      LEFT JOIN leads l ON t.lead_id = l.id
      LEFT JOIN managers m ON t.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filter by manager (default to current user if not admin)
    const managerFilter = manager_id || (req.user.role !== 'admin' ? req.user.id : null);
    if (managerFilter) {
      query += ` AND t.manager_id = $${paramIndex++}`;
      params.push(parseInt(managerFilter));
    }

    if (lead_id) {
      query += ` AND t.lead_id = $${paramIndex++}`;
      params.push(parseInt(lead_id));
    }

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    // Date filtering
    if (date_filter === 'today') {
      query += ` AND DATE(t.due_date) = CURRENT_DATE`;
    } else if (date_filter === 'tomorrow') {
      query += ` AND DATE(t.due_date) = CURRENT_DATE + INTERVAL '1 day'`;
    } else if (date_filter === 'upcoming') {
      query += ` AND DATE(t.due_date) > CURRENT_DATE`;
    }

    if (due_date_from) {
      query += ` AND t.due_date >= $${paramIndex++}`;
      params.push(due_date_from);
    }

    if (due_date_to) {
      query += ` AND t.due_date <= $${paramIndex++}`;
      params.push(due_date_to);
    }

    query += ` ORDER BY t.due_date ASC, t.priority DESC`;

    const result = await pool.query(query, params);

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single task
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, 
              l.fio as lead_name, l.phone as lead_phone, l.id as lead_id,
              m.name as manager_name
       FROM tasks t
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN managers m ON t.manager_id = m.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new task
router.post('/', async (req, res) => {
  try {
    const {
      lead_id,
      manager_id,
      title,
      description,
      task_type,
      due_date,
      due_time,
      priority
    } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due_date are required' });
    }

    // Определяем manager_id: если админ указал другого менеджера, используем его, иначе текущего пользователя
    let assignedManagerId = req.user.id;
    if (manager_id && req.user.role === 'admin') {
      // Проверяем, что указанный менеджер существует
      const managerCheck = await pool.query('SELECT id FROM managers WHERE id = $1 AND is_active = TRUE', [manager_id]);
      if (managerCheck.rows.length > 0) {
        assignedManagerId = parseInt(manager_id);
      }
    }

    const result = await pool.query(
      `INSERT INTO tasks (
        lead_id, manager_id, title, description, task_type,
        due_date, due_time, priority, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        lead_id || null,
        assignedManagerId,
        title,
        description || null,
        task_type || 'reminder',
        due_date,
        due_time || null,
        priority || 'normal',
        'new'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const allowedFields = [
      'title', 'description', 'task_type', 'due_date', 'due_time',
      'priority', 'status'
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

    // If status is being set to completed, set completed_at
    if (updateFields.status === 'completed') {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    } else if (updateFields.status && updateFields.status !== 'completed') {
      updates.push(`completed_at = NULL`);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


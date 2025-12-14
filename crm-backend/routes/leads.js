import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Telegram bot instance for sending messages
let botInstance = null;
if (process.env.BOT_TOKEN) {
  botInstance = new Telegraf(process.env.BOT_TOKEN);
}

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all leads with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      funnel_stage,
      manager_id,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (funnel_stage) {
      conditions.push(`funnel_stage = $${paramIndex++}`);
      params.push(funnel_stage);
    }

    if (manager_id) {
      conditions.push(`manager_id = $${paramIndex++}`);
      params.push(parseInt(manager_id));
    }

    if (search) {
      conditions.push(`(
        fio ILIKE $${paramIndex} OR 
        phone ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        telegram_username ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get leads
    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT * FROM leads 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      leads: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single lead by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT l.*, 
              u.first_name, u.last_name, u.username as telegram_username_from_users,
              m.name as manager_name
       FROM leads l
       LEFT JOIN users u ON l.user_id = u.user_id
       LEFT JOIN managers m ON l.manager_id = m.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get comments for this lead
    const commentsResult = await pool.query(
      `SELECT c.*, m.name as manager_name, m.email as manager_email
       FROM lead_comments c
       LEFT JOIN managers m ON c.manager_id = m.id
       WHERE c.lead_id = $1
       ORDER BY c.created_at DESC`,
      [id]
    );

    // Get interactions for this lead
    const interactionsResult = await pool.query(
      `SELECT 
        li.*,
        m.name as manager_name
       FROM lead_interactions li
       LEFT JOIN managers m ON li.manager_id = m.id
       WHERE li.lead_id = $1
       ORDER BY li.created_at ASC
       LIMIT 100`,
      [id]
    );

    res.json({
      ...result.rows[0],
      comments: commentsResult.rows,
      interactions: interactionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new lead
router.post('/', async (req, res) => {
  try {
    const {
      fio,
      phone,
      email,
      telegram_username,
      country,
      city,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO leads (
        fio, phone, email, telegram_username, country, city,
        source, utm_source, utm_medium, utm_campaign, notes,
        status, funnel_stage, manager_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        fio,
        phone || null,
        email || null,
        telegram_username || null,
        country || null,
        city || null,
        source || 'Manual',
        utm_source || null,
        utm_medium || null,
        utm_campaign || null,
        notes || null,
        'Новый лид',
        'Новый лид',
        req.user.id // Assign to current manager
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Build dynamic update query
    const allowedFields = [
      'fio', 'phone', 'email', 'telegram_username', 'country', 'city',
      'age', 'source', 'utm_source', 'utm_medium', 'utm_campaign',
      'trading_experience', 'interested_course', 'budget', 'ready_to_start',
      'preferred_contact', 'timezone', 'notes', 'status', 'funnel_stage',
      'manager_id', 'priority', 'tags'
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

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Log interaction if status or stage changed
    if (updateFields.status || updateFields.funnel_stage) {
      await pool.query(
        `INSERT INTO lead_interactions (lead_id, manager_id, interaction_type, notes)
         VALUES ($1, $2, $3, $4)`,
        [
          parseInt(id),
          req.user.id,
          updateFields.status ? 'status_change' : 'stage_change',
          `Changed ${updateFields.status ? 'status' : 'stage'} to ${updateFields.status || updateFields.funnel_stage}`
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to lead
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment_text } = req.body;

    if (!comment_text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const result = await pool.query(
      `INSERT INTO lead_comments (lead_id, manager_id, comment_text, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [parseInt(id), req.user.id, comment_text]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Telegram message to lead
router.post('/:id/message', async (req, res) => {
  try {
    const { id } = req.params;
    const { message_text } = req.body;

    if (!message_text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Get lead with user_id
    const leadResult = await pool.query(
      'SELECT user_id, fio FROM leads WHERE id = $1',
      [id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    if (!lead.user_id) {
      return res.status(400).json({ error: 'Lead does not have Telegram ID' });
    }

    if (!botInstance) {
      return res.status(500).json({ error: 'Telegram bot not configured' });
    }

    // Send message via Telegram bot
    await botInstance.telegram.sendMessage(lead.user_id, message_text);

    // Log interaction
    await pool.query(
      `INSERT INTO lead_interactions (lead_id, manager_id, interaction_type, interaction_data, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        parseInt(id),
        req.user.id,
        'telegram_message',
        JSON.stringify({ message: message_text }),
        `Sent message: ${message_text.substring(0, 50)}...`
      ]
    );

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

export default router;


import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Statistics
router.get('/stats', async (req, res) => {
  try {
    const [usersResult, referralsResult, broadcastsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total FROM referrals'),
      pool.query('SELECT COUNT(*) as total FROM broadcasts WHERE status = $1', ['sent'])
    ]);

    res.json({
      total_users: parseInt(usersResult.rows[0].total),
      total_referrals: parseInt(referralsResult.rows[0].total),
      total_broadcasts: parseInt(broadcastsResult.rows[0].total)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM users';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE username ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR CAST(user_id AS TEXT) LIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM users' + (search ? ` WHERE username ILIKE $1 OR first_name ILIKE $1 OR CAST(user_id AS TEXT) LIKE $1` : ''), search ? [`%${search}%`] : []);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const referralCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1',
      [userId]
    );

    const isBlacklistedResult = await pool.query(
      'SELECT * FROM blacklist WHERE user_id = $1',
      [userId]
    );

    res.json({
      ...userResult.rows[0],
      referral_count: parseInt(referralCountResult.rows[0].count),
      is_blacklisted: isBlacklistedResult.rows.length > 0,
      blacklist_info: isBlacklistedResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    await pool.query(
      'INSERT INTO blacklist (user_id, reason) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET reason = $2',
      [userId, reason || 'Заблокирован администратором']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:userId/unban', async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query('DELETE FROM blacklist WHERE user_id = $1', [userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Broadcasts
router.get('/broadcasts', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM broadcasts ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/broadcasts', async (req, res) => {
  try {
    const { title, message_text, buttons, scheduled_at, target_audience } = req.body;

    const result = await pool.query(
      `INSERT INTO broadcasts (title, message_text, buttons, scheduled_at, target_audience, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        message_text,
        JSON.stringify(buttons || []),
        scheduled_at || null,
        target_audience || 'all',
        scheduled_at ? 'scheduled' : 'draft'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating broadcast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Autofunnels
router.get('/autofunnels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM autofunnels ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching autofunnels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/autofunnels', async (req, res) => {
  try {
    const { name, trigger_event, delay_hours, message_text, is_active } = req.body;

    const result = await pool.query(
      `INSERT INTO autofunnels (name, trigger_event, delay_hours, message_text, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, trigger_event, delay_hours, message_text, is_active !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating autofunnel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/autofunnels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(
      'UPDATE autofunnels SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Autofunnel not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating autofunnel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lead Magnets
router.get('/lead-magnets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lead_magnets ORDER BY created_at DESC');
    const activeResult = await pool.query('SELECT * FROM lead_magnets WHERE is_active = TRUE LIMIT 1');
    
    res.json({
      lead_magnets: result.rows,
      active: activeResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching lead magnets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/lead-magnets', async (req, res) => {
  try {
    const { title, type, text_content, link_url, file_id, file_type } = req.body;

    const result = await pool.query(
      `INSERT INTO lead_magnets (title, type, text_content, link_url, file_id, file_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, type, text_content || null, link_url || null, file_id || null, file_type || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead magnet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/lead-magnets/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    // Deactivate all
    await pool.query('UPDATE lead_magnets SET is_active = FALSE');
    
    // Activate this one
    const result = await pool.query(
      'UPDATE lead_magnets SET is_active = TRUE WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead magnet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error activating lead magnet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Giveaways
router.get('/giveaways', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM giveaways ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching giveaways:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/giveaways', async (req, res) => {
  try {
    const { title, description, prize_description, end_date, status } = req.body;

    const result = await pool.query(
      `INSERT INTO giveaways (title, description, prize_description, end_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || null, prize_description || null, end_date, status || 'draft']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating giveaway:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


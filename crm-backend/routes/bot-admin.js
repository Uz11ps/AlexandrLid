import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
router.use(authenticateToken);

// Initialize Telegram bot instance for sending broadcasts
let botInstance = null;
if (process.env.BOT_TOKEN) {
  botInstance = new Telegraf(process.env.BOT_TOKEN);
}

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
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.post('/users/:userId/unban', async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query('DELETE FROM blacklist WHERE user_id = $1', [userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.post('/broadcasts', async (req, res) => {
  try {
    const { title, message_text, buttons, scheduled_at, target_audience } = req.body;

    if (!title || !message_text) {
      return res.status(400).json({ error: 'Title and message_text are required' });
    }

    // Конвертация времени из локального времени браузера в UTC
    let scheduledAtUTC = null;
    if (scheduled_at) {
      // datetime-local возвращает время в формате "YYYY-MM-DDTHH:mm" без часового пояса
      // Интерпретируем его как локальное время и конвертируем в UTC
      const localDate = new Date(scheduled_at);
      // Проверяем, что дата валидна
      if (isNaN(localDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduled_at format' });
      }
      // Конвертируем в UTC для сохранения в БД
      scheduledAtUTC = localDate.toISOString();
    }

    const result = await pool.query(
      `INSERT INTO broadcasts (title, message_text, buttons, scheduled_at, segment, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        message_text,
        buttons ? JSON.stringify(buttons) : null,
        scheduledAtUTC || null,
        target_audience || 'all',
        scheduledAtUTC ? 'scheduled' : 'draft'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating broadcast:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/broadcasts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message_text, buttons, scheduled_at, target_audience, status } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (message_text !== undefined) {
      updates.push(`message_text = $${paramIndex++}`);
      values.push(message_text);
    }
    if (buttons !== undefined) {
      updates.push(`buttons = $${paramIndex++}`);
      values.push(buttons ? JSON.stringify(buttons) : null);
    }
    if (scheduled_at !== undefined) {
      // Конвертация времени из локального времени браузера в UTC
      let scheduledAtUTC = null;
      if (scheduled_at) {
        const localDate = new Date(scheduled_at);
        if (!isNaN(localDate.getTime())) {
          scheduledAtUTC = localDate.toISOString();
        }
      }
      updates.push(`scheduled_at = $${paramIndex++}`);
      values.push(scheduledAtUTC || null);
    }
    if (target_audience !== undefined) {
      updates.push(`segment = $${paramIndex++}`);
      values.push(target_audience);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(parseInt(id));
    const result = await pool.query(
      `UPDATE broadcasts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating broadcast:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.post('/broadcasts/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const broadcastResult = await pool.query('SELECT * FROM broadcasts WHERE id = $1', [id]);
    
    if (broadcastResult.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }

    const broadcast = broadcastResult.rows[0];
    
    if (!botInstance) {
      return res.status(500).json({ error: 'Bot instance not initialized. Check BOT_TOKEN in environment variables.' });
    }

    // Получить список пользователей для рассылки
    let usersQuery = 'SELECT user_id FROM users';
    const usersParams = [];
    let hasWhere = false;
    
    // Фильтрация по сегменту (если указан)
    if (broadcast.segment && broadcast.segment !== 'all') {
      if (broadcast.segment === 'active') {
        usersQuery += " WHERE created_at >= NOW() - INTERVAL '30 days'";
        hasWhere = true;
      }
      // Можно добавить другие сегменты
    }
    
    // Исключить заблокированных пользователей
    if (hasWhere) {
      usersQuery += ' AND user_id NOT IN (SELECT user_id FROM blacklist)';
    } else {
      usersQuery += ' WHERE user_id NOT IN (SELECT user_id FROM blacklist)';
    }
    
    const usersResult = await pool.query(usersQuery, usersParams);
    const users = usersResult.rows;

    if (users.length === 0) {
      return res.status(400).json({ error: 'No users found for broadcast' });
    }

    // Парсинг кнопок
    let replyMarkup = null;
    if (broadcast.buttons) {
      try {
        const buttons = typeof broadcast.buttons === 'string' 
          ? JSON.parse(broadcast.buttons) 
          : broadcast.buttons;
        
        if (Array.isArray(buttons) && buttons.length > 0) {
          replyMarkup = {
            inline_keyboard: buttons
          };
        }
      } catch (error) {
        console.error('Error parsing buttons:', error);
      }
    }

    // Отправка сообщений
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        const messageOptions = {};
        if (replyMarkup) {
          messageOptions.reply_markup = replyMarkup;
        }

        await botInstance.telegram.sendMessage(
          user.user_id,
          broadcast.message_text,
          messageOptions
        );
        successCount++;
        
        // Небольшая задержка, чтобы не превысить лимиты Telegram API
        if (successCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        errorCount++;
        errors.push({
          user_id: user.user_id,
          error: error.message
        });
        
        // Если пользователь заблокировал бота или удалил аккаунт, пропускаем
        if (error.response?.error_code === 403 || error.response?.error_code === 400) {
          console.log(`User ${user.user_id} blocked bot or invalid`);
        } else {
          console.error(`Error sending to user ${user.user_id}:`, error.message);
        }
      }
    }

    // Обновить статус рассылки
    await pool.query(
      `UPDATE broadcasts 
       SET status = $1, 
           sent_at = CURRENT_TIMESTAMP, 
           sent_count = $2, 
           error_count = $3 
       WHERE id = $4`,
      ['sent', successCount, errorCount, id]
    );

    res.json({ 
      success: true, 
      message: 'Broadcast sent',
      sent: successCount,
      errors: errorCount,
      total: users.length,
      error_details: errors.slice(0, 10) // Первые 10 ошибок для отладки
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.delete('/broadcasts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM broadcasts WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Autofunnels
router.get('/autofunnels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM autofunnels ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching autofunnels:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.post('/autofunnels', async (req, res) => {
  try {
    const { name, trigger_event, delay_hours, message_text, is_active } = req.body;

    if (!name || !trigger_event || !message_text) {
      return res.status(400).json({ error: 'Name, trigger_event, and message_text are required' });
    }

    const result = await pool.query(
      `INSERT INTO autofunnels (name, trigger_event, delay_hours, message_text, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, trigger_event, delay_hours || 0, message_text, is_active !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating autofunnel:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/autofunnels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, trigger_event, delay_hours, message_text, is_active } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (trigger_event !== undefined) {
      updates.push(`trigger_event = $${paramIndex++}`);
      values.push(trigger_event);
    }
    if (delay_hours !== undefined) {
      updates.push(`delay_hours = $${paramIndex++}`);
      values.push(delay_hours);
    }
    if (message_text !== undefined) {
      updates.push(`message_text = $${paramIndex++}`);
      values.push(message_text);
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
      `UPDATE autofunnels SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Autofunnel not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating autofunnel:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.delete('/autofunnels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM autofunnels WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Autofunnel not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting autofunnel:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.post('/lead-magnets', async (req, res) => {
  try {
    const { title, type, text_content, link_url, file_id, file_type } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    if (type === 'text' && !text_content) {
      return res.status(400).json({ error: 'text_content is required for text type' });
    }
    if (type === 'link' && !link_url) {
      return res.status(400).json({ error: 'link_url is required for link type' });
    }
    if (type === 'file' && (!file_id || !file_type)) {
      return res.status(400).json({ error: 'file_id and file_type are required for file type' });
    }

    const result = await pool.query(
      `INSERT INTO lead_magnets (title, type, text_content, link_url, file_id, file_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, type, text_content || null, link_url || null, file_id || null, file_type || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead magnet:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/lead-magnets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, text_content, link_url, file_id, file_type } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (text_content !== undefined) {
      updates.push(`text_content = $${paramIndex++}`);
      values.push(text_content);
    }
    if (link_url !== undefined) {
      updates.push(`link_url = $${paramIndex++}`);
      values.push(link_url);
    }
    if (file_id !== undefined) {
      updates.push(`file_id = $${paramIndex++}`);
      values.push(file_id);
    }
    if (file_type !== undefined) {
      updates.push(`file_type = $${paramIndex++}`);
      values.push(file_type);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));
    const result = await pool.query(
      `UPDATE lead_magnets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead magnet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lead magnet:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.delete('/lead-magnets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM lead_magnets WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead magnet not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead magnet:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Giveaways
router.get('/giveaways', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM giveaways ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching giveaways:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.post('/giveaways', async (req, res) => {
  try {
    const { title, description, prize_description, end_date, status, start_date } = req.body;

    if (!title || !end_date) {
      return res.status(400).json({ error: 'Title and end_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO giveaways (title, description, prize_description, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        description || null,
        prize_description || null,
        start_date || new Date().toISOString(),
        end_date,
        status || 'draft'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating giveaway:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/giveaways/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, prize_description, start_date, end_date, status } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (prize_description !== undefined) {
      updates.push(`prize_description = $${paramIndex++}`);
      values.push(prize_description);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(end_date);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      if (status === 'ended') {
        updates.push(`ended_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(parseInt(id));
    const result = await pool.query(
      `UPDATE giveaways SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating giveaway:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.delete('/giveaways/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM giveaways WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting giveaway:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Export data
router.get('/export/:type/:format', async (req, res) => {
  try {
    const { type, format } = req.params;
    let users;

    switch (type) {
      case 'all':
        const allResult = await pool.query('SELECT * FROM users');
        users = allResult.rows;
        break;
      case 'active':
        const activeResult = await pool.query(
          `SELECT * FROM users WHERE created_at >= NOW() - INTERVAL '30 days'`
        );
        users = activeResult.rows;
        break;
      case 'refs':
        const refsResult = await pool.query(`
          SELECT u.*, COUNT(r.id) as referral_count
          FROM users u
          LEFT JOIN referrals r ON u.user_id = r.referrer_id
          GROUP BY u.user_id
          HAVING COUNT(r.id) > 0
          ORDER BY referral_count DESC
        `);
        users = refsResult.rows;
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'excel' || format === 'xlsx') {
      // Используем динамический импорт для exceljs
      const exceljs = await import('exceljs');
      // ExcelJS экспортируется как default в ES modules
      const ExcelJS = exceljs.default || exceljs;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Пользователи');

      worksheet.columns = [
        { header: 'ID', key: 'user_id', width: 15 },
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Имя', key: 'first_name', width: 20 },
        { header: 'Фамилия', key: 'last_name', width: 20 },
        { header: 'Дата регистрации', key: 'created_at', width: 20 },
        { header: 'Рефералов', key: 'referral_count', width: 15 }
      ];

      worksheet.getRow(1).font = { bold: true };
      users.forEach(user => {
        worksheet.addRow({
          user_id: user.user_id,
          username: user.username || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          created_at: new Date(user.created_at).toLocaleString('ru-RU'),
          referral_count: user.referral_count || 0
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=export_${type}_${Date.now()}.xlsx`);
      res.send(buffer);
    } else {
      // CSV
      const csvHeader = 'user_id,username,first_name,last_name,created_at,referral_count\n';
      const csvRows = users.map(user => {
        const username = (user.username || '').replace(/,/g, '');
        const firstName = (user.first_name || '').replace(/,/g, '');
        const lastName = (user.last_name || '').replace(/,/g, '');
        return `${user.user_id},${username},${firstName},${lastName},${user.created_at},${user.referral_count || 0}`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=export_${type}_${Date.now()}.csv`);
      res.send(csvHeader + csvRows);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Settings
router.get('/settings', async (req, res) => {
  try {
    const settingsResult = await pool.query("SELECT key, value FROM bot_settings WHERE key IN ('channel_id', 'channel_username', 'user_rate_limit', 'user_rate_window', 'admin_rate_limit', 'admin_rate_window', 'timezone')");
    
    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    // Определяем часовой пояс сервера
    const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const serverOffset = -new Date().getTimezoneOffset() / 60; // Смещение в часах
    
    res.json({
      channel_id: settings.channel_id || null,
      channel_username: settings.channel_username || null,
      user_rate_limit: parseInt(settings.user_rate_limit) || 20,
      user_rate_window: parseInt(settings.user_rate_window) || 3600000, // 1 час в миллисекундах
      admin_rate_limit: parseInt(settings.admin_rate_limit) || 100,
      admin_rate_window: parseInt(settings.admin_rate_window) || 3600000,
      timezone: settings.timezone || serverTimezone,
      server_timezone: serverTimezone,
      server_utc_offset: serverOffset,
      current_server_time: new Date().toISOString(),
      current_server_time_local: new Date().toLocaleString('ru-RU', { timeZone: serverTimezone })
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/settings/channel', async (req, res) => {
  try {
    const { channel_id, channel_username } = req.body;

    if (channel_id !== undefined) {
      await pool.query(
        `INSERT INTO bot_settings (key, value) VALUES ('channel_id', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [channel_id]
      );
    }

    if (channel_username !== undefined) {
      await pool.query(
        `INSERT INTO bot_settings (key, value) VALUES ('channel_username', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [channel_username]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating channel settings:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/settings/rate-limits', async (req, res) => {
  try {
    const { user_rate_limit, user_rate_window, admin_rate_limit, admin_rate_window } = req.body;

    if (user_rate_limit !== undefined) {
      await pool.query(
        `INSERT INTO bot_settings (key, value) VALUES ('user_rate_limit', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [user_rate_limit.toString()]
      );
    }

    if (user_rate_window !== undefined) {
      await pool.query(
        `INSERT INTO bot_settings (key, value) VALUES ('user_rate_window', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [user_rate_window.toString()]
      );
    }

    if (admin_rate_limit !== undefined) {
      await pool.query(
        `INSERT INTO bot_settings (key, value) VALUES ('admin_rate_limit', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [admin_rate_limit.toString()]
      );
    }

    if (admin_rate_window !== undefined) {
      await pool.query(
        `INSERT INTO bot_settings (key, value) VALUES ('admin_rate_window', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [admin_rate_window.toString()]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating rate limit settings:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get giveaway participants
router.get('/giveaways/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT gp.*, u.username, u.first_name, u.last_name
       FROM giveaway_participants gp
       LEFT JOIN users u ON gp.user_id = u.user_id
       WHERE gp.giveaway_id = $1
       ORDER BY gp.referral_count DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching giveaway participants:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Select winners for giveaway
router.post('/giveaways/:id/winners', async (req, res) => {
  try {
    const { id } = req.params;
    const { selection_type } = req.body; // 'top', 'random', 'combined'

    // Get giveaway
    const giveawayResult = await pool.query('SELECT * FROM giveaways WHERE id = $1', [id]);
    if (giveawayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }

    const giveaway = giveawayResult.rows[0];

    if (giveaway.status !== 'ended' && giveaway.status !== 'active') {
      return res.status(400).json({ error: 'Giveaway is not active or ended' });
    }

    // Get participants
    const participantsResult = await pool.query(
      `SELECT gp.*, u.username, u.first_name, u.last_name
       FROM giveaway_participants gp
       LEFT JOIN users u ON gp.user_id = u.user_id
       WHERE gp.giveaway_id = $1 AND gp.referral_count >= $2
       ORDER BY gp.referral_count DESC`,
      [id, giveaway.min_referrals || 0]
    );

    const eligibleParticipants = participantsResult.rows;

    if (eligibleParticipants.length === 0) {
      return res.status(400).json({ error: 'No eligible participants' });
    }

    // Select winners
    let winners = [];
    const winnerCount = Math.min(giveaway.winner_count || 1, eligibleParticipants.length);
    const selectionType = selection_type || giveaway.winner_selection_type || 'top';

    if (selectionType === 'top') {
      winners = eligibleParticipants.slice(0, winnerCount);
    } else if (selectionType === 'random') {
      const shuffled = [...eligibleParticipants].sort(() => Math.random() - 0.5);
      winners = shuffled.slice(0, winnerCount);
    } else {
      // Combined: 50% top, 50% random
      const topCount = Math.ceil(winnerCount / 2);
      const randomCount = winnerCount - topCount;
      
      winners = eligibleParticipants.slice(0, topCount);
      const remaining = eligibleParticipants.slice(topCount);
      const shuffled = [...remaining].sort(() => Math.random() - 0.5);
      winners.push(...shuffled.slice(0, randomCount));
    }

    // Update giveaway status
    await pool.query(
      'UPDATE giveaways SET status = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['ended', id]
    );

    // Notify winners via Telegram bot
    const { Telegraf } = await import('telegraf');
    const dotenv = await import('dotenv');
    dotenv.config();
    
    if (process.env.BOT_TOKEN) {
      const bot = new Telegraf(process.env.BOT_TOKEN);
      for (const winner of winners) {
        try {
          await bot.telegram.sendMessage(
            winner.user_id,
            `🎉 Поздравляем! Вы победили в розыгрыше "${giveaway.title}"!\n\n` +
            `🎁 Приз: ${giveaway.prize_description || 'не указан'}\n\n` +
            `Свяжитесь с администратором для получения приза.`
          );
        } catch (error) {
          console.error(`Failed to notify winner ${winner.user_id}:`, error);
        }
      }
    }

    res.json({
      success: true,
      winners: winners.map(w => ({
        user_id: w.user_id,
        username: w.username,
        first_name: w.first_name,
        referral_count: parseInt(w.referral_count) || 0
      }))
    });
  } catch (error) {
    console.error('Error selecting winners:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;


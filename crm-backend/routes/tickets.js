import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Получить список тикетов
router.get('/', async (req, res) => {
  try {
    const { status, manager_id, user_id } = req.query;
    
    let query = `
      SELECT t.*, 
             u.username as user_username, u.first_name as user_first_name,
             m.name as manager_name,
             (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) as messages_count,
             (SELECT MAX(created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.id) as last_message_at
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.user_id
      LEFT JOIN managers m ON t.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Фильтр по статусу
    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    // Фильтр по менеджеру
    if (manager_id) {
      query += ` AND t.manager_id = $${paramIndex++}`;
      params.push(parseInt(manager_id));
    } else if (req.user.role !== 'admin') {
      // Менеджеры видят только свои тикеты
      query += ` AND (t.manager_id = $${paramIndex++} OR t.manager_id IS NULL)`;
      params.push(req.user.id);
    }

    // Фильтр по пользователю
    if (user_id) {
      query += ` AND t.user_id = $${paramIndex++}`;
      params.push(parseInt(user_id));
    }

    query += ` ORDER BY t.updated_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить тикет по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const ticketResult = await pool.query(
      `SELECT t.*, 
              u.username as user_username, u.first_name as user_first_name,
              m.name as manager_name
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.user_id
       LEFT JOIN managers m ON t.manager_id = m.id
       WHERE t.id = $1`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Проверка прав доступа
    if (req.user.role !== 'admin' && ticket.manager_id !== req.user.id && ticket.manager_id !== null) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Получить сообщения
    const messagesResult = await pool.query(
      `SELECT tm.*,
              CASE 
                WHEN tm.sender_type = 'user' THEN u.first_name
                WHEN tm.sender_type IN ('manager', 'admin') THEN m.name
              END as sender_name
       FROM ticket_messages tm
       LEFT JOIN users u ON tm.sender_type = 'user' AND tm.sender_id = u.user_id
       LEFT JOIN managers m ON tm.sender_type IN ('manager', 'admin') AND tm.sender_id = m.id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [id]
    );

    res.json({
      ...ticket,
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать тикет
router.post('/', async (req, res) => {
  try {
    const { user_id, subject, priority } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const result = await pool.query(
      `INSERT INTO tickets (user_id, manager_id, subject, priority, status)
       VALUES ($1, $2, $3, $4, 'open')
       RETURNING *`,
      [
        user_id,
        req.user.role === 'admin' ? null : req.user.id, // Автоматически назначаем менеджера если не админ
        subject || 'Новый тикет',
        priority || 'normal'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Отправить сообщение в тикет
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { message_text } = req.body;

    if (!message_text) {
      return res.status(400).json({ error: 'message_text is required' });
    }

    // Проверить существование тикета
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Проверка прав доступа
    if (req.user.role !== 'admin' && ticket.manager_id !== req.user.id && ticket.manager_id !== null) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Определить тип отправителя
    const senderType = req.user.role === 'admin' ? 'admin' : 'manager';

    // Создать сообщение
    const messageResult = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, senderType, req.user.id, message_text]
    );

    // Обновить статус тикета и время обновления
    // Если тикет закрыт, переоткрыть его
    const updateResult = await pool.query(
      `UPDATE tickets 
       SET status = CASE WHEN status IN ('closed', 'resolved') THEN 'open' ELSE status END,
           updated_at = CURRENT_TIMESTAMP,
           closed_at = CASE WHEN status IN ('closed', 'resolved') THEN NULL ELSE closed_at END,
           manager_id = CASE WHEN manager_id IS NULL THEN $1 ELSE manager_id END
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    // Отправить сообщение в Telegram (если есть user_id)
    if (ticket.user_id) {
      try {
        const { Telegraf } = await import('telegraf');
        const dotenv = await import('dotenv');
        dotenv.config();
        
        if (process.env.BOT_TOKEN) {
          const bot = new Telegraf(process.env.BOT_TOKEN);
          await bot.telegram.sendMessage(ticket.user_id, message_text);
        }
      } catch (telegramError) {
        console.error('Error sending message to Telegram:', telegramError);
        // Не прерываем выполнение, просто логируем ошибку
      }
    }

    res.status(201).json(messageResult.rows[0]);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить тикет
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, manager_id, priority } = req.body;

    // Проверить существование тикета
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Проверка прав доступа
    if (req.user.role !== 'admin' && ticket.manager_id !== req.user.id && ticket.manager_id !== null) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      if (status === 'closed' || status === 'resolved') {
        updates.push(`closed_at = CURRENT_TIMESTAMP`);
      } else {
        updates.push(`closed_at = NULL`);
      }
    }

    if (manager_id !== undefined && req.user.role === 'admin') {
      updates.push(`manager_id = $${paramIndex++}`);
      values.push(manager_id);
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


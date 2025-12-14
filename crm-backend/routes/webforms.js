import express from 'express';
import pool from '../db.js';
import cors from 'cors';

const router = express.Router();

// Allow CORS for web forms (public endpoint)
router.use(cors());

// Create lead from web form (public endpoint, no auth required)
router.post('/lead', async (req, res) => {
  try {
    const {
      fio,
      phone,
      email,
      telegram_username,
      country,
      city,
      age,
      source = 'Web Form',
      utm_source,
      utm_medium,
      utm_campaign,
      trading_experience,
      interested_course,
      budget,
      ready_to_start,
      preferred_contact,
      timezone,
      notes
    } = req.body;

    // Validate required fields
    if (!fio || !phone) {
      return res.status(400).json({ error: 'ФИО и телефон обязательны для заполнения' });
    }

    // Create lead
    const result = await pool.query(
      `INSERT INTO leads (
        fio, phone, email, telegram_username, country, city, age,
        source, utm_source, utm_medium, utm_campaign,
        trading_experience, interested_course, budget, ready_to_start,
        preferred_contact, timezone, notes,
        status, funnel_stage, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, fio, phone, email, created_at`,
      [
        fio, phone || null, email || null, telegram_username || null,
        country || null, city || null, age || null,
        source, utm_source || null, utm_medium || null, utm_campaign || null,
        trading_experience || null, interested_course || null, budget || null,
        ready_to_start || null, preferred_contact || null, timezone || null, notes || null,
        'Новый лид', 'Новый лид'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Заявка успешно создана',
      lead: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating lead from web form:', error);
    
    // Check if it's a duplicate
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Заявка с такими данными уже существует' });
    }

    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
});

// Get web form structure (for frontend integration)
router.get('/structure', (req, res) => {
  res.json({
    fields: [
      { name: 'fio', label: 'ФИО', type: 'text', required: true },
      { name: 'phone', label: 'Телефон', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: false },
      { name: 'telegram_username', label: 'Telegram', type: 'text', required: false },
      { name: 'country', label: 'Страна', type: 'text', required: false },
      { name: 'city', label: 'Город', type: 'text', required: false },
      { name: 'age', label: 'Возраст', type: 'number', required: false },
      { name: 'trading_experience', label: 'Опыт в трейдинге', type: 'select', 
        options: ['новичок', 'есть опыт', 'продвинутый'], required: false },
      { name: 'interested_course', label: 'Интересующий курс', type: 'text', required: false },
      { name: 'budget', label: 'Бюджет', type: 'text', required: false },
      { name: 'ready_to_start', label: 'Готовность к старту', type: 'text', required: false },
      { name: 'preferred_contact', label: 'Предпочитаемый способ связи', type: 'text', required: false },
      { name: 'timezone', label: 'Часовой пояс', type: 'text', required: false },
      { name: 'notes', label: 'Дополнительная информация', type: 'textarea', required: false }
    ],
    utm_fields: ['utm_source', 'utm_medium', 'utm_campaign']
  });
});

export default router;


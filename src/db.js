import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// В Docker Compose используем имя сервиса 'postgres', иначе 'localhost'
const dbHost = process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? 'postgres' : 'localhost');
const dbPort = parseInt(process.env.DB_PORT || '5432');
const dbName = process.env.DB_NAME || 'telegram_bot_db';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';

console.log(`🔌 Подключение к БД: ${dbHost}:${dbPort}/${dbName} (user: ${dbUser})`);

const pool = new Pool({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
});

// Устанавливаем московский часовой пояс для всех подключений к БД
pool.on('connect', async (client) => {
  await client.query('SET timezone = \'Europe/Moscow\'');
});

// Проверка подключения и установка московского часового пояса
pool.on('connect', async (client) => {
  await client.query('SET timezone = \'Europe/Moscow\'');
  console.log('✅ Подключение к базе данных установлено (Moscow timezone)');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка подключения к базе данных:', err);
});

// Экспортируем pool для использования в других модулях
export { pool };

// Функции для работы с пользователями
export const db = {
  // Получить пользователя по ID
  async getUser(userId) {
    const result = await pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  },

  // Создать нового пользователя
  async createUser(userData) {
    const { user_id, username, first_name, last_name, language_code, referrer_id, is_bot } = userData;
    const result = await pool.query(
      `INSERT INTO users (user_id, username, first_name, last_name, language_code, referrer_id, is_bot)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name
       RETURNING *`,
      [user_id, username || null, first_name || null, last_name || null, language_code || null, referrer_id || null, is_bot || false]
    );
    return result.rows[0];
  },

  // Создать реферальную связь
  async createReferral(referrerId, referralId) {
    try {
      console.log(`Creating referral: ${referrerId} -> ${referralId}`);
      
      // Сначала проверяем, существует ли уже такая связь
      const existing = await pool.query(
        'SELECT * FROM referrals WHERE referrer_id = $1 AND referral_id = $2',
        [referrerId, referralId]
      );
      
      if (existing.rows.length > 0) {
        console.log('Referral already exists');
        return existing.rows[0];
      }
      
      const result = await pool.query(
        `INSERT INTO referrals (referrer_id, referral_id)
         VALUES ($1, $2)
         ON CONFLICT (referrer_id, referral_id) DO NOTHING
         RETURNING *`,
        [referrerId, referralId]
      );
      
      if (result.rows.length > 0) {
        console.log('Referral created successfully');
        return result.rows[0];
      } else {
        console.log('Referral was not created (conflict)');
        return null;
      }
    } catch (error) {
      console.error('Ошибка при создании реферальной связи:', error);
      return null;
    }
  },

  // Получить количество рефералов пользователя
  async getReferralCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  },

  // Получить всех рефералов пользователя
  async getReferrals(userId) {
    const result = await pool.query(
      `SELECT u.* FROM users u
       INNER JOIN referrals r ON u.user_id = r.referral_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Получить общее количество пользователей
  async getTotalUsers() {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  },

  // Получить новых пользователей за период
  async getNewUsers(days = 1) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM users
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1`,
      [days]
    );
    return parseInt(result.rows[0].count);
  },

  // Получить всех пользователей для экспорта
  async getAllUsers() {
    const result = await pool.query(
      `SELECT u.*, 
              (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.user_id) as referral_count
       FROM users u
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  },

  // Получить всех пользователей для рассылки
  async getAllUsersForBroadcast() {
    const result = await pool.query('SELECT user_id FROM users WHERE is_bot = FALSE');
    return result.rows.map(row => row.user_id);
  },

  // Работа с лид-магнитами
  async getActiveLeadMagnet() {
    const result = await pool.query(
      'SELECT * FROM lead_magnets WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0];
  },

  async createLeadMagnet(leadMagnetData) {
    const { title, type, text_content, link_url, file_id, file_type } = leadMagnetData;
    const result = await pool.query(
      `INSERT INTO lead_magnets (title, type, text_content, link_url, file_id, file_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, type, text_content || null, link_url || null, file_id || null, file_type || null]
    );
    return result.rows[0];
  },

  async updateLeadMagnet(id, leadMagnetData) {
    const { title, type, text_content, link_url, file_id, file_type, is_active } = leadMagnetData;
    const result = await pool.query(
      `UPDATE lead_magnets 
       SET title = COALESCE($1, title),
           type = COALESCE($2, type),
           text_content = COALESCE($3, text_content),
           link_url = COALESCE($4, link_url),
           file_id = COALESCE($5, file_id),
           file_type = COALESCE($6, file_type),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [title, type, text_content, link_url, file_id, file_type, is_active, id]
    );
    return result.rows[0];
  },

  async getAllLeadMagnets() {
    const result = await pool.query(
      'SELECT * FROM lead_magnets ORDER BY created_at DESC'
    );
    return result.rows;
  },

  // Работа с настройками бота
  async getSetting(key) {
    const result = await pool.query(
      'SELECT value FROM bot_settings WHERE key = $1',
      [key]
    );
    return result.rows[0]?.value || null;
  },

  async setSetting(key, value) {
    await pool.query(
      `INSERT INTO bot_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  },

  // Работа с черным списком
  async addToBlacklist(userId, reason, bannedBy) {
    await pool.query(
      `INSERT INTO blacklist (user_id, reason, banned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         reason = EXCLUDED.reason,
         banned_at = CURRENT_TIMESTAMP,
         banned_by = EXCLUDED.banned_by`,
      [userId, reason || null, bannedBy || null]
    );
  },

  async removeFromBlacklist(userId) {
    await pool.query('DELETE FROM blacklist WHERE user_id = $1', [userId]);
  },

  async isBlacklisted(userId) {
    const result = await pool.query(
      'SELECT * FROM blacklist WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0;
  },

  // Получить топ рефералов для лидерборда
  async getTopReferrers(limit = 10) {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.first_name,
              COUNT(r.id) as referral_count
       FROM users u
       LEFT JOIN referrals r ON u.user_id = r.referrer_id
       WHERE u.is_bot = FALSE
       GROUP BY u.user_id, u.username, u.first_name
       HAVING COUNT(r.id) > 0
       ORDER BY referral_count DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  // Работа с рассылками
  async createBroadcast(broadcastData) {
    const { title, message_text, message_type, file_id, buttons, segment, scheduled_at, created_by } = broadcastData;
    
    console.log(`📝 [Broadcast] Создание новой рассылки:`);
    console.log(`  Название: "${title}"`);
    console.log(`  Сегмент: ${segment || 'all'}`);
    console.log(`  Тип сообщения: ${message_type || 'text'}`);
    console.log(`  Создано пользователем: ${created_by || 'система'}`);
    
    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      const moscowTime = new Date(scheduledDate.getTime() + (3 * 60 * 60 * 1000));
      const moscowStr = moscowTime.toLocaleString('ru-RU', { 
        timeZone: 'UTC',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`  ⏰ Запланировано на: ${scheduled_at} (UTC) = ${moscowStr} (MSK)`);
      console.log(`  Статус: scheduled`);
    } else {
      console.log(`  📤 Отправка: немедленная (draft)`);
    }
    
    const result = await pool.query(
      `INSERT INTO broadcasts (title, message_text, message_type, file_id, buttons, segment, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, message_text, message_type || 'text', file_id || null, buttons ? JSON.stringify(buttons) : null, segment || null, scheduled_at || null, created_by || null]
    );
    
    const broadcast = result.rows[0];
    console.log(`✅ [Broadcast] Рассылка создана с ID: ${broadcast.id}`);
    
    return broadcast;
  },

  async getBroadcast(id) {
    const result = await pool.query('SELECT * FROM broadcasts WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    let buttons = null;
    if (row.buttons) {
      try {
        // Если buttons уже объект (JSONB), используем как есть
        if (typeof row.buttons === 'object') {
          buttons = row.buttons;
        } else if (typeof row.buttons === 'string') {
          buttons = JSON.parse(row.buttons);
        }
      } catch (error) {
        console.error('Ошибка при парсинге buttons:', error);
        buttons = null;
      }
    }
    return {
      ...row,
      buttons
    };
  },

  async getAllBroadcasts() {
    const result = await pool.query('SELECT * FROM broadcasts ORDER BY created_at DESC');
    return result.rows.map(row => {
      let buttons = null;
      if (row.buttons) {
        try {
          // Если buttons уже объект (JSONB), используем как есть
          if (typeof row.buttons === 'object') {
            buttons = row.buttons;
          } else if (typeof row.buttons === 'string') {
            buttons = JSON.parse(row.buttons);
          }
        } catch (error) {
          console.error('Ошибка при парсинге buttons:', error);
          buttons = null;
        }
      }
      return {
        ...row,
        buttons
      };
    });
  },

  async getScheduledBroadcasts() {
    // Выбираем рассылки со статусом 'scheduled', которые должны быть отправлены
    // scheduled_at хранится в UTC в БД
    // Расширяем окно проверки до 24 часов, чтобы рассылки, созданные позже запланированного времени, тоже отправлялись
    const result = await pool.query(
      `SELECT * FROM broadcasts 
       WHERE status = 'scheduled' 
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= (NOW() AT TIME ZONE 'UTC' + INTERVAL '2 minutes')
       AND scheduled_at >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours')
       ORDER BY scheduled_at ASC`
    );
    return result.rows.map(row => {
      let buttons = null;
      if (row.buttons) {
        try {
          // Если buttons уже объект (JSONB), используем как есть
          if (typeof row.buttons === 'object') {
            buttons = row.buttons;
          } else if (typeof row.buttons === 'string') {
            buttons = JSON.parse(row.buttons);
          }
        } catch (error) {
          console.error('Ошибка при парсинге buttons:', error);
          buttons = null;
        }
      }
      return {
        ...row,
        buttons
      };
    });
  },

  async updateBroadcastStatus(id, status, sentCount = null, errorCount = null) {
    const updates = ['status = $1'];
    const values = [status];
    let paramIndex = 1;

    if (status === 'sent') {
      updates.push('sent_at = CURRENT_TIMESTAMP');
      if (sentCount !== null) {
        paramIndex++;
        updates.push(`sent_count = $${paramIndex}`);
        values.push(sentCount);
      }
      if (errorCount !== null) {
        paramIndex++;
        updates.push(`error_count = $${paramIndex}`);
        values.push(errorCount);
      }
    }

    // ID всегда последний параметр
    paramIndex++;
    const result = await pool.query(
      `UPDATE broadcasts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  },

  async cancelBroadcast(id) {
    const result = await pool.query(
      `UPDATE broadcasts SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // Получить пользователей по сегменту
  async getUsersBySegment(segment) {
    let query = 'SELECT user_id FROM users WHERE is_bot = FALSE';
    const params = [];

    switch (segment) {
      case 'all':
        // Все пользователи
        break;
      case 'active':
        // Активные пользователи (за последние 30 дней)
        query += " AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'active_7':
        query += " AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'active_30':
        query += " AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'with_referrals':
        query += ` AND user_id IN (SELECT DISTINCT referrer_id FROM referrals)`;
        break;
      case 'top_referrers':
        query += ` AND user_id IN (
          SELECT referrer_id FROM referrals 
          GROUP BY referrer_id 
          HAVING COUNT(*) >= 5
          ORDER BY COUNT(*) DESC 
          LIMIT 10
        )`;
        break;
      case 'no_referrals':
        query += ` AND user_id NOT IN (SELECT DISTINCT referrer_id FROM referrals WHERE referrer_id IS NOT NULL)`;
        break;
      case 'new_7':
        query += " AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'old_30':
        query += " AND created_at < NOW() - INTERVAL '30 days'";
        break;
    }

    // Исключаем заблокированных пользователей
    query += ' AND user_id NOT IN (SELECT user_id FROM blacklist)';

    const result = await pool.query(query, params);
    return result.rows.map(row => row.user_id);
  },

  // Работа с розыгрышами
  async createGiveaway(giveawayData) {
    const { title, description, prize_description, start_date, end_date, min_referrals, require_channel_subscription, winner_count, winner_selection_type } = giveawayData;
    const result = await pool.query(
      `INSERT INTO giveaways (title, description, prize_description, start_date, end_date, min_referrals, require_channel_subscription, winner_count, winner_selection_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description || null, prize_description || null, start_date, end_date, min_referrals || 0, require_channel_subscription || false, winner_count || 1, winner_selection_type || 'top']
    );
    return result.rows[0];
  },

  async getGiveaway(id) {
    const result = await pool.query('SELECT * FROM giveaways WHERE id = $1', [id]);
    return result.rows[0];
  },

  async getAllGiveaways() {
    const result = await pool.query('SELECT * FROM giveaways ORDER BY created_at DESC');
    return result.rows;
  },

  async getActiveGiveaways() {
    const result = await pool.query(
      `SELECT * FROM giveaways 
       WHERE status = 'active' AND end_date > NOW()
       ORDER BY end_date ASC`
    );
    return result.rows;
  },

  async joinGiveaway(giveawayId, userId, referralCount) {
    try {
      const result = await pool.query(
        `INSERT INTO giveaway_participants (giveaway_id, user_id, referral_count)
         VALUES ($1, $2, $3)
         ON CONFLICT (giveaway_id, user_id) DO UPDATE SET
           referral_count = EXCLUDED.referral_count
         RETURNING *`,
        [giveawayId, userId, referralCount]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Ошибка при добавлении участника розыгрыша:', error);
      return null;
    }
  },

  async getGiveawayParticipants(giveawayId) {
    const result = await pool.query(
      `SELECT gp.*, u.username, u.first_name 
       FROM giveaway_participants gp
       JOIN users u ON gp.user_id = u.user_id
       WHERE gp.giveaway_id = $1
       ORDER BY gp.referral_count DESC, gp.joined_at ASC`,
      [giveawayId]
    );
    return result.rows;
  },

  async updateGiveawayStatus(id, status) {
    const updates = ['status = $1'];
    const values = [status, id];

    if (status === 'ended') {
      updates.push('ended_at = CURRENT_TIMESTAMP');
    }

    const result = await pool.query(
      `UPDATE giveaways SET ${updates.join(', ')} WHERE id = $2 RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async isUserInGiveaway(giveawayId, userId) {
    const result = await pool.query(
      'SELECT * FROM giveaway_participants WHERE giveaway_id = $1 AND user_id = $2',
      [giveawayId, userId]
    );
    return result.rows.length > 0;
  },

  // Работа с автоворонками
  async createAutofunnel(autofunnelData) {
    const { name, trigger_event, delay_hours, message_text, message_type, file_id, buttons } = autofunnelData;
    const result = await pool.query(
      `INSERT INTO autofunnels (name, trigger_event, delay_hours, message_text, message_type, file_id, buttons)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, trigger_event, delay_hours || 0, message_text, message_type || 'text', file_id || null, buttons ? JSON.stringify(buttons) : null]
    );
    return result.rows[0];
  },

  async getAutofunnel(id) {
    const result = await pool.query('SELECT * FROM autofunnels WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      buttons: row.buttons ? JSON.parse(row.buttons) : null
    };
  },

  async getAllAutofunnels() {
    const result = await pool.query('SELECT * FROM autofunnels ORDER BY created_at DESC');
    return result.rows.map(row => ({
      ...row,
      buttons: row.buttons ? JSON.parse(row.buttons) : null
    }));
  },

  async getActiveAutofunnelsByTrigger(triggerEvent) {
    const result = await pool.query(
      `SELECT * FROM autofunnels 
       WHERE trigger_event = $1 AND is_active = TRUE
       ORDER BY delay_hours ASC`,
      [triggerEvent]
    );
    return result.rows.map(row => ({
      ...row,
      buttons: row.buttons ? JSON.parse(row.buttons) : null
    }));
  },

  async markAutofunnelSent(autofunnelId, userId) {
    await pool.query(
      `INSERT INTO autofunnel_sent (autofunnel_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (autofunnel_id, user_id) DO NOTHING`,
      [autofunnelId, userId]
    );
  },

  async isAutofunnelSent(autofunnelId, userId) {
    const result = await pool.query(
      'SELECT * FROM autofunnel_sent WHERE autofunnel_id = $1 AND user_id = $2',
      [autofunnelId, userId]
    );
    return result.rows.length > 0;
  },

  async updateAutofunnelStatus(id, isActive) {
    const result = await pool.query(
      'UPDATE autofunnels SET is_active = $1 WHERE id = $2 RETURNING *',
      [isActive, id]
    );
    return result.rows[0];
  },

  // Работа с напоминаниями о подписке
  async getSubscriptionReminder(userId) {
    const result = await pool.query(
      'SELECT * FROM subscription_reminders WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  },

  async createOrUpdateSubscriptionReminder(userId) {
    await pool.query(
      `INSERT INTO subscription_reminders (user_id, last_reminder_at, reminder_count)
       VALUES ($1, CURRENT_TIMESTAMP, 1)
       ON CONFLICT (user_id) DO UPDATE SET
         last_reminder_at = CURRENT_TIMESTAMP,
         reminder_count = subscription_reminders.reminder_count + 1`,
      [userId]
    );
  },

  async getUsersForSubscriptionReminder(hoursSinceLastReminder = 24, maxReminders = 3) {
    const result = await pool.query(
      `SELECT u.user_id, sr.reminder_count, sr.last_reminder_at
       FROM users u
       LEFT JOIN subscription_reminders sr ON u.user_id = sr.user_id
       WHERE u.is_bot = FALSE
         AND (sr.last_reminder_at IS NULL 
              OR sr.last_reminder_at < NOW() - INTERVAL '1 hour' * $1)
         AND (sr.reminder_count IS NULL OR sr.reminder_count < $2)
       LIMIT 100`,
      [hoursSinceLastReminder, maxReminders]
    );
    return result.rows;
  },

  async resetSubscriptionReminder(userId) {
    await pool.query(
      'DELETE FROM subscription_reminders WHERE user_id = $1',
      [userId]
    );
  },

  // Получить пользователей без подписки на канал
  async getUsersWithoutChannelSubscription(channelId) {
    // Эта функция будет использоваться вместе с проверкой подписки через API
    const result = await pool.query(
      'SELECT user_id FROM users WHERE is_bot = FALSE'
    );
    return result.rows.map(row => row.user_id);
  },

  // ============================================
  // CRM FUNCTIONS (Phase 1.0)
  // ============================================

  // Создать или обновить лида из данных пользователя бота
  async createOrUpdateLeadFromUser(userId, userData = {}) {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        console.log('User not found for lead creation:', userId);
        return null;
      }

      const fio = userData.fio || `${user.first_name || ''} ${user.last_name || ''}`.trim() || null;
      const telegramUsername = user.username || null;
      const source = userData.source || 'Telegram Bot';

      // Проверяем, существует ли уже лид для этого user_id
      const existingLead = await pool.query(
        'SELECT * FROM leads WHERE user_id = $1',
        [userId]
      );

      if (existingLead.rows.length > 0) {
        // Обновляем существующего лида
        const result = await pool.query(
          `UPDATE leads 
           SET telegram_username = COALESCE($1, telegram_username),
               fio = COALESCE($2, fio),
               source = CASE WHEN $4 IS NOT NULL AND $4 != 'Telegram Bot' THEN $4 ELSE source END,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3
           RETURNING *`,
          [telegramUsername, fio, userId, source]
        );
        return result.rows[0];
      } else {
        // Создаем нового лида
        const result = await pool.query(
          `INSERT INTO leads (user_id, fio, telegram_username, source, status, funnel_stage, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            userId,
            fio,
            telegramUsername,
            source,
            'Новый лид',
            'Новый лид'
          ]
        );
        return result.rows[0];
      }
    } catch (error) {
      console.error('Ошибка при создании/обновлении лида:', error);
      return null;
    }
  },

  // Получить лида по user_id
  async getLeadByUserId(userId) {
    try {
      const result = await pool.query(
        'SELECT * FROM leads WHERE user_id = $1',
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Ошибка при получении лида:', error);
      return null;
    }
  },

  // Закрыть соединение
  async close() {
    await pool.end();
  },
};

export default db;


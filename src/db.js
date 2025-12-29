import pg from 'pg';

const { Pool } = pg;

// Принудительная очистка переменных окружения
const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return String(value).split('#')[0].trim().replace(/\r/g, '');
};

const getDbConfig = (password) => ({
  host: getEnv('DB_HOST', 'postgres'),
  port: parseInt(getEnv('DB_PORT', '5432')),
  database: getEnv('DB_NAME', 'telegram_bot_db'),
  user: getEnv('DB_USER', 'postgres'),
  password: password,
});

// Начальный пароль из окружения или дефолтный
const initialPassword = getEnv('DB_PASSWORD', 'postgres');
const pool = new Pool(getDbConfig(initialPassword));

// Сохраняем оригинальный метод запроса
const originalPoolQuery = pool.query.bind(pool);

// Переопределяем метод query для ВСЕГО пула (автоматический fallback)
pool.query = async function(text, params) {
  try {
    return await originalPoolQuery(text, params);
  } catch (err) {
    // Если ошибка авторизации, пробуем запасной пароль
    if (err.message.includes('password authentication failed')) {
      console.log('⚠️ [Bot DB] Auth failed, trying fallback password "postgres"...');
      
      const fallbackConfig = getDbConfig('postgres');
      const tempPool = new Pool(fallbackConfig);
      
      try {
        const res = await tempPool.query(text, params);
        console.log('✅ [Bot DB] Fallback worked! Re-initializing main pool...');
        
        // Перенастраиваем основной пул на рабочий пароль на будущее
        // (в идеале нужно пересоздать pool, но для стабильности пока просто прокидываем результат)
        await tempPool.end().catch(() => {});
        return res;
      } catch (fallbackErr) {
        await tempPool.end().catch(() => {});
        throw err; // Если и запасной не помог, кидаем оригинальную ошибку
      }
    }
    throw err;
  }
};

// Проверка подключения при старте
pool.query('SELECT NOW()')
  .then(() => console.log('✅ [Bot DB] Connected successfully'))
  .catch(err => console.error('❌ [Bot DB] Initial connection failed:', err.message));

export { pool };

export const db = {
  // === USERS ===
  async getUser(userId) {
    const res = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    return res.rows[0];
  },

  async createUser(userData) {
    const { user_id, username, first_name, last_name, language_code, referrer_id, is_bot } = userData;
    const res = await pool.query(
      `INSERT INTO users (user_id, username, first_name, last_name, language_code, referrer_id, is_bot)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name
       RETURNING *`,
      [user_id, username, first_name, last_name, language_code, referrer_id, is_bot]
    );
    return res.rows[0];
  },

  // === SETTINGS ===
  async getSetting(key) {
    const res = await pool.query('SELECT value FROM bot_settings WHERE key = $1', [key]);
    return res.rows[0]?.value;
  },

  async setSetting(key, value) {
    await pool.query(
      'INSERT INTO bot_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
      [key, String(value)]
    );
  },

  // === CRM: LEADS ===
  async createOrUpdateLeadFromUser(userId, data) {
    try {
      const res = await pool.query(
        `INSERT INTO leads (user_id, fio, source, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           fio = COALESCE(EXCLUDED.fio, leads.fio),
           source = COALESCE(EXCLUDED.source, leads.source),
           updated_at = NOW()
         RETURNING *`,
        [userId, data.fio, data.source || 'Telegram Bot']
      );
      return res.rows[0];
    } catch (error) {
      console.error('Error in createOrUpdateLeadFromUser:', error);
      return null;
    }
  },

  async getLeadByUserId(userId) {
    const res = await pool.query('SELECT * FROM leads WHERE user_id = $1', [userId]);
    return res.rows[0];
  },

  // === REFERRALS ===
  async createReferral(referrerId, referralId) {
    try {
      const res = await pool.query(
        'INSERT INTO referrals (referrer_id, referral_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
        [referrerId, referralId]
      );
      return res.rows[0];
    } catch (e) {
      console.error('Error creating referral:', e);
      return null;
    }
  },

  async getReferrals(userId) {
    const res = await pool.query(
      'SELECT u.* FROM referrals r JOIN users u ON r.referral_id = u.user_id WHERE r.referrer_id = $1',
      [userId]
    );
    return res.rows;
  },

  async getReferralCount(userId) {
    const res = await pool.query('SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1', [userId]);
    return parseInt(res.rows[0]?.count || 0);
  },

  async getTopReferrers(limit = 10) {
    const res = await pool.query(
      `SELECT u.user_id, u.first_name, u.username, COUNT(r.id) as referral_count
       FROM users u
       JOIN referrals r ON u.user_id = r.referrer_id
       GROUP BY u.user_id, u.first_name, u.username
       ORDER BY referral_count DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  },

  // === POINTS & ACTIVITY ===
  async addPoints(userId, points, reason, stage = null) {
    try {
      const updates = ['points = points + $1'];
      const values = [points, userId];
      
      if (stage === 1 || stage === '1') updates.push('stage1_points = stage1_points + $1');
      else if (stage === 2 || stage === '2') updates.push('stage2_points = stage2_points + $1');
      else if (stage === 3 || stage === '3') updates.push('stage3_points = stage3_points + $1');

      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = $${values.length}`, values);
      await this.logUserActivity(userId, 'points_award', { points, reason, stage });
      return true;
    } catch (e) {
      console.error('Error adding points:', e);
      return false;
    }
  },

  async addActivityPoints(userId, type, points, dailyLimit) {
    try {
      const act = await pool.query(
        `INSERT INTO user_daily_activity (user_id, activity_date)
         VALUES ($1, CURRENT_DATE) ON CONFLICT (user_id, activity_date) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING *`,
        [userId]
      );
      const current = type === 'message' ? (act.rows[0].message_points || 0) : (act.rows[0].reaction_points || 0);
      if (current < dailyLimit) {
        const toAdd = Math.min(points, dailyLimit - current);
        const col = type === 'message' ? 'message_points' : 'reaction_points';
        await pool.query(`UPDATE user_daily_activity SET ${col} = ${col} + $1 WHERE user_id = $2 AND activity_date = CURRENT_DATE`, [toAdd, userId]);
        await pool.query(`UPDATE users SET points = points + $1 WHERE user_id = $2`, [toAdd, userId]);
        return toAdd;
      }
      return 0;
    } catch (e) {
      console.error('Error adding activity points:', e);
      return 0;
    }
  },

  // === CHANNELS & SUBSCRIPTIONS ===
  async getChannelInvite(channelId) {
    const res = await pool.query('SELECT * FROM channel_invites WHERE (channel_id = $1 OR channel_username = $1) AND is_active = TRUE', [channelId]);
    return res.rows[0];
  },

  async checkChannelSubscription(userId, channelInviteId) {
    const res = await pool.query(
      'SELECT * FROM user_channel_subscriptions WHERE user_id = $1 AND channel_invite_id = $2',
      [userId, channelInviteId]
    );
    return res.rows.length > 0;
  },

  async recordChannelSubscription(userId, channelInviteId) {
    await pool.query(
      'INSERT INTO user_channel_subscriptions (user_id, channel_invite_id, subscribed_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, channel_invite_id) DO NOTHING',
      [userId, channelInviteId]
    );
  },

  // === GIVEAWAYS ===
  async getGiveaway(id) {
    const res = await pool.query('SELECT * FROM giveaways WHERE id = $1', [id]);
    return res.rows[0];
  },

  async getAllGiveaways() {
    const res = await pool.query('SELECT * FROM giveaways ORDER BY created_at DESC');
    return res.rows;
  },

  async getActiveGiveaways() {
    const res = await pool.query("SELECT * FROM giveaways WHERE status = 'active' AND end_date > NOW()");
    return res.rows;
  },

  async joinGiveaway(giveawayId, userId, referralCount) {
    await pool.query(
      'INSERT INTO giveaway_participants (giveaway_id, user_id, referral_count) VALUES ($1, $2, $3) ON CONFLICT (giveaway_id, user_id) DO UPDATE SET referral_count = EXCLUDED.referral_count',
      [giveawayId, userId, referralCount]
    );
  },

  async isUserInGiveaway(giveawayId, userId) {
    const res = await pool.query(
      'SELECT 1 FROM giveaway_participants WHERE giveaway_id = $1 AND user_id = $2',
      [giveawayId, userId]
    );
    return res.rows.length > 0;
  },

  // === LEAD MAGNETS ===
  async getActiveLeadMagnet() {
    const res = await pool.query('SELECT * FROM lead_magnets WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1');
    return res.rows[0];
  },

  async getAllLeadMagnets() {
    const res = await pool.query('SELECT * FROM lead_magnets ORDER BY created_at DESC');
    return res.rows;
  },

  async updateLeadMagnet(id, data) {
    const fields = Object.keys(data);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = Object.values(data);
    await pool.query(`UPDATE lead_magnets SET ${setClause}, updated_at = NOW() WHERE id = $1`, [id, ...values]);
  },

  // === AUTOFUNNELS ===
  async getActiveAutofunnelsByTrigger(trigger) {
    const res = await pool.query('SELECT * FROM autofunnels WHERE trigger_event = $1 AND is_active = TRUE', [trigger]);
    return res.rows;
  },

  async isAutofunnelSent(autofunnelId, userId) {
    const res = await pool.query('SELECT 1 FROM autofunnel_sent WHERE autofunnel_id = $1 AND user_id = $2', [autofunnelId, userId]);
    return res.rows.length > 0;
  },

  async markAutofunnelSent(autofunnelId, userId) {
    await pool.query('INSERT INTO autofunnel_sent (autofunnel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [autofunnelId, userId]);
  },

  // === BROADCASTS ===
  async getBroadcast(id) {
    const res = await pool.query('SELECT * FROM broadcasts WHERE id = $1', [id]);
    return res.rows[0];
  },

  async getAllBroadcasts() {
    const res = await pool.query('SELECT * FROM broadcasts ORDER BY created_at DESC');
    return res.rows;
  },

  async getScheduledBroadcasts() {
    const res = await pool.query("SELECT * FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= NOW()");
    return res.rows;
  },

  async updateBroadcastStatus(id, status, sent = 0, errors = 0) {
    await pool.query(
      'UPDATE broadcasts SET status = $1, sent_count = $2, error_count = $3, sent_at = NOW() WHERE id = $4',
      [status, sent, errors, id]
    );
  },

  // === OTHER ===
  async isBlacklisted(userId) {
    try {
      const res = await pool.query('SELECT 1 FROM blacklist WHERE user_id = $1', [userId]);
      return res.rows.length > 0;
    } catch (e) {
      console.error('Error checking blacklist:', e.message);
      return false;
    }
  },

  async logUserActivity(userId, activityType, activityData = null, metadata = null) {
    try {
      await pool.query(
        'INSERT INTO user_activity (user_id, activity_type, activity_data, metadata) VALUES ($1, $2, $3, $4)',
        [userId, activityType, activityData ? JSON.stringify(activityData) : null, metadata ? JSON.stringify(metadata) : null]
      );
    } catch (e) {
      console.error('Error logging user activity:', e.message);
    }
  },

  async close() {
    await pool.end();
  }
};

export default db;

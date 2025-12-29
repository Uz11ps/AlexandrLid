import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return String(value).trim().replace(/\r/g, '');
};

const pool = new Pool({
  host: getEnv('DB_HOST', 'postgres'),
  port: parseInt(getEnv('DB_PORT', '5432')),
  database: getEnv('DB_NAME', 'telegram_bot_db'),
  user: getEnv('DB_USER', 'postgres'),
  password: getEnv('DB_PASSWORD', 'postgres'),
});

pool.on('connect', async (client) => {
  await client.query("SET timezone = 'Europe/Moscow'");
});

// Внутренние функции (чтобы не зависеть от this)
const getUser = async (userId) => {
  const res = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  return res.rows[0];
};

const logUserActivity = async (userId, activityType, activityData = null, metadata = null) => {
  try {
    await pool.query(
      'INSERT INTO user_activity (user_id, activity_type, activity_data, metadata) VALUES ($1, $2, $3, $4)',
      [userId, activityType, activityData ? JSON.stringify(activityData) : null, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (e) {
    console.error('Error logging user activity:', e);
  }
};

export { pool };

export const db = {
  // === USERS ===
  getUser,

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
      const user = await getUser(userId);
      if (!user) return null;

      const fio = data.fio || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
      
      const res = await pool.query(
        `INSERT INTO leads (user_id, fio, telegram_username, source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           fio = COALESCE(EXCLUDED.fio, leads.fio),
           telegram_username = COALESCE(EXCLUDED.telegram_username, leads.telegram_username),
           source = COALESCE(EXCLUDED.source, leads.source),
           updated_at = NOW()
         RETURNING *`,
        [userId, fio, user.username, data.source || 'Telegram Bot']
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
      'SELECT u.* FROM users u JOIN referrals r ON u.user_id = r.referral_id WHERE r.referrer_id = $1',
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
      await logUserActivity(userId, 'points_award', { points, reason, stage });
      return true;
    } catch (e) {
      console.error('Error adding points:', e);
      return false;
    }
  },

  async addActivityPoints(userId, type, points, dailyLimit) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const act = await client.query(
        `INSERT INTO user_daily_activity (user_id, activity_date)
         VALUES ($1, CURRENT_DATE) ON CONFLICT (user_id, activity_date) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING *`,
        [userId]
      );
      const current = type === 'message' ? act.rows[0].message_points : act.rows[0].reaction_points;
      if (current < dailyLimit) {
        const toAdd = Math.min(points, dailyLimit - current);
        const col = type === 'message' ? 'message_points' : 'reaction_points';
        await client.query(`UPDATE user_daily_activity SET ${col} = ${col} + $1 WHERE user_id = $2 AND activity_date = CURRENT_DATE`, [toAdd, userId]);
        await client.query(`UPDATE users SET points = points + $1, stage2_points = stage2_points + $1 WHERE user_id = $2`, [toAdd, userId]);
        await client.query('COMMIT');
        return toAdd;
      }
      await client.query('ROLLBACK');
      return 0;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Error adding activity points:', e);
      return 0;
    } finally {
      client.release();
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

  async createGiveaway(data) {
    const { title, description, prize_description, start_date, end_date, min_referrals, require_channel_subscription, winner_count, winner_selection_type } = data;
    const res = await pool.query(
      `INSERT INTO giveaways (title, description, prize_description, start_date, end_date, min_referrals, require_channel_subscription, winner_count, winner_selection_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft') RETURNING *`,
      [title, description, prize_description, start_date, end_date, min_referrals, require_channel_subscription, winner_count, winner_selection_type]
    );
    return res.rows[0];
  },

  async updateGiveawayStatus(id, status) {
    await pool.query('UPDATE giveaways SET status = $1, ended_at = CASE WHEN $1 = \'ended\' THEN NOW() ELSE ended_at END WHERE id = $2', [status, id]);
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

  async getGiveawayParticipants(giveawayId) {
    const res = await pool.query(
      'SELECT u.*, gp.referral_count, gp.joined_at FROM users u JOIN giveaway_participants gp ON u.user_id = gp.user_id WHERE gp.giveaway_id = $1',
      [giveawayId]
    );
    return res.rows;
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
  async createBroadcast(data) {
    const { title, message_text, message_type, file_id, buttons, segment, scheduled_at, created_by } = data;
    const res = await pool.query(
      `INSERT INTO broadcasts (title, message_text, message_type, file_id, buttons, segment, scheduled_at, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft') RETURNING *`,
      [title, message_text, message_type, file_id, buttons ? JSON.stringify(buttons) : null, segment, scheduled_at, created_by]
    );
    return res.rows[0];
  },

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

  async cancelBroadcast(id) {
    await pool.query("UPDATE broadcasts SET status = 'cancelled' WHERE id = $1", [id]);
  },

  // === SUBSCRIPTION REMINDERS ===
  async getSubscriptionReminder(userId) {
    const res = await pool.query('SELECT * FROM subscription_reminders WHERE user_id = $1', [userId]);
    return res.rows[0];
  },

  async createOrUpdateSubscriptionReminder(userId) {
    await pool.query(
      'INSERT INTO subscription_reminders (user_id, last_reminder_at, reminder_count) VALUES ($1, NOW(), 1) ON CONFLICT (user_id) DO UPDATE SET last_reminder_at = NOW(), reminder_count = subscription_reminders.reminder_count + 1',
      [userId]
    );
  },

  async getUsersForSubscriptionReminder(hoursInterval, maxReminders) {
    const res = await pool.query(
      `SELECT u.user_id FROM users u
       LEFT JOIN user_channel_subscriptions ucs ON u.user_id = ucs.user_id
       LEFT JOIN subscription_reminders sr ON u.user_id = sr.user_id
       WHERE ucs.id IS NULL
       AND (sr.id IS NULL OR (sr.last_reminder_at < NOW() - interval '$1 hours' AND sr.reminder_count < $2))`,
      [hoursInterval, maxReminders]
    );
    return res.rows;
  },

  async resetSubscriptionReminder(userId) {
    await pool.query('DELETE FROM subscription_reminders WHERE user_id = $1', [userId]);
  },

  // === OTHER ===
  async isBlacklisted(userId) {
    const res = await pool.query('SELECT 1 FROM blacklist WHERE user_id = $1', [userId]);
    return res.rows.length > 0;
  },

  async getUsersBySegment(segment) {
    let query = 'SELECT user_id FROM users';
    const params = [];
    if (segment && segment !== 'all') {
      if (segment === 'no_referrals') query += ' WHERE user_id NOT IN (SELECT referrer_id FROM referrals)';
      else if (segment === 'has_referrals') query += ' WHERE user_id IN (SELECT referrer_id FROM referrals)';
    }
    const res = await pool.query(query, params);
    return res.rows.map(r => r.user_id);
  },

  logUserActivity,

  async close() {
    await pool.end();
  }
};

export default db;

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return String(value).trim().replace(/\r/g, '');
};

const dbConfig = {
  host: getEnv('DB_HOST', 'postgres'),
  port: parseInt(getEnv('DB_PORT', '5432')),
  database: getEnv('DB_NAME', 'telegram_bot_db'),
  user: getEnv('DB_USER', 'postgres'),
  password: getEnv('DB_PASSWORD', 'postgres'),
};

const pool = new Pool(dbConfig);

pool.on('connect', async (client) => {
  await client.query("SET timezone = 'Europe/Moscow'");
});

export { pool };

export const db = {
  // Базовые функции
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

  // Конкурс и баллы
  async addPoints(userId, points, reason, stage = null) {
    const updates = ['points = points + $1'];
    const values = [points, userId];
    if (stage === 1) updates.push('stage1_points = stage1_points + $1');
    else if (stage === 2) updates.push('stage2_points = stage2_points + $1');
    else if (stage === 3) updates.push('stage3_points = stage3_points + $1');

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = $${values.length}`, values);
    await this.logUserActivity(userId, 'points_award', { points, reason, stage });
    return true;
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
      throw e;
    } finally {
      client.release();
    }
  },

  // Рефералы
  async createReferral(referrerId, referralId) {
    const res = await pool.query(
      'INSERT INTO referrals (referrer_id, referral_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [referrerId, referralId]
    );
    return res.rows[0];
  },

  async getReferrals(userId) {
    const res = await pool.query(
      'SELECT u.* FROM users u JOIN referrals r ON u.user_id = r.referral_id WHERE r.referrer_id = $1',
      [userId]
    );
    return res.rows;
  },

  // Розыгрыши (Giveaways) - исправлено
  async getActiveGiveaways() {
    const res = await pool.query("SELECT * FROM giveaways WHERE status = 'active' AND end_date > NOW()");
    return res.rows;
  },

  // Активность
  async logUserActivity(userId, activityType, activityData = null) {
    try {
      await pool.query(
        'INSERT INTO user_activity (user_id, activity_type, activity_data) VALUES ($1, $2, $3)',
        [userId, activityType, activityData ? JSON.stringify(activityData) : null]
      );
    } catch (e) {}
  },

  // Рассылки
  async getScheduledBroadcasts() {
    const res = await pool.query("SELECT * FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= NOW()");
    return res.rows;
  },

  async updateBroadcastStatus(id, status, sent = 0, errors = 0) {
    await pool.query(
      'UPDATE broadcasts SET status = $1, sent_count = $2, error_count = $3, sent_at = NOW() WHERE id = $4',
      [status, sent, errors, id]
    );
  }
};

export default db;

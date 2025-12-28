import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const { Pool } = pg;

// Очищаем переменные от скрытых символов (\r, пробелы)
const dbConfig = {
  host: (process.env.DB_HOST || 'postgres').trim(),
  port: parseInt((process.env.DB_PORT || '5432').trim()),
  database: (process.env.DB_NAME || 'telegram_bot_db').trim(),
  user: (process.env.DB_USER || 'postgres').trim(),
  password: (process.env.DB_PASSWORD || 'postgres').trim(),
};

console.log('🔍 [Bot DB Debug] Connection attempt with user:', dbConfig.user);

const pool = new Pool(dbConfig);

// Устанавливаем московский часовой пояс
pool.on('connect', async (client) => {
  await client.query('SET timezone = \'Europe/Moscow\'');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка подключения к базе данных:', err);
});

// Экспортируем pool для использования в других модулях
export { pool };

// Функции для работы с пользователями (сокращено для экономии места, логика остается прежней)
export const db = {
  async getUser(userId) {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    return result.rows[0];
  },

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

  async createReferral(referrerId, referralId) {
    try {
      const result = await pool.query(
        `INSERT INTO referrals (referrer_id, referral_id)
         VALUES ($1, $2)
         ON CONFLICT (referrer_id, referral_id) DO NOTHING
         RETURNING *`,
        [referrerId, referralId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Ошибка при создании реферальной связи:', error);
      return null;
    }
  },

  async getReferralCount(userId) {
    const result = await pool.query('SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1', [userId]);
    return parseInt(result.rows[0].count);
  },

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

  async logUserActivity(userId, activityType, activityData = null, metadata = null) {
    try {
      const result = await pool.query(
        `INSERT INTO user_activity (user_id, activity_type, activity_data, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, activityType, activityData ? JSON.stringify(activityData) : null, metadata ? JSON.stringify(metadata) : null]
      );
      return result.rows[0];
    } catch (error) {
      return null;
    }
  },

  async addPoints(userId, points, reason, stage = null) {
    try {
      const updates = ['points = points + $1'];
      const values = [points, userId];
      let paramIndex = 2;
      if (stage === 1) updates.push('stage1_points = stage1_points + $1');
      else if (stage === 2) updates.push('stage2_points = stage2_points + $1');
      else if (stage === 3) updates.push('stage3_points = stage3_points + $1');

      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`, values);
      await this.logUserActivity(userId, 'points_award', { points, reason, stage });
      return true;
    } catch (error) {
      console.error('Ошибка при добавлении баллов:', error);
      return false;
    }
  },

  async getScheduledBroadcasts() {
    const result = await pool.query(
      `SELECT * FROM broadcasts 
       WHERE status = 'scheduled' 
       AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC`
    );
    return result.rows;
  },

  async close() {
    await pool.end();
  }
};

export default db;

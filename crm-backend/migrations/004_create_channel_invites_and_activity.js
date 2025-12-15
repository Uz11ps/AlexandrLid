import pool from '../db.js';

export async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Таблица для хранения пригласительных ссылок каналов/групп
    await client.query(`
      CREATE TABLE IF NOT EXISTS channel_invites (
        id SERIAL PRIMARY KEY,
        channel_id VARCHAR(255) NOT NULL,
        channel_username VARCHAR(255),
        channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('channel', 'group')),
        invite_link VARCHAR(500) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица для отслеживания подписок через пригласительные ссылки
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_channel_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        channel_invite_id INTEGER NOT NULL,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (channel_invite_id) REFERENCES channel_invites(id) ON DELETE CASCADE,
        UNIQUE(user_id, channel_invite_id)
      )
    `);

    // Таблица для отслеживания активности пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('command', 'message', 'callback', 'subscription', 'giveaway_join', 'referral')),
        activity_data JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Индексы для оптимизации запросов
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
      CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_channel_subscriptions_user_id ON user_channel_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_channel_subscriptions_channel_invite_id ON user_channel_subscriptions(channel_invite_id);
      CREATE INDEX IF NOT EXISTS idx_channel_invites_channel_id ON channel_invites(channel_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Migration 004 (create channel invites and activity): completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 004 failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DROP TABLE IF EXISTS user_activity CASCADE');
    await client.query('DROP TABLE IF EXISTS user_channel_subscriptions CASCADE');
    await client.query('DROP TABLE IF EXISTS channel_invites CASCADE');

    await client.query('COMMIT');
    console.log('✅ Migration 004 rollback: completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 004 rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}


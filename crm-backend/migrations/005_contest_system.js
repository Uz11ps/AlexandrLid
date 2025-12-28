import pool from '../db.js';

export async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add contest fields to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tickets INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stage1_points INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stage2_points INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stage3_points INTEGER DEFAULT 0;
    `);

    // Create table for daily activity limits
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_daily_activity (
          id SERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          activity_date DATE DEFAULT CURRENT_DATE,
          message_points INTEGER DEFAULT 0,
          reaction_points INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          UNIQUE(user_id, activity_date)
      );
    `);

    // Create table for contest winners
    await client.query(`
      CREATE TABLE IF NOT EXISTS contest_winners (
          id SERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          stage INTEGER NOT NULL,
          prize_name TEXT NOT NULL,
          prize_details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    // Create table for bot chats (channels and groups) - updating existing if needed
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_chats (
          id SERIAL PRIMARY KEY,
          chat_id VARCHAR(255) UNIQUE NOT NULL,
          title TEXT,
          type VARCHAR(50), -- 'channel' или 'group'
          invite_link TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migration 005 (contest system) completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 005 failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS contest_winners CASCADE');
    await client.query('DROP TABLE IF EXISTS user_daily_activity CASCADE');
    await client.query('DROP TABLE IF EXISTS bot_chats CASCADE');
    await client.query('ALTER TABLE users DROP COLUMN IF EXISTS points, DROP COLUMN IF EXISTS tickets, DROP COLUMN IF EXISTS stage1_points, DROP COLUMN IF EXISTS stage2_points, DROP COLUMN IF EXISTS stage3_points');
    await client.query('COMMIT');
    console.log('✅ Migration 005 rollback completed');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

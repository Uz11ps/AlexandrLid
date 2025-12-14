import { pool } from '../db.js';

// Сохранение сообщения от пользователя в историю взаимодействий с лидом
export async function saveLeadMessage(userId, messageText, messageType = 'text', fileId = null) {
  try {
    // Находим лид по user_id
    const leadResult = await pool.query(
      'SELECT id FROM leads WHERE user_id = $1',
      [userId]
    );

    if (leadResult.rows.length === 0) {
      // Лид не найден, возможно пользователь еще не зарегистрирован
      return null;
    }

    const leadId = leadResult.rows[0].id;

    // Сохраняем сообщение как взаимодействие
    const interactionData = {
      message_text: messageText,
      message_type: messageType,
      file_id: fileId
    };

    const result = await pool.query(
      `INSERT INTO lead_interactions (
        lead_id, 
        interaction_type, 
        interaction_data, 
        notes,
        created_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        leadId,
        'telegram_message',
        JSON.stringify(interactionData),
        `Сообщение от пользователя: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Ошибка при сохранении сообщения лида:', error);
    return null;
  }
}

// Получить историю переписки с лидом
export async function getLeadConversationHistory(leadId, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT 
        li.*,
        m.name as manager_name
      FROM lead_interactions li
      LEFT JOIN managers m ON li.manager_id = m.id
      WHERE li.lead_id = $1 
        AND li.interaction_type = 'telegram_message'
      ORDER BY li.created_at ASC
      LIMIT $2`,
      [leadId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Ошибка при получении истории переписки:', error);
    return [];
  }
}

// Получить историю переписки по user_id
export async function getLeadConversationHistoryByUserId(userId, limit = 50) {
  try {
    const leadResult = await pool.query(
      'SELECT id FROM leads WHERE user_id = $1',
      [userId]
    );

    if (leadResult.rows.length === 0) {
      return [];
    }

    const leadId = leadResult.rows[0].id;
    return await getLeadConversationHistory(leadId, limit);
  } catch (error) {
    console.error('Ошибка при получении истории переписки по user_id:', error);
    return [];
  }
}

export default {
  saveLeadMessage,
  getLeadConversationHistory,
  getLeadConversationHistoryByUserId
};


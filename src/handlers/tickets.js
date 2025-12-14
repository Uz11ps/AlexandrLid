import pool from '../db.js';

// Команда /ticket - создать тикет
export async function handleTicketCommand(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Проверить, есть ли открытый тикет у пользователя
    const openTicketResult = await pool.query(
      `SELECT * FROM tickets 
       WHERE user_id = $1 AND status IN ('open', 'in_progress')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (openTicketResult.rows.length > 0) {
      const ticket = openTicketResult.rows[0];
      await ctx.reply(
        `📋 У вас уже есть открытый тикет #${ticket.id}\n\n` +
        `Тема: ${ticket.subject || 'Без темы'}\n` +
        `Статус: ${ticket.status === 'open' ? 'Открыт' : 'В работе'}\n\n` +
        `Вы можете просто написать сообщение, и оно будет добавлено в тикет.`
      );
      return;
    }

    // Создать новый тикет
    const result = await pool.query(
      `INSERT INTO tickets (user_id, subject, status, priority)
       VALUES ($1, $2, 'open', 'normal')
       RETURNING *`,
      [userId, 'Новый тикет из Telegram']
    );

    const ticket = result.rows[0];

    await ctx.reply(
      `✅ Тикет #${ticket.id} создан!\n\n` +
      `Теперь вы можете написать ваше сообщение, и оно будет отправлено менеджеру.\n\n` +
      `Для создания нового тикета используйте /ticket_new`
    );
  } catch (error) {
    console.error('Ошибка при создании тикета:', error);
    await ctx.reply('❌ Произошла ошибка при создании тикета. Попробуйте позже.');
  }
}

// Команда /ticket_new - создать новый тикет (даже если есть открытый)
export async function handleTicketNew(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Создать новый тикет
    const result = await pool.query(
      `INSERT INTO tickets (user_id, subject, status, priority)
       VALUES ($1, $2, 'open', 'normal')
       RETURNING *`,
      [userId, 'Новый тикет из Telegram']
    );

    const ticket = result.rows[0];

    await ctx.reply(
      `✅ Новый тикет #${ticket.id} создан!\n\n` +
      `Теперь вы можете написать ваше сообщение.`
    );
  } catch (error) {
    console.error('Ошибка при создании тикета:', error);
    await ctx.reply('❌ Произошла ошибка при создании тикета. Попробуйте позже.');
  }
}

// Обработка текстовых сообщений для тикетов
export async function handleTicketMessage(ctx) {
  try {
    const userId = ctx.from.id;
    const messageText = ctx.message.text;

    // Найти открытый тикет пользователя
    const ticketResult = await pool.query(
      `SELECT * FROM tickets 
       WHERE user_id = $1 AND status IN ('open', 'in_progress')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (ticketResult.rows.length === 0) {
      // Если нет открытого тикета, создать новый
      const newTicketResult = await pool.query(
        `INSERT INTO tickets (user_id, subject, status, priority)
         VALUES ($1, $2, 'open', 'normal')
         RETURNING *`,
        [userId, 'Новый тикет из Telegram']
      );

      const ticket = newTicketResult.rows[0];

      // Добавить сообщение
      await pool.query(
        `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message_text)
         VALUES ($1, 'user', $2, $3)`,
        [ticket.id, userId, messageText]
      );

      await ctx.reply(
        `✅ Ваше сообщение отправлено в тикет #${ticket.id}\n\n` +
        `Менеджер ответит вам в ближайшее время.`
      );
    } else {
      const ticket = ticketResult.rows[0];

      // Добавить сообщение в существующий тикет
      await pool.query(
        `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message_text)
         VALUES ($1, 'user', $2, $3)`,
        [ticket.id, userId, messageText]
      );

      // Обновить время обновления тикета
      await pool.query(
        `UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [ticket.id]
      );

      await ctx.reply(`✅ Ваше сообщение добавлено в тикет #${ticket.id}`);
    }
  } catch (error) {
    console.error('Ошибка при обработке сообщения тикета:', error);
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
}

// Отправка сообщения от менеджера пользователю через бот
export async function sendMessageToUser(userId, messageText) {
  try {
    const axios = (await import('axios')).default;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: userId,
        text: messageText,
        parse_mode: 'HTML'
      }
    );

    return { success: true, messageId: response.data.result.message_id };
  } catch (error) {
    console.error('Ошибка при отправке сообщения в Telegram:', error);
    return { success: false, error: error.message };
  }
}

export default {
  handleTicketCommand,
  handleTicketNew,
  handleTicketMessage,
  sendMessageToUser
};


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
    
    // Если передана тема через callback или текст
    let subject = 'Новый тикет из Telegram';
    if (ctx.callbackQuery) {
      // Если это callback, попросим ввести тему
      await ctx.answerCbQuery();
      await ctx.reply('📝 Пожалуйста, введите тему вашего тикета:');
      // Установим флаг ожидания темы
      if (!ctx.session) ctx.session = {};
      ctx.session.waitingForTicketSubject = true;
      return;
    }
    
    // Если это команда с текстом после неё
    const commandText = ctx.message?.text || '';
    const args = commandText.replace('/ticket_new', '').trim();
    if (args) {
      subject = args;
    } else {
      // Попросим ввести тему
      await ctx.reply('📝 Пожалуйста, введите тему вашего тикета:');
      if (!ctx.session) ctx.session = {};
      ctx.session.waitingForTicketSubject = true;
      return;
    }
    
    // Создать новый тикет
    const result = await pool.query(
      `INSERT INTO tickets (user_id, subject, status)
       VALUES ($1, $2, 'open')
       RETURNING *`,
      [userId, subject]
    );

    const ticket = result.rows[0];
    
    if (ctx.session) {
      ctx.session.activeTicketId = ticket.id;
      ctx.session.waitingForTicketSubject = false;
    }

    await ctx.reply(
      `✅ Новый тикет #${ticket.id} создан!\n\n` +
      `Тема: ${subject}\n\n` +
      `💬 Теперь просто напишите ваше сообщение, и оно будет добавлено в тикет.\n` +
      `Менеджер ответит вам в ближайшее время.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Просмотреть тикет', callback_data: `ticket_view_${ticket.id}` }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка при создании тикета:', error);
    await ctx.reply('❌ Произошла ошибка при создании тикета. Попробуйте позже.');
  }
}

// Обработка темы тикета
export async function handleTicketSubject(ctx) {
  try {
    const userId = ctx.from.id;
    const subject = ctx.message.text.trim();
    
    if (!subject || subject.length < 3) {
      await ctx.reply('❌ Тема должна содержать минимум 3 символа. Попробуйте снова:');
      return;
    }
    
    // Создать новый тикет
    const result = await pool.query(
      `INSERT INTO tickets (user_id, subject, status)
       VALUES ($1, $2, 'open')
       RETURNING *`,
      [userId, subject]
    );

    const ticket = result.rows[0];
    
    if (ctx.session) {
      ctx.session.activeTicketId = ticket.id;
      ctx.session.waitingForTicketSubject = false;
    }

    await ctx.reply(
      `✅ Новый тикет #${ticket.id} создан!\n\n` +
      `Тема: ${subject}\n\n` +
      `💬 Теперь просто напишите ваше сообщение, и оно будет добавлено в тикет.\n` +
      `Менеджер ответит вам в ближайшее время.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Просмотреть тикет', callback_data: `ticket_view_${ticket.id}` }]
          ]
        }
      }
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

    // Проверка на ожидание темы тикета
    if (ctx.session && ctx.session.waitingForTicketSubject) {
      await handleTicketSubject(ctx);
      return;
    }

    // Проверить активный тикет из сессии или найти открытый
    let ticketId = null;
    if (ctx.session && ctx.session.activeTicketId) {
      ticketId = ctx.session.activeTicketId;
    } else {
      // Найти открытый тикет пользователя
      const ticketResult = await pool.query(
        `SELECT * FROM tickets 
         WHERE user_id = $1 AND status IN ('open', 'in_progress')
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (ticketResult.rows.length === 0) {
        // Если нет открытого тикета, создать новый автоматически
        const newTicketResult = await pool.query(
          `INSERT INTO tickets (user_id, subject, status)
           VALUES ($1, $2, 'open')
           RETURNING *`,
          [userId, `Сообщение от пользователя ${userId}`]
        );

        const ticket = newTicketResult.rows[0];
        ticketId = ticket.id;
        
        if (ctx.session) {
          ctx.session.activeTicketId = ticketId;
        }

        // Добавить сообщение
        await pool.query(
          `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message_text)
           VALUES ($1, 'user', $2, $3)`,
          [ticketId, userId, messageText]
        );

        await ctx.reply(
          `✅ Ваше сообщение отправлено в новый тикет #${ticketId}\n\n` +
          `Менеджер ответит вам в ближайшее время.\n\n` +
          `💡 Используйте /ticket для просмотра тикета или /ticket_new для создания нового.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📋 Просмотреть тикет', callback_data: `ticket_view_${ticketId}` }]
              ]
            }
          }
        );
        return;
      } else {
        ticketId = ticketResult.rows[0].id;
        if (ctx.session) {
          ctx.session.activeTicketId = ticketId;
        }
      }
    }

    // Добавить сообщение в существующий тикет
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message_text)
       VALUES ($1, 'user', $2, $3)`,
      [ticketId, userId, messageText]
    );

    // Обновить время обновления тикета и статус
    await pool.query(
      `UPDATE tickets 
       SET updated_at = CURRENT_TIMESTAMP, 
           status = CASE WHEN status = 'closed' THEN 'reopened' ELSE status END
       WHERE id = $1`,
      [ticketId]
    );

    await ctx.reply(
      `✅ Ваше сообщение добавлено в тикет #${ticketId}\n\n` +
      `Менеджер получит уведомление и ответит вам.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Просмотреть тикет', callback_data: `ticket_view_${ticketId}` }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка при обработке сообщения тикета:', error);
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
}

// Просмотр тикета
export async function handleTicketView(ctx, ticketId) {
  try {
    const userId = ctx.from.id;
    
    const ticketResult = await pool.query(
      `SELECT * FROM tickets WHERE id = $1 AND user_id = $2`,
      [ticketId, userId]
    );
    
    if (ticketResult.rows.length === 0) {
      await ctx.reply('❌ Тикет не найден.');
      return;
    }
    
    const ticket = ticketResult.rows[0];
    
    // Получить все сообщения
    const messagesResult = await pool.query(
      `SELECT * FROM ticket_messages 
       WHERE ticket_id = $1 
       ORDER BY created_at ASC`,
      [ticketId]
    );
    
    let message = `📋 Тикет #${ticket.id}\n\n`;
    message += `Тема: ${ticket.subject || 'Без темы'}\n`;
    message += `Статус: ${ticket.status === 'open' ? 'Открыт' : ticket.status === 'in_progress' ? 'В работе' : ticket.status === 'closed' ? 'Закрыт' : ticket.status}\n`;
    message += `Сообщений: ${messagesResult.rows.length}\n\n`;
    message += `Переписка:\n\n`;
    
    messagesResult.rows.forEach((msg) => {
      const sender = msg.sender_type === 'user' ? 'Вы' : 'Менеджер';
      const time = new Date(msg.created_at).toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      message += `${sender} (${time}):\n${msg.message_text}\n\n`;
    });
    
    message += `💬 Напишите сообщение, чтобы ответить в тикет.`;
    
    if (ctx.session) {
      ctx.session.activeTicketId = ticketId;
    }
    
    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 Ответить', callback_data: 'ticket_reply' }],
          [{ text: '📋 Обновить', callback_data: `ticket_view_${ticketId}` }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при просмотре тикета:', error);
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
  handleTicketSubject,
  handleTicketMessage,
  handleTicketView,
  sendMessageToUser
};


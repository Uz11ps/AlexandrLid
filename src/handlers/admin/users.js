import db from '../../db.js';

// Просмотр информации о пользователе (через callback)
export async function handleUserView(ctx, userId = null) {
  try {
    // Если userId не передан, пытаемся получить из команды или callback
    if (!userId) {
      if (ctx.callbackQuery && ctx.callbackQuery.data) {
        const match = ctx.callbackQuery.data.match(/user_view_(\d+)/);
        userId = match ? parseInt(match[1]) : null;
      } else if (ctx.message && ctx.message.text) {
        const args = ctx.message.text.split(' ').slice(1);
        const searchQuery = args.join(' ');
        
        if (!searchQuery) {
          return ctx.reply(
            '🔍 ПОИСК ПОЛЬЗОВАТЕЛЯ\n\n' +
            'Использование: /user_search <ID или username>\n\n' +
            'Примеры:\n' +
            '/user_search 123456789\n' +
            '/user_search @username'
          );
        }
        
        // Поиск по ID
        if (/^\d+$/.test(searchQuery)) {
          userId = parseInt(searchQuery);
        } else {
          // Поиск по username (без @)
          const username = searchQuery.replace('@', '');
          const allUsers = await db.getAllUsers();
          const user = allUsers.find(u => u.username === username);
          userId = user ? user.user_id : null;
        }
      }
    }

    if (!userId || isNaN(userId)) {
      const errorMsg = '❌ Пользователь не найден.';
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(errorMsg);
      } else {
        await ctx.reply(errorMsg);
      }
      return;
    }

    const user = await db.getUser(userId);
    if (!user) {
      const errorMsg = '❌ Пользователь не найден.';
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(errorMsg);
      } else {
        await ctx.reply(errorMsg);
      }
      return;
    }

    const referralCount = await db.getReferralCount(user.user_id);
    const isBlacklisted = await db.isBlacklisted(user.user_id);

    const userInfo = 
      `👤 ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ\n\n` +
      `ID: ${user.user_id}\n` +
      `Username: ${user.username ? `@${user.username}` : 'не указан'}\n` +
      `Имя: ${user.first_name || 'не указано'}\n` +
      `Регистрация: ${new Date(user.created_at).toLocaleString('ru-RU')}\n` +
      `Рефералов: ${referralCount}\n` +
      `Статус: ${isBlacklisted ? '❌ Заблокирован' : '✅ Активен'}`;

    // Создаем кнопки для действий
    const buttons = [];
    if (isBlacklisted) {
      buttons.push([
        { text: '✅ Разблокировать', callback_data: `user_unban_${user.user_id}` }
      ]);
    } else {
      buttons.push([
        { text: '🚫 Заблокировать', callback_data: `user_ban_${user.user_id}` }
      ]);
    }
    buttons.push([
      { text: '◀️ Назад к списку', callback_data: 'user_search_menu' }
    ]);

    const menu = {
      reply_markup: {
        inline_keyboard: buttons
      }
    };

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(userInfo, menu);
        await ctx.answerCbQuery();
      } catch (error) {
        await ctx.reply(userInfo, menu);
        await ctx.answerCbQuery();
      }
    } else {
      await ctx.reply(userInfo, menu);
    }
  } catch (error) {
    console.error('Ошибка при просмотре пользователя:', error);
    const errorMsg = '❌ Ошибка при просмотре пользователя.';
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery(errorMsg);
    } else {
      await ctx.reply(errorMsg);
    }
  }
}

// Поиск пользователя (для обратной совместимости с командами)
export async function handleUserSearch(ctx) {
  await handleUserView(ctx);
}

// Бан пользователя
export async function handleUserBan(ctx, userId = null, reason = 'Не указана') {
  try {
    // Если userId не передан, пытаемся получить из команды или callback
    if (!userId) {
      if (ctx.callbackQuery && ctx.callbackQuery.data) {
        const match = ctx.callbackQuery.data.match(/user_ban_(\d+)/);
        userId = match ? parseInt(match[1]) : null;
      } else if (ctx.message && ctx.message.text) {
        const args = ctx.message.text.split(' ').slice(1);
        userId = parseInt(args[0]);
        reason = args.slice(1).join(' ') || 'Не указана';
      }
    }

    if (!userId || isNaN(userId)) {
      const errorMsg = '❌ Использование: /user_ban <ID пользователя> [причина]\n\nПример:\n/user_ban 123456789 Нарушение правил';
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Ошибка');
      } else {
        await ctx.reply(errorMsg);
      }
      return;
    }

    const user = await db.getUser(userId);
    if (!user) {
      const errorMsg = '❌ Пользователь не найден.';
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(errorMsg);
      } else {
        await ctx.reply(errorMsg);
      }
      return;
    }

    const adminId = ctx.from.id;
    await db.addToBlacklist(userId, reason, adminId);

    const successMsg = `✅ Пользователь заблокирован!\n\nID: ${userId}\nПричина: ${reason}`;

    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('✅ Заблокирован');
      // Обновляем информацию о пользователе
      await handleUserView(ctx, userId);
    } else {
      await ctx.reply(successMsg);
    }

    // Уведомление пользователю
    try {
      await ctx.telegram.sendMessage(
        userId,
        `⚠️ Ваш аккаунт был заблокирован.\n\n` +
        `Причина: ${reason}\n\n` +
        `Если вы считаете, что это ошибка, свяжитесь с администратором.`
      );
    } catch (error) {
      console.error('Не удалось отправить уведомление пользователю:', error);
    }
  } catch (error) {
    console.error('Ошибка при бане пользователя:', error);
    const errorMsg = '❌ Ошибка при бане пользователя.';
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery(errorMsg);
    } else {
      await ctx.reply(errorMsg);
    }
  }
}

// Разбан пользователя
export async function handleUserUnban(ctx, userId = null) {
  try {
    // Если userId не передан, пытаемся получить из команды или callback
    if (!userId) {
      if (ctx.callbackQuery && ctx.callbackQuery.data) {
        const match = ctx.callbackQuery.data.match(/user_unban_(\d+)/);
        userId = match ? parseInt(match[1]) : null;
      } else if (ctx.message && ctx.message.text) {
        const args = ctx.message.text.split(' ').slice(1);
        userId = parseInt(args[0]);
      }
    }

    if (!userId || isNaN(userId)) {
      const errorMsg = '❌ Использование: /user_unban <ID пользователя>\n\nПример:\n/user_unban 123456789';
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Ошибка');
      } else {
        await ctx.reply(errorMsg);
      }
      return;
    }

    const user = await db.getUser(userId);
    if (!user) {
      const errorMsg = '❌ Пользователь не найден.';
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(errorMsg);
      } else {
        await ctx.reply(errorMsg);
      }
      return;
    }

    const isBlacklisted = await db.isBlacklisted(userId);
    if (!isBlacklisted) {
      const errorMsg = '❌ Пользователь не заблокирован.';
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(errorMsg);
      } else {
        await ctx.reply(errorMsg);
      }
      return;
    }

    await db.removeFromBlacklist(userId);

    const successMsg = `✅ Пользователь разблокирован!\n\nID: ${userId}`;

    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('✅ Разблокирован');
      // Обновляем информацию о пользователе
      await handleUserView(ctx, userId);
    } else {
      await ctx.reply(successMsg);
    }

    // Уведомление пользователю
    try {
      await ctx.telegram.sendMessage(
        userId,
        `✅ Ваш аккаунт был разблокирован.\n\n` +
        `Вы снова можете использовать бота.`
      );
    } catch (error) {
      console.error('Не удалось отправить уведомление пользователю:', error);
    }
  } catch (error) {
    console.error('Ошибка при разбане пользователя:', error);
    const errorMsg = '❌ Ошибка при разбане пользователя.';
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery(errorMsg);
    } else {
      await ctx.reply(errorMsg);
    }
  }
}

export default {
  handleUserSearch,
  handleUserView,
  handleUserBan,
  handleUserUnban,
};


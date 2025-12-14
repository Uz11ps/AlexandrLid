import db from '../db.js';

// Список активных розыгрышей для пользователей
export async function handleGiveaways(ctx) {
  try {
    const activeGiveaways = await db.getActiveGiveaways();

    if (activeGiveaways.length === 0) {
      const { getMainMenu } = await import('./menu.js');
      const emptyMessage = '🎁 АКТИВНЫЕ РОЗЫГРЫШИ\n\nСейчас нет активных розыгрышей. Следите за обновлениями!';
      
      try {
        if (ctx.callbackQuery) {
          try {
            await ctx.editMessageText(emptyMessage, getMainMenu());
          } catch (error) {
            await ctx.reply(emptyMessage, getMainMenu());
          }
          await ctx.answerCbQuery();
        } else {
          await ctx.reply(emptyMessage, getMainMenu());
        }
      } catch (error) {
        console.error('Ошибка при отправке пустого списка розыгрышей:', error);
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('❌ Ошибка');
        }
      }
      return;
    }

    let message = '🎁 АКТИВНЫЕ РОЗЫГРЫШИ\n\n';

    for (const giveaway of activeGiveaways) {
      const endDate = new Date(giveaway.end_date).toLocaleDateString('ru-RU');
      const isParticipant = await db.isUserInGiveaway(giveaway.id, ctx.from.id);
      
      message += `🎯 ${giveaway.title}\n`;
      message += `${giveaway.description || ''}\n`;
      message += `🎁 Приз: ${giveaway.prize_description || 'не указан'}\n`;
      message += `📅 До: ${endDate}\n`;
      if (giveaway.min_referrals > 0) {
        message += `📊 Минимум рефералов: ${giveaway.min_referrals}\n`;
      }
      message += `${isParticipant ? '✅ Вы участвуете' : '❌ Вы не участвуете'}\n\n`;
    }

    const { getGiveawaysMenu, getMainMenu } = await import('./menu.js');
    const menu = getGiveawaysMenu(activeGiveaways);
    
    try {
      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(message, menu);
        } catch (error) {
          await ctx.reply(message, menu);
        }
        await ctx.answerCbQuery();
      } else {
        await ctx.reply(message, menu);
      }
    } catch (error) {
      console.error('Ошибка при отправке розыгрышей:', error);
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Ошибка при загрузке розыгрышей');
      }
    }
  } catch (error) {
    console.error('Ошибка при получении розыгрышей:', error);
    await ctx.reply('❌ Ошибка при получении розыгрышей.');
  }
}

// Участие в розыгрыше
export async function handleGiveawayJoin(ctx) {
  try {
    // Определяем ID розыгрыша из команды или callback
    let giveawayId;
    if (ctx.callbackQuery && ctx.callbackQuery.data) {
      // Извлекаем ID из callback_data (giveaway_join_123)
      const match = ctx.callbackQuery.data.match(/giveaway_join_(\d+)/);
      giveawayId = match ? parseInt(match[1]) : null;
    } else if (ctx.message && ctx.message.text) {
      const args = ctx.message.text.split(' ').slice(1);
      giveawayId = parseInt(args[0]);
    } else {
      throw new Error('Не удалось определить ID розыгрыша');
    }

    if (!giveawayId || isNaN(giveawayId)) {
      return ctx.reply(
        '❌ Использование: /giveaway_join <ID розыгрыша>\n\n' +
        'Пример: /giveaway_join 1\n\n' +
        'Используйте /giveaways для просмотра активных розыгрышей'
      );
    }

    const giveaway = await db.getGiveaway(giveawayId);
    
    if (!giveaway) {
      return ctx.reply('❌ Розыгрыш не найден.');
    }

    if (giveaway.status !== 'active') {
      return ctx.reply('❌ Розыгрыш не активен.');
    }

    const now = new Date();
    const startDate = new Date(giveaway.start_date);
    const endDate = new Date(giveaway.end_date);

    if (now < startDate) {
      return ctx.reply('❌ Розыгрыш еще не начался.');
    }

    if (now > endDate) {
      return ctx.reply('❌ Розыгрыш уже завершен.');
    }

    // Проверка минимального количества рефералов
    const referralCount = await db.getReferralCount(ctx.from.id);
    
    if (referralCount < giveaway.min_referrals) {
      return ctx.reply(
        `❌ Для участия необходимо минимум ${giveaway.min_referrals} рефералов.\n\n` +
        `У вас: ${referralCount}\n` +
        `Пригласите друзей, чтобы получить доступ к розыгрышу!`
      );
    }

    // Проверка подписки на канал (если требуется)
    if (giveaway.require_channel_subscription) {
      const channelId = await db.getSetting('channel_id');
      if (channelId) {
        try {
          const member = await ctx.telegram.getChatMember(channelId, ctx.from.id);
          if (!['member', 'administrator', 'creator'].includes(member.status)) {
            const channelUsername = await db.getSetting('channel_username') || 'канал';
            const errorMsg = `⚠️ Для участия необходимо подписаться на ${channelUsername}`;
            if (ctx.callbackQuery) {
              await ctx.answerCbQuery('❌ Нужна подписка');
              await ctx.telegram.sendMessage(ctx.from.id, errorMsg);
            } else {
              await ctx.reply(errorMsg);
            }
            return;
          }
        } catch (error) {
          console.error('Ошибка при проверке подписки:', error);
        }
      }
    }

    // Добавляем участника
    await db.joinGiveaway(giveawayId, ctx.from.id, referralCount);

    const successMessage = 
      `✅ Вы успешно зарегистрированы в розыгрыше "${giveaway.title}"!\n\n` +
      `📊 Ваши рефералы: ${referralCount}\n` +
      `🎁 Приз: ${giveaway.prize_description || 'не указан'}\n\n` +
      `Удачи! 🍀`;

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(successMessage);
        await ctx.answerCbQuery('✅ Вы зарегистрированы!');
      } catch (error) {
        await ctx.telegram.sendMessage(ctx.from.id, successMessage);
        await ctx.answerCbQuery('✅ Вы зарегистрированы!');
      }
    } else {
      await ctx.reply(successMessage);
    }
  } catch (error) {
    console.error('Ошибка при участии в розыгрыше:', error);
    await ctx.reply('❌ Ошибка при участии в розыгрыше.');
  }
}

export default {
  handleGiveaways,
  handleGiveawayJoin,
};


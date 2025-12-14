import db from '../../db.js';

// Список розыгрышей
export async function handleGiveawaysList(ctx) {
  try {
    const giveaways = await db.getAllGiveaways();
    const activeGiveaways = await db.getActiveGiveaways();

    const backMenu = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '◀️ Назад', callback_data: 'admin_main' }]
        ]
      }
    };

    if (giveaways.length === 0) {
      const emptyMessage = '🎁 Розыгрыши не найдены.\n\nИспользуйте /giveaway_create для создания нового.';
      
      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(emptyMessage, backMenu);
        } catch (error) {
          await ctx.reply(emptyMessage, backMenu);
        }
        await ctx.answerCbQuery();
      } else {
        await ctx.reply(emptyMessage);
      }
      return;
    }

    let message = '🎁 РОЗЫГРЫШИ\n\n';
    message += `Активных: ${activeGiveaways.length}\n\n`;

    giveaways.slice(0, 10).forEach((giveaway) => {
      const statusEmoji = {
        'draft': '📝',
        'active': '🎯',
        'ended': '✅',
        'cancelled': '❌'
      };

      const emoji = statusEmoji[giveaway.status] || '📄';
      const endDate = new Date(giveaway.end_date).toLocaleString('ru-RU');
      
      message += `${emoji} ${giveaway.title}\n`;
      message += `   ID: ${giveaway.id} | Статус: ${giveaway.status}\n`;
      message += `   До: ${endDate}\n`;
      message += `   Приз: ${giveaway.prize_description || 'не указан'}\n\n`;
    });

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, backMenu);
      } catch (error) {
        await ctx.reply(message, backMenu);
      }
      await ctx.answerCbQuery();
    } else {
      await ctx.reply(message);
    }
  } catch (error) {
    console.error('Ошибка при получении списка розыгрышей:', error);
    await ctx.reply('❌ Ошибка при получении списка розыгрышей.');
  }
}

// Создание розыгрыша (упрощенная версия через команды)
export async function handleGiveawayCreate(ctx) {
  await ctx.reply(
    '🎁 СОЗДАНИЕ РОЗЫГРЫША\n\n' +
    'Используйте команду:\n' +
    '/giveaway_new <название> | <описание> | <приз> | <дата начала ДД.ММ.ГГГГ> | <дата окончания ДД.ММ.ГГГГ> | <количество победителей> | <мин. рефералов>\n\n' +
    'Пример:\n' +
    '/giveaway_new iPhone 15 Pro | Розыгрыш для топ рефералов | iPhone 15 Pro 256GB | 01.12.2025 | 31.12.2025 | 3 | 5'
  );
}

// Создание нового розыгрыша
export async function handleGiveawayNew(ctx) {
  try {
    const args = ctx.message.text.replace('/giveaway_new', '').trim();
    const parts = args.split('|').map(s => s.trim());

    if (parts.length < 7) {
      return ctx.reply(
        '❌ Неверный формат. Используйте:\n' +
        '/giveaway_new <название> | <описание> | <приз> | <дата начала> | <дата окончания> | <победителей> | <мин. рефералов>'
      );
    }

    const [title, description, prize, startDateStr, endDateStr, winnerCountStr, minReferralsStr] = parts;

    // Парсинг дат
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('.');
      return new Date(`${year}-${month}-${day}T00:00:00`);
    };

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);
    const winnerCount = parseInt(winnerCountStr) || 1;
    const minReferrals = parseInt(minReferralsStr) || 0;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return ctx.reply('❌ Неверный формат даты. Используйте: ДД.ММ.ГГГГ');
    }

    if (endDate <= startDate) {
      return ctx.reply('❌ Дата окончания должна быть позже даты начала.');
    }

    const giveaway = await db.createGiveaway({
      title,
      description,
      prize_description: prize,
      start_date: startDate,
      end_date: endDate,
      winner_count: winnerCount,
      min_referrals: minReferrals,
      winner_selection_type: 'top',
    });

    await db.updateGiveawayStatus(giveaway.id, 'active');

    await ctx.reply(
      `✅ Розыгрыш "${title}" создан и активирован!\n\n` +
      `ID: ${giveaway.id}\n` +
      `Период: ${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}\n` +
      `Победителей: ${winnerCount}\n` +
      `Минимум рефералов: ${minReferrals}`
    );
  } catch (error) {
    console.error('Ошибка при создании розыгрыша:', error);
    await ctx.reply('❌ Ошибка при создании розыгрыша.');
  }
}

// Выбор победителей
export async function handleGiveawaySelectWinners(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    const giveawayId = parseInt(args[0]);

    if (!giveawayId || isNaN(giveawayId)) {
      return ctx.reply(
        '❌ Использование: /giveaway_winners <ID розыгрыша>\n\n' +
        'Пример: /giveaway_winners 1'
      );
    }

    const giveaway = await db.getGiveaway(giveawayId);
    if (!giveaway) {
      return ctx.reply('❌ Розыгрыш не найден.');
    }

    if (giveaway.status !== 'ended' && giveaway.status !== 'active') {
      return ctx.reply('❌ Розыгрыш не завершен или отменен.');
    }

    const participants = await db.getGiveawayParticipants(giveawayId);

    if (participants.length === 0) {
      return ctx.reply('❌ Нет участников в розыгрыше.');
    }

    // Фильтруем по минимальному количеству рефералов
    const eligibleParticipants = participants.filter(
      p => p.referral_count >= giveaway.min_referrals
    );

    if (eligibleParticipants.length === 0) {
      return ctx.reply(
        `❌ Нет участников, соответствующих критериям (минимум ${giveaway.min_referrals} рефералов).`
      );
    }

    // Выбираем победителей
    let winners = [];
    const winnerCount = Math.min(giveaway.winner_count, eligibleParticipants.length);

    if (giveaway.winner_selection_type === 'top') {
      // Топ по количеству рефералов
      winners = eligibleParticipants.slice(0, winnerCount);
    } else if (giveaway.winner_selection_type === 'random') {
      // Случайный выбор
      const shuffled = [...eligibleParticipants].sort(() => Math.random() - 0.5);
      winners = shuffled.slice(0, winnerCount);
    } else {
      // Комбинированный: 50% топ, 50% случайно
      const topCount = Math.ceil(winnerCount / 2);
      const randomCount = winnerCount - topCount;
      
      winners = eligibleParticipants.slice(0, topCount);
      const remaining = eligibleParticipants.slice(topCount);
      const shuffled = [...remaining].sort(() => Math.random() - 0.5);
      winners.push(...shuffled.slice(0, randomCount));
    }

    // Обновляем статус розыгрыша
    await db.updateGiveawayStatus(giveawayId, 'ended');

    // Формируем сообщение с победителями
    let message = `🏆 ПОБЕДИТЕЛИ РОЗЫГРЫША "${giveaway.title}"\n\n`;
    
    winners.forEach((winner, index) => {
      const username = winner.username ? `@${winner.username}` : (winner.first_name || 'Без имени');
      message += `${index + 1}. ${username} - ${winner.referral_count} рефералов\n`;
    });

    message += `\n🎁 Приз: ${giveaway.prize_description || 'не указан'}`;

    await ctx.reply(message);

    // Уведомляем победителей
    for (const winner of winners) {
      try {
        await ctx.telegram.sendMessage(
          winner.user_id,
          `🎉 Поздравляем! Вы победили в розыгрыше "${giveaway.title}"!\n\n` +
          `🎁 Приз: ${giveaway.prize_description || 'не указан'}\n\n` +
          `Свяжитесь с администратором для получения приза.`
        );
      } catch (error) {
        console.error(`Не удалось уведомить победителя ${winner.user_id}:`, error);
      }
    }
  } catch (error) {
    console.error('Ошибка при выборе победителей:', error);
    await ctx.reply('❌ Ошибка при выборе победителей.');
  }
}

export default {
  handleGiveawaysList,
  handleGiveawayCreate,
  handleGiveawayNew,
  handleGiveawaySelectWinners,
};


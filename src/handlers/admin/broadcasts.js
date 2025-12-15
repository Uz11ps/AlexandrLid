import db from '../../db.js';
import { sendBroadcast } from '../../utils/broadcastSender.js';
import { formatMoscowTime } from '../../utils/timeUtils.js';

// Список всех рассылок
export async function handleBroadcastList(ctx) {
  try {
    const broadcasts = await db.getAllBroadcasts();

    if (broadcasts.length === 0) {
      const message = '📢 Рассылки не найдены.\n\nИспользуйте /broadcast_new для создания.';
      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Создать рассылку', callback_data: 'broadcast_create' }],
              [{ text: '◀️ Назад', callback_data: 'admin_broadcast' }]
            ]
          }
        });
        await ctx.answerCbQuery();
      } else {
        await ctx.reply(message);
      }
      return;
    }

    let message = '📢 СПИСОК РАССЫЛОК\n\n';

    broadcasts.slice(0, 10).forEach((broadcast, index) => {
      const statusEmoji = {
        'draft': '📝',
        'scheduled': '⏰',
        'sent': '✅',
        'cancelled': '❌'
      };

      const emoji = statusEmoji[broadcast.status] || '📄';
      const scheduled = broadcast.scheduled_at ? 
        formatMoscowTime(broadcast.scheduled_at) : 'сейчас';
      
      message += `${emoji} ${broadcast.title}\n`;
      message += `   ID: ${broadcast.id} | Статус: ${broadcast.status}\n`;
      if (broadcast.status === 'scheduled') {
        message += `   Запланировано: ${scheduled} (МСК)\n`;
      }
      if (broadcast.status === 'sent') {
        message += `   Отправлено: ${broadcast.sent_count || 0} | Ошибок: ${broadcast.error_count || 0}\n`;
      }
      message += '\n';
    });

    const buttons = [];
    broadcasts.slice(0, 5).forEach(broadcast => {
      if (broadcast.status === 'draft' || broadcast.status === 'scheduled') {
        buttons.push([
          { text: `📤 Отправить: ${broadcast.title}`, callback_data: `broadcast_send_${broadcast.id}` }
        ]);
      }
    });
    buttons.push([{ text: '◀️ Назад', callback_data: 'admin_broadcast' }]);

    const menuWithButtons = {
      reply_markup: {
        inline_keyboard: buttons
      }
    };

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, menuWithButtons);
        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Ошибка при редактировании сообщения:', error);
        await ctx.reply(message, menuWithButtons);
        await ctx.answerCbQuery();
      }
    } else {
      await ctx.reply(message, menuWithButtons);
    }
  } catch (error) {
    console.error('Ошибка при получении списка рассылок:', error);
    await ctx.reply('❌ Ошибка при получении списка рассылок.');
  }
}

// Отправка рассылки
export async function handleBroadcastSend(ctx, broadcastId = null) {
  try {
    // Если broadcastId передан напрямую (из callback), используем его
    // Иначе извлекаем из команды (для обратной совместимости)
    if (!broadcastId) {
      if (ctx.callbackQuery && ctx.callbackQuery.data) {
        const match = ctx.callbackQuery.data.match(/broadcast_send_(\d+)/);
        broadcastId = match ? parseInt(match[1]) : null;
      } else if (ctx.message && ctx.message.text) {
        const args = ctx.message.text.split(' ').slice(1);
        broadcastId = parseInt(args[0]);
      }
    }

    if (!broadcastId || isNaN(broadcastId)) {
      return ctx.reply(
        '❌ Использование: /broadcast_send <ID рассылки>\n\n' +
        'Пример: /broadcast_send 1'
      );
    }

    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('📤 Начинаю отправку рассылки...');
    } else {
      await ctx.reply('📤 Начинаю отправку рассылки...');
    }

    const result = await sendBroadcast(ctx, broadcastId);

    if (result.success) {
      const successMessage = 
        `✅ Рассылка отправлена!\n\n` +
        `✅ Успешно: ${result.sent}\n` +
        `❌ Ошибок: ${result.errors}\n` +
        `📊 Всего: ${result.total}`;
      
      if (ctx.callbackQuery) {
        await ctx.telegram.sendMessage(ctx.from.id, successMessage);
      } else {
        await ctx.reply(successMessage);
      }
    } else {
      const errorMessage = `❌ Ошибка: ${result.error}`;
      if (ctx.callbackQuery) {
        await ctx.telegram.sendMessage(ctx.from.id, errorMessage);
      } else {
        await ctx.reply(errorMessage);
      }
    }
  } catch (error) {
    console.error('Ошибка при отправке рассылки:', error);
    if (ctx.callbackQuery) {
      await ctx.telegram.sendMessage(ctx.from.id, '❌ Ошибка при отправке рассылки.');
    } else {
      await ctx.reply('❌ Ошибка при отправке рассылки.');
    }
  }
}

// Отмена рассылки
export async function handleBroadcastCancel(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    const broadcastId = parseInt(args[0]);

    if (!broadcastId || isNaN(broadcastId)) {
      return ctx.reply(
        '❌ Использование: /broadcast_cancel <ID рассылки>\n\n' +
        'Пример: /broadcast_cancel 1'
      );
    }

    const broadcast = await db.getBroadcast(broadcastId);
    if (!broadcast) {
      return ctx.reply('❌ Рассылка не найдена.');
    }

    if (broadcast.status !== 'scheduled' && broadcast.status !== 'draft') {
      return ctx.reply('❌ Можно отменить только запланированные или черновики рассылок.');
    }

    await db.cancelBroadcast(broadcastId);
    await ctx.reply(`✅ Рассылка "${broadcast.title}" отменена.`);
  } catch (error) {
    console.error('Ошибка при отмене рассылки:', error);
    await ctx.reply('❌ Ошибка при отмене рассылки.');
  }
}

export default {
  handleBroadcastList,
  handleBroadcastSend,
  handleBroadcastCancel,
};


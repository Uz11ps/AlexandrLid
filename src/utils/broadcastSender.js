import db from '../db.js';

// Отправка рассылки
export async function sendBroadcast(ctx, broadcastId) {
  try {
    const broadcast = await db.getBroadcast(broadcastId);
    
    if (!broadcast) {
      return { success: false, error: 'Рассылка не найдена' };
    }

    // Получаем пользователей по сегменту
    const userIds = await db.getUsersBySegment(broadcast.segment);

    if (userIds.length === 0) {
      return { success: false, error: 'Нет пользователей в выбранном сегменте' };
    }

    // Обновляем статус
    await db.updateBroadcastStatus(broadcast.id, 'sent', 0, 0);

    let successCount = 0;
    let errorCount = 0;

    const delay = 1000 / 20; // 20 сообщений в секунду
    let buttons = null;
    if (broadcast.buttons) {
      try {
        // Если buttons уже объект (JSONB), используем как есть
        if (typeof broadcast.buttons === 'object') {
          buttons = broadcast.buttons;
        } else if (typeof broadcast.buttons === 'string') {
          buttons = JSON.parse(broadcast.buttons);
        }
      } catch (error) {
        console.error('Ошибка при парсинге buttons:', error);
        buttons = null;
      }
    }

    const messageOptions = {
      parse_mode: 'HTML',
    };

    if (buttons) {
      messageOptions.reply_markup = {
        inline_keyboard: buttons
      };
    }

    for (const userId of userIds) {
      try {
        if (broadcast.message_type === 'photo' && broadcast.file_id) {
          await ctx.telegram.sendPhoto(userId, broadcast.file_id, {
            caption: broadcast.message_text,
            ...messageOptions
          });
        } else if (broadcast.message_type === 'video' && broadcast.file_id) {
          await ctx.telegram.sendVideo(userId, broadcast.file_id, {
            caption: broadcast.message_text,
            ...messageOptions
          });
        } else if (broadcast.message_type === 'document' && broadcast.file_id) {
          await ctx.telegram.sendDocument(userId, broadcast.file_id, {
            caption: broadcast.message_text,
            ...messageOptions
          });
        } else {
          await ctx.telegram.sendMessage(userId, broadcast.message_text, messageOptions);
        }

        successCount++;
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        errorCount++;
        console.error(`Ошибка при отправке пользователю ${userId}:`, error.message);
      }
    }

    // Обновляем статистику
    await db.updateBroadcastStatus(broadcast.id, 'sent', successCount, errorCount);

    return {
      success: true,
      sent: successCount,
      errors: errorCount,
      total: userIds.length
    };
  } catch (error) {
    console.error('Ошибка при отправке рассылки:', error);
    return { success: false, error: error.message };
  }
}

export default sendBroadcast;




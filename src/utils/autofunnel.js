import db from '../db.js';

// Отправка сообщения автоворонки
async function sendAutofunnelMessage(ctx, autofunnel, userId) {
  try {
    const messageOptions = {
      parse_mode: 'HTML',
    };

    if (autofunnel.buttons) {
      messageOptions.reply_markup = {
        inline_keyboard: autofunnel.buttons
      };
    }

    if (autofunnel.message_type === 'photo' && autofunnel.file_id) {
      await ctx.telegram.sendPhoto(userId, autofunnel.file_id, {
        caption: autofunnel.message_text,
        ...messageOptions
      });
    } else if (autofunnel.message_type === 'video' && autofunnel.file_id) {
      await ctx.telegram.sendVideo(userId, autofunnel.file_id, {
        caption: autofunnel.message_text,
        ...messageOptions
      });
    } else if (autofunnel.message_type === 'document' && autofunnel.file_id) {
      await ctx.telegram.sendDocument(userId, autofunnel.file_id, {
        caption: autofunnel.message_text,
        ...messageOptions
      });
    } else {
      await ctx.telegram.sendMessage(userId, autofunnel.message_text, messageOptions);
    }

    // Отмечаем как отправленное
    await db.markAutofunnelSent(autofunnel.id, userId);
    return true;
  } catch (error) {
    console.error(`Ошибка при отправке автоворонки ${autofunnel.id} пользователю ${userId}:`, error);
    return false;
  }
}

// Обработка триггера регистрации
export async function triggerRegistrationFunnel(ctx, userId) {
  try {
    const autofunnels = await db.getActiveAutofunnelsByTrigger('registration');
    
    for (const autofunnel of autofunnels) {
      // Проверяем, не отправляли ли уже
      const isSent = await db.isAutofunnelSent(autofunnel.id, userId);
      if (isSent) continue;

      if (autofunnel.delay_hours === 0) {
        // Отправляем сразу
        await sendAutofunnelMessage(ctx, autofunnel, userId);
      } else {
        // Планируем отправку (будет обработано планировщиком)
        // Для простоты отправляем сразу, но можно добавить таблицу запланированных отправок
        await sendAutofunnelMessage(ctx, autofunnel, userId);
      }
    }
  } catch (error) {
    console.error('Ошибка при обработке триггера регистрации:', error);
  }
}

// Обработка триггера нового реферала
export async function triggerNewReferralFunnel(ctx, referrerId) {
  try {
    const autofunnels = await db.getActiveAutofunnelsByTrigger('new_referral');
    
    for (const autofunnel of autofunnels) {
      const isSent = await db.isAutofunnelSent(autofunnel.id, referrerId);
      if (isSent) continue;

      await sendAutofunnelMessage(ctx, autofunnel, referrerId);
    }
  } catch (error) {
    console.error('Ошибка при обработке триггера нового реферала:', error);
  }
}

// Обработка триггера отсутствия подписки
export async function triggerNoSubscriptionFunnel(ctx, userId) {
  try {
    const autofunnels = await db.getActiveAutofunnelsByTrigger('no_subscription');
    
    for (const autofunnel of autofunnels) {
      const isSent = await db.isAutofunnelSent(autofunnel.id, userId);
      if (isSent) continue;

      await sendAutofunnelMessage(ctx, autofunnel, userId);
    }
  } catch (error) {
    console.error('Ошибка при обработке триггера отсутствия подписки:', error);
  }
}

export default {
  triggerRegistrationFunnel,
  triggerNewReferralFunnel,
  triggerNoSubscriptionFunnel,
};




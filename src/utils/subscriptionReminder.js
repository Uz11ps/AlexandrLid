import db from '../db.js';

// Отправка напоминания о подписке на канал
export async function sendSubscriptionReminder(bot, userId, channelUsername) {
  try {
    const reminder = await db.getSubscriptionReminder(userId);
    const reminderCount = reminder?.reminder_count || 0;

    let message = `⚠️ Напоминание о подписке\n\n`;
    
    if (reminderCount === 0) {
      message += `Для полного доступа к функциям бота подпишитесь на наш канал ${channelUsername}`;
    } else if (reminderCount === 1) {
      message += `Не забудьте подписаться на канал ${channelUsername} для получения всех возможностей!`;
    } else {
      message += `Пожалуйста, подпишитесь на канал ${channelUsername}. Это займет всего секунду!`;
    }

    message += `\n\nПосле подписки используйте /start для обновления статуса.`;

    const channelLink = channelUsername.startsWith('@') 
      ? `https://t.me/${channelUsername.substring(1)}`
      : `https://t.me/${channelUsername}`;
    
    await bot.telegram.sendMessage(userId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Подписаться на канал', url: channelLink }]
        ]
      }
    });

    // Обновляем счетчик напоминаний
    await db.createOrUpdateSubscriptionReminder(userId);
    
    return true;
  } catch (error) {
    console.error(`Ошибка при отправке напоминания пользователю ${userId}:`, error);
    return false;
  }
}

// Проверка и отправка напоминаний пользователям без подписки
export async function processSubscriptionReminders(bot) {
  try {
    const channelId = await db.getSetting('channel_id');
    const channelUsername = await db.getSetting('channel_username');

    if (!channelId || !channelUsername) {
      return; // Канал не настроен
    }

    // Получаем пользователей, которым нужно отправить напоминание
    const users = await db.getUsersForSubscriptionReminder(24, 3); // Каждые 24 часа, максимум 3 напоминания

    for (const user of users) {
      try {
        // Проверяем подписку
        const member = await bot.telegram.getChatMember(channelId, user.user_id);
        
        if (['member', 'administrator', 'creator'].includes(member.status)) {
          // Пользователь подписан, сбрасываем напоминания
          await db.resetSubscriptionReminder(user.user_id);
        } else {
          // Пользователь не подписан, отправляем напоминание
          await sendSubscriptionReminder(bot, user.user_id, `@${channelUsername}`);
          
          // Небольшая задержка между отправками
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Ошибка при проверке подписки пользователя ${user.user_id}:`, error);
      }
    }
  } catch (error) {
    console.error('Ошибка при обработке напоминаний о подписке:', error);
  }
}

export default {
  sendSubscriptionReminder,
  processSubscriptionReminders,
};


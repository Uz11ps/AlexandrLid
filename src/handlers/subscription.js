import db from '../db.js';

// Проверка подписки на канал и создание лида
export async function checkSubscriptionAndCreateLead(ctx) {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return ctx.reply('❌ Не удалось определить ваш ID пользователя.');
    }

    const channelId = await db.getSetting('channel_id');
    const channelUsername = await db.getSetting('channel_username') || 'канал';
    
    if (!channelId) {
      return ctx.reply('⚠️ Канал не настроен. Обратитесь к администратору.');
    }

    // Проверяем статус подписки
    try {
      let member;
      try {
        member = await ctx.telegram.getChatMember(channelId, userId);
      } catch (error) {
        // Если бот не может проверить подписку (нет прав администратора)
        console.error('Ошибка при проверке подписки (возможно, бот не является администратором канала):', error);
        
        // Предлагаем пользователю подписаться и проверить вручную
        const channelLink = channelUsername.startsWith('@') 
          ? `https://t.me/${channelUsername.substring(1)}`
          : `https://t.me/${channelUsername}`;
        
        return ctx.reply(
          `⚠️ Для доступа к функциям необходимо подписаться на канал ${channelUsername}\n\n` +
          `📢 Пожалуйста, подпишитесь на канал по ссылке ниже и нажмите кнопку "Проверить подписку" снова.\n\n` +
          `💡 Если вы уже подписаны, убедитесь, что бот добавлен в канал как администратор.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📢 Подписаться на канал', url: channelLink }],
                [{ text: '🔄 Проверить подписку', callback_data: 'check_subscription' }]
              ]
            }
          }
        );
      }
      
      const status = member.status;

      // Разрешенные статусы: member, administrator, creator
      if (['member', 'administrator', 'creator'].includes(status)) {
        // Пользователь подписан - создаем/обновляем лид
        try {
          const user = await db.getUser(userId);
          if (user) {
            // Создаем или обновляем лид с источником "Channel Subscription"
            const lead = await db.createOrUpdateLeadFromUser(userId, {
              fio: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null,
              source: 'Channel Subscription'
            });

            if (lead) {
              await ctx.reply(
                `✅ Отлично! Вы подписаны на канал ${channelUsername}.\n\n` +
                `📝 Ваш лид успешно создан/обновлен в CRM системе.`
              );
            } else {
              await ctx.reply(
                `✅ Вы подписаны на канал ${channelUsername}!`
              );
            }
          } else {
            await ctx.reply(
              `✅ Вы подписаны на канал ${channelUsername}!\n\n` +
              `💡 Используйте команду /start для регистрации в системе.`
            );
          }
        } catch (error) {
          console.error('Ошибка при создании лида:', error);
          await ctx.reply(
            `✅ Вы подписаны на канал ${channelUsername}!`
          );
        }
      } else {
        // Пользователь не подписан
        const channelLink = channelUsername.startsWith('@') 
          ? `https://t.me/${channelUsername.substring(1)}`
          : `https://t.me/${channelUsername}`;

        await ctx.reply(
          `⚠️ Для доступа к функциям необходимо подписаться на канал ${channelUsername}\n\n` +
          `Пожалуйста, подпишитесь и нажмите кнопку "Проверить подписку" снова.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📢 Подписаться на канал', url: channelLink }],
                [{ text: '🔄 Проверить подписку', callback_data: 'check_subscription' }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.error('Ошибка при проверке подписки:', error);
      await ctx.reply(
        `❌ Не удалось проверить подписку. Убедитесь, что бот добавлен в канал как администратор.`
      );
    }
  } catch (error) {
    console.error('Ошибка в checkSubscriptionAndCreateLead:', error);
    await ctx.reply('❌ Произошла ошибка при проверке подписки.');
  }
}

export default {
  checkSubscriptionAndCreateLead
};


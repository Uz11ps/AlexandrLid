import db from '../db.js';

// Middleware для проверки подписки на канал
export const checkChannelSubscription = async (ctx, next) => {
  try {
    const channelId = await db.getSetting('channel_id');
    
    if (!channelId) {
      // Канал не настроен, пропускаем проверку
      return next();
    }

    const userId = ctx.from?.id;
    if (!userId) {
      return ctx.reply('❌ Не удалось определить ваш ID пользователя.');
    }

    // Проверяем статус подписки
    try {
      const member = await ctx.telegram.getChatMember(channelId, userId);
      const status = member.status;

      // Разрешенные статусы: member, administrator, creator
      if (['member', 'administrator', 'creator'].includes(status)) {
        // Пользователь подписан - создаем/обновляем лид с источником "Channel Subscription"
        try {
          const user = await db.getUser(userId);
          if (user) {
            await db.createOrUpdateLeadFromUser(userId, {
              fio: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null,
              source: 'Channel Subscription'
            });
          }
        } catch (error) {
          console.error('Ошибка при создании лида в middleware:', error);
          // Не прерываем выполнение, если создание лида не удалось
        }
        return next();
      } else {
        const channelUsername = await db.getSetting('channel_username') || 'канал';
        return ctx.reply(
          `⚠️ Для использования этой функции необходимо подписаться на ${channelUsername}\n\n` +
          `Пожалуйста, подпишитесь и попробуйте снова.`
        );
      }
    } catch (error) {
      // Если бот не может проверить подписку (например, не добавлен в канал как админ)
      console.error('Ошибка при проверке подписки:', error);
      // Пропускаем проверку, если не можем проверить
      return next();
    }
  } catch (error) {
    console.error('Ошибка в middleware проверки подписки:', error);
    return next();
  }
};

export default checkChannelSubscription;




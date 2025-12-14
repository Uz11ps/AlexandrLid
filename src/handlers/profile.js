import db from '../db.js';

// Обработчик команды /profile
export async function handleProfile(ctx) {
  const userId = ctx.from.id;

  // Получение данных пользователя
  const user = await db.getUser(userId);
  
  if (!user) {
    return ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
  }

  // Получение username бота из API Telegram
  const botInfo = await ctx.telegram.getMe();
  const botUsername = botInfo.username;

  // Получение статистики рефералов
  const referralCount = await db.getReferralCount(userId);
  const referrals = await db.getReferrals(userId);
  
  // Подсчет активных рефералов (у кого есть username и аккаунт старше 7 дней)
  const activeReferrals = referrals.filter(ref => {
    if (!ref.username) return false;
    const accountAge = new Date() - new Date(ref.created_at);
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    return daysOld >= 7;
  }).length;

  // Генерация реферальной ссылки
  const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;

  // Формирование сообщения профиля
  const profileMessage = 
    `👤 ЛИЧНЫЙ КАБИНЕТ\n\n` +
    `👥 Мои рефералы:\n` +
    `├── Всего приглашено: ${referralCount}\n` +
    `└── Активных: ${activeReferrals}\n\n` +
    `🔗 Моя реферальная ссылка:\n` +
    `${referralLink}\n\n` +
    `📊 Используйте эту ссылку для приглашения друзей!`;

  const { getProfileMenu, getMainMenu } = await import('./menu.js');
  
  // Создаем меню с кнопкой поделиться ссылкой (объединенной)
  const menu = {
    reply_markup: {
      inline_keyboard: [
        [
          { 
            text: '🔗 Поделиться реферальной ссылкой', 
            url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Присоединяйся!')}`
          }
        ],
        [
          { text: '◀️ Назад в меню', callback_data: 'menu_main' }
        ]
      ]
    }
  };

  try {
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(profileMessage, menu);
        await ctx.answerCbQuery();
      } catch (error) {
        // Если не удалось отредактировать, отправляем новое сообщение
        await ctx.telegram.sendMessage(ctx.from.id, profileMessage, menu);
        await ctx.answerCbQuery();
      }
    } else {
      await ctx.reply(profileMessage, menu);
    }
  } catch (error) {
    console.error('Ошибка при отправке профиля:', error);
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Ошибка при загрузке профиля');
      } else {
        await ctx.reply('❌ Ошибка при загрузке профиля.');
      }
    } catch (e) {
      console.error('Ошибка при отправке сообщения об ошибке:', e);
    }
  }
}

export default handleProfile;


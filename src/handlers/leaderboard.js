import db from '../db.js';

// Обработчик команды /leaderboard
export async function handleLeaderboard(ctx) {
  try {
    const topReferrers = await db.getTopReferrers(10);

    if (topReferrers.length === 0) {
      return ctx.reply(
        '🏆 ЛИДЕРБОРД\n\n' +
        'Пока нет рефералов. Станьте первым!'
      );
    }

    let message = '🏆 ТОП-10 РЕФЕРАЛОВ\n\n';

    topReferrers.forEach((user, index) => {
      const username = user.username ? `@${user.username}` : (user.first_name || 'Без имени');
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `${medal} ${username} - ${user.referral_count} рефералов\n`;
    });

    const { getMainMenu } = await import('./menu.js');
    try {
      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(message, getMainMenu());
        } catch (error) {
          await ctx.reply(message, getMainMenu());
        }
        await ctx.answerCbQuery();
      } else {
        await ctx.reply(message, getMainMenu());
      }
    } catch (error) {
      console.error('Ошибка при отправке лидерборда:', error);
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Ошибка при загрузке лидерборда');
      }
    }
  } catch (error) {
    console.error('Ошибка при получении лидерборда:', error);
    await ctx.reply('❌ Ошибка при получении лидерборда.');
  }
}

export default handleLeaderboard;


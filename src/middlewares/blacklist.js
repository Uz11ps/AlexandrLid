import db from '../db.js';

// Middleware для проверки черного списка
export const checkBlacklist = async (ctx, next) => {
  try {
    const userId = ctx.from?.id;
    
    if (!userId) {
      return next();
    }

    const isBlacklisted = await db.isBlacklisted(userId);
    
    if (isBlacklisted) {
      return ctx.reply(
        '❌ Ваш аккаунт заблокирован.\n\n' +
        'Если вы считаете, что это ошибка, свяжитесь с администратором.'
      );
    }

    return next();
  } catch (error) {
    console.error('Ошибка в middleware проверки черного списка:', error);
    return next();
  }
};

export default checkBlacklist;




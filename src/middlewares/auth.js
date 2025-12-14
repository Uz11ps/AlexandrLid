import dotenv from 'dotenv';

dotenv.config();

const adminIds = (process.env.ADMIN_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim()))
  .filter(id => !isNaN(id));

// Middleware для проверки прав администратора
export const isAdmin = (ctx, next) => {
  const userId = ctx.from?.id;
  
  if (!userId) {
    return ctx.reply('❌ Не удалось определить ваш ID пользователя.');
  }

  if (!adminIds.includes(userId)) {
    return ctx.reply('❌ У вас нет прав для выполнения этой команды.');
  }

  return next();
};

export default isAdmin;




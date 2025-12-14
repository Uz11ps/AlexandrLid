// Простой rate limiting middleware
const userRequests = new Map();

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of userRequests.entries()) {
    const filtered = timestamps.filter(ts => now - ts < 3600000); // Последний час
    if (filtered.length === 0) {
      userRequests.delete(userId);
    } else {
      userRequests.set(userId, filtered);
    }
  }
}, 300000); // Каждые 5 минут

export const rateLimit = (maxRequests = 20, windowMs = 3600000) => {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      return next();
    }

    const now = Date.now();
    const userTimestamps = userRequests.get(userId) || [];

    // Фильтрация запросов за последний час
    const recentRequests = userTimestamps.filter(ts => now - ts < windowMs);

    if (recentRequests.length >= maxRequests) {
      return ctx.reply(
        '⚠️ Превышен лимит запросов.\n\n' +
        `Максимум ${maxRequests} запросов в час. Попробуйте позже.`
      );
    }

    // Добавление текущего запроса
    recentRequests.push(now);
    userRequests.set(userId, recentRequests);

    return next();
  };
};

export default rateLimit;




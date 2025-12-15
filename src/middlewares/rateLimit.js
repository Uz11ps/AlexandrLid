import { pool } from '../db.js';

// Простой rate limiting middleware
const userRequests = new Map();

// Кэш настроек лимитов
let rateLimitSettings = {
  user_rate_limit: 20,
  user_rate_window: 3600000,
  admin_rate_limit: 100,
  admin_rate_window: 3600000
};

// Загрузка настроек лимитов из БД
async function loadRateLimitSettings() {
  try {
    const settingsResult = await pool.query(
      "SELECT key, value FROM bot_settings WHERE key IN ('user_rate_limit', 'user_rate_window', 'admin_rate_limit', 'admin_rate_window')"
    );
    
    settingsResult.rows.forEach(row => {
      if (row.key === 'user_rate_limit') rateLimitSettings.user_rate_limit = parseInt(row.value) || 20;
      if (row.key === 'user_rate_window') rateLimitSettings.user_rate_window = parseInt(row.value) || 3600000;
      if (row.key === 'admin_rate_limit') rateLimitSettings.admin_rate_limit = parseInt(row.value) || 100;
      if (row.key === 'admin_rate_window') rateLimitSettings.admin_rate_window = parseInt(row.value) || 3600000;
    });
  } catch (error) {
    console.error('Error loading rate limit settings:', error);
  }
}

// Загружаем настройки при старте
loadRateLimitSettings();

// Обновляем настройки каждые 5 минут
setInterval(loadRateLimitSettings, 300000);

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  const maxWindow = Math.max(rateLimitSettings.user_rate_window, rateLimitSettings.admin_rate_window);
  for (const [userId, timestamps] of userRequests.entries()) {
    const filtered = timestamps.filter(ts => now - ts < maxWindow);
    if (filtered.length === 0) {
      userRequests.delete(userId);
    } else {
      userRequests.set(userId, filtered);
    }
  }
}, 300000); // Каждые 5 минут

export const rateLimit = () => {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      return next();
    }

    // Проверяем, является ли пользователь админом
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    const isUserAdmin = adminIds.includes(userId);

    // Выбираем лимиты в зависимости от роли
    const maxRequests = isUserAdmin ? rateLimitSettings.admin_rate_limit : rateLimitSettings.user_rate_limit;
    const windowMs = isUserAdmin ? rateLimitSettings.admin_rate_window : rateLimitSettings.user_rate_window;

    const now = Date.now();
    const userTimestamps = userRequests.get(userId) || [];

    // Фильтрация запросов за период окна
    const recentRequests = userTimestamps.filter(ts => now - ts < windowMs);

    if (recentRequests.length >= maxRequests) {
      const windowMinutes = Math.floor(windowMs / 60000);
      return ctx.reply(
        '⚠️ Превышен лимит запросов.\n\n' +
        `Максимум ${maxRequests} запросов за ${windowMinutes} минут. Попробуйте позже.`
      );
    }

    // Добавление текущего запроса
    recentRequests.push(now);
    userRequests.set(userId, recentRequests);

    return next();
  };
};

export default rateLimit;




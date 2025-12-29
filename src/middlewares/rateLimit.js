import db from '../db.js';

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
    // Используем методы из объекта db для получения настроек
    const userRateLimit = await db.getSetting('user_rate_limit');
    const userRateWindow = await db.getSetting('user_rate_window');
    const adminRateLimit = await db.getSetting('admin_rate_limit');
    const adminRateWindow = await db.getSetting('admin_rate_window');
    
    if (userRateLimit !== null && userRateLimit !== undefined) {
      rateLimitSettings.user_rate_limit = parseInt(userRateLimit) || 20;
    }
    if (userRateWindow !== null && userRateWindow !== undefined) {
      rateLimitSettings.user_rate_window = parseInt(userRateWindow) || 3600000;
    }
    if (adminRateLimit !== null && adminRateLimit !== undefined) {
      rateLimitSettings.admin_rate_limit = parseInt(adminRateLimit) || 100;
    }
    if (adminRateWindow !== null && adminRateWindow !== undefined) {
      rateLimitSettings.admin_rate_window = parseInt(adminRateWindow) || 3600000;
    }
  } catch (error) {
    console.error('Error loading rate limit settings:', error);
    // Используем значения по умолчанию при ошибке подключения к БД
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




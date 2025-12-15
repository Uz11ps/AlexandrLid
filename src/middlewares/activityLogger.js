import db from '../db.js';

/**
 * Middleware для логирования активности пользователей
 */
export const activityLogger = async (ctx, next) => {
  const userId = ctx.from?.id;
  
  if (!userId) {
    return next();
  }

  try {
    let activityType = null;
    let activityData = null;
    const metadata = {
      chat_id: ctx.chat?.id,
      message_id: ctx.message?.message_id || ctx.callbackQuery?.message?.message_id,
      timestamp: new Date().toISOString()
    };

    // Определяем тип активности
    if (ctx.callbackQuery) {
      activityType = 'callback';
      activityData = {
        data: ctx.callbackQuery.data,
        message_text: ctx.callbackQuery.message?.text
      };
    } else if (ctx.message) {
      if (ctx.message.text && ctx.message.text.startsWith('/')) {
        activityType = 'command';
        activityData = {
          command: ctx.message.text.split(' ')[0],
          args: ctx.message.text.split(' ').slice(1)
        };
      } else {
        activityType = 'message';
        activityData = {
          text_length: ctx.message.text?.length || 0,
          has_photo: !!ctx.message.photo,
          has_video: !!ctx.message.video,
          has_document: !!ctx.message.document
        };
      }
    }

    // Логируем активность асинхронно (не блокируем выполнение)
    // Проверяем существование пользователя перед логированием, чтобы избежать foreign key violation
    if (activityType) {
      // Проверяем, существует ли пользователь в БД
      db.getUser(userId)
        .then(user => {
          if (user) {
            // Пользователь существует, логируем активность
            return db.logUserActivity(userId, activityType, activityData, metadata);
          } else {
            // Пользователь не найден - это нормально для новых пользователей
            // Логирование будет выполнено после создания пользователя
            return Promise.resolve();
          }
        })
        .catch(err => {
          // Игнорируем ошибки проверки пользователя и логирования
          // Не прерываем выполнение основного потока
          if (err.code !== '23503') { // Игнорируем только foreign key violations
            console.error('Ошибка при логировании активности:', err.message);
          }
        });
    }
  } catch (error) {
    // Не прерываем выполнение при ошибке логирования
    console.error('Ошибка в activityLogger middleware:', error);
  }

  return next();
};

export default activityLogger;


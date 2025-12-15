import cron from 'node-cron';
import db from '../db.js';
import { processSubscriptionReminders } from './subscriptionReminder.js';

let botInstance = null;

// Инициализация планировщика
export function initScheduler(bot) {
  botInstance = bot;

  // Проверка запланированных рассылок каждую минуту
  cron.schedule('* * * * *', async () => {
    try {
      const scheduledBroadcasts = await db.getScheduledBroadcasts();
      const now = new Date();
      const nowUTC = new Date(now.toISOString()); // Убеждаемся, что используем UTC

      for (const broadcast of scheduledBroadcasts) {
        // scheduled_at хранится в БД как TIMESTAMP (без timezone)
        // PostgreSQL возвращает его в формате ISO, но без указания timezone
        // Интерпретируем как UTC для корректного сравнения
        const scheduledAt = new Date(broadcast.scheduled_at);
        const now = new Date();
        
        // Логируем для отладки (только для первых 3 рассылок, чтобы не засорять логи)
        if (broadcast.id && scheduledBroadcasts.indexOf(broadcast) < 3) {
          console.log(`[Scheduler] Проверка рассылки ${broadcast.id}:`);
          console.log(`  scheduled_at (из БД): ${broadcast.scheduled_at}`);
          console.log(`  scheduled_at (Date): ${scheduledAt.toISOString()}`);
          console.log(`  now (Date): ${now.toISOString()}`);
          console.log(`  Разница (мс): ${now.getTime() - scheduledAt.getTime()}`);
        }
        
        // Если время наступило (рассылка должна быть отправлена)
        if (scheduledAt <= now) {
          console.log(`⏰ [Scheduler] Отправка запланированной рассылки: ${broadcast.id}`);
          console.log(`  Запланировано на: ${scheduledAt.toISOString()}`);
          console.log(`  Текущее время: ${now.toISOString()}`);
          
          try {
            // Импортируем функцию отправки
            const { sendBroadcast } = await import('./broadcastSender.js');
            
            // Создаем фиктивный контекст для отправки
            const fakeCtx = {
              telegram: botInstance.telegram
            };
            
            await sendBroadcast(fakeCtx, broadcast.id);
            
            // Обновляем статус рассылки на 'sent' после успешной отправки
            await db.updateBroadcastStatus(broadcast.id, 'sent');
          } catch (error) {
            console.error(`❌ [Scheduler] Ошибка при отправке рассылки ${broadcast.id}:`, error);
            // Обновляем статус на 'cancelled' при ошибке
            try {
              await db.updateBroadcastStatus(broadcast.id, 'cancelled');
            } catch (updateError) {
              console.error(`Ошибка при обновлении статуса рассылки ${broadcast.id}:`, updateError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Ошибка в планировщике рассылок:', error);
    }
  });

  // Проверка окончания розыгрышей каждые 5 минут
  cron.schedule('*/5 * * * *', async () => {
    try {
      const activeGiveaways = await db.getActiveGiveaways();
      const now = new Date();

      for (const giveaway of activeGiveaways) {
        const endDate = new Date(giveaway.end_date);
        
        if (endDate <= now && giveaway.status === 'active') {
          console.log(`Розыгрыш ${giveaway.id} завершен`);
          await db.updateGiveawayStatus(giveaway.id, 'ended');
        }
      }
    } catch (error) {
      console.error('Ошибка в планировщике розыгрышей:', error);
    }
  });

  // Отправка напоминаний о подписке каждые 6 часов
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('Проверка напоминаний о подписке...');
      await processSubscriptionReminders(botInstance);
    } catch (error) {
      console.error('Ошибка в планировщике напоминаний о подписке:', error);
    }
  });

  console.log('✅ Планировщик задач запущен');
}

export default initScheduler;


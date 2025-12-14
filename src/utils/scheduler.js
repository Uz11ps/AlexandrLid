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

      for (const broadcast of scheduledBroadcasts) {
        const scheduledAt = new Date(broadcast.scheduled_at);
        
        // Если время наступило (с запасом в 1 минуту)
        if (scheduledAt <= now) {
          console.log(`Отправка запланированной рассылки: ${broadcast.id}`);
          
          try {
            // Импортируем функцию отправки
            const { sendBroadcast } = await import('./broadcastSender.js');
            
            // Создаем фиктивный контекст для отправки
            const fakeCtx = {
              telegram: botInstance.telegram
            };
            
            await sendBroadcast(fakeCtx, broadcast.id);
          } catch (error) {
            console.error(`Ошибка при отправке рассылки ${broadcast.id}:`, error);
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


import cron from 'node-cron';
import db from '../db.js';
import { processSubscriptionReminders } from './subscriptionReminder.js';
import { sendBroadcast } from './broadcastSender.js';

let botInstance = null;

// Инициализация планировщика
export function initScheduler(bot) {
  if (!bot) {
    throw new Error('Bot instance не передан в initScheduler');
  }
  
  botInstance = bot;
  
  console.log('🕐 [Scheduler] Инициализация планировщика задач...');

  // Функция проверки и отправки запланированных рассылок
  const checkScheduledBroadcasts = async () => {
    try {
      // Получаем все рассылки, время которых наступило
      const scheduledBroadcasts = await db.getScheduledBroadcasts();
      
      if (scheduledBroadcasts.length === 0) {
        return; // Тихо выходим, если нет рассылок
      }
      
      console.log(`⏰ [Scheduler] Найдено ${scheduledBroadcasts.length} рассылок для отправки`);
      
      for (const broadcast of scheduledBroadcasts) {
        console.log(`📤 [Scheduler] Отправка рассылки ID: ${broadcast.id} - "${broadcast.title}"`);
        
        try {
          // Создаем контекст для отправки
          const fakeCtx = {
            telegram: botInstance.telegram
          };
          
          const result = await sendBroadcast(fakeCtx, broadcast.id);
          
          if (result.success) {
            console.log(`✅ [Scheduler] Рассылка ${broadcast.id} отправлена: ${result.sent}/${result.total}`);
          } else {
            console.error(`❌ [Scheduler] Ошибка рассылки ${broadcast.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`❌ [Scheduler] Критическая ошибка рассылки ${broadcast.id}:`, error.message);
          // Помечаем как отмененную при критической ошибке
          await db.updateBroadcastStatus(broadcast.id, 'cancelled');
        }
      }
    } catch (error) {
      console.error('❌ [Scheduler] Ошибка в checkScheduledBroadcasts:', error.message);
    }
  };
  
  // Проверка запланированных рассылок каждую минуту
  cron.schedule('* * * * *', checkScheduledBroadcasts);
  
  // Также проверяем каждые 30 секунд для более точного времени отправки
  setInterval(checkScheduledBroadcasts, 30 * 1000);

  // Проверка окончания розыгрышей каждые 5 минут
  cron.schedule('*/5 * * * *', async () => {
    try {
      const activeGiveaways = await db.getActiveGiveaways();
      const now = new Date();

      for (const giveaway of activeGiveaways) {
        const endDate = new Date(giveaway.end_date);
        
        if (endDate <= now && giveaway.status === 'active') {
          console.log(`🎁 [Scheduler] Розыгрыш ${giveaway.id} завершен`);
          await db.updateGiveawayStatus(giveaway.id, 'ended');
        }
      }
    } catch (error) {
      console.error('❌ [Scheduler] Ошибка проверки розыгрышей:', error.message);
    }
  });

  // Отправка напоминаний о подписке каждые 6 часов
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('📬 [Scheduler] Проверка напоминаний о подписке...');
      await processSubscriptionReminders(botInstance);
    } catch (error) {
      console.error('❌ [Scheduler] Ошибка напоминаний о подписке:', error.message);
    }
  });

  console.log('✅ [Scheduler] Планировщик задач запущен');
  console.log('   - Рассылки: каждую минуту + каждые 30 сек');
  console.log('   - Розыгрыши: каждые 5 минут');
  console.log('   - Напоминания: каждые 6 часов');
  
  // Первая проверка через 5 секунд после запуска
  setTimeout(checkScheduledBroadcasts, 5000);
}

export default initScheduler;


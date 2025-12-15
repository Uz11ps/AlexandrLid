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
      console.log(`[Scheduler] Проверка запланированных рассылок в ${new Date().toISOString()}`);
      const scheduledBroadcasts = await db.getScheduledBroadcasts();
      console.log(`[Scheduler] Найдено рассылок для проверки: ${scheduledBroadcasts.length}`);
      
      // Получаем текущее UTC время для сравнения
      const nowUTC = new Date();

      for (const broadcast of scheduledBroadcasts) {
        // scheduled_at хранится в БД в UTC
        const scheduledAtUTC = new Date(broadcast.scheduled_at);
        
        // Логируем для отладки
        console.log(`[Scheduler] Проверка рассылки ${broadcast.id}:`);
        console.log(`  scheduled_at (из БД): ${broadcast.scheduled_at}`);
        console.log(`  scheduled_at (UTC Date): ${scheduledAtUTC.toISOString()}`);
        console.log(`  now (UTC): ${nowUTC.toISOString()}`);
        console.log(`  Разница (мс): ${nowUTC.getTime() - scheduledAtUTC.getTime()}`);
        console.log(`  Разница (минуты): ${(nowUTC.getTime() - scheduledAtUTC.getTime()) / 60000}`);
        
        // Если время наступило (рассылка должна быть отправлена)
        // Сравниваем с запасом в 2 минуты, чтобы учесть задержки выполнения cron
        const timeDiff = nowUTC.getTime() - scheduledAtUTC.getTime();
        if (timeDiff >= 0 && timeDiff < 120000) { // В пределах 2 минут после запланированного времени
          console.log(`⏰ [Scheduler] Отправка запланированной рассылки: ${broadcast.id}`);
          console.log(`  Запланировано на (UTC): ${scheduledAtUTC.toISOString()}`);
          console.log(`  Текущее время (UTC): ${nowUTC.toISOString()}`);
          
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
            console.log(`✅ [Scheduler] Рассылка ${broadcast.id} успешно отправлена`);
          } catch (error) {
            console.error(`❌ [Scheduler] Ошибка при отправке рассылки ${broadcast.id}:`, error);
            console.error(`  Stack:`, error.stack);
            // Обновляем статус на 'cancelled' при ошибке
            try {
              await db.updateBroadcastStatus(broadcast.id, 'cancelled');
            } catch (updateError) {
              console.error(`Ошибка при обновлении статуса рассылки ${broadcast.id}:`, updateError);
            }
          }
        } else if (timeDiff < 0) {
          console.log(`⏳ [Scheduler] Рассылка ${broadcast.id} еще не наступила (осталось ${Math.abs(timeDiff / 60000)} минут)`);
        } else {
          console.log(`⚠️ [Scheduler] Рассылка ${broadcast.id} пропущена (прошло ${timeDiff / 60000} минут)`);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка в планировщике рассылок:', error);
      console.error('  Stack:', error.stack);
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


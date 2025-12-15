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
        // Расширяем окно проверки до 24 часов, чтобы рассылки, созданные позже запланированного времени, тоже отправлялись
        const timeDiff = nowUTC.getTime() - scheduledAtUTC.getTime();
        const maxDelay = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
        
        if (timeDiff >= 0 && timeDiff < maxDelay) {
          // Время наступило и не прошло более 24 часов
          const moscowTime = new Date(scheduledAtUTC.getTime() + (3 * 60 * 60 * 1000));
          const moscowStr = moscowTime.toLocaleString('ru-RU', { 
            timeZone: 'UTC',
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          console.log(`\n⏰ [Scheduler] ════════════════════════════════════════════════════`);
          console.log(`⏰ [Scheduler] ВРЕМЯ РАССЫЛКИ НАСТУПИЛО!`);
          console.log(`⏰ [Scheduler] ════════════════════════════════════════════════════`);
          console.log(`  ID рассылки: ${broadcast.id}`);
          console.log(`  Название: "${broadcast.title}"`);
          console.log(`  Запланировано на (UTC): ${scheduledAtUTC.toISOString()}`);
          console.log(`  Запланировано на (MSK): ${moscowStr}`);
          console.log(`  Текущее время (UTC): ${nowUTC.toISOString()}`);
          console.log(`  Прошло времени: ${Math.round(timeDiff / 60000)} минут (${(timeDiff / 1000).toFixed(0)} секунд)`);
          console.log(`  Сегмент: ${broadcast.segment || 'all'}`);
          
          try {
            // Импортируем функцию отправки
            const { sendBroadcast } = await import('./broadcastSender.js');
            
            // Создаем фиктивный контекст для отправки
            const fakeCtx = {
              telegram: botInstance.telegram
            };
            
            console.log(`\n🚀 [Scheduler] Запуск функции отправки рассылки...`);
            const result = await sendBroadcast(fakeCtx, broadcast.id);
            
            if (result.success) {
              console.log(`\n✅ [Scheduler] Рассылка ${broadcast.id} успешно отправлена через планировщик`);
              console.log(`  Отправлено: ${result.sent}/${result.total}`);
              console.log(`  Ошибок: ${result.errors}`);
            } else {
              console.error(`\n❌ [Scheduler] Рассылка ${broadcast.id} завершилась с ошибкой: ${result.error}`);
            }
          } catch (error) {
            console.error(`\n❌ [Scheduler] КРИТИЧЕСКАЯ ОШИБКА при отправке рассылки ${broadcast.id}:`);
            console.error(`  Ошибка:`, error.message);
            console.error(`  Stack:`, error.stack);
            // Обновляем статус на 'cancelled' при ошибке
            try {
              await db.updateBroadcastStatus(broadcast.id, 'cancelled');
              console.error(`  Статус рассылки обновлен на 'cancelled'`);
            } catch (updateError) {
              console.error(`  Ошибка при обновлении статуса рассылки ${broadcast.id}:`, updateError);
            }
          }
          console.log(`⏰ [Scheduler] ════════════════════════════════════════════════════\n`);
        } else if (timeDiff < 0) {
          console.log(`⏳ [Scheduler] Рассылка ${broadcast.id} еще не наступила (осталось ${Math.abs(timeDiff / 60000)} минут)`);
        } else {
          console.log(`⚠️ [Scheduler] Рассылка ${broadcast.id} пропущена (прошло ${Math.round(timeDiff / 60000)} минут, более 24 часов)`);
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


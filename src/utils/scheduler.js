import cron from 'node-cron';
import db from '../db.js';
import { processSubscriptionReminders } from './subscriptionReminder.js';

let botInstance = null;

// Инициализация планировщика
export function initScheduler(bot) {
  botInstance = bot;
  
  console.log('🕐 [Scheduler] Инициализация планировщика задач...');
  console.log('🕐 [Scheduler] Cron задачи будут запускаться:');
  console.log('  - Проверка рассылок: каждую минуту (* * * * *)');
  console.log('  - Проверка розыгрышей: каждые 5 минут (*/5 * * * *)');
  console.log('  - Напоминания о подписке: каждые 6 часов (0 */6 * * *)');

  // Проверка запланированных рассылок каждую минуту
  cron.schedule('* * * * *', async () => {
    try {
      console.log(`\n[Scheduler] Проверка запланированных рассылок в ${new Date().toISOString()}`);
      const scheduledBroadcasts = await db.getScheduledBroadcasts();
      console.log(`[Scheduler] Найдено рассылок для проверки: ${scheduledBroadcasts.length}`);
      
      if (scheduledBroadcasts.length === 0) {
        console.log(`[Scheduler] Нет рассылок для обработки`);
        return;
      }
      
      // Получаем текущее UTC время для сравнения
      const nowUTC = new Date();

      console.log(`[Scheduler] Начинаем обработку ${scheduledBroadcasts.length} рассылок...`);
      
      for (const broadcast of scheduledBroadcasts) {
        try {
          // scheduled_at хранится в БД в UTC (нормализовано в getScheduledBroadcasts)
          // broadcast.scheduled_at уже должна быть ISO строка UTC после нормализации
          const scheduledAtUTC = new Date(broadcast.scheduled_at);
          const createdAtUTC = new Date(broadcast.created_at);
          
          if (isNaN(scheduledAtUTC.getTime())) {
            console.error(`[Scheduler] Ошибка: некорректное время scheduled_at для рассылки ${broadcast.id}: ${broadcast.scheduled_at}`);
            continue;
          }
        
          // Проверяем, что рассылка была создана хотя бы 60 секунд назад
          // Это предотвращает отправку рассылок, которые только что созданы
          const timeSinceCreation = nowUTC.getTime() - createdAtUTC.getTime();
          const minCreationDelaySafe = 60 * 1000; // 60 секунд для надежности
          
          // Логируем для отладки
          console.log(`[Scheduler] Проверка рассылки ${broadcast.id}:`);
          console.log(`  Название: "${broadcast.title}"`);
          console.log(`  scheduled_at (из БД): ${broadcast.scheduled_at}`);
          console.log(`  scheduled_at (UTC Date): ${scheduledAtUTC.toISOString()}`);
          console.log(`  created_at: ${broadcast.created_at}`);
          console.log(`  now (UTC): ${nowUTC.toISOString()}`);
          
          const timeDiff = nowUTC.getTime() - scheduledAtUTC.getTime();
          console.log(`  Разница до запланированного времени: ${(timeDiff / 60000).toFixed(1)} минут`);
          console.log(`  Время с момента создания: ${(timeSinceCreation / 1000).toFixed(1)} секунд`);
          
          // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: если рассылка создана менее минуты назад и время уже наступило
          // это подозрительно и может быть ошибка timezone - пропускаем такую рассылку
          if (timeSinceCreation < minCreationDelaySafe && timeDiff >= 0) {
            console.log(`⏸️ [Scheduler] Рассылка ${broadcast.id} создана ${(timeSinceCreation / 1000).toFixed(1)} сек назад, но время уже наступило - пропускаем (защита от мгновенной отправки)`);
            continue;
          }
          
          // Если время наступило (рассылка должна быть отправлена)
          // Расширяем окно проверки до 24 часов, чтобы рассылки, созданные позже запланированного времени, тоже отправлялись
          const maxDelay = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
          
          // Проверяем, что:
          // 1. Время наступило (timeDiff >= 0)
          // 2. Не прошло более 24 часов (timeDiff < maxDelay)
          // 3. Рассылка была создана хотя бы 60 секунд назад
          if (timeDiff >= 0 && timeDiff < maxDelay && timeSinceCreation >= minCreationDelaySafe) {
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
        } else if (timeSinceCreation < minCreationDelaySafe) {
          console.log(`⏸️ [Scheduler] Рассылка ${broadcast.id} только что создана (${(timeSinceCreation / 1000).toFixed(1)} сек назад, нужно минимум 60 сек), пропускаем до следующей проверки`);
        } else if (timeDiff < 0) {
          console.log(`⏳ [Scheduler] Рассылка ${broadcast.id} еще не наступила (осталось ${Math.abs(timeDiff / 60000).toFixed(1)} минут)`);
        } else {
          console.log(`⚠️ [Scheduler] Рассылка ${broadcast.id} пропущена (прошло ${Math.round(timeDiff / 60000)} минут, более 24 часов)`);
        }
        } catch (error) {
          console.error(`[Scheduler] Ошибка при обработке рассылки ${broadcast.id}:`, error);
          console.error(`  Stack:`, error.stack);
        }
      }
      
      console.log(`[Scheduler] Завершена обработка рассылок\n`);
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
  
  // Запускаем первую проверку сразу при старте (для отладки)
  setTimeout(async () => {
    console.log('\n🔍 [Scheduler] Первая проверка при старте бота...');
    try {
      const scheduledBroadcasts = await db.getScheduledBroadcasts();
      console.log(`🔍 [Scheduler] Найдено рассылок со статусом 'scheduled': ${scheduledBroadcasts.length}`);
      if (scheduledBroadcasts.length > 0) {
        scheduledBroadcasts.forEach(b => {
          console.log(`  - ID: ${b.id}, scheduled_at: ${b.scheduled_at}, status: ${b.status}`);
        });
      }
    } catch (error) {
      console.error('❌ Ошибка при первой проверке:', error);
    }
  }, 5000); // Через 5 секунд после запуска
  
  // Тестовая проверка каждые 10 секунд для отладки (временно)
  // Удалить после исправления проблемы
  let testCounter = 0;
  const testInterval = setInterval(async () => {
    testCounter++;
    console.log(`\n🧪 [Scheduler TEST] Тестовая проверка #${testCounter} в ${new Date().toISOString()}`);
    try {
      const scheduledBroadcasts = await db.getScheduledBroadcasts();
      console.log(`🧪 [Scheduler TEST] Найдено рассылок: ${scheduledBroadcasts.length}`);
      if (scheduledBroadcasts.length > 0) {
        const nowUTC = new Date();
        scheduledBroadcasts.forEach(b => {
          const scheduledAtUTC = new Date(b.scheduled_at);
          const timeDiff = nowUTC.getTime() - scheduledAtUTC.getTime();
          console.log(`🧪 [Scheduler TEST] Рассылка ${b.id}: scheduled_at=${b.scheduled_at}, diff=${(timeDiff / 60000).toFixed(1)} мин`);
        });
      }
    } catch (error) {
      console.error('🧪 [Scheduler TEST] Ошибка:', error);
    }
    
    // Останавливаем тест через 5 минут
    if (testCounter >= 30) {
      clearInterval(testInterval);
      console.log('🧪 [Scheduler TEST] Тестовая проверка остановлена');
    }
  }, 10000); // Каждые 10 секунд
}

export default initScheduler;


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
      
      // Получаем текущее время в московском часовом поясе
      // Используем Intl.DateTimeFormat для получения времени в Москве
      const nowMoscow = new Date();
      const moscowTimeString = nowMoscow.toLocaleString('en-US', { 
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Преобразуем строку времени в Date объект для сравнения
      // Формат: "MM/DD/YYYY, HH:mm:ss"
      const [datePart, timePart] = moscowTimeString.split(', ');
      const [month, day, year] = datePart.split('/');
      const [hours, minutes, seconds] = timePart.split(':');
      const nowMoscowDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}+03:00`);

      for (const broadcast of scheduledBroadcasts) {
        // scheduled_at хранится в БД с московским часовым поясом (+03:00)
        // Создаем Date объект из строки времени из БД
        const scheduledAt = new Date(broadcast.scheduled_at);
        
        // Логируем для отладки (только для первых 3 рассылок, чтобы не засорять логи)
        if (broadcast.id && scheduledBroadcasts.indexOf(broadcast) < 3) {
          console.log(`[Scheduler] Проверка рассылки ${broadcast.id}:`);
          console.log(`  scheduled_at (из БД): ${broadcast.scheduled_at}`);
          console.log(`  scheduled_at (Date): ${scheduledAt.toISOString()}`);
          console.log(`  now Moscow (Date): ${nowMoscowDate.toISOString()}`);
          console.log(`  Разница (мс): ${nowMoscowDate.getTime() - scheduledAt.getTime()}`);
        }
        
        // Если время наступило (рассылка должна быть отправлена)
        // Сравниваем с запасом в 1 минуту, чтобы учесть задержки
        const timeDiff = nowMoscowDate.getTime() - scheduledAt.getTime();
        if (timeDiff >= 0 && timeDiff < 60000) { // В пределах 1 минуты
          console.log(`⏰ [Scheduler] Отправка запланированной рассылки: ${broadcast.id}`);
          console.log(`  Запланировано на: ${scheduledAt.toISOString()}`);
          console.log(`  Текущее время (Moscow): ${nowMoscowDate.toISOString()}`);
          
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


import cron from 'node-cron';
import db from '../db.js';
import { processSubscriptionReminders } from './subscriptionReminder.js';
import { sendBroadcast } from './broadcastSender.js';

let botInstance = null;
let schedulerInitialized = false;

// Инициализация планировщика
export function initScheduler(bot) {
  if (!bot) {
    console.error('❌ [Scheduler] Bot instance не передан в initScheduler');
    throw new Error('Bot instance не передан в initScheduler');
  }
  
  if (schedulerInitialized) {
    console.warn('⚠️ [Scheduler] Планировщик уже инициализирован, пропускаем повторную инициализацию');
    return;
  }
  
  botInstance = bot;
  
  console.log('🕐 [Scheduler] ============================================');
  console.log('🕐 [Scheduler] Инициализация планировщика задач...');
  console.log('🕐 [Scheduler] ============================================');

  // Функция проверки и отправки запланированных рассылок
  const checkScheduledBroadcasts = async () => {
    const checkTime = new Date().toISOString();
    console.log(`\n⏰ [Scheduler] Проверка запланированных рассылок в ${checkTime}`);
    
    try {
      // Получаем все рассылки, время которых наступило
      const scheduledBroadcasts = await db.getScheduledBroadcasts();
      
      if (scheduledBroadcasts.length === 0) {
        console.log(`   ℹ️  Нет рассылок для отправки`);
        return;
      }
      
      console.log(`   📋 Найдено ${scheduledBroadcasts.length} рассылок для отправки`);
      
      for (const broadcast of scheduledBroadcasts) {
        const scheduledTime = broadcast.scheduled_at ? new Date(broadcast.scheduled_at).toISOString() : 'N/A';
        console.log(`\n   📤 [Scheduler] Обработка рассылки:`);
        console.log(`      ID: ${broadcast.id}`);
        console.log(`      Название: "${broadcast.title}"`);
        console.log(`      Запланировано на: ${scheduledTime}`);
        console.log(`      Текущее время: ${checkTime}`);
        
        try {
          // Создаем контекст для отправки
          const fakeCtx = {
            telegram: botInstance.telegram
          };
          
          const result = await sendBroadcast(fakeCtx, broadcast.id);
          
          if (result.success) {
            console.log(`      ✅ Рассылка ${broadcast.id} успешно отправлена: ${result.sent}/${result.total} пользователей`);
          } else {
            console.error(`      ❌ Ошибка рассылки ${broadcast.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`      ❌ Критическая ошибка рассылки ${broadcast.id}:`, error.message);
          console.error(`      Stack:`, error.stack);
          // Помечаем как отмененную при критической ошибке
          try {
            await db.updateBroadcastStatus(broadcast.id, 'cancelled');
          } catch (updateError) {
            console.error(`      ❌ Не удалось обновить статус рассылки:`, updateError.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ [Scheduler] Критическая ошибка в checkScheduledBroadcasts:', error.message);
      console.error('   Stack:', error.stack);
    }
  };
  
  // Проверка запланированных рассылок каждую минуту
  try {
    cron.schedule('* * * * *', () => {
      console.log('⏰ [Scheduler] Cron задача выполнена (каждую минуту)');
      checkScheduledBroadcasts().catch(err => {
        console.error('❌ [Scheduler] Необработанная ошибка в cron задаче:', err);
      });
    });
    console.log('✅ [Scheduler] Cron задача для рассылок настроена (каждую минуту)');
  } catch (error) {
    console.error('❌ [Scheduler] Ошибка настройки cron задачи:', error);
  }
  
  // Также проверяем каждые 30 секунд для более точного времени отправки
  try {
    setInterval(() => {
      console.log('⏰ [Scheduler] Interval задача выполнена (каждые 30 сек)');
      checkScheduledBroadcasts().catch(err => {
        console.error('❌ [Scheduler] Необработанная ошибка в interval задаче:', err);
      });
    }, 30 * 1000);
    console.log('✅ [Scheduler] Interval задача для рассылок настроена (каждые 30 сек)');
  } catch (error) {
    console.error('❌ [Scheduler] Ошибка настройки interval задачи:', error);
  }

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
  console.log('🕐 [Scheduler] ============================================\n');
  
  schedulerInitialized = true;
  
  // Первая проверка через 5 секунд после запуска
  setTimeout(() => {
    console.log('🔄 [Scheduler] Первая проверка запланированных рассылок...');
    checkScheduledBroadcasts().catch(err => {
      console.error('❌ [Scheduler] Ошибка при первой проверке:', err);
    });
  }, 5000);
}

export default initScheduler;


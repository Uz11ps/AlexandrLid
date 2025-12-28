import cron from 'node-cron';
import db from '../db.js';
import { processSubscriptionReminders } from './subscriptionReminder.js';
import { sendBroadcast } from './broadcastSender.js';

let botInstance = null;
let schedulerInitialized = false;
let schedulerInterval = null;
let schedulerCron = null;

// Инициализация планировщика
export function initScheduler(bot) {
  console.log('\n\n🔧 [Scheduler] ============================================');
  console.log('🔧 [Scheduler] НАЧАЛО ИНИЦИАЛИЗАЦИИ ПЛАНИРОВЩИКА');
  console.log('🔧 [Scheduler] ============================================');
  
  if (!bot) {
    console.error('❌ [Scheduler] Bot instance не передан в initScheduler');
    throw new Error('Bot instance не передан в initScheduler');
  }
  
  if (schedulerInitialized) {
    console.warn('⚠️ [Scheduler] Планировщик уже инициализирован, пропускаем повторную инициализацию');
    return;
  }
  
  botInstance = bot;
  console.log('✅ [Scheduler] Bot instance установлен');
  
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
  
  // Проверяем каждые 15 секунд для надежности и точности
  // Используем setInterval как основной механизм, так как он более надежен в Docker
  try {
    console.log('⏱️  [Scheduler] Настройка interval задачи (каждые 15 сек)...');
    schedulerInterval = setInterval(() => {
      const now = new Date().toISOString();
      console.log(`\n⏰ [Scheduler] === Interval проверка в ${now} ===`);
      checkScheduledBroadcasts().catch(err => {
        console.error('❌ [Scheduler] Необработанная ошибка в interval задаче:', err);
        console.error('   Stack:', err.stack);
      });
    }, 15 * 1000); // Каждые 15 секунд
    console.log('✅ [Scheduler] Interval задача для рассылок настроена (каждые 15 сек)');
  } catch (error) {
    console.error('❌ [Scheduler] КРИТИЧЕСКАЯ ОШИБКА настройки interval задачи:', error);
    console.error('   Stack:', error.stack);
    }
  
  // Дополнительно: проверка каждую минуту через cron (резервный механизм)
  try {
    console.log('⏱️  [Scheduler] Настройка cron задачи (каждую минуту)...');
    schedulerCron = cron.schedule('* * * * *', () => {
      const now = new Date().toISOString();
      console.log(`\n⏰ [Scheduler] === Cron проверка в ${now} ===`);
      checkScheduledBroadcasts().catch(err => {
        console.error('❌ [Scheduler] Необработанная ошибка в cron задаче:', err);
        console.error('   Stack:', err.stack);
      });
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    console.log('✅ [Scheduler] Cron задача для рассылок настроена (каждую минуту)');
  } catch (error) {
    console.error('❌ [Scheduler] Ошибка настройки cron задачи:', error);
    console.error('   Stack:', error.stack);
    // Не критично, у нас есть setInterval
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
  console.log('   - Рассылки: каждые 15 сек (interval) + каждую минуту (cron)');
  console.log('   - Розыгрыши: каждые 5 минут');
  console.log('   - Напоминания: каждые 6 часов');
  console.log('🕐 [Scheduler] ============================================');
  
  schedulerInitialized = true;
  console.log('✅ [Scheduler] Флаг инициализации установлен: schedulerInitialized = true');
  
  // Первая проверка через 3 секунды после запуска для немедленной диагностики
  setTimeout(() => {
    console.log('\n🔄 [Scheduler] ============================================');
    console.log('🔄 [Scheduler] ПЕРВАЯ ПРОВЕРКА ЗАПЛАНИРОВАННЫХ РАССЫЛОК');
    console.log('🔄 [Scheduler] ============================================');
    checkScheduledBroadcasts()
      .then(() => {
        console.log('✅ [Scheduler] Первая проверка завершена успешно');
      })
      .catch(err => {
        console.error('❌ [Scheduler] ОШИБКА при первой проверке:', err);
        console.error('   Stack:', err.stack);
      });
  }, 3000);
  
  console.log('✅ [Scheduler] ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО');
  console.log('🔧 [Scheduler] ============================================\n\n');
}

export default initScheduler;


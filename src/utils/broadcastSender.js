import db from '../db.js';

// Отправка рассылки
export async function sendBroadcast(ctx, broadcastId) {
  const startTime = new Date();
  console.log(`\n🚀 [BroadcastSender] Начало отправки рассылки ID: ${broadcastId}`);
  console.log(`  Время начала: ${startTime.toISOString()}`);
  
  try {
    const broadcast = await db.getBroadcast(broadcastId);
    
    if (!broadcast) {
      console.error(`❌ [BroadcastSender] Рассылка ${broadcastId} не найдена в БД`);
      return { success: false, error: 'Рассылка не найдена' };
    }

    console.log(`📋 [BroadcastSender] Информация о рассылке:`);
    console.log(`  ID: ${broadcast.id}`);
    console.log(`  Название: "${broadcast.title}"`);
    console.log(`  Сегмент: ${broadcast.segment || 'all'}`);
    console.log(`  Тип: ${broadcast.message_type || 'text'}`);
    console.log(`  Статус: ${broadcast.status}`);
    
    if (broadcast.scheduled_at) {
      const scheduledDate = new Date(broadcast.scheduled_at);
      const moscowTime = new Date(scheduledDate.getTime() + (3 * 60 * 60 * 1000));
      const moscowStr = moscowTime.toLocaleString('ru-RU', { 
        timeZone: 'UTC',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`  Запланировано на: ${broadcast.scheduled_at} (UTC) = ${moscowStr} (MSK)`);
    }

    // Получаем пользователей по сегменту
    console.log(`\n👥 [BroadcastSender] Получение списка пользователей для сегмента: ${broadcast.segment || 'all'}`);
    const userIds = await db.getUsersBySegment(broadcast.segment);
    console.log(`  Найдено пользователей: ${userIds.length}`);

    if (userIds.length === 0) {
      console.error(`❌ [BroadcastSender] Нет пользователей в сегменте "${broadcast.segment || 'all'}"`);
      return { success: false, error: 'Нет пользователей в выбранном сегменте' };
    }

    // Обновляем статус
    console.log(`\n📊 [BroadcastSender] Обновление статуса рассылки на 'sent'`);
    await db.updateBroadcastStatus(broadcast.id, 'sent', 0, 0);

    let successCount = 0;
    let errorCount = 0;

    const delay = 1000 / 20; // 20 сообщений в секунду
    let buttons = null;
    if (broadcast.buttons) {
      try {
        // Если buttons уже объект (JSONB), используем как есть
        if (typeof broadcast.buttons === 'object') {
          buttons = broadcast.buttons;
        } else if (typeof broadcast.buttons === 'string') {
          buttons = JSON.parse(broadcast.buttons);
        }
        console.log(`  Кнопок в сообщении: ${buttons?.length || 0} рядов`);
      } catch (error) {
        console.error('❌ [BroadcastSender] Ошибка при парсинге buttons:', error);
        buttons = null;
      }
    }

    const messageOptions = {
      parse_mode: 'HTML',
    };

    if (buttons) {
      messageOptions.reply_markup = {
        inline_keyboard: buttons
      };
    }

    console.log(`\n📤 [BroadcastSender] Начало отправки сообщений пользователям`);
    console.log(`  Тип сообщения: ${broadcast.message_type || 'text'}`);
    console.log(`  Задержка между сообщениями: ${delay}мс (${Math.round(1000/delay)} сообщений/сек)`);
    console.log(`  Всего пользователей: ${userIds.length}`);

    const sendStartTime = Date.now();
    let lastLogTime = sendStartTime;
    const logInterval = 5000; // Логируем прогресс каждые 5 секунд

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const currentTime = Date.now();
      
      // Логируем прогресс каждые 5 секунд или каждые 50 пользователей
      if (currentTime - lastLogTime >= logInterval || (i > 0 && i % 50 === 0)) {
        const elapsed = ((currentTime - sendStartTime) / 1000).toFixed(1);
        const rate = i > 0 ? (i / elapsed).toFixed(1) : 0;
        console.log(`  📊 Прогресс: ${i}/${userIds.length} (${successCount} успешно, ${errorCount} ошибок) | Скорость: ${rate} сообщ/сек | Прошло: ${elapsed}с`);
        lastLogTime = currentTime;
      }
      
      try {
        if (broadcast.message_type === 'photo' && broadcast.file_id) {
          await ctx.telegram.sendPhoto(userId, broadcast.file_id, {
            caption: broadcast.message_text,
            ...messageOptions
          });
        } else if (broadcast.message_type === 'video' && broadcast.file_id) {
          await ctx.telegram.sendVideo(userId, broadcast.file_id, {
            caption: broadcast.message_text,
            ...messageOptions
          });
        } else if (broadcast.message_type === 'document' && broadcast.file_id) {
          await ctx.telegram.sendDocument(userId, broadcast.file_id, {
            caption: broadcast.message_text,
            ...messageOptions
          });
        } else {
          await ctx.telegram.sendMessage(userId, broadcast.message_text, messageOptions);
        }

        successCount++;
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        errorCount++;
        // Логируем только первые 5 ошибок, чтобы не засорять логи
        if (errorCount <= 5) {
          console.error(`  ❌ Ошибка при отправке пользователю ${userId}:`, error.message);
        }
      }
    }

    const sendEndTime = Date.now();
    const totalTime = ((sendEndTime - sendStartTime) / 1000).toFixed(1);
    const avgRate = (successCount / (totalTime || 1)).toFixed(1);

    console.log(`\n✅ [BroadcastSender] Отправка завершена:`);
    console.log(`  Успешно отправлено: ${successCount}/${userIds.length}`);
    console.log(`  Ошибок: ${errorCount}`);
    console.log(`  Время отправки: ${totalTime} секунд`);
    console.log(`  Средняя скорость: ${avgRate} сообщений/секунду`);

    // Обновляем статистику
    console.log(`\n💾 [BroadcastSender] Обновление статистики в БД`);
    await db.updateBroadcastStatus(broadcast.id, 'sent', successCount, errorCount);
    
    const endTime = new Date();
    const totalDuration = ((endTime - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 [BroadcastSender] Рассылка ${broadcastId} полностью завершена за ${totalDuration} секунд`);
    console.log(`  Время начала: ${startTime.toISOString()}`);
    console.log(`  Время окончания: ${endTime.toISOString()}`);

    return {
      success: true,
      sent: successCount,
      errors: errorCount,
      total: userIds.length
    };
  } catch (error) {
    const endTime = new Date();
    console.error(`\n❌ [BroadcastSender] КРИТИЧЕСКАЯ ОШИБКА при отправке рассылки ${broadcastId}:`);
    console.error(`  Ошибка:`, error.message);
    console.error(`  Stack:`, error.stack);
    console.error(`  Время ошибки: ${endTime.toISOString()}`);
    return { success: false, error: error.message };
  }
}

export default sendBroadcast;




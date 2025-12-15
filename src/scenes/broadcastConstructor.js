import { Scenes } from 'telegraf';
import db from '../db.js';
import { parseMoscowDateTime, formatMoscowTime } from '../utils/timeUtils.js';

const broadcastConstructor = new Scenes.WizardScene(
  'broadcastConstructor',
  async (ctx) => {
    await ctx.reply(
      '📢 СОЗДАНИЕ РАССЫЛКИ\n\n' +
      'Шаг 1/6: Введите название рассылки:'
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('❌ Пожалуйста, отправьте текстовое сообщение с названием рассылки.');
    }
    ctx.wizard.state.title = ctx.message.text;
    await ctx.reply(
      'Шаг 2/6: Введите текст сообщения (поддерживается HTML):'
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('❌ Пожалуйста, отправьте текстовое сообщение с текстом рассылки.');
    }
    ctx.wizard.state.messageText = ctx.message.text;
    await ctx.reply(
      'Шаг 3/6: Хотите добавить медиа (фото/видео/документ)?\n\n' +
      'Отправьте файл или нажмите "Пропустить"',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏭ Пропустить', callback_data: 'skip_media' }]
          ]
        }
      }
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'skip_media') {
      ctx.wizard.state.fileId = null;
      ctx.wizard.state.messageType = 'text';
      await ctx.answerCbQuery();
    } else if (ctx.message && ctx.message.photo) {
      ctx.wizard.state.fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      ctx.wizard.state.messageType = 'photo';
    } else if (ctx.message && ctx.message.video) {
      ctx.wizard.state.fileId = ctx.message.video.file_id;
      ctx.wizard.state.messageType = 'video';
    } else if (ctx.message && ctx.message.document) {
      ctx.wizard.state.fileId = ctx.message.document.file_id;
      ctx.wizard.state.messageType = 'document';
    } else if (!ctx.callbackQuery) {
      await ctx.reply('❌ Неверный формат. Отправьте файл или нажмите "Пропустить"');
      return;
    }

    await ctx.reply(
      'Шаг 4/6: Хотите добавить кнопки?\n\n' +
      'Формат: текст кнопки | ссылка\n' +
      'Для нескольких кнопок разделите их новой строкой\n' +
      'Пример:\n' +
      'Перейти на сайт | https://example.com\n' +
      'Наш канал | https://t.me/channel\n\n' +
      'Или нажмите "Пропустить"',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏭ Пропустить', callback_data: 'skip_buttons' }]
          ]
        }
      }
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'skip_buttons') {
      ctx.wizard.state.buttons = null;
      await ctx.answerCbQuery();
    } else if (ctx.message && ctx.message.text) {
      const buttonsText = ctx.message.text;
      const buttons = [];
      const rows = buttonsText.split('\n').filter(row => row.trim());

      for (const row of rows) {
        const [text, url] = row.split('|').map(s => s.trim());
        if (text && url) {
          buttons.push([{ text, url }]);
        }
      }

      ctx.wizard.state.buttons = buttons.length > 0 ? buttons : null;
    } else if (!ctx.callbackQuery) {
      await ctx.reply('❌ Отправьте текст кнопок или нажмите "Пропустить"');
      return;
    }

    await ctx.reply(
      'Шаг 5/6: Выберите сегмент аудитории:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '👥 Все пользователи', callback_data: 'segment_all' }],
            [{ text: '📈 Активные за 7 дней', callback_data: 'segment_active_7' }],
            [{ text: '📈 Активные за 30 дней', callback_data: 'segment_active_30' }],
            [{ text: '👥 С рефералами', callback_data: 'segment_with_referrals' }],
            [{ text: '🏆 Топ-10 рефералов', callback_data: 'segment_top_referrers' }],
            [{ text: '🆕 Новые (7 дней)', callback_data: 'segment_new_7' }]
          ]
        }
      }
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery) {
      await ctx.reply('❌ Выберите сегмент из предложенных вариантов');
      return;
    }

    const segment = ctx.callbackQuery.data.replace('segment_', '');
    ctx.wizard.state.segment = segment;
    await ctx.answerCbQuery();

    await ctx.reply(
      'Шаг 6/6: Когда отправить рассылку?\n\n' +
      'Введите дату и время в формате: ДД.ММ.ГГГГ ЧЧ:ММ\n' +
      'Или нажмите "Отправить сейчас"',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📤 Отправить сейчас', callback_data: 'send_now' }],
            [{ text: '❌ Отмена', callback_data: 'cancel' }]
          ]
        }
      }
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    let scheduledAt = null;

    if (ctx.callbackQuery) {
      if (ctx.callbackQuery.data === 'cancel') {
        await ctx.answerCbQuery();
        await ctx.reply('❌ Создание рассылки отменено');
        return ctx.scene.leave();
      }
      if (ctx.callbackQuery.data === 'send_now') {
        await ctx.answerCbQuery();
        scheduledAt = null;
      }
    } else {
      // Парсинг даты и времени в московском формате
      const dateTimeStr = ctx.message.text;
      console.log(`\n📅 [BroadcastConstructor] Парсинг времени: "${dateTimeStr}"`);
      
      scheduledAt = parseMoscowDateTime(dateTimeStr);
      
      if (!scheduledAt || isNaN(scheduledAt.getTime())) {
        console.error(`❌ [BroadcastConstructor] Неверный формат времени: "${dateTimeStr}"`);
        await ctx.reply('❌ Неверный формат даты. Используйте: ДД.ММ.ГГГГ ЧЧ:ММ (московское время)');
        return;
      }

      const nowUTC = new Date();
      const moscowTime = new Date(scheduledAt.getTime() + (3 * 60 * 60 * 1000));
      const moscowStr = moscowTime.toLocaleString('ru-RU', { 
        timeZone: 'UTC',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      console.log(`  Входное время (MSK): ${dateTimeStr}`);
      console.log(`  Распарсенное UTC: ${scheduledAt.toISOString()}`);
      console.log(`  Для отображения MSK: ${moscowStr}`);
      console.log(`  Текущее UTC: ${nowUTC.toISOString()}`);
      console.log(`  Разница: ${((scheduledAt.getTime() - nowUTC.getTime()) / 60000).toFixed(1)} минут`);

      // Проверяем, что время в будущем (в UTC)
      if (scheduledAt <= nowUTC) {
        const diffMinutes = (nowUTC.getTime() - scheduledAt.getTime()) / 60000;
        console.error(`❌ [BroadcastConstructor] Время в прошлом! Разница: ${diffMinutes.toFixed(1)} минут`);
        await ctx.reply(`❌ Указанная дата в прошлом (прошло ${Math.round(diffMinutes)} минут). Выберите будущую дату.`);
        return;
      }
      
      console.log(`✅ [BroadcastConstructor] Время валидно, рассылка будет запланирована`);
    }

    // Сохранение рассылки
    const broadcast = await db.createBroadcast({
      title: ctx.wizard.state.title,
      message_text: ctx.wizard.state.messageText,
      message_type: ctx.wizard.state.messageType || 'text',
      file_id: ctx.wizard.state.fileId || null,
      buttons: ctx.wizard.state.buttons,
      segment: ctx.wizard.state.segment,
      scheduled_at: scheduledAt,
      created_by: ctx.from.id,
    });

    // Предпросмотр отправляем ТОЛЬКО если рассылка не запланирована (немедленная отправка)
    // Для запланированных рассылок предпросмотр не нужен, чтобы не путать пользователя
    if (!scheduledAt) {
      const previewOptions = {
        parse_mode: 'HTML',
      };

      if (ctx.wizard.state.buttons) {
        previewOptions.reply_markup = {
          inline_keyboard: ctx.wizard.state.buttons
        };
      }

      console.log(`📋 [BroadcastConstructor] Отправка предпросмотра (рассылка будет отправлена немедленно)`);
      
      if (ctx.wizard.state.fileId) {
        if (ctx.wizard.state.messageType === 'photo') {
          await ctx.replyWithPhoto(ctx.wizard.state.fileId, {
            caption: ctx.wizard.state.messageText,
            ...previewOptions
          });
        } else if (ctx.wizard.state.messageType === 'video') {
          await ctx.replyWithVideo(ctx.wizard.state.fileId, {
            caption: ctx.wizard.state.messageText,
            ...previewOptions
          });
        } else {
          await ctx.replyWithDocument(ctx.wizard.state.fileId, {
            caption: ctx.wizard.state.messageText,
            ...previewOptions
          });
        }
      } else {
        await ctx.reply(ctx.wizard.state.messageText, previewOptions);
      }
    } else {
      console.log(`📋 [BroadcastConstructor] Предпросмотр не отправляется (рассылка запланирована)`);
    }

    const moscowTimeStr = scheduledAt ? formatMoscowTime(scheduledAt) : null;
    
    console.log(`\n📢 [BroadcastConstructor] Рассылка создана:`);
    console.log(`  ID: ${broadcast.id}`);
    console.log(`  Название: "${ctx.wizard.state.title}"`);
    console.log(`  Сегмент: ${ctx.wizard.state.segment}`);
    console.log(`  scheduled_at в БД: ${broadcast.scheduled_at || 'null'}`);
    console.log(`  Статус в БД: ${broadcast.status || 'не установлен'}`);
    
    if (scheduledAt) {
      const moscowTime = new Date(scheduledAt.getTime() + (3 * 60 * 60 * 1000));
      const moscowStr = moscowTime.toLocaleString('ru-RU', { 
        timeZone: 'UTC',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`  Запланировано на (MSK): ${moscowStr}`);
      console.log(`  Запланировано на (UTC): ${scheduledAt.toISOString()}`);
    } else {
      console.log(`  Отправка: немедленная`);
    }

    await ctx.reply(
      `✅ Рассылка "${ctx.wizard.state.title}" создана!\n\n` +
      `Сегмент: ${ctx.wizard.state.segment}\n` +
      `${scheduledAt ? `Запланирована на: ${moscowTimeStr} (московское время)` : 'Будет отправлена сейчас'}\n\n` +
      `${scheduledAt ? '⏰ Рассылка будет отправлена автоматически в запланированное время' : 'Для отправки используйте /broadcast_send ' + broadcast.id}`
    );

    if (!scheduledAt) {
      // Обновляем статус для немедленной отправки
      console.log(`  Установка статуса: draft (немедленная отправка)`);
      await db.updateBroadcastStatus(broadcast.id, 'draft');
    } else {
      console.log(`  Установка статуса: scheduled (запланированная отправка)`);
      await db.updateBroadcastStatus(broadcast.id, 'scheduled');
      console.log(`✅ [BroadcastConstructor] Рассылка ${broadcast.id} запланирована, будет отправлена автоматически`);
    }

    return ctx.scene.leave();
  }
);

export default broadcastConstructor;


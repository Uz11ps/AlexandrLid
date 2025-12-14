import db from '../../db.js';

// Список автоворонок
export async function handleAutofunnelsList(ctx) {
  try {
    const autofunnels = await db.getAllAutofunnels();

    const backMenu = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '◀️ Назад', callback_data: 'admin_main' }]
        ]
      }
    };

    if (autofunnels.length === 0) {
      const emptyMessage = '🔄 АВТОВОРОНКИ\n\nАвтоворонки не настроены.';
      const emptyMenu = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Создать автоворонку', callback_data: 'autofunnel_create_menu' }],
            [{ text: '◀️ Назад', callback_data: 'admin_main' }]
          ]
        }
      };
      
      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(emptyMessage, emptyMenu);
        } catch (error) {
          await ctx.reply(emptyMessage, emptyMenu);
        }
        await ctx.answerCbQuery();
      } else {
        await ctx.reply(emptyMessage, emptyMenu);
      }
      return;
    }

    let message = '🔄 АВТОВОРОНКИ\n\n';

    autofunnels.forEach((funnel, index) => {
      const status = funnel.is_active ? '✅ Активна' : '❌ Неактивна';
      const triggerNames = {
        'registration': 'Регистрация',
        'no_subscription': 'Нет подписки',
        'inactive': 'Неактивность',
        'new_referral': 'Новый реферал'
      };
      
      message += `${index + 1}. ${funnel.name}\n`;
      message += `   Триггер: ${triggerNames[funnel.trigger_event] || funnel.trigger_event}\n`;
      message += `   Задержка: ${funnel.delay_hours}ч\n`;
      message += `   Статус: ${status}\n\n`;
    });

    // Добавляем кнопки действий
    const actionButtons = [];
    
    // Кнопки для каждой автоворонки
    autofunnels.slice(0, 5).forEach((funnel) => {
      const toggleText = funnel.is_active ? '❌ Выключить' : '✅ Включить';
      actionButtons.push([
        { 
          text: `${toggleText}: ${funnel.name}`, 
          callback_data: `autofunnel_toggle_${funnel.id}` 
        }
      ]);
    });
    
    actionButtons.push([
      { text: '➕ Создать автоворонку', callback_data: 'autofunnel_create_menu' }
    ]);
    actionButtons.push([
      { text: '◀️ Назад', callback_data: 'admin_main' }
    ]);

    const menuWithActions = {
      reply_markup: {
        inline_keyboard: actionButtons
      }
    };

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, menuWithActions);
      } catch (error) {
        await ctx.reply(message, menuWithActions);
      }
      await ctx.answerCbQuery();
    } else {
      await ctx.reply(message, menuWithActions);
    }
  } catch (error) {
    console.error('Ошибка при получении списка автоворонок:', error);
    await ctx.reply('❌ Ошибка при получении списка автоворонок.');
  }
}

// Создание автоворонки (упрощенная версия)
export async function handleAutofunnelCreate(ctx) {
  await ctx.reply(
    '🔄 СОЗДАНИЕ АВТОВОРОНКИ\n\n' +
    'Используйте команду:\n' +
    '/autofunnel_new <название> | <триггер> | <задержка_часов> | <текст>\n\n' +
    'Триггеры:\n' +
    '• registration - при регистрации\n' +
    '• new_referral - при новом реферале\n' +
    '• no_subscription - если нет подписки\n' +
    '• inactive - при неактивности\n\n' +
    'Пример:\n' +
    '/autofunnel_new Приветствие | registration | 0 | Добро пожаловать!'
  );
}

// Создание новой автоворонки
export async function handleAutofunnelNew(ctx) {
  try {
    // Проверяем наличие ctx и методов
    if (!ctx || typeof ctx.reply !== 'function') {
      console.error('Invalid ctx in handleAutofunnelNew:', ctx);
      if (ctx && ctx.telegram && ctx.from) {
        // Если есть telegram и from, можем отправить сообщение напрямую
        await ctx.telegram.sendMessage(ctx.from.id, '❌ Ошибка: неверный контекст');
      }
      return;
    }

    let args = '';
    if (ctx.message && ctx.message.text) {
      args = ctx.message.text.replace('/autofunnel_new', '').trim();
    }
    
    if (!args) {
      return ctx.reply(
        '❌ Неверный формат. Используйте:\n' +
        '/autofunnel_new <название> | <триггер> | <задержка_часов> | <текст>\n\n' +
        'Или отправьте текст в формате:\n' +
        '<название> | <триггер> | <задержка_часов> | <текст>'
      );
    }

    const parts = args.split('|').map(s => s.trim());

    if (parts.length < 4) {
      return ctx.reply(
        '❌ Неверный формат. Используйте:\n' +
        '<название> | <триггер> | <задержка_часов> | <текст>\n\n' +
        'Пример:\n' +
        'Приветствие | registration | 0 | Добро пожаловать!'
      );
    }

    const [name, triggerEvent, delayHoursStr, messageText] = parts;

    if (!name || !triggerEvent || !messageText) {
      return ctx.reply(
        '❌ Название, триггер и текст не могут быть пустыми.\n\n' +
        'Используйте формат:\n' +
        '<название> | <триггер> | <задержка_часов> | <текст>'
      );
    }

    const delayHours = parseInt(delayHoursStr) || 0;

    const validTriggers = ['registration', 'no_subscription', 'inactive', 'new_referral'];
    if (!validTriggers.includes(triggerEvent)) {
      return ctx.reply(
        `❌ Неверный триггер. Используйте один из: ${validTriggers.join(', ')}`
      );
    }

    console.log('Creating autofunnel:', { name, trigger_event: triggerEvent, delay_hours: delayHours, message_text: messageText, message_type: 'text' });

    const autofunnel = await db.createAutofunnel({
      name,
      trigger_event: triggerEvent,
      delay_hours: delayHours,
      message_text: messageText,
      message_type: 'text',
    });

    console.log('Autofunnel created:', autofunnel);

    if (!autofunnel || !autofunnel.id) {
      throw new Error('Автоворонка не была создана');
    }

    await ctx.reply(
      `✅ Автоворонка "${name}" создана и активирована!\n\n` +
      `ID: ${autofunnel.id}\n` +
      `Триггер: ${triggerEvent}\n` +
      `Задержка: ${delayHours} часов`
    );
  } catch (error) {
    console.error('Ошибка при создании автоворонки:', error);
    console.error('Error details:', error.message, error.stack);
    await ctx.reply(`❌ Ошибка при создании автоворонки: ${error.message || 'Неизвестная ошибка'}`);
  }
}

// Включение/выключение автоворонки
export async function handleAutofunnelToggle(ctx, autofunnelId = null) {
  try {
    // Если autofunnelId передан напрямую (из callback), используем его
    // Иначе извлекаем из команды (для обратной совместимости)
    if (!autofunnelId) {
      if (ctx.callbackQuery && ctx.callbackQuery.data) {
        const match = ctx.callbackQuery.data.match(/autofunnel_toggle_(\d+)/);
        autofunnelId = match ? parseInt(match[1]) : null;
      } else if (ctx.message && ctx.message.text) {
        const args = ctx.message.text.split(' ').slice(1);
        autofunnelId = parseInt(args[0]);
      }
    }

    if (!autofunnelId || isNaN(autofunnelId)) {
      return ctx.reply(
        '❌ Использование: /autofunnel_toggle <ID автоворонки>\n\n' +
        'Пример: /autofunnel_toggle 1'
      );
    }

    const autofunnel = await db.getAutofunnel(autofunnelId);
    if (!autofunnel) {
      const errorMsg = '❌ Автоворонка не найдена.';
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(errorMsg);
      } else {
        await ctx.reply(errorMsg);
      }
      return;
    }

    const newStatus = !autofunnel.is_active;
    await db.updateAutofunnelStatus(autofunnelId, newStatus);

    const successMessage = `✅ Автоворонка "${autofunnel.name}" ${newStatus ? 'включена' : 'выключена'}.`;
    
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery(successMessage);
    } else {
      await ctx.reply(successMessage);
    }
  } catch (error) {
    console.error('Ошибка при переключении автоворонки:', error);
    const errorMsg = '❌ Ошибка при переключении автоворонки.';
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery(errorMsg);
    } else {
      await ctx.reply(errorMsg);
    }
  }
}

export default {
  handleAutofunnelsList,
  handleAutofunnelCreate,
  handleAutofunnelNew,
  handleAutofunnelToggle,
};


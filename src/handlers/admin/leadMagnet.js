import db from '../../db.js';

// Показать список лид-магнитов
export async function handleLeadMagnetsList(ctx) {
  try {
    const leadMagnets = await db.getAllLeadMagnets();
    const activeLeadMagnet = await db.getActiveLeadMagnet();

    const backMenu = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '◀️ Назад', callback_data: 'admin_main' }]
        ]
      }
    };

    if (leadMagnets.length === 0) {
      const emptyMessage = '📎 ЛИД-МАГНИТЫ\n\nЛид-магниты не настроены.';
      const emptyMenu = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Создать лид-магнит', callback_data: 'leadmagnet_create_menu' }],
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

    let message = '📎 ЛИД-МАГНИТЫ\n\n';
    
    leadMagnets.forEach((lm, index) => {
      const status = lm.id === activeLeadMagnet?.id ? '✅ Активен' : '❌ Неактивен';
      message += `${index + 1}. ${lm.title} (${lm.type}) - ${status}\n`;
    });

    // Добавляем кнопки действий
    const actionButtons = [];
    
    // Кнопки для каждого лид-магнита
    leadMagnets.slice(0, 5).forEach((lm) => {
      const activateText = lm.id === activeLeadMagnet?.id ? '❌ Деактивировать' : '✅ Активировать';
      actionButtons.push([
        { 
          text: `${activateText}: ${lm.title}`, 
          callback_data: `leadmagnet_activate_${lm.id}` 
        }
      ]);
    });
    
    actionButtons.push([
      { text: '➕ Создать лид-магнит', callback_data: 'leadmagnet_create_menu' }
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
    console.error('Ошибка при получении списка лид-магнитов:', error);
    await ctx.reply('❌ Ошибка при получении списка лид-магнитов.');
  }
}

// Создание нового лид-магнита (упрощенная версия через команды)
export async function handleLeadMagnetCreate(ctx) {
  await ctx.reply(
    '📎 СОЗДАНИЕ ЛИД-МАГНИТА\n\n' +
    'Для создания лид-магнита используйте команды:\n\n' +
    '1. Текстовый лид-магнит:\n' +
    '/leadmagnet_text <название> | <текст>\n\n' +
    '2. Ссылка:\n' +
    '/leadmagnet_link <название> | <текст> | <ссылка>\n\n' +
    '3. Файл (отправьте файл с подписью):\n' +
    '/leadmagnet_file <название> | <описание>\n' +
    'Затем отправьте файл как ответ на это сообщение.\n\n' +
    'Пример:\n' +
    '/leadmagnet_text Полезный гайд | Привет! Вот полезная информация...'
  );
}

// Обработка текстового лид-магнита
export async function handleLeadMagnetText(ctx) {
  try {
    let args = '';
    if (ctx.message && ctx.message.text) {
      args = ctx.message.text.replace('/leadmagnet_text', '').trim();
    }
    
    if (!args) {
      return ctx.reply(
        '❌ Неверный формат. Используйте:\n' +
        '/leadmagnet_text <название> | <текст>\n\n' +
        'Или отправьте текст в формате:\n' +
        '<название> | <текст>'
      );
    }

    const parts = args.split('|').map(s => s.trim());

    if (parts.length < 2) {
      return ctx.reply(
        '❌ Неверный формат. Используйте:\n' +
        '<название> | <текст>\n\n' +
        'Пример:\n' +
        'Полезная информация | Текст лид-магнита'
      );
    }

    const [title, textContent] = parts;

    if (!title || !textContent) {
      return ctx.reply(
        '❌ Название и текст не могут быть пустыми.\n\n' +
        'Используйте формат:\n' +
        '<название> | <текст>'
      );
    }

    console.log('Creating lead magnet:', { title, type: 'text', text_content: textContent });

    const leadMagnet = await db.createLeadMagnet({
      title,
      type: 'text',
      text_content: textContent,
    });

    console.log('Lead magnet created:', leadMagnet);

    // Активируем созданный лид-магнит
    if (leadMagnet && leadMagnet.id) {
      const allLeadMagnets = await db.getAllLeadMagnets();
      for (const lm of allLeadMagnets) {
        await db.updateLeadMagnet(lm.id, { is_active: lm.id === leadMagnet.id });
      }
    }

    await ctx.reply(`✅ Текстовый лид-магнит "${title}" создан и активирован!`);
  } catch (error) {
    console.error('Ошибка при создании текстового лид-магнита:', error);
    console.error('Error details:', error.message, error.stack);
    await ctx.reply(`❌ Ошибка при создании лид-магнита: ${error.message || 'Неизвестная ошибка'}`);
  }
}

// Обработка лид-магнита со ссылкой
export async function handleLeadMagnetLink(ctx) {
  try {
    const args = ctx.message.text.replace('/leadmagnet_link', '').trim();
    const parts = args.split('|').map(s => s.trim());

    if (parts.length < 3) {
      return ctx.reply(
        '❌ Неверный формат. Используйте:\n' +
        '/leadmagnet_link <название> | <текст> | <ссылка>'
      );
    }

    const [title, textContent, linkUrl] = parts;

    await db.createLeadMagnet({
      title,
      type: 'link',
      text_content: textContent,
      link_url: linkUrl,
    });

    await ctx.reply(`✅ Лид-магнит со ссылкой "${title}" создан и активирован!`);
  } catch (error) {
    console.error('Ошибка при создании лид-магнита со ссылкой:', error);
    await ctx.reply('❌ Ошибка при создании лид-магнита.');
  }
}

// Обработка файла для лид-магнита
export async function handleLeadMagnetFile(ctx) {
  try {
    if (!ctx.message.reply_to_message) {
      return ctx.reply(
        '❌ Отправьте файл как ответ на сообщение с командой /leadmagnet_file.\n\n' +
        'Пример:\n' +
        '1. Отправьте: /leadmagnet_file Название | Описание\n' +
        '2. Ответьте на это сообщение файлом'
      );
    }

    const args = ctx.message.reply_to_message.text.replace('/leadmagnet_file', '').trim();
    const parts = args.split('|').map(s => s.trim());
    const [title, textContent] = parts;

    const file = ctx.message.document || ctx.message.photo?.[0] || ctx.message.video;
    
    if (!file) {
      return ctx.reply('❌ Файл не найден. Отправьте документ, фото или видео.');
    }

    const fileId = file.file_id;
    let fileType = 'document';
    
    if (ctx.message.photo) fileType = 'photo';
    else if (ctx.message.video) fileType = 'video';
    else if (ctx.message.document) fileType = 'document';

    await db.createLeadMagnet({
      title: title || 'Файл',
      type: 'file',
      text_content: textContent || null,
      file_id: fileId,
      file_type: fileType,
    });

    await ctx.reply(`✅ Лид-магнит с файлом "${title || 'Файл'}" создан и активирован!`);
  } catch (error) {
    console.error('Ошибка при создании лид-магнита с файлом:', error);
    await ctx.reply('❌ Ошибка при создании лид-магнита.');
  }
}

export default {
  handleLeadMagnetsList,
  handleLeadMagnetCreate,
  handleLeadMagnetText,
  handleLeadMagnetLink,
  handleLeadMagnetFile,
};


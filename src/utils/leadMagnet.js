import db from '../db.js';

// Отправка лид-магнита пользователю
export async function sendLeadMagnet(ctx) {
  try {
    const leadMagnet = await db.getActiveLeadMagnet();
    
    if (!leadMagnet) {
      return; // Нет активного лид-магнита
    }

    // Отправка в зависимости от типа
    switch (leadMagnet.type) {
      case 'text':
        if (leadMagnet.text_content) {
          await ctx.reply(leadMagnet.text_content, { parse_mode: 'HTML' });
        }
        break;

      case 'link':
        if (leadMagnet.link_url) {
          const message = leadMagnet.text_content || '🔗 Полезная ссылка для вас:';
          await ctx.reply(message, {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Перейти по ссылке', url: leadMagnet.link_url }]
              ]
            }
          });
        }
        break;

      case 'file':
        if (leadMagnet.file_id) {
          const caption = leadMagnet.text_content || '📎 Файл для вас:';
          
          // Определяем тип файла и отправляем соответствующим методом
          if (leadMagnet.file_type === 'photo') {
            await ctx.replyWithPhoto(leadMagnet.file_id, { caption });
          } else if (leadMagnet.file_type === 'video') {
            await ctx.replyWithVideo(leadMagnet.file_id, { caption });
          } else if (leadMagnet.file_type === 'document') {
            await ctx.replyWithDocument(leadMagnet.file_id, { caption });
          } else {
            await ctx.replyWithDocument(leadMagnet.file_id, { caption });
          }
        }
        break;

      case 'combined':
        // Сначала текст/ссылка, потом файл
        if (leadMagnet.text_content) {
          if (leadMagnet.link_url) {
            await ctx.reply(leadMagnet.text_content, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Перейти по ссылке', url: leadMagnet.link_url }]
                ]
              },
              parse_mode: 'HTML'
            });
          } else {
            await ctx.reply(leadMagnet.text_content, { parse_mode: 'HTML' });
          }
        }
        
        if (leadMagnet.file_id) {
          const caption = '📎 Дополнительный файл:';
          if (leadMagnet.file_type === 'photo') {
            await ctx.replyWithPhoto(leadMagnet.file_id, { caption });
          } else if (leadMagnet.file_type === 'video') {
            await ctx.replyWithVideo(leadMagnet.file_id, { caption });
          } else {
            await ctx.replyWithDocument(leadMagnet.file_id, { caption });
          }
        }
        break;
    }
  } catch (error) {
    console.error('Ошибка при отправке лид-магнита:', error);
    // Не прерываем выполнение, если лид-магнит не отправился
  }
}

export default sendLeadMagnet;






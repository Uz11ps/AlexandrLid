import db from '../../db.js';
import { getLeadConversationHistoryByUserId } from '../../utils/leadMessages.js';

// Просмотр истории переписки с лидом через бота (для менеджеров)
export async function handleLeadHistory(ctx, userId = null) {
  try {
    const adminIds = (process.env.ADMIN_IDS || '')
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));

    const currentUserId = ctx.from?.id;
    
    if (!adminIds.includes(currentUserId)) {
      return ctx.reply('❌ У вас нет прав для просмотра истории переписки.');
    }

    // Если userId не передан, просим ввести
    if (!userId) {
      await ctx.reply(
        '📋 ПРОСМОТР ИСТОРИИ ПЕРЕПИСКИ С ЛИДОМ\n\n' +
        'Отправьте user_id пользователя для просмотра истории переписки.\n\n' +
        'Пример: /lead_history 123456789'
      );
      if (!ctx.session) ctx.session = {};
      ctx.session.waitingForLeadHistoryUserId = true;
      return;
    }

    // Получаем информацию о лиде
    const lead = await db.getLeadByUserId(userId);
    
    if (!lead) {
      return ctx.reply(`❌ Лид с user_id ${userId} не найден.`);
    }

    // Получаем историю переписки
    const history = await getLeadConversationHistoryByUserId(userId, 50);

    if (history.length === 0) {
      return ctx.reply(
        `📋 ИСТОРИЯ ПЕРЕПИСКИ С ЛИДОМ\n\n` +
        `Лид: ${lead.fio || 'Не указано'}\n` +
        `Telegram: @${lead.telegram_username || 'не указан'}\n\n` +
        `История переписки пуста.`
      );
    }

    // Формируем сообщение с историей
    let message = `📋 ИСТОРИЯ ПЕРЕПИСКИ С ЛИДОМ\n\n`;
    message += `Лид: ${lead.fio || 'Не указано'}\n`;
    message += `Telegram: @${lead.telegram_username || 'не указан'}\n`;
    message += `Всего сообщений: ${history.length}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Показываем последние 10 сообщений (из-за ограничений Telegram)
    const recentHistory = history.slice(-10);
    
    for (const interaction of recentHistory) {
      const interactionData = typeof interaction.interaction_data === 'string' 
        ? JSON.parse(interaction.interaction_data) 
        : interaction.interaction_data;
      
      const date = new Date(interaction.created_at).toLocaleString('ru-RU');
      const sender = interaction.manager_name ? `👤 ${interaction.manager_name}` : '👤 Пользователь';
      const messageText = interactionData?.message_text || interaction.notes || 'Сообщение';
      
      message += `${sender}\n`;
      message += `${date}\n`;
      message += `${messageText.substring(0, 200)}${messageText.length > 200 ? '...' : ''}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    if (history.length > 10) {
      message += `\n... и еще ${history.length - 10} сообщений.\n`;
      message += `Полную историю можно посмотреть в CRM.`;
    }

    await ctx.reply(message);
  } catch (error) {
    console.error('Ошибка при получении истории переписки:', error);
    await ctx.reply('❌ Ошибка при получении истории переписки.');
  }
}

export default {
  handleLeadHistory
};


import { Telegraf, session, Scenes } from 'telegraf';
import dotenv from 'dotenv';
import db from './db.js';
import handleStart from './handlers/onboarding.js';
import handleProfile from './handlers/profile.js';
import adminHandlers from './handlers/admin.js';
import isAdmin from './middlewares/auth.js';
import { rateLimit } from './middlewares/rateLimit.js';
import { checkBlacklist } from './middlewares/blacklist.js';
import broadcastConstructor from './scenes/broadcastConstructor.js';
import initScheduler from './utils/scheduler.js';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не установлен в переменных окружения!');
  process.exit(1);
}

// Инициализация бота
const bot = new Telegraf(BOT_TOKEN);

// Создание stage для сцен
const stage = new Scenes.Stage([broadcastConstructor]);

// Middleware для сессий и сцен (должно быть ПЕРВЫМ!)
bot.use(session());
bot.use(stage.middleware());

// Глобальный rate limiting (20 запросов в час)
bot.use(rateLimit(20, 3600000));

// Проверка черного списка
bot.use(checkBlacklist);

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error('Ошибка в боте:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});

// Команда /start
bot.command('start', handleStart);
bot.start(handleStart); // Также регистрируем через bot.start для совместимости

// Команды для тикетов
bot.command('ticket', async (ctx) => {
  const ticketHandlers = (await import('./handlers/tickets.js')).default;
  await ticketHandlers.handleTicketCommand(ctx);
});

bot.command('ticket_new', async (ctx) => {
  const ticketHandlers = (await import('./handlers/tickets.js')).default;
  await ticketHandlers.handleTicketNew(ctx);
});

// Админ-команды
bot.command('admin', isAdmin, adminHandlers.handleAdmin);
bot.command('stats', isAdmin, adminHandlers.handleStats);
bot.command('export', isAdmin, adminHandlers.handleExport);
bot.command('broadcast', isAdmin, adminHandlers.handleBroadcast);
bot.command('confirm_broadcast', isAdmin, adminHandlers.handleConfirmBroadcast);

// Команды управления лид-магнитами (только для админов)
bot.command('leadmagnet_list', isAdmin, async (ctx) => {
  const leadMagnetHandlers = (await import('./handlers/admin/leadMagnet.js')).default;
  await leadMagnetHandlers.handleLeadMagnetsList(ctx);
});

bot.command('leadmagnet_create', isAdmin, async (ctx) => {
  const leadMagnetHandlers = (await import('./handlers/admin/leadMagnet.js')).default;
  await leadMagnetHandlers.handleLeadMagnetCreate(ctx);
});

bot.command('leadmagnet_text', isAdmin, async (ctx) => {
  const leadMagnetHandlers = (await import('./handlers/admin/leadMagnet.js')).default;
  await leadMagnetHandlers.handleLeadMagnetText(ctx);
});

bot.command('leadmagnet_link', isAdmin, async (ctx) => {
  const leadMagnetHandlers = (await import('./handlers/admin/leadMagnet.js')).default;
  await leadMagnetHandlers.handleLeadMagnetLink(ctx);
});

bot.command('leadmagnet_file', isAdmin, async (ctx) => {
  const leadMagnetHandlers = (await import('./handlers/admin/leadMagnet.js')).default;
  await leadMagnetHandlers.handleLeadMagnetFile(ctx);
});

// Команды управления пользователями
bot.command('user_search', isAdmin, async (ctx) => {
  const userHandlers = (await import('./handlers/admin/users.js')).default;
  await userHandlers.handleUserSearch(ctx);
});

bot.command('user_ban', isAdmin, async (ctx) => {
  const userHandlers = (await import('./handlers/admin/users.js')).default;
  await userHandlers.handleUserBan(ctx);
});

bot.command('user_unban', isAdmin, async (ctx) => {
  const userHandlers = (await import('./handlers/admin/users.js')).default;
  await userHandlers.handleUserUnban(ctx);
});

// Команда для настройки канала
bot.command('set_channel', isAdmin, async (ctx) => {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    const channelInput = args[0];

    if (!channelInput) {
      return ctx.reply(
        '❌ Использование: /set_channel <@username или ID канала>\n\n' +
        'Пример:\n' +
        '/set_channel @my_channel\n' +
        '/set_channel -1001234567890'
      );
    }

    let channelId = channelInput;
    let channelUsername = null;

    // Если это username (начинается с @)
    if (channelInput.startsWith('@')) {
      channelUsername = channelInput.substring(1);
      try {
        const chat = await ctx.telegram.getChat(channelInput);
        channelId = chat.id.toString();
      } catch (error) {
        return ctx.reply('❌ Не удалось найти канал. Убедитесь, что бот добавлен в канал как администратор.');
      }
    }

    await db.setSetting('channel_id', channelId);
    if (channelUsername) {
      await db.setSetting('channel_username', channelUsername);
    }

    await ctx.reply(
      `✅ Канал настроен!\n\n` +
      `ID: ${channelId}\n` +
      `${channelUsername ? `Username: @${channelUsername}` : ''}`
    );
  } catch (error) {
    console.error('Ошибка при настройке канала:', error);
    await ctx.reply('❌ Ошибка при настройке канала.');
  }
});

// Команды для рассылок
bot.command('broadcast_new', isAdmin, async (ctx) => {
  await ctx.scene.enter('broadcastConstructor');
});

bot.command('broadcast_list', isAdmin, async (ctx) => {
  const broadcastHandlers = (await import('./handlers/admin/broadcasts.js')).default;
  await broadcastHandlers.handleBroadcastList(ctx);
});

bot.command('broadcast_send', isAdmin, async (ctx) => {
  const broadcastHandlers = (await import('./handlers/admin/broadcasts.js')).default;
  await broadcastHandlers.handleBroadcastSend(ctx);
});

bot.command('broadcast_cancel', isAdmin, async (ctx) => {
  const broadcastHandlers = (await import('./handlers/admin/broadcasts.js')).default;
  await broadcastHandlers.handleBroadcastCancel(ctx);
});

// Команды для розыгрышей (админ)
bot.command('giveaway_list', isAdmin, async (ctx) => {
  const giveawayAdminHandlers = (await import('./handlers/admin/giveaways.js')).default;
  await giveawayAdminHandlers.handleGiveawaysList(ctx);
});

bot.command('giveaway_create', isAdmin, async (ctx) => {
  const giveawayAdminHandlers = (await import('./handlers/admin/giveaways.js')).default;
  await giveawayAdminHandlers.handleGiveawayCreate(ctx);
});

bot.command('giveaway_new', isAdmin, async (ctx) => {
  const giveawayAdminHandlers = (await import('./handlers/admin/giveaways.js')).default;
  await giveawayAdminHandlers.handleGiveawayNew(ctx);
});

bot.command('giveaway_winners', isAdmin, async (ctx) => {
  const giveawayAdminHandlers = (await import('./handlers/admin/giveaways.js')).default;
  await giveawayAdminHandlers.handleGiveawaySelectWinners(ctx);
});

// Команды для автоворонок (админ)
bot.command('autofunnel_list', isAdmin, async (ctx) => {
  const autofunnelHandlers = (await import('./handlers/admin/autofunnels.js')).default;
  await autofunnelHandlers.handleAutofunnelsList(ctx);
});

bot.command('autofunnel_create', isAdmin, async (ctx) => {
  const autofunnelHandlers = (await import('./handlers/admin/autofunnels.js')).default;
  await autofunnelHandlers.handleAutofunnelCreate(ctx);
});

bot.command('autofunnel_new', isAdmin, async (ctx) => {
  const autofunnelHandlers = (await import('./handlers/admin/autofunnels.js')).default;
  await autofunnelHandlers.handleAutofunnelNew(ctx);
});

bot.command('autofunnel_toggle', isAdmin, async (ctx) => {
  const autofunnelHandlers = (await import('./handlers/admin/autofunnels.js')).default;
  await autofunnelHandlers.handleAutofunnelToggle(ctx);
});

// Обработка callback-кнопок
bot.on('callback_query', async (ctx) => {
  try {
    const data = ctx.callbackQuery?.data;
    
    if (!data) {
      await ctx.answerCbQuery();
      return;
    }

    console.log('Callback received:', data);

    // Обработка пользовательского меню
    if (data.startsWith('menu_')) {
      await ctx.answerCbQuery();
      
      const { getMainMenu } = await import('./handlers/menu.js');
      
      switch (data) {
      case 'menu_main':
        try {
          await ctx.editMessageText('📋 ГЛАВНОЕ МЕНЮ\n\nВыберите действие:', getMainMenu());
        } catch (error) {
          await ctx.reply('📋 ГЛАВНОЕ МЕНЮ\n\nВыберите действие:', getMainMenu());
        }
        break;
      case 'menu_profile':
        try {
          const profileHandler = (await import('./handlers/profile.js')).default;
          await profileHandler(ctx);
        } catch (error) {
          console.error('Ошибка при открытии профиля:', error);
          if (ctx.callbackQuery) {
            await ctx.answerCbQuery('❌ Ошибка');
          } else {
            await ctx.reply('❌ Ошибка при открытии профиля.');
          }
        }
        break;
      case 'menu_leaderboard':
        try {
          const leaderboardHandler = (await import('./handlers/leaderboard.js')).default;
          await leaderboardHandler(ctx);
        } catch (error) {
          console.error('Ошибка при открытии лидерборда:', error);
          await ctx.reply('❌ Ошибка при открытии лидерборда.');
        }
        break;
      case 'menu_giveaways':
        try {
          const giveawayHandlers = (await import('./handlers/giveaways.js')).default;
          await giveawayHandlers.handleGiveaways(ctx);
        } catch (error) {
          console.error('Ошибка при открытии розыгрышей:', error);
          await ctx.reply('❌ Ошибка при открытии розыгрышей.');
        }
        break;
      case 'menu_help':
        try {
          const helpMessage = 
            '📋 ПОМОЩЬ\n\n' +
            'Этот бот помогает вам приглашать друзей и участвовать в розыгрышах.\n\n' +
            'Основные функции:\n' +
            '• Профиль - ваш личный кабинет с реферальной ссылкой\n' +
            '• Лидерборд - топ пользователей по рефералам\n' +
            '• Розыгрыши - активные розыгрыши и призы';
          try {
            await ctx.editMessageText(helpMessage, getMainMenu());
          } catch (error) {
            await ctx.reply(helpMessage, getMainMenu());
          }
        } catch (error) {
          console.error('Ошибка при показе помощи:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
    }
    return;
    }

    // Обработка розыгрышей
    if (data.startsWith('giveaway_')) {
      await ctx.answerCbQuery();
      
      if (data.startsWith('giveaway_view_')) {
        try {
          const giveawayId = parseInt(data.replace('giveaway_view_', ''));
          const giveaway = await db.getGiveaway(giveawayId);
          
          if (!giveaway) {
            await ctx.answerCbQuery('❌ Розыгрыш не найден');
            return;
          }

          const isParticipant = await db.isUserInGiveaway(giveawayId, ctx.from.id);
          const referralCount = await db.getReferralCount(ctx.from.id);
          const endDate = new Date(giveaway.end_date).toLocaleDateString('ru-RU');

          let message = `🎯 ${giveaway.title}\n\n`;
          if (giveaway.description) {
            message += `${giveaway.description}\n\n`;
          }
          message += `🎁 Приз: ${giveaway.prize_description || 'не указан'}\n`;
          message += `📅 До: ${endDate}\n`;
          if (giveaway.min_referrals > 0) {
            message += `📊 Минимум рефералов: ${giveaway.min_referrals}\n`;
            message += `У вас: ${referralCount}\n`;
          }
          message += `\n${isParticipant ? '✅ Вы участвуете' : '❌ Вы не участвуете'}`;

          const buttons = [];
          if (!isParticipant && giveaway.status === 'active') {
            buttons.push([{ text: '🎁 Участвовать', callback_data: `giveaway_join_${giveawayId}` }]);
          }
          buttons.push([{ text: '◀️ Назад к розыгрышам', callback_data: 'menu_giveaways' }]);

          try {
            await ctx.editMessageText(message, {
              reply_markup: {
                inline_keyboard: buttons
              }
            });
          } catch (error) {
            await ctx.reply(message, {
              reply_markup: {
                inline_keyboard: buttons
              }
            });
          }
          await ctx.answerCbQuery();
        } catch (error) {
          console.error('Ошибка при просмотре розыгрыша:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        return;
      }

      if (data.startsWith('giveaway_join_')) {
        try {
          await ctx.answerCbQuery('⏳ Проверяю условия участия...');
          const giveawayHandlers = (await import('./handlers/giveaways.js')).default;
          
          // Передаем контекст с callbackQuery для правильной обработки
          await giveawayHandlers.handleGiveawayJoin(ctx);
        } catch (error) {
          console.error('Ошибка при участии в розыгрыше:', error);
          try {
            await ctx.answerCbQuery('❌ Ошибка при участии');
          } catch (e) {
            // Игнорируем ошибку если уже ответили
          }
        }
        return;
      }

      if (data === 'giveaway_list') {
        const giveawayHandlers = (await import('./handlers/giveaways.js')).default;
        await giveawayHandlers.handleGiveaways(ctx);
        return;
      }
    }

    // Обработка рассылок через кнопки
    if (data.startsWith('broadcast_send_')) {
      const userId = ctx.from?.id;
      const adminIds = (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      
      if (userId && adminIds.includes(userId)) {
        const broadcastId = parseInt(data.replace('broadcast_send_', ''));
        const broadcastHandlers = (await import('./handlers/admin/broadcasts.js')).default;
        await broadcastHandlers.handleBroadcastSend(ctx, broadcastId);
      } else {
        await ctx.answerCbQuery('❌ У вас нет прав для выполнения этого действия.');
      }
      return;
    }

    // Обработка автоворонок через кнопки
    if (data.startsWith('autofunnel_toggle_')) {
      const userId = ctx.from?.id;
      const adminIds = (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      
      if (userId && adminIds.includes(userId)) {
        try {
          const autofunnelId = parseInt(data.replace('autofunnel_toggle_', ''));
          const autofunnelHandlers = (await import('./handlers/admin/autofunnels.js')).default;
          await autofunnelHandlers.handleAutofunnelToggle(ctx, autofunnelId);
          // Обновляем список автоворонок
          await autofunnelHandlers.handleAutofunnelsList(ctx);
        } catch (error) {
          console.error('Ошибка при переключении автоворонки:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
      } else {
        await ctx.answerCbQuery('❌ У вас нет прав');
      }
      return;
    }

    // Обработка лид-магнитов через кнопки
    if (data.startsWith('leadmagnet_activate_')) {
      const userId = ctx.from?.id;
      const adminIds = (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      
      if (userId && adminIds.includes(userId)) {
        try {
          await ctx.answerCbQuery('⏳ Обновляю...');
          const leadMagnetId = parseInt(data.replace('leadmagnet_activate_', ''));
          const leadMagnetHandlers = (await import('./handlers/admin/leadMagnet.js')).default;
          
          // Получаем текущий активный лид-магнит
          const activeLeadMagnet = await db.getActiveLeadMagnet();
          const isCurrentlyActive = activeLeadMagnet && activeLeadMagnet.id === leadMagnetId;
          
          if (isCurrentlyActive) {
            // Деактивируем все лид-магниты
            const allLeadMagnets = await db.getAllLeadMagnets();
            for (const lm of allLeadMagnets) {
              await db.updateLeadMagnet(lm.id, { is_active: false });
            }
            await ctx.telegram.sendMessage(ctx.from.id, `✅ Лид-магнит деактивирован.`);
          } else {
            // Деактивируем все, затем активируем выбранный
            const allLeadMagnets = await db.getAllLeadMagnets();
            for (const lm of allLeadMagnets) {
              await db.updateLeadMagnet(lm.id, { is_active: lm.id === leadMagnetId });
            }
            await ctx.telegram.sendMessage(ctx.from.id, `✅ Лид-магнит активирован.`);
          }
          
          // Обновляем список лид-магнитов
          await leadMagnetHandlers.handleLeadMagnetsList(ctx);
        } catch (error) {
          console.error('Ошибка при активации лид-магнита:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
      } else {
        await ctx.answerCbQuery('❌ У вас нет прав');
      }
      return;
    }

    // Обработка просмотра пользователя и блокировки/разблокировки
    if (data.startsWith('user_view_') || data.startsWith('user_ban_') || data.startsWith('user_unban_')) {
      const userId = ctx.from?.id;
      const adminIds = (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      
      if (userId && adminIds.includes(userId)) {
        const userHandlers = (await import('./handlers/admin/users.js')).default;
        
        if (data.startsWith('user_view_')) {
          const targetUserId = parseInt(data.replace('user_view_', ''));
          await ctx.answerCbQuery('⏳ Загружаю информацию...');
          await userHandlers.handleUserView(ctx, targetUserId);
        } else if (data.startsWith('user_ban_')) {
          const targetUserId = parseInt(data.replace('user_ban_', ''));
          await ctx.answerCbQuery('⏳ Блокирую...');
          await userHandlers.handleUserBan(ctx, targetUserId);
        } else if (data.startsWith('user_unban_')) {
          const targetUserId = parseInt(data.replace('user_unban_', ''));
          await ctx.answerCbQuery('⏳ Разблокирую...');
          await userHandlers.handleUserUnban(ctx, targetUserId);
        }
      } else {
        await ctx.answerCbQuery('❌ У вас нет прав для выполнения этого действия.');
      }
      return;
    }

    // Обработка админ-панели и всех админских callback
    if (data.startsWith('admin_') || 
        data === 'broadcast_create' || 
        data === 'broadcast_list_menu' ||
        data === 'user_search_menu' ||
        data === 'user_ban_menu' ||
        data === 'user_unban_menu' ||
        data === 'autofunnel_create_menu' ||
        data === 'leadmagnet_create_menu' ||
        data === 'leadmagnet_type_text' ||
        data === 'leadmagnet_type_link' ||
        data === 'leadmagnet_type_file' ||
        data === 'settings_channel' ||
        data.startsWith('export_')) {
      const userId = ctx.from?.id;
      const adminIds = (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      
      if (userId && adminIds.includes(userId)) {
        console.log('Admin callback:', data);
        await adminHandlers.handleAdminCallback(ctx);
      } else {
        await ctx.answerCbQuery('❌ У вас нет прав для выполнения этого действия.');
      }
      return;
    }

    // Если не обработано, отвечаем на callback
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Ошибка в обработчике callback_query:', error);
    try {
      await ctx.answerCbQuery('❌ Произошла ошибка');
    } catch (e) {
      // Игнорируем ошибку если уже ответили
    }
  }
});

// Обработка текстовых сообщений (для интерактивных действий)
// Обработка callback для тикетов
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data;
  
  if (data && (data.startsWith('ticket_') || data === 'ticket_new')) {
    await ctx.answerCbQuery();
    const ticketHandlers = (await import('./handlers/tickets.js')).default;
    
    if (data === 'ticket_new') {
      await ticketHandlers.handleTicketNew(ctx);
    } else if (data === 'ticket_reply') {
      await ctx.reply('💬 Напишите ваше сообщение для ответа в тикет:');
      if (!ctx.session) ctx.session = {};
      ctx.session.waitingForTicketReply = true;
    } else if (data.startsWith('ticket_view_')) {
      const ticketId = parseInt(data.replace('ticket_view_', ''));
      await ticketHandlers.handleTicketView(ctx, ticketId);
    }
    return;
  }
  
  // Продолжить обработку других callback...
});

bot.on('text', async (ctx) => {
  // Если это команда, обрабатываем как обычно
  if (ctx.message.text.startsWith('/')) {
    // Команды обрабатываются отдельными обработчиками выше
    return;
  }

  // Обработка интерактивных действий через сессию
  if (ctx.session) {
    // Создание рассылки через интерактивный режим
    if (ctx.session.waitingForBroadcastTitle) {
      ctx.session.waitingForBroadcastTitle = false;
      // Запускаем сцену создания рассылки
      try {
        await ctx.scene.enter('broadcastConstructor');
      } catch (error) {
        console.error('Ошибка при входе в сцену:', error);
        await ctx.reply('❌ Ошибка при запуске создания рассылки. Используйте команду /broadcast_new');
      }
      return;
    }

    // Поиск пользователя
    if (ctx.session.waitingForUserSearch) {
      ctx.session.waitingForUserSearch = false;
      const userHandlers = (await import('./handlers/admin/users.js')).default;
      const fakeCtx = {
        ...ctx,
        message: {
          ...ctx.message,
          text: `/user_search ${ctx.message.text}`
        }
      };
      await userHandlers.handleUserSearch(fakeCtx);
      return;
    }

    // Блокировка пользователя
    if (ctx.session.waitingForUserBan) {
      ctx.session.waitingForUserBan = false;
      const userHandlers = (await import('./handlers/admin/users.js')).default;
      const parts = ctx.message.text.split(' ');
      const fakeCtx = {
        ...ctx,
        message: {
          ...ctx.message,
          text: `/user_ban ${parts.join(' ')}`
        }
      };
      await userHandlers.handleUserBan(fakeCtx);
      return;
    }

    // Разблокировка пользователя
    if (ctx.session.waitingForUserUnban) {
      ctx.session.waitingForUserUnban = false;
      const userHandlers = (await import('./handlers/admin/users.js')).default;
      const fakeCtx = {
        ...ctx,
        message: {
          ...ctx.message,
          text: `/user_unban ${ctx.message.text}`
        }
      };
      await userHandlers.handleUserUnban(fakeCtx);
      return;
    }

    // Создание автоворонки
    if (ctx.session && ctx.session.waitingForAutofunnel) {
      ctx.session.waitingForAutofunnel = false;
      try {
        const autofunnelHandlers = (await import('./handlers/admin/autofunnels.js')).default;
        // Сохраняем оригинальный текст
        const originalText = ctx.message.text;
        // Временно изменяем текст сообщения
        ctx.message.text = `/autofunnel_new ${originalText}`;
        try {
          await autofunnelHandlers.handleAutofunnelNew(ctx);
        } finally {
          // Восстанавливаем оригинальный текст
          ctx.message.text = originalText;
        }
      } catch (error) {
        console.error('Ошибка при обработке автоворонки:', error);
        await ctx.reply(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`);
      }
      return;
    }

    // Создание текстового лид-магнита
    if (ctx.session && ctx.session.waitingForLeadMagnetText) {
      ctx.session.waitingForLeadMagnetText = false;
      try {
        const leadMagnetHandlers = (await import('./handlers/admin/leadMagnet.js')).default;
        // Сохраняем оригинальный текст
        const originalText = ctx.message.text;
        // Временно изменяем текст сообщения
        ctx.message.text = `/leadmagnet_text ${originalText}`;
        try {
          await leadMagnetHandlers.handleLeadMagnetText(ctx);
        } finally {
          // Восстанавливаем оригинальный текст
          ctx.message.text = originalText;
        }
      } catch (error) {
        console.error('Ошибка при обработке текстового лид-магнита:', error);
        await ctx.reply(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`);
      }
      return;
    }

    // Создание лид-магнита со ссылкой
    if (ctx.session && ctx.session.waitingForLeadMagnetLink) {
      ctx.session.waitingForLeadMagnetLink = false;
      try {
        const leadMagnetHandlers = (await import('./handlers/admin/leadMagnet.js')).default;
        // Сохраняем оригинальный текст
        const originalText = ctx.message.text;
        // Временно изменяем текст сообщения
        ctx.message.text = `/leadmagnet_link ${originalText}`;
        try {
          await leadMagnetHandlers.handleLeadMagnetLink(ctx);
        } finally {
          // Восстанавливаем оригинальный текст
          ctx.message.text = originalText;
        }
      } catch (error) {
        console.error('Ошибка при обработке лид-магнита со ссылкой:', error);
        await ctx.reply(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`);
      }
      return;
    }
  }
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('🛑 Получен SIGINT, завершаю работу...');
  bot.stop('SIGINT');
  db.close();
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, завершаю работу...');
  bot.stop('SIGTERM');
  db.close();
  process.exit(0);
});

// Экспортируем bot для использования в других модулях
export { bot };

// Запуск бота
console.log('🚀 Запуск бота...');
bot.launch()
  .then(async () => {
    console.log('✅ Бот успешно запущен!');
    // Инициализация планировщика
    initScheduler(bot);
    // Устанавливаем bot instance в admin handlers
    const adminHandlersModule = await import('./handlers/admin.js');
    if (adminHandlersModule.setBotInstance) {
      adminHandlersModule.setBotInstance(bot);
    }
  })
  .catch((error) => {
    console.error('❌ Ошибка при запуске бота:', error);
    process.exit(1);
  });


import db from '../db.js';

// Импортируем bot для доступа к handleUpdate
let botInstance = null;
export function setBotInstance(bot) {
  botInstance = bot;
}

// Обработчик команды /admin - главное меню админ-панели
export async function handleAdmin(ctx) {
  const adminMenu = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 Статистика', callback_data: 'admin_stats' },
          { text: '👥 Пользователи', callback_data: 'admin_users' }
        ],
        [
          { text: '📢 Рассылки', callback_data: 'admin_broadcast' },
          { text: '🔄 Автоворонки', callback_data: 'admin_autofunnels' }
        ],
        [
          { text: '🎁 Розыгрыши', callback_data: 'admin_giveaways' },
          { text: '📎 Лид-магниты', callback_data: 'admin_leadmagnets' }
        ],
        [
          { text: '📥 Экспорт данных', callback_data: 'admin_export_menu' },
          { text: '⚙️ Настройки', callback_data: 'admin_settings' }
        ]
      ]
    }
  };

  if (ctx.callbackQuery) {
    await ctx.editMessageText(
      '👨‍💼 АДМИН-ПАНЕЛЬ\n\nВыберите раздел:',
      adminMenu
    );
    await ctx.answerCbQuery();
  } else {
    await ctx.reply(
      '👨‍💼 АДМИН-ПАНЕЛЬ\n\nВыберите раздел:',
      adminMenu
    );
  }
}

// Обработчик callback-кнопок админ-панели
export async function handleAdminCallback(ctx) {
  const action = ctx.callbackQuery?.data;

  if (!action) {
    await ctx.answerCbQuery('❌ Неверный запрос');
    return;
  }

  console.log('Admin callback action:', action);

  try {
    switch (action) {
      case 'admin_stats':
        await ctx.answerCbQuery();
        try {
          await handleStats(ctx);
        } catch (error) {
          console.error('Ошибка при получении статистики:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'admin_export':
      case 'admin_export_menu':
        await ctx.answerCbQuery();
        try {
          await ctx.editMessageText(
            '📥 ЭКСПОРТ ДАННЫХ\n\nВыберите тип экспорта:',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '👥 Все (CSV)', callback_data: 'export_all_csv' },
                    { text: '📈 Активные (CSV)', callback_data: 'export_active_csv' }
                  ],
                  [
                    { text: '🏆 Топ рефералов (CSV)', callback_data: 'export_refs_csv' }
                  ],
                  [
                    { text: '📊 Все (Excel)', callback_data: 'export_all_excel' },
                    { text: '📊 Активные (Excel)', callback_data: 'export_active_excel' }
                  ],
                  [
                    { text: '◀️ Назад', callback_data: 'admin_main' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          await ctx.reply(
            '📥 ЭКСПОРТ ДАННЫХ\n\nВыберите тип экспорта:',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '👥 Все (CSV)', callback_data: 'export_all_csv' },
                    { text: '📈 Активные (CSV)', callback_data: 'export_active_csv' }
                  ],
                  [
                    { text: '🏆 Топ рефералов (CSV)', callback_data: 'export_refs_csv' }
                  ],
                  [
                    { text: '📊 Все (Excel)', callback_data: 'export_all_excel' },
                    { text: '📊 Активные (Excel)', callback_data: 'export_active_excel' }
                  ],
                  [
                    { text: '◀️ Назад', callback_data: 'admin_main' }
                  ]
                ]
              }
            }
          );
        }
        break;
      case 'admin_broadcast':
        await ctx.answerCbQuery();
        try {
          const scheduledBroadcasts = await db.getScheduledBroadcasts();
          const allBroadcasts = await db.getAllBroadcasts();
          const sentBroadcasts = allBroadcasts.filter(b => b.status === 'sent').length;
          
          const broadcastMenu = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '➕ Создать рассылку', callback_data: 'broadcast_create' }
                ],
                [
                  { text: '📋 Список рассылок', callback_data: 'broadcast_list_menu' }
                ],
                [
                  { text: '◀️ Назад', callback_data: 'admin_main' }
                ]
              ]
            }
          };

          const message = '📢 РАССЫЛКИ\n\n' +
            `📋 Запланированные: ${scheduledBroadcasts.length}\n` +
            `✅ Завершенные: ${sentBroadcasts}\n\n` +
            'Выберите действие:';

          try {
            await ctx.editMessageText(message, broadcastMenu);
          } catch (error) {
            await ctx.reply(message, broadcastMenu);
          }
        } catch (error) {
          console.error('Ошибка при открытии раздела рассылок:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'admin_users':
        await ctx.answerCbQuery();
        try {
          const totalUsers = await db.getTotalUsers();
          const usersMenu = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔍 Найти пользователя', callback_data: 'user_search_menu' }
                ],
                [
                  { text: '◀️ Назад', callback_data: 'admin_main' }
                ]
              ]
            }
          };

          const message = `👥 ПОЛЬЗОВАТЕЛИ\n\nВсего пользователей: ${totalUsers}\n\nВыберите действие:`;
          
          try {
            await ctx.editMessageText(message, usersMenu);
          } catch (error) {
            await ctx.reply(message, usersMenu);
          }
        } catch (error) {
          console.error('Ошибка при открытии раздела пользователей:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'admin_settings':
        await ctx.answerCbQuery();
        try {
          const channelId = await db.getSetting('channel_id');
          const channelUsername = await db.getSetting('channel_username');
          
          const settingsMenu = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📢 Настроить канал', callback_data: 'settings_channel' }
                ],
                [
                  { text: '📎 Лид-магниты', callback_data: 'admin_leadmagnets' }
                ],
                [
                  { text: '◀️ Назад', callback_data: 'admin_main' }
                ]
              ]
            }
          };

          let settingsMessage = '⚙️ НАСТРОЙКИ\n\n';
          settingsMessage += `Канал: ${channelId ? `@${channelUsername || channelId}` : 'не настроен'}\n\n`;
          settingsMessage += 'Выберите действие:';
          
          try {
            await ctx.editMessageText(settingsMessage, settingsMenu);
          } catch (error) {
            await ctx.reply(settingsMessage, settingsMenu);
          }
        } catch (error) {
          console.error('Ошибка при открытии настроек:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'admin_leadmagnets':
        await ctx.answerCbQuery();
        try {
          const leadMagnetHandlers = (await import('./admin/leadMagnet.js')).default;
          await leadMagnetHandlers.handleLeadMagnetsList(ctx);
        } catch (error) {
          console.error('Ошибка при открытии лид-магнитов:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'admin_giveaways':
        await ctx.answerCbQuery();
        try {
          const giveawayAdminHandlers = (await import('./admin/giveaways.js')).default;
          await giveawayAdminHandlers.handleGiveawaysList(ctx);
        } catch (error) {
          console.error('Ошибка при открытии розыгрышей:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'admin_autofunnels':
        await ctx.answerCbQuery();
        try {
          const autofunnelHandlers = (await import('./admin/autofunnels.js')).default;
          await autofunnelHandlers.handleAutofunnelsList(ctx);
        } catch (error) {
          console.error('Ошибка при открытии автоворонок:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'admin_main':
        await ctx.answerCbQuery();
        await handleAdmin(ctx);
        break;
      case 'broadcast_create':
        try {
          await ctx.answerCbQuery('⏳ Запускаю создание рассылки...');
          // Запускаем сцену создания рассылки напрямую
          await ctx.scene.enter('broadcastConstructor');
        } catch (error) {
          console.error('Ошибка при создании рассылки:', error);
          await ctx.answerCbQuery('❌ Ошибка');
          // Если сцена не работает, отправляем инструкцию
          try {
            await ctx.telegram.sendMessage(
              ctx.from.id,
              '📢 СОЗДАНИЕ РАССЫЛКИ\n\nИспользуйте команду:\n/broadcast_new',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '◀️ Назад', callback_data: 'admin_broadcast' }]
                  ]
                }
              }
            );
          } catch (e) {
            console.error('Ошибка при отправке сообщения:', e);
          }
        }
        break;
      case 'broadcast_list_menu':
        try {
          await ctx.answerCbQuery();
          const broadcastHandlers = (await import('./admin/broadcasts.js')).default;
          await broadcastHandlers.handleBroadcastList(ctx);
        } catch (error) {
          console.error('Ошибка при открытии списка рассылок:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'user_search_menu':
        try {
          await ctx.answerCbQuery('⏳ Загружаю список пользователей...');
          
          // Получаем список пользователей (последние 20)
          const allUsers = await db.getAllUsers();
          const recentUsers = allUsers.slice(-20).reverse(); // Последние 20, новые сверху
          
          if (recentUsers.length === 0) {
            const emptyMessage = '👥 ПОЛЬЗОВАТЕЛИ\n\nПользователи не найдены.';
            try {
              await ctx.editMessageText(emptyMessage, {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '◀️ Назад', callback_data: 'admin_users' }]
                  ]
                }
              });
            } catch (error) {
              await ctx.reply(emptyMessage, {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '◀️ Назад', callback_data: 'admin_users' }]
                  ]
                }
              });
            }
            return;
          }
          
          // Создаем кнопки для каждого пользователя
          const buttons = [];
          recentUsers.forEach(user => {
            const displayName = user.username ? `@${user.username}` : (user.first_name || `ID: ${user.user_id}`);
            const shortName = displayName.length > 30 ? displayName.substring(0, 27) + '...' : displayName;
            buttons.push([
              { 
                text: `👤 ${shortName}`, 
                callback_data: `user_view_${user.user_id}` 
              }
            ]);
          });
          
          // Добавляем кнопку "Назад"
          buttons.push([
            { text: '◀️ Назад', callback_data: 'admin_users' }
          ]);
          
          const message = `👥 СПИСОК ПОЛЬЗОВАТЕЛЕЙ\n\nПоказано: ${recentUsers.length} из ${allUsers.length}\n\nВыберите пользователя:`;
          
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
        } catch (error) {
          console.error('Ошибка при загрузке списка пользователей:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'user_ban_menu':
        try {
          await ctx.answerCbQuery();
          await ctx.telegram.sendMessage(
            ctx.from.id,
            'Для блокировки пользователя используйте:\n/user_ban <ID> [причина]\n\nПример:\n/user_ban 123456789\n/user_ban 123456789 Спам'
          );
        } catch (error) {
          console.error('Ошибка при блокировке:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'user_unban_menu':
        try {
          await ctx.answerCbQuery();
          await ctx.telegram.sendMessage(
            ctx.from.id,
            'Для разблокировки пользователя используйте:\n/user_unban <ID>\n\nПример:\n/user_unban 123456789'
          );
        } catch (error) {
          console.error('Ошибка при разблокировке:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'autofunnel_create_menu':
        try {
          await ctx.answerCbQuery();
          // Устанавливаем сессию ПЕРЕД отправкой сообщения
          if (!ctx.session) {
            ctx.session = {};
          }
          ctx.session.waitingForAutofunnel = true;
          
          await ctx.editMessageText(
            '🔄 СОЗДАНИЕ АВТОВОРОНКИ\n\nОтправьте данные в формате:\n<название> | <триггер> | <задержка_часов> | <текст>\n\nТриггеры:\n• registration - при регистрации\n• new_referral - при новом реферале\n• no_subscription - если нет подписки\n• inactive - при неактивности\n\nПример:\nПриветствие | registration | 0 | Добро пожаловать!',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '◀️ Назад', callback_data: 'admin_autofunnels' }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при создании автоворонки:', error);
          await ctx.answerCbQuery('❌ Ошибка');
          // Сбрасываем сессию при ошибке
          if (ctx.session) {
            ctx.session.waitingForAutofunnel = false;
          }
        }
        break;
      case 'leadmagnet_create_menu':
        try {
          await ctx.answerCbQuery();
          await ctx.editMessageText(
            '📎 СОЗДАНИЕ ЛИД-МАГНИТА\n\nВыберите тип:',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📝 Текстовый', callback_data: 'leadmagnet_type_text' }],
                  [{ text: '🔗 Ссылка', callback_data: 'leadmagnet_type_link' }],
                  [{ text: '📎 Файл', callback_data: 'leadmagnet_type_file' }],
                  [{ text: '◀️ Назад', callback_data: 'admin_leadmagnets' }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при создании лид-магнита:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'leadmagnet_type_text':
        try {
          await ctx.answerCbQuery();
          // Устанавливаем сессию ПЕРЕД отправкой сообщения
          if (!ctx.session) {
            ctx.session = {};
          }
          ctx.session.waitingForLeadMagnetText = true;
          
          await ctx.editMessageText(
            '📝 ТЕКСТОВЫЙ ЛИД-МАГНИТ\n\nОтправьте данные в формате:\n<название> | <текст>\n\nПример:\nПолезная информация | Текст лид-магнита',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '◀️ Назад', callback_data: 'leadmagnet_create_menu' }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при обработке leadmagnet_type_text:', error);
          await ctx.answerCbQuery('❌ Ошибка');
          // Сбрасываем сессию при ошибке
          if (ctx.session) {
            ctx.session.waitingForLeadMagnetText = false;
          }
        }
        break;
      case 'leadmagnet_type_link':
        try {
          await ctx.answerCbQuery();
          // Устанавливаем сессию ПЕРЕД отправкой сообщения
          if (!ctx.session) {
            ctx.session = {};
          }
          ctx.session.waitingForLeadMagnetLink = true;
          
          await ctx.editMessageText(
            '🔗 ЛИД-МАГНИТ СО ССЫЛКОЙ\n\nОтправьте данные в формате:\n<название> | <текст> | <ссылка>\n\nПример:\nПолезная ссылка | Описание | https://example.com',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '◀️ Назад', callback_data: 'leadmagnet_create_menu' }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при обработке leadmagnet_type_link:', error);
          await ctx.answerCbQuery('❌ Ошибка');
          // Сбрасываем сессию при ошибке
          if (ctx.session) {
            ctx.session.waitingForLeadMagnetLink = false;
          }
        }
        break;
      case 'leadmagnet_type_file':
        try {
          await ctx.answerCbQuery();
          await ctx.editMessageText(
            '📎 ЛИД-МАГНИТ С ФАЙЛОМ\n\nОтправьте название лид-магнита, затем отправьте файл как ответ на это сообщение.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '◀️ Назад', callback_data: 'leadmagnet_create_menu' }]
                ]
              }
            }
          );
          ctx.session.waitingForLeadMagnetFile = true;
        } catch (error) {
          console.error('Ошибка:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      case 'settings_channel':
        try {
          await ctx.answerCbQuery();
          await ctx.editMessageText(
            '📢 НАСТРОЙКА КАНАЛА\n\nОтправьте @username канала или его ID для настройки.\n\nПример:\n@channel_name\nили\n-1001234567890',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '◀️ Назад', callback_data: 'admin_settings' }]
                ]
              }
            }
          );
          ctx.session.waitingForChannel = true;
        } catch (error) {
          console.error('Ошибка при настройке канала:', error);
          await ctx.answerCbQuery('❌ Ошибка');
        }
        break;
      // Обработка экспорта через кнопки
      case 'export_all_csv':
      case 'export_active_csv':
      case 'export_refs_csv':
      case 'export_all_excel':
      case 'export_active_excel':
      case 'export_refs_excel':
        await ctx.answerCbQuery('⏳ Генерирую файл...');
        try {
          const exportData = ctx.callbackQuery.data;
          const exportType = exportData.replace('export_', '').replace('_csv', '').replace('_excel', '');
          const format = exportData.includes('excel') ? 'excel' : 'csv';
          
          console.log('Export request:', { exportType, format, userId: ctx.from?.id });
          
          // Вызываем handleExport напрямую с параметрами, без изменения ctx.message
          await handleExport(ctx, exportType, format);
        } catch (error) {
          console.error('Ошибка при экспорте:', error);
          console.error('Error stack:', error.stack);
          await ctx.answerCbQuery('❌ Ошибка при экспорте');
          // Отправляем сообщение об ошибке напрямую
          try {
            await ctx.telegram.sendMessage(ctx.from.id, `❌ Ошибка при экспорте: ${error.message || 'Неизвестная ошибка'}`);
          } catch (e) {
            console.error('Не удалось отправить сообщение об ошибке:', e);
          }
        }
        break;
      default:
        await ctx.answerCbQuery('Неизвестное действие');
    }
  } catch (error) {
    console.error('Ошибка в handleAdminCallback:', error);
    await ctx.answerCbQuery('❌ Произошла ошибка');
  }
}

// Обработчик команды /stats
export async function handleStats(ctx) {
  try {
    const totalUsers = await db.getTotalUsers();
    const newUsersToday = await db.getNewUsers(1);
    const newUsersWeek = await db.getNewUsers(7);

    // Получение топ-10 рефералов
    const allUsers = await db.getAllUsers();
    const topReferrers = allUsers
      .filter(u => u.referral_count > 0)
      .sort((a, b) => parseInt(b.referral_count) - parseInt(a.referral_count))
      .slice(0, 10);

    let statsMessage = 
      `📊 СТАТИСТИКА БОТА\n\n` +
      `👥 Всего пользователей: ${totalUsers}\n` +
      `📈 Новых за сегодня: ${newUsersToday}\n` +
      `📈 Новых за неделю: ${newUsersWeek}\n\n`;

    if (topReferrers.length > 0) {
      statsMessage += `🏆 Топ-10 рефералов:\n`;
      topReferrers.forEach((user, index) => {
        const username = user.username ? `@${user.username}` : 'без username';
        statsMessage += `${index + 1}. ${username} - ${user.referral_count} рефералов\n`;
      });
    }

    await ctx.reply(statsMessage);
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    await ctx.reply('❌ Ошибка при получении статистики.');
  }
}

// Обработчик команды /export
export async function handleExport(ctx, exportType = null, format = null) {
  try {
    console.log('handleExport called, ctx:', {
      hasTelegram: !!ctx?.telegram,
      hasFrom: !!ctx?.from,
      hasMessage: !!ctx?.message,
      chatId: ctx?.chat?.id || ctx?.from?.id || ctx?.message?.chat?.id,
      exportType,
      format
    });

    // Проверяем наличие ctx и telegram
    if (!ctx || !ctx.telegram) {
      console.error('Invalid ctx in handleExport:', ctx);
      return;
    }

    const chatId = ctx.chat?.id || ctx.from?.id || ctx.message?.chat?.id;
    if (!chatId) {
      console.error('Cannot determine chatId');
      return;
    }

    // Если параметры не переданы, пытаемся получить из ctx.message.text (для команды /export)
    if (!exportType || !format) {
      const messageText = ctx.message?.text || '';
      const args = messageText.split(' ').slice(1);
      exportType = exportType || args[0] || 'all';
      format = format || args[1] || 'csv'; // csv или excel
    }

    console.log('Export params:', { exportType, format, usersCount: 'loading...' });

    let users;

    switch (exportType) {
      case 'all':
        users = await db.getAllUsers();
        break;
      case 'active':
        // Активные за последние 30 дней
        const allUsers = await db.getAllUsers();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        users = allUsers.filter(u => new Date(u.created_at) >= thirtyDaysAgo);
        break;
      case 'refs':
        // Топ рефералов
        const all = await db.getAllUsers();
        users = all.filter(u => u.referral_count > 0)
          .sort((a, b) => parseInt(b.referral_count) - parseInt(a.referral_count));
        break;
      default:
        users = await db.getAllUsers();
    }

    if (format === 'excel' || format === 'xlsx') {
      // Экспорт в Excel
      console.log('Starting Excel export...');
      
      // Используем правильный способ импорта для exceljs версии 4.x
      const exceljs = await import('exceljs');
      
      // ExcelJS может экспортироваться по-разному в зависимости от версии
      let Workbook;
      if (exceljs.default) {
        // ES6 default export
        if (exceljs.default.Workbook) {
          Workbook = exceljs.default.Workbook;
        } else if (typeof exceljs.default === 'function') {
          Workbook = exceljs.default;
        } else {
          Workbook = exceljs.default;
        }
      } else if (exceljs.Workbook) {
        // Named export
        Workbook = exceljs.Workbook;
      } else {
        throw new Error('Не удалось найти Workbook. Доступные ключи: ' + Object.keys(exceljs).join(', '));
      }
      
      console.log('Workbook found, type:', typeof Workbook);
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Пользователи');

      // Заголовки
      worksheet.columns = [
        { header: 'ID пользователя', key: 'user_id', width: 15 },
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Имя', key: 'first_name', width: 20 },
        { header: 'Фамилия', key: 'last_name', width: 20 },
        { header: 'Дата регистрации', key: 'created_at', width: 20 },
        { header: 'Количество рефералов', key: 'referral_count', width: 20 }
      ];

      // Стиль заголовков
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Данные
      users.forEach(user => {
        worksheet.addRow({
          user_id: user.user_id,
          username: user.username || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          created_at: new Date(user.created_at).toLocaleString('ru-RU'),
          referral_count: user.referral_count || 0
        });
      });

      // Автоподбор ширины колонок
      worksheet.columns.forEach(column => {
        column.width = Math.max(column.width || 10, 15);
      });

      // Генерация буфера
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `export_${exportType}_${Date.now()}.xlsx`;
      const caption = `📥 Экспорт данных в Excel: ${exportType}\n\nЗаписей: ${users.length}`;

      // Используем ctx.telegram напрямую для гарантированной работы
      const chatId = ctx.chat?.id || ctx.from?.id || ctx.message?.chat?.id;
      if (!chatId) {
        throw new Error('Не удалось определить chat ID');
      }

      // Правильный синтаксис для sendDocument в Telegraf 4.x
      // Используем объект с source и filename напрямую
      await ctx.telegram.sendDocument(chatId, {
        source: Buffer.from(buffer),
        filename: filename
      }, {
        caption: caption
      });
    } else {
      // Экспорт в CSV (по умолчанию)
      const csvHeader = 'user_id,username,first_name,last_name,created_at,referral_count\n';
      const csvRows = users.map(user => {
        const username = (user.username || '').replace(/,/g, '');
        const firstName = (user.first_name || '').replace(/,/g, '');
        const lastName = (user.last_name || '').replace(/,/g, '');
        return `${user.user_id},${username},${firstName},${lastName},${user.created_at},${user.referral_count || 0}`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      const filename = `export_${exportType}_${Date.now()}.csv`;
      const caption = `📥 Экспорт данных в CSV: ${exportType}\n\nЗаписей: ${users.length}`;

      // Используем ctx.telegram напрямую для гарантированной работы
      const chatId = ctx.chat?.id || ctx.from?.id || ctx.message?.chat?.id;
      if (!chatId) {
        throw new Error('Не удалось определить chat ID');
      }

      // Правильный синтаксис для sendDocument в Telegraf 4.x
      // Используем объект с source и filename напрямую
      await ctx.telegram.sendDocument(chatId, {
        source: Buffer.from(csvContent, 'utf-8'),
        filename: filename
      }, {
        caption: caption
      });
    }

  } catch (error) {
    console.error('Ошибка при экспорте данных:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Отправляем сообщение об ошибке через telegram напрямую
    const chatId = ctx.chat?.id || ctx.from?.id || ctx.message?.chat?.id;
    if (chatId && ctx.telegram) {
      try {
        await ctx.telegram.sendMessage(chatId, `❌ Ошибка при экспорте данных: ${error.message || 'Неизвестная ошибка'}`);
      } catch (e) {
        console.error('Не удалось отправить сообщение об ошибке:', e);
      }
    }
  }
}

// Обработчик команды /broadcast
export async function handleBroadcast(ctx) {
  try {
    const messageText = ctx.message.text.replace('/broadcast', '').trim();

    if (!messageText) {
      return ctx.reply(
        '❌ Использование: /broadcast <текст сообщения>\n\n' +
        'Пример: /broadcast Привет всем! Это тестовая рассылка.'
      );
    }

    // Подтверждение перед рассылкой
    await ctx.reply(
      `⚠️ ВНИМАНИЕ!\n\n` +
      `Вы собираетесь отправить сообщение всем пользователям бота.\n\n` +
      `Текст: ${messageText}\n\n` +
      `Отправьте /confirm_broadcast для подтверждения или любое другое сообщение для отмены.`
    );

    // Сохранение данных рассылки в контексте (в реальном приложении лучше использовать БД или Redis)
    ctx.session = ctx.session || {};
    ctx.session.pendingBroadcast = messageText;

  } catch (error) {
    console.error('Ошибка при подготовке рассылки:', error);
    await ctx.reply('❌ Ошибка при подготовке рассылки.');
  }
}

// Обработчик подтверждения рассылки
export async function handleConfirmBroadcast(ctx) {
  try {
    if (!ctx.session?.pendingBroadcast) {
      return ctx.reply('❌ Нет ожидающей рассылки. Используйте /broadcast для создания новой.');
    }

    const messageText = ctx.session.pendingBroadcast;
    const userIds = await db.getAllUsersForBroadcast();

    await ctx.reply(`📤 Начинаю рассылку для ${userIds.length} пользователей...`);

    let successCount = 0;
    let errorCount = 0;

    // Отправка с защитой от флуда (20 сообщений в секунду)
    const delay = 1000 / 20; // 50ms между сообщениями

    for (const userId of userIds) {
      try {
        await ctx.telegram.sendMessage(userId, messageText);
        successCount++;
        
        // Задержка для защиты от флуда
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        errorCount++;
        console.error(`Ошибка при отправке пользователю ${userId}:`, error.message);
      }
    }

    // Очистка сессии
    delete ctx.session.pendingBroadcast;

    await ctx.reply(
      `✅ Рассылка завершена!\n\n` +
      `✅ Успешно отправлено: ${successCount}\n` +
      `❌ Ошибок: ${errorCount}`
    );

  } catch (error) {
    console.error('Ошибка при выполнении рассылки:', error);
    await ctx.reply('❌ Ошибка при выполнении рассылки.');
  }
}

export default {
  handleAdmin,
  handleAdminCallback,
  handleStats,
  handleExport,
  handleBroadcast,
  handleConfirmBroadcast,
};


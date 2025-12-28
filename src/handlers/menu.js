// Главное меню пользователя
export function getMainMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👤 Профиль', callback_data: 'menu_profile' },
          { text: '🏆 Лидерборд', callback_data: 'menu_leaderboard' }
        ],
        [
          { text: '🎁 КОНКУРС', callback_data: 'menu_contest' }
        ],
        [
          { text: '💬 Тикеты', callback_data: 'menu_tickets' }
        ],
        [
          { text: '📢 Проверить подписку', callback_data: 'check_subscription' }
        ],
        [
          { text: '📋 Помощь', callback_data: 'menu_help' }
        ]
      ]
    }
  };
}

// Меню профиля
export function getProfileMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔗 Поделиться реферальной ссылкой', callback_data: 'profile_share' }
        ],
        [
          { text: '◀️ Назад в меню', callback_data: 'menu_main' }
        ]
      ]
    }
  };
}

// Меню розыгрышей
export function getGiveawaysMenu(giveaways) {
  const buttons = [];
  
  if (giveaways && giveaways.length > 0) {
    giveaways.slice(0, 5).forEach((giveaway) => {
      buttons.push([
        { 
          text: `🎯 ${giveaway.title}`, 
          callback_data: `giveaway_view_${giveaway.id}` 
        }
      ]);
    });
  }
  
  buttons.push([
    { text: '◀️ Назад в меню', callback_data: 'menu_main' }
  ]);
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

export default {
  getMainMenu,
  getProfileMenu,
  getGiveawaysMenu,
};


import db from '../db.js';
import { Markup } from 'telegraf';

// Даты этапов (МСК)
export const CONTEST_STAGES = {
  STAGE_1: {
    id: 1,
    name: 'ЭТАП 1',
    period: '29.12 - 04.01',
    startDate: new Date('2024-12-29T00:00:00+03:00'),
    endDate: new Date('2025-01-04T23:59:59+03:00'),
    conditions: '- Минимум 2 приглашённых реферала\n💡 Дополнительные шансы: Каждый второй реферал = +1 билет',
    prizes: '💎 5 × Двухнедельная подписка на приватный канал\n💎 1 × Месячная подписка на приватный канал\n💰 5 × Скидка 25% на билеты челленджа\n💰 5 × Билет челленджа $1,000 📋',
    drawDate: '4 января на вебинаре'
  },
  STAGE_2: {
    id: 2,
    name: 'ЭТАП 2',
    period: '05.01 - 11.01',
    startDate: new Date('2025-01-05T00:00:00+03:00'),
    endDate: new Date('2025-01-11T23:59:59+03:00'),
    conditions: '- Минимум 2 реферала\n- Участие в викторине (03.01)',
    prizes: '💎 5 × Двухнедельная подписка на приватный канал\n💎 1 × Месячная подписка на приватный канал\n🎓 1 × Консультация с экспертом (1 час)\n💰 5 × Скидка 25% на билеты челленджа\n💰 1 × Билет челленджа $5,000 🔥',
    drawDate: '11 января на вебинаре'
  },
  STAGE_3: {
    id: 3,
    name: 'ФИНАЛ',
    period: '12.01 - 18.01',
    startDate: new Date('2025-01-12T00:00:00+03:00'),
    endDate: new Date('2025-01-18T23:59:59+03:00'),
    conditions: '→ Новые задания каждый день\n→ Баллы с этапов 1-2 учитываются\n→ Активность в сообществе',
    prizes: '🥇 1 место: Билет $10,000 + Месяц подписки + Консультация\n🥈 2 место: Билет $10,000 + Месяц подписки\n🥉 3 место: Билет $5,000 + Месяц подписки\n4️⃣ 4 место: Билет $5,000\n🎁 Секретный приз',
    drawDate: '18 января на вебинаре'
  }
};

export const getCurrentStage = () => {
  const now = new Date();
  
  // Проверяем этапы по порядку
  if (now >= CONTEST_STAGES.STAGE_1.startDate && now <= CONTEST_STAGES.STAGE_1.endDate) {
    return CONTEST_STAGES.STAGE_1;
  }
  if (now >= CONTEST_STAGES.STAGE_2.startDate && now <= CONTEST_STAGES.STAGE_2.endDate) {
    return CONTEST_STAGES.STAGE_2;
  }
  if (now >= CONTEST_STAGES.STAGE_3.startDate && now <= CONTEST_STAGES.STAGE_3.endDate) {
    return CONTEST_STAGES.STAGE_3;
  }
  
  // Если до начала первого этапа - возвращаем первый этап
  if (now < CONTEST_STAGES.STAGE_1.startDate) {
    return CONTEST_STAGES.STAGE_1;
  }
  
  // Если после окончания всех этапов - возвращаем последний этап
  return CONTEST_STAGES.STAGE_3;
};

export const calculateTickets = (referralCount) => {
  return Math.floor(referralCount / 2);
};

export const handleContestMenu = async (ctx) => {
  const userId = ctx.from.id;
  const user = await db.getUser(userId) || {};
  const referralCount = await db.getReferralCount(userId);
  const tickets = calculateTickets(referralCount);
  const stage = getCurrentStage();
  
  // Рассчитываем время до конца этапа
  const now = new Date();
  const diff = stage.endDate - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const countdown = diff > 0 ? `${days}д ${hours}ч` : 'Завершен';

  const isParticipant = referralCount >= 2;
  const statusWarning = !isParticipant ? `\n⚠️ Для участия в розыгрыше пригласи ещё ${2 - referralCount} друга` : '';

  const message = `🎁 КОНКУРС MOMENTUM TRADING\n\n` +
    `📅 Сейчас идёт: ${stage.name} (${stage.period})\n\n` +
    `Твой статус участия:\n` +
    `├─ Приглашено рефералов: ${referralCount}\n` +
    `├─ Билетов: ${tickets}\n` +
    `└─ Баллов накоплено: ${user.points || 0}\n` +
    statusWarning + `\n\n` +
    `До конца этапа: ${countdown}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🎁 Призы этой недели', 'contest_prizes')],
    [Markup.button.callback('👥 Мои рефералы', 'contest_referrals')],
    [Markup.button.callback('📊 Моя статистика', 'contest_stats')],
    [Markup.button.callback('🏆 Лидерборд', 'menu_leaderboard')],
    [Markup.button.callback('📋 Правила конкурса', 'contest_rules')],
    [Markup.button.callback('🔗 Поделиться ссылкой', 'contest_share')],
    [Markup.button.callback('◀️ Назад', 'menu_main')]
  ]);

  try {
    await ctx.editMessageText(message, keyboard);
  } catch (e) {
    await ctx.reply(message, keyboard);
  }
};

export const handleContestPrizes = async (ctx) => {
  const stage = getCurrentStage();
  const message = `🎁 ПРИЗЫ ${stage.name}\n\n` +
    `Разыгрываем среди выполнивших условия:\n` +
    stage.prizes + `\n\n` +
    `Условия участия:\n` +
    stage.conditions + `\n\n` +
    `⏰ Розыгрыш: ${stage.drawDate}\n\n` +
    `Все баллы сохраняются для финала! 🏆`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад', 'menu_contest')]
  ]);

  await ctx.editMessageText(message, keyboard);
};

export const handleContestRules = async (ctx) => {
  const message = `📋 ПРАВИЛА КОНКУРСА\n\n` +
    `🎯 КАК ЭТО РАБОТАЕТ\n\n` +
    `Конкурс длится 3 недели (29.12 - 18.01)\n` +
    `Каждая неделя = отдельный этап\n\n` +
    `ЭТАП 1 и ЭТАП 2:\n` +
    `- Призы — случайный розыгрыш\n` +
    `- Минимальные условия для участия\n` +
    `- Баллы копятся для финала\n\n` +
    `ЭТАП 3 (финал):\n` +
    `- БЕЗ рандома — только баллы\n` +
    `- Главные призы топ-4 участникам\n` +
    `- Все баллы с этапов 1-2 учитываются\n\n` +
    `📊 КАК НАБРАТЬ БАЛЛЫ\n\n` +
    `✅ Приглашать рефералов (+10 баллов за активного)\n` +
    `✅ Участвовать в викторине (этап 2)\n` +
    `✅ Быть активным в чате (+2 балла за сообщение 50+ симв.)\n\n` +
    `⚖️ ВАЖНЫЕ ПРАВИЛА\n` +
    `1. Один аккаунт = один участник\n` +
    `2. Накрутка = дисквалификация`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад', 'menu_contest')]
  ]);

  await ctx.editMessageText(message, keyboard);
};

export const handleContestStats = async (ctx) => {
  const userId = ctx.from.id;
  const user = await db.getUser(userId) || {};
  const referralCount = await db.getReferralCount(userId);
  const tickets = calculateTickets(referralCount);
  
  // Здесь в идеале нужен запрос к лидерборду для определения места
  const rank = 'Скоро...'; 

  const message = `📊 ТВОЯ СТАТИСТИКА\n\n` +
    `🎟 Билеты в лотерею: ${tickets}\n` +
    `(Каждый билет = 1 шанс на приз)\n\n` +
    `⭐️ Баллы накоплено: ${user.points || 0}\n\n` +
    `Детализация:\n` +
    `├─ Этап 1: ${user.stage1_points || 0} баллов\n` +
    `├─ Этап 2: ${user.stage2_points || 0} баллов\n` +
    `└─ Этап 3: ${user.stage3_points || 0} баллов\n\n` +
    `💡 Баллы копятся и влияют на финал!\n\n` +
    `Твой ранг: ${rank}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад', 'menu_contest')]
  ]);

  await ctx.editMessageText(message, keyboard);
};

export const handleContestReferrals = async (ctx, page = 1, filter = 'all') => {
  const userId = ctx.from.id;
  const referrals = await db.getReferrals(userId);
  
  // Имитация фильтрации "Активные" (например, те кто подписался на канал)
  let filtered = referrals;
  if (filter === 'active') {
    filtered = referrals.filter(r => r.username);
  } else if (filter === 'registered') {
    filtered = referrals.filter(r => !r.username);
  }

  const total = referrals.length;
  const activeCount = referrals.filter(r => r.username).length;
  const registeredCount = total - activeCount;

  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pagedReferrals = filtered.slice(start, end);

  let message = `👥 МОИ РЕФЕРАЛЫ\n\n` +
    `Всего приглашено: ${total}\n` +
    `├─ Активных: ${activeCount}\n` +
    `└─ Прошли регистрацию: ${registeredCount}\n\n` +
    `🔗 Твоя реферальная ссылка:\n` +
    `https://t.me/${ctx.botInfo.username}?start=ref_${userId}\n\n` +
    `💡 Что дают рефералы на каждом этапе:\n` +
    `- Этап 1: каждые 2 реферала = +1 билет\n` +
    `- Этап 2: каждый новый реферал +10 баллов\n` +
    `- Этап 3: продолжаешь копить баллы\n\n` +
    `📋 СПИСОК (${filter === 'active' ? 'Активные' : filter === 'registered' ? 'Регистрации' : 'Все'}):\n\n`;

  if (pagedReferrals.length === 0) {
    message += 'Список пуст';
  } else {
    pagedReferrals.forEach((ref, i) => {
      const name = ref.first_name || 'Пользователь';
      const username = ref.username ? `@${ref.username}` : 'ID: ' + ref.user_id;
      const status = ref.username ? '✅ Активен' : '⏳ Не завершил';
      message += `${start + i + 1}. ${name} (${username}) - ${status}\n`;
    });
  }

  const buttons = [
    [
      Markup.button.callback('Все', 'refs_filter_all'),
      Markup.button.callback('✅ Активные', 'refs_filter_active'),
      Markup.button.callback('⏳ Регистрации', 'refs_filter_registered')
    ]
  ];

  // Кнопки пагинации
  const navButtons = [];
  if (page > 1) navButtons.push(Markup.button.callback('⬅️ Пред.', `refs_page_${page - 1}_${filter}`));
  if (page < totalPages) navButtons.push(Markup.button.callback('След. ➡️', `refs_page_${page + 1}_${filter}`));
  if (navButtons.length > 0) buttons.push(navButtons);

  buttons.push([Markup.button.callback('◀️ Назад', 'menu_contest')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  try {
    await ctx.editMessageText(message, keyboard);
  } catch (e) {
    await ctx.reply(message, keyboard);
  }
};

export default {
  handleContestMenu,
  handleContestPrizes,
  handleContestRules,
  handleContestStats,
  handleContestReferrals,
  getCurrentStage,
  CONTEST_STAGES
};

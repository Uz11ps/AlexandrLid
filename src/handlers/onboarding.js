import db from '../db.js';

// Обработчик команды /start
export async function handleStart(ctx) {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name;
  const languageCode = ctx.from.language_code;
  const isBot = ctx.from.is_bot || false;

  // Парсинг реферального кода из параметра start
  // Сначала проверяем текст сообщения, так как ctx.startParam может быть некорректным
  let startParam = null;
  
  console.log('[REFERRAL DEBUG] Raw ctx.startParam:', ctx.startParam, 'ctx.match:', ctx.match, 'Message text:', ctx.message?.text);
  
  if (ctx.message && ctx.message.text) {
    // Парсим из текста команды /start ref_123456
    const text = ctx.message.text.trim();
    console.log('[REFERRAL DEBUG] Parsing text:', text, 'Length:', text.length);
    
    // Метод 1: Разделение по пробелу
    const parts = text.split(/\s+/);
    console.log('[REFERRAL DEBUG] Split parts:', parts);
    if (parts.length > 1 && parts[0] === '/start') {
      startParam = parts.slice(1).join(' ').trim();
      console.log('[REFERRAL DEBUG] Extracted startParam from split:', startParam);
    }
    
    // Метод 2: Регулярное выражение (если первый метод не сработал)
    if (!startParam) {
      const match = text.match(/\/start\s+(.+)/);
      console.log('[REFERRAL DEBUG] Regex match result:', match);
      if (match && match[1]) {
        startParam = match[1].trim();
        console.log('[REFERRAL DEBUG] Extracted startParam from regex:', startParam);
      }
    }
  }
  
  // Если не нашли в тексте, проверяем ctx.startParam (но игнорируем значение "start")
  if (!startParam && ctx.startParam && ctx.startParam !== 'start' && ctx.startParam.trim() !== 'start') {
    startParam = ctx.startParam.trim();
    console.log('[REFERRAL DEBUG] Using ctx.startParam:', startParam);
  }
  
  // Также проверяем ctx.match как запасной вариант
  if (!startParam && ctx.match && Array.isArray(ctx.match) && ctx.match.length > 0) {
    const matchValue = ctx.match[0];
    if (matchValue && matchValue !== 'start' && matchValue.trim() !== 'start') {
      startParam = matchValue.trim();
      console.log('[REFERRAL DEBUG] Using ctx.match:', startParam);
    }
  }
  
  let referrerId = null;
  
  console.log('[REFERRAL DEBUG] Final startParam:', startParam, 'User ID:', userId);

  if (startParam && typeof startParam === 'string' && startParam.startsWith('ref_')) {
    const refUserId = parseInt(startParam.replace('ref_', ''));
    console.log('[REFERRAL DEBUG] Parsed referrer ID:', refUserId, 'Is valid:', !isNaN(refUserId) && refUserId !== userId);
    if (!isNaN(refUserId) && refUserId !== userId && refUserId > 0) {
      referrerId = refUserId;
    }
  }
  
  console.log('[REFERRAL DEBUG] Final referrerId:', referrerId);

  // Проверка реферера (если указан) - делаем до проверки существующего пользователя
  if (referrerId) {
    const referrer = await db.getUser(referrerId);
    console.log('[REFERRAL DEBUG] Referrer check - referrer found:', !!referrer, 'referrerId:', referrerId);
    if (!referrer) {
      console.log('[REFERRAL DEBUG] Referrer not found in database, ignoring');
      referrerId = null; // Реферер не найден, игнорируем
    } else if (referrerId === userId) {
      console.log('[REFERRAL DEBUG] User trying to refer themselves, ignoring');
      referrerId = null; // Нельзя быть рефералом самого себя
    }
  }

  // Проверка на существование пользователя
  const existingUser = await db.getUser(userId);
  console.log('[REFERRAL DEBUG] Existing user:', !!existingUser, 'referrerId after checks:', referrerId);

  if (existingUser) {
    // Пользователь уже зарегистрирован, но проверяем реферальную ссылку
    console.log('Existing user found, referrerId:', referrerId);
    if (referrerId) {
      // Пытаемся создать реферальную связь (если еще не существует)
      console.log('Attempting to create referral:', referrerId, '->', userId);
      const referralCreated = await db.createReferral(referrerId, userId);
      console.log('Referral created:', referralCreated ? 'YES' : 'NO (already exists or error)');
      
      if (referralCreated) {
        // Уведомление реферера о новом реферале
        try {
          await ctx.telegram.sendMessage(
            referrerId,
            `🎉 У вас новый реферал!\n\n` +
            `Пользователь ${firstName || 'без имени'} присоединился по вашей ссылке.`
          );
          
          // Триггер автоворонки для нового реферала
          try {
            const { triggerNewReferralFunnel } = await import('../utils/autofunnel.js');
            await triggerNewReferralFunnel(ctx, referrerId);
          } catch (error) {
            console.error('Ошибка при запуске автоворонки нового реферала:', error);
          }
        } catch (error) {
          console.error('Не удалось отправить уведомление рефереру:', error);
        }
      } else {
        console.log('Referral was not created - may already exist or referrer not found');
      }
    } else {
      console.log('No referrerId provided or invalid');
    }
    
    // Обновляем данные пользователя (но не меняем referrer_id, если он уже установлен)
    await db.createUser({
      user_id: userId,
      username,
      first_name: firstName,
      last_name: lastName,
      language_code: languageCode,
      referrer_id: existingUser.referrer_id, // Сохраняем существующего реферера
      is_bot: isBot,
    });

    // Синхронизация с CRM: обновление лида
    try {
      await db.createOrUpdateLeadFromUser(userId, {
        fio: `${firstName || ''} ${lastName || ''}`.trim() || null
      });
    } catch (error) {
      console.error('Ошибка при синхронизации лида в CRM:', error);
      // Не прерываем процесс, если синхронизация не удалась
    }
    
    const { getMainMenu } = await import('./menu.js');
    return ctx.reply(
      `👋 С возвращением, ${firstName || 'друг'}!\n\n` +
      `${referrerId ? '✅ Реферальная ссылка засчитана!\n\n' : ''}` +
      `Выберите действие в меню:`,
      getMainMenu()
    );
  }

  // Создание нового пользователя
  await db.createUser({
    user_id: userId,
    username,
    first_name: firstName,
    last_name: lastName,
    language_code: languageCode,
    referrer_id: referrerId,
    is_bot: isBot,
  });

  // Синхронизация с CRM: создание/обновление лида
  try {
    await db.createOrUpdateLeadFromUser(userId, {
      fio: `${firstName || ''} ${lastName || ''}`.trim() || null
    });
  } catch (error) {
    console.error('Ошибка при синхронизации лида в CRM:', error);
    // Не прерываем процесс регистрации, если синхронизация не удалась
  }

  // Создание реферальной связи (если есть реферер)
  if (referrerId) {
    await db.createReferral(referrerId, userId);
    
    // Уведомление реферера о новом реферале
    try {
      await ctx.telegram.sendMessage(
        referrerId,
        `🎉 У вас новый реферал!\n\n` +
        `Пользователь ${firstName || 'без имени'} присоединился по вашей ссылке.`
      );
      
      // Триггер автоворонки для нового реферала
      try {
        const { triggerNewReferralFunnel } = await import('../utils/autofunnel.js');
        await triggerNewReferralFunnel(ctx, referrerId);
      } catch (error) {
        console.error('Ошибка при запуске автоворонки нового реферала:', error);
      }
    } catch (error) {
      console.error('Не удалось отправить уведомление рефереру:', error);
    }
  }

  // Триггер автоворонки регистрации
  try {
    const { triggerRegistrationFunnel } = await import('../utils/autofunnel.js');
    await triggerRegistrationFunnel(ctx, userId);
  } catch (error) {
    console.error('Ошибка при запуске автоворонки регистрации:', error);
  }

  // Приветственное сообщение
  const welcomeMessage = 
    `👋 Добро пожаловать, ${firstName || 'друг'}!\n\n` +
    `${referrerId ? '✅ Вы присоединились по реферальной ссылке!\n\n' : ''}` +
    `Выберите действие в меню ниже:`;

  const { getMainMenu } = await import('./menu.js');
  await ctx.reply(welcomeMessage, getMainMenu());

  // Отправка лид-магнита
  try {
    const { sendLeadMagnet } = await import('../utils/leadMagnet.js');
    await sendLeadMagnet(ctx);
  } catch (error) {
    console.error('Ошибка при отправке лид-магнита:', error);
  }
}

export default handleStart;


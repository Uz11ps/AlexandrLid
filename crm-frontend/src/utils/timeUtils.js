/**
 * Утилиты для работы с московским временем (MSK = UTC+3)
 * Все функции работают с московским временем как основным
 */

/**
 * Конвертирует UTC время из БД в московское время для отображения
 * @param {Date|string} utcDate - Date объект или ISO строка в UTC
 * @returns {Date} - Date объект с московским временем (добавлено 3 часа)
 */
export function utcToMoscow(utcDate) {
  if (!utcDate) return null;
  
  const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
  if (isNaN(date.getTime())) return null;
  
  // Добавляем 3 часа для конвертации из UTC в московское время
  return new Date(date.getTime() + (3 * 60 * 60 * 1000));
}

/**
 * Форматирует UTC время в строку московского времени для отображения
 * @param {Date|string} utcDate - Date объект или ISO строка в UTC
 * @param {object} options - Опции форматирования
 * @returns {string} - Отформатированная строка времени
 */
export function formatMoscowTime(utcDate, options = {}) {
  if (!utcDate) return '-';
  
  try {
    // Если это строка, создаем Date объект
    let date;
    if (utcDate instanceof Date) {
      date = utcDate;
    } else if (typeof utcDate === 'string') {
      // Если строка уже содержит Z (UTC), используем как есть
      // Иначе добавляем Z для явного указания UTC
      const dateStr = utcDate.endsWith('Z') ? utcDate : utcDate + 'Z';
      date = new Date(dateStr);
    } else {
      date = new Date(utcDate);
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', utcDate);
      return '-';
    }
    
    // Получаем UTC компоненты исходного времени
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    const utcSeconds = date.getUTCSeconds();
    
    // Отладочный вывод (можно удалить после исправления)
    console.log('formatMoscowTime:', {
      input: utcDate,
      utcISO: date.toISOString(),
      utcComponents: { utcYear, utcMonth: utcMonth + 1, utcDay, utcHours, utcMinutes }
    });
    
    // Добавляем 3 часа для московского времени
    let moscowHours = utcHours + 3;
    let moscowDay = utcDay;
    let moscowMonth = utcMonth;
    let moscowYear = utcYear;
    
    // Обработка перехода через полночь (если часы >= 24)
    if (moscowHours >= 24) {
      moscowHours -= 24;
      moscowDay += 1;
      // Проверка перехода через месяц
      const daysInMonth = new Date(moscowYear, moscowMonth + 1, 0).getDate();
      if (moscowDay > daysInMonth) {
        moscowDay = 1;
        moscowMonth += 1;
        // Проверка перехода через год
        if (moscowMonth >= 12) {
          moscowMonth = 0;
          moscowYear += 1;
        }
      }
    }
    
    const {
      includeDate = true,
      includeTime = true,
      format = 'ru-RU'
    } = options;
    
    // Форматируем результат
    const year = moscowYear;
    const month = String(moscowMonth + 1).padStart(2, '0');
    const day = String(moscowDay).padStart(2, '0');
    const hours = String(moscowHours).padStart(2, '0');
    const minutes = String(utcMinutes).padStart(2, '0');
    
    const result = format === 'datetime-local' 
      ? `${year}-${month}-${day}T${hours}:${minutes}`
      : (includeDate && includeTime 
          ? `${day}.${month}.${year}, ${hours}:${minutes}`
          : includeDate 
            ? `${day}.${month}.${year}`
            : includeTime 
              ? `${hours}:${minutes}`
              : '-');
    
    console.log('formatMoscowTime result:', result);
    return result;
  } catch (error) {
    console.error('Error in formatMoscowTime:', error, utcDate);
    return '-';
  }
}

export default {
  utcToMoscow,
  formatMoscowTime
};


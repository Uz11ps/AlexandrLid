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
    
    // Добавляем 3 часа для московского времени
    const moscowHours = utcHours + 3;
    
    // Создаем новую дату с московским временем
    // Используем Date.UTC для создания правильного timestamp
    const moscowTimestamp = Date.UTC(utcYear, utcMonth, utcDay, moscowHours, utcMinutes, utcSeconds);
    const moscowDate = new Date(moscowTimestamp);
    
    const {
      includeDate = true,
      includeTime = true,
      format = 'ru-RU'
    } = options;
    
    // Извлекаем компоненты московского времени
    const year = moscowDate.getUTCFullYear();
    const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(moscowDate.getUTCDate()).padStart(2, '0');
    const hours = String(moscowDate.getUTCHours()).padStart(2, '0');
    const minutes = String(moscowDate.getUTCMinutes()).padStart(2, '0');
    
    if (format === 'datetime-local') {
      // Формат для input[type="datetime-local"]: YYYY-MM-DDTHH:mm
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    if (format === 'ru-RU') {
      if (includeDate && includeTime) {
        return `${day}.${month}.${year}, ${hours}:${minutes}`;
      } else if (includeDate) {
        return `${day}.${month}.${year}`;
      } else if (includeTime) {
        return `${hours}:${minutes}`;
      }
    }
    
    return '-';
  } catch (error) {
    console.error('Error in formatMoscowTime:', error, utcDate);
    return '-';
  }
}

export default {
  utcToMoscow,
  formatMoscowTime
};


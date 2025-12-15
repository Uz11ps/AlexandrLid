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
  
  // Если это строка, создаем Date объект
  const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
  if (isNaN(date.getTime())) return '-';
  
  // Добавляем 3 часа для конвертации из UTC в московское время
  const moscowTimestamp = date.getTime() + (3 * 60 * 60 * 1000);
  const moscowDate = new Date(moscowTimestamp);
  
  const {
    includeDate = true,
    includeTime = true,
    format = 'ru-RU'
  } = options;
  
  if (format === 'datetime-local') {
    // Формат для input[type="datetime-local"]: YYYY-MM-DDTHH:mm
    // Используем UTC методы, так как timestamp уже скорректирован
    const year = moscowDate.getUTCFullYear();
    const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(moscowDate.getUTCDate()).padStart(2, '0');
    const hours = String(moscowDate.getUTCHours()).padStart(2, '0');
    const minutes = String(moscowDate.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  if (format === 'ru-RU') {
    // Формат для отображения: ДД.ММ.ГГГГ, ЧЧ:ММ
    // Используем UTC методы, так как timestamp уже скорректирован
    const year = moscowDate.getUTCFullYear();
    const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(moscowDate.getUTCDate()).padStart(2, '0');
    const hours = String(moscowDate.getUTCHours()).padStart(2, '0');
    const minutes = String(moscowDate.getUTCMinutes()).padStart(2, '0');
    
    if (includeDate && includeTime) {
      return `${day}.${month}.${year}, ${hours}:${minutes}`;
    } else if (includeDate) {
      return `${day}.${month}.${year}`;
    } else if (includeTime) {
      return `${hours}:${minutes}`;
    }
  }
  
  return '-';
}

export default {
  utcToMoscow,
  formatMoscowTime
};


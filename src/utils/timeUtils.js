/**
 * Утилиты для работы с московским временем (MSK = UTC+3)
 * Все функции работают с московским временем как основным
 */

/**
 * Конвертирует московское время в UTC для сохранения в БД
 * @param {string} moscowDateTime - Время в формате "YYYY-MM-DDTHH:mm" (московское время)
 * @returns {Date} - Date объект в UTC
 */
export function moscowToUTC(moscowDateTime) {
  if (!moscowDateTime) return null;
  
  // Парсим дату и время из формата "YYYY-MM-DDTHH:mm"
  const [datePart, timePart] = moscowDateTime.split('T');
  if (!datePart || !timePart) return null;
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    return null;
  }
  
  // Создаем Date объект в UTC, вычитая 3 часа (московское время = UTC+3)
  const moscowDateUTC = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  // Вычитаем 3 часа для конвертации из московского в UTC
  const utcTimestamp = moscowDateUTC - (3 * 60 * 60 * 1000);
  
  return new Date(utcTimestamp);
}

/**
 * Конвертирует Date объект из строки формата "ДД.ММ.ГГГГ ЧЧ:ММ" (московское время) в UTC
 * @param {string} dateTimeStr - Время в формате "ДД.ММ.ГГГГ ЧЧ:ММ" (московское время)
 * @returns {Date} - Date объект в UTC или null
 */
export function parseMoscowDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;
  
  const [datePart, timePart] = dateTimeStr.split(' ');
  if (!datePart || !timePart) return null;
  
  const [day, month, year] = datePart.split('.').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    return null;
  }
  
  // Создаем Date объект в UTC, вычитая 3 часа (московское время = UTC+3)
  const moscowDateUTC = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const utcTimestamp = moscowDateUTC - (3 * 60 * 60 * 1000);
  
  return new Date(utcTimestamp);
}

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
 * Форматирует время в строку московского времени для отображения
 * @param {Date|string} dateValue - Date объект или ISO строка
 * @param {object} options - Опции форматирования
 * @returns {string} - Отформатированная строка времени в московском часовом поясе
 */
export function formatMoscowTime(dateValue, options = {}) {
  if (!dateValue) return '-';
  
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return '-';
  
  const {
    includeDate = true,
    includeTime = true,
    format = 'ru-RU'
  } = options;
  
  // Используем toLocaleString с московским часовым поясом для корректного отображения
  if (format === 'datetime-local') {
    // Формат для input[type="datetime-local"]: YYYY-MM-DDTHH:mm
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(date).replace(' ', 'T');
  }
  
  // Формат для отображения в русском стиле
  const formatOptions = {
    timeZone: 'Europe/Moscow',
    hour12: false
  };
  
  if (includeDate) {
    formatOptions.year = 'numeric';
    formatOptions.month = '2-digit';
    formatOptions.day = '2-digit';
  }
  
  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }
  
  return date.toLocaleString('ru-RU', formatOptions);
}

/**
 * Проверяет, что московское время не в прошлом
 * @param {Date} moscowDate - Date объект (уже должен быть в UTC, но представлять московское время)
 * @returns {boolean} - true если время в будущем
 */
export function isMoscowTimeInFuture(moscowDate) {
  if (!moscowDate) return false;
  
  // Текущее время в UTC
  const nowUTC = new Date();
  // Конвертируем текущее время в московское для сравнения
  const nowMoscow = utcToMoscow(nowUTC);
  
  // Сравниваем московские времена
  return moscowDate > nowMoscow;
}

export default {
  moscowToUTC,
  parseMoscowDateTime,
  utcToMoscow,
  formatMoscowTime,
  isMoscowTimeInFuture
};


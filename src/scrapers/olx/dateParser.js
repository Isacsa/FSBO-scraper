/**
 * Parser de datas específico para OLX
 * Processa todos os formatos de data que o OLX usa e retorna ISO UTC
 */

/**
 * Parse de datas relativas (Hoje, Ontem, Há X dias)
 */
function parseRelativeDate(text, now = new Date()) {
  const lowerText = text.toLowerCase().trim();
  
  // "Hoje" ou "Hoje às HH:MM"
  if (lowerText.includes('hoje')) {
    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      const date = new Date(now);
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return date.toISOString();
    }
    // Hoje sem hora específica - usar início do dia
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }
  
  // "Ontem" ou "Ontem às HH:MM"
  if (lowerText.includes('ontem')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      yesterday.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    } else {
      yesterday.setHours(0, 0, 0, 0);
    }
    return yesterday.toISOString();
  }
  
  // "Há X dias" ou "Há X horas"
  const daysMatch = lowerText.match(/há\s+(\d+)\s+dias?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }
  
  const hoursMatch = lowerText.match(/há\s+(\d+)\s+horas?/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    const date = new Date(now);
    date.setHours(date.getHours() - hours);
    return date.toISOString();
  }
  
  return null;
}

/**
 * Parse de datas absolutas (DD/MM/YYYY, DD de Mês, etc)
 */
function parseAbsoluteDate(text, now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  
  // Formato DD/MM/YYYY ou DD-MM-YYYY
  const slashMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    }
  }
  
  // Formato "DD de Mês" ou "DD de Mês de YYYY"
  const monthNames = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2,
    'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8,
    'outubro': 9, 'novembro': 10, 'dezembro': 11,
    'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
  };
  
  // "DD de Mês de YYYY"
  const fullDateMatch = text.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (fullDateMatch) {
    const [, day, monthName, year] = fullDateMatch;
    const month = monthNames[monthName.toLowerCase()];
    if (month !== undefined) {
      const date = new Date(parseInt(year, 10), month, parseInt(day, 10));
      if (!isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      }
    }
  }
  
  // "DD de Mês" (sem ano)
  const partialDateMatch = text.match(/(\d{1,2})\s+de\s+(\w+)/i);
  if (partialDateMatch) {
    const [, day, monthName] = partialDateMatch;
    const month = monthNames[monthName.toLowerCase()];
    if (month !== undefined) {
      let year = currentYear;
      const dayNum = parseInt(day, 10);
      
      // Criar data com ano atual
      const date = new Date(year, month, dayNum);
      
      // Se a data for futura (ex: 25 de Dezembro quando estamos em Janeiro),
      // usar ano anterior
      if (date > now) {
        year = currentYear - 1;
        date.setFullYear(year);
      }
      
      if (!isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      }
    }
  }
  
  // Formato "DD Mês" ou "DD Mês YYYY" (sem "de")
  const shortDateMatch = text.match(/(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/i);
  if (shortDateMatch) {
    const [, day, monthName, year] = shortDateMatch;
    const month = monthNames[monthName.toLowerCase()];
    if (month !== undefined) {
      let finalYear = year ? parseInt(year, 10) : currentYear;
      const dayNum = parseInt(day, 10);
      
      const date = new Date(finalYear, month, dayNum);
      
      // Se não tiver ano e a data for futura, usar ano anterior
      if (!year && date > now) {
        finalYear = currentYear - 1;
        date.setFullYear(finalYear);
      }
      
      if (!isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      }
    }
  }
  
  return null;
}

/**
 * Parse de datas com "Publicado em" ou "Atualizado em"
 */
function parseWithPrefix(text, now = new Date()) {
  const lowerText = text.toLowerCase().trim();
  
  // Caso especial: "Publicado às HH:MM" ou "Atualizado às HH:MM"
  // Quando só tem hora, assume que é hoje
  const timeOnlyMatch = text.match(/(?:publicado|atualizado)\s+às\s+(\d{1,2}):(\d{2})/i);
  if (timeOnlyMatch) {
    const [, hours, minutes] = timeOnlyMatch;
    const date = new Date(now);
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return date.toISOString();
  }
  
  // Remover prefixos comuns
  const cleaned = text
    .replace(/^(publicado|atualizado)\s+(em|à|às|há)\s*/i, '')
    .replace(/^(publicado|atualizado)\s*/i, '')
    .trim();
  
  if (cleaned !== text) {
    // Tentar parsear a data limpa
    const relative = parseRelativeDate(cleaned, now);
    if (relative) return relative;
    
    const absolute = parseAbsoluteDate(cleaned, now);
    if (absolute) return absolute;
  }
  
  return null;
}

/**
 * Função principal de parsing de datas do OLX
 * @param {string} dateText - Texto da data como aparece no site
 * @param {Date} now - Data atual (para cálculos relativos, opcional)
 * @returns {string|null} - Data em formato ISO UTC ou null
 */
function parseOLXDate(dateText, now = new Date()) {
  if (!dateText || typeof dateText !== 'string') {
    return null;
  }
  
  const cleaned = dateText.trim();
  if (!cleaned) {
    return null;
  }
  
  // Tentar parsear como data relativa primeiro
  const relative = parseRelativeDate(cleaned, now);
  if (relative) return relative;
  
  // Tentar parsear como data absoluta
  const absolute = parseAbsoluteDate(cleaned, now);
  if (absolute) return absolute;
  
  // Tentar parsear com prefixos
  const withPrefix = parseWithPrefix(cleaned, now);
  if (withPrefix) return withPrefix;
  
  // Se não conseguir parsear, retornar null
  console.warn(`[OLX DateParser] ⚠️  Não foi possível parsear a data: "${dateText}"`);
  return null;
}

module.exports = {
  parseOLXDate,
  parseRelativeDate,
  parseAbsoluteDate
};


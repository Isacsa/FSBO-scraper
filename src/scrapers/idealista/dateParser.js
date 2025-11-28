/**
 * Parser de datas específico para Idealista
 * Processa formatos de data do Idealista e retorna ISO UTC
 */

/**
 * Parse de datas relativas (Publicado há X dias, Atualizado ontem, etc)
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
  
  // "Há X dias" ou "Publicado há X dias"
  const daysMatch = lowerText.match(/(?:há|publicado há|atualizado há)\s+(\d+)\s+dias?/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }
  
  // "Há X horas"
  const hoursMatch = lowerText.match(/(?:há|publicado há|atualizado há)\s+(\d+)\s+horas?/i);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    const date = new Date(now);
    date.setHours(date.getHours() - hours);
    return date.toISOString();
  }
  
  // "Há X semanas"
  const weeksMatch = lowerText.match(/(?:há|publicado há|atualizado há)\s+(\d+)\s+semanas?/i);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10);
    const date = new Date(now);
    date.setDate(date.getDate() - (weeks * 7));
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }
  
  return null;
}

/**
 * Parse de datas absolutas (DD/MM/YYYY, DD de Mês, etc)
 */
function parseAbsoluteDate(text, now = new Date()) {
  const currentYear = now.getFullYear();
  
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
  
  // Formato "DD de Mês de YYYY" ou "DD de Mês"
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
      
      const date = new Date(year, month, dayNum);
      
      // Se a data for futura, usar ano anterior
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
  
  return null;
}

/**
 * Parse de atributo datetime (HTML5)
 */
function parseDatetimeAttribute(text) {
  // Tentar parsear como ISO string direto
  try {
    const date = new Date(text);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    // Continuar
  }
  
  return null;
}

/**
 * Função principal de parsing de datas do Idealista
 */
function parseIdealistaDate(dateText, now = new Date()) {
  if (!dateText || typeof dateText !== 'string') {
    return null;
  }
  
  const cleaned = dateText.trim();
  if (!cleaned) {
    return null;
  }
  
  // Tentar parsear como datetime attribute primeiro
  const datetime = parseDatetimeAttribute(cleaned);
  if (datetime) return datetime;
  
  // Tentar parsear como data relativa
  const relative = parseRelativeDate(cleaned, now);
  if (relative) return relative;
  
  // Tentar parsear como data absoluta
  const absolute = parseAbsoluteDate(cleaned, now);
  if (absolute) return absolute;
  
  // Remover prefixos comuns e tentar novamente
  const withoutPrefix = cleaned
    .replace(/^(publicado|atualizado)\s+(em|à|às|há)\s*/i, '')
    .replace(/^(publicado|atualizado)\s*/i, '')
    .trim();
  
  if (withoutPrefix !== cleaned) {
    const relative2 = parseRelativeDate(withoutPrefix, now);
    if (relative2) return relative2;
    
    const absolute2 = parseAbsoluteDate(withoutPrefix, now);
    if (absolute2) return absolute2;
  }
  
  console.warn(`[Idealista DateParser] ⚠️  Não foi possível parsear a data: "${dateText}"`);
  return null;
}

module.exports = {
  parseIdealistaDate,
  parseRelativeDate,
  parseAbsoluteDate,
  parseDatetimeAttribute
};


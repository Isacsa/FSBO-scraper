/**
 * Extrai dados brutos (raw) da página OLX
 * Sem limpeza ou normalização - apenas extração
 */

const selectors = require('./selectors');

/**
 * Tenta extrair usando múltiplos seletores
 */
async function extractWithSelectors(page, selectorList, extractFn = null) {
  for (const selector of selectorList) {
    try {
      const element = await page.$(selector);
      if (element) {
        if (extractFn) {
          const result = await extractFn(element);
          if (result) return result;
        } else {
          const text = await element.textContent().catch(() => '');
          if (text && text.trim()) return text.trim();
        }
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

/**
 * Extrai título
 */
async function extractTitle(page) {
  return await extractWithSelectors(page, selectors.title);
}

/**
 * Extrai preço
 */
async function extractPrice(page) {
  return await extractWithSelectors(page, selectors.price);
}

/**
 * Extrai localização
 */
async function extractLocation(page) {
  try {
    // Tentar extrair localização estruturada
    const locationData = await page.evaluate(() => {
      const locationEl = document.querySelector('.css-1deibjd');
      if (locationEl) {
        const paragraphs = Array.from(locationEl.querySelectorAll('p'));
        return paragraphs.map(p => p.textContent.trim()).filter(Boolean);
      }
      return null;
    });
    
    if (locationData && locationData.length > 0) {
      return {
        raw: locationData.join(', '),
        parts: locationData
      };
    }
    
    // Fallback para string simples
    const locationStr = await extractWithSelectors(page, selectors.location);
    return locationStr ? { raw: locationStr, parts: [locationStr] } : null;
  } catch (error) {
    return null;
  }
}

/**
 * Extrai coordenadas do mapa
 */
async function extractCoordinates(page) {
  try {
    const coords = await page.evaluate(() => {
      // Tentar encontrar iframe do mapa
      const iframe = document.querySelector('iframe[src*="maps"]');
      if (iframe) {
        const src = iframe.getAttribute('src');
        const latMatch = src.match(/[?&]ll=([^,&]+)/);
        if (latMatch) {
          const [lat, lng] = latMatch[1].split(',');
          return { lat: parseFloat(lat), lng: parseFloat(lng) };
        }
      }
      
      // Tentar data attributes
      const mapEl = document.querySelector('[data-lat], [data-lng]');
      if (mapEl) {
        const lat = mapEl.getAttribute('data-lat');
        const lng = mapEl.getAttribute('data-lng');
        if (lat && lng) {
          return { lat: parseFloat(lat), lng: parseFloat(lng) };
        }
      }
      
      return null;
    });
    
    return coords;
  } catch (error) {
    return null;
  }
}

/**
 * Extrai data de publicação e atualização
 */
async function extractDates(page) {
  try {
    const dates = await page.evaluate(() => {
      const result = { published: null, updated: null };
      
      // Procurar por "Publicado" ou "Atualizado"
      const allText = document.body.textContent || '';
      
      // Procurar elemento com data de publicação
      const publishedSelectors = [
        '[data-testid="ad-posted-at"]',
        '[data-cy="ad-posted-at"]',
        'p:has-text("Publicado")',
        'span:has-text("Publicado")',
        'div:has-text("Publicado")'
      ];
      
      for (const selector of publishedSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent.trim();
            if (text.toLowerCase().includes('publicado') || 
                text.toLowerCase().includes('hoje') ||
                text.toLowerCase().includes('ontem') ||
                text.match(/\d{1,2}[\/\-]\d{1,2}/)) {
              result.published = text;
              break;
            }
          }
          if (result.published) break;
        } catch (e) {
          continue;
        }
      }
      
      // Procurar por "Atualizado"
      const updatedSelectors = [
        '[data-testid="ad-updated-at"]',
        '[data-cy="ad-updated-at"]',
        'p:has-text("Atualizado")',
        'span:has-text("Atualizado")',
        'div:has-text("Atualizado")'
      ];
      
      for (const selector of updatedSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent.trim();
            if (text.toLowerCase().includes('atualizado')) {
              result.updated = text;
              break;
            }
          }
          if (result.updated) break;
        } catch (e) {
          continue;
        }
      }
      
      // Fallback: procurar padrões de data no texto
      if (!result.published) {
        const datePatterns = [
          /(?:Publicado|publicado)\s+(?:em|à|às|há)?\s*([^\.]+)/i,
          /(Hoje|Ontem|Há\s+\d+\s+dias?)/i,
          /(\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4})/,
          /(\d{1,2}\s+de\s+\w+)/i
        ];
        
        for (const pattern of datePatterns) {
          const match = allText.match(pattern);
          if (match) {
            result.published = match[0].trim();
            break;
          }
        }
      }
      
      return result;
    });
    
    return dates;
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair datas:', error.message);
    return { published: null, updated: null };
  }
}

/**
 * Extrai dados do anunciante
 */
async function extractAdvertiser(page) {
  try {
    const advertiserData = await page.evaluate(() => {
      // Nome
      const nameEl = document.querySelector('h4[data-testid="user-profile-user-name"]') ||
                     document.querySelector('[data-testid="user-profile-link"] h4');
      const name = nameEl ? nameEl.textContent.trim() : null;
      
      // URL
      const urlEl = document.querySelector('[data-testid="user-profile-link"]') ||
                    document.querySelector('a[href*="/ads/user/"]');
      const url = urlEl ? urlEl.getAttribute('href') : null;
      const fullUrl = url && !url.startsWith('http') ? `https://www.olx.pt${url}` : url;
      
      return { name, url: fullUrl };
    });
    
    return advertiserData;
  } catch (error) {
    return { name: null, url: null };
  }
}

/**
 * Extrai descrição
 */
async function extractDescription(page) {
  try {
    const description = await page.evaluate(() => {
      // Procurar h3 com texto "Descrição"
      const h3Elements = Array.from(document.querySelectorAll('h3'));
      const descH3 = h3Elements.find(h3 => h3.textContent.includes('Descrição'));
      if (descH3) {
        const nextSibling = descH3.nextElementSibling;
        if (nextSibling) {
          return nextSibling.textContent.trim();
        }
      }
      return null;
    });
    
    if (description) return description;
    
    // Fallback
    return await extractWithSelectors(page, selectors.description);
  } catch (error) {
    return null;
  }
}

/**
 * Extrai todas as fotos
 */
async function extractPhotos(page) {
  try {
    const photos = await page.evaluate(() => {
      const photoUrls = new Set();
      
      // Procurar todas as imagens relevantes
      const images = document.querySelectorAll('img[src*="olxcdn"], img[data-src*="olxcdn"], [class*="gallery"] img, [class*="image"] img');
      
      images.forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src && src.includes('olxcdn')) {
          // Tentar obter URL de alta resolução
          let highResUrl = src;
          
          // Remover parâmetros de redimensionamento se existirem
          highResUrl = highResUrl.replace(/[?&]resize=[^&]*/g, '');
          highResUrl = highResUrl.replace(/[?&]w=\d+/g, '');
          highResUrl = highResUrl.replace(/[?&]h=\d+/g, '');
          
          // Adicionar parâmetro para máxima resolução
          if (!highResUrl.includes('?')) {
            highResUrl += '?width=1920';
          } else {
            highResUrl += '&width=1920';
          }
          
          photoUrls.add(highResUrl);
        }
      });
      
      return Array.from(photoUrls);
    });
    
    return photos.length > 0 ? photos : null;
  } catch (error) {
    return null;
  }
}

/**
 * Extrai características/propriedades brutas
 * Retorna texto completo para processamento posterior
 */
async function extractPropertyFeatures(page) {
  try {
    const features = await page.evaluate(() => {
      const featuresObj = {};
      const featuresText = [];
      
      // Procurar parágrafos com padrão "Label: Value"
      const paragraphs = Array.from(document.querySelectorAll('p'));
      
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        featuresText.push(text); // Guardar texto completo
        
        const colonIndex = text.indexOf(':');
        
        if (colonIndex > 0) {
          const label = text.substring(0, colonIndex).trim();
          const value = text.substring(colonIndex + 1).trim();
          
          // Mapear labels conhecidos
          if (label.toLowerCase().includes('tipologia')) {
            featuresObj.tipology = value;
          } else if (label.toLowerCase().includes('área') || label.toLowerCase().includes('area')) {
            featuresObj.area = value;
          } else if (label.toLowerCase().includes('ano') || label.toLowerCase().includes('construção')) {
            featuresObj.year = value;
          } else if (label.toLowerCase().includes('andar') || label.toLowerCase().includes('piso')) {
            featuresObj.floor = value;
          } else if (label.toLowerCase().includes('condição') || label.toLowerCase().includes('estado')) {
            featuresObj.condition = value;
          } else if (label.toLowerCase().includes('casas de banho') || label.toLowerCase().includes('wc')) {
            featuresObj.bathrooms = value;
          } else if (label.toLowerCase().includes('certificado energético') || label.toLowerCase().includes('energia')) {
            featuresObj.energy = value;
          } else if (label.toLowerCase().includes('garagem') || label.toLowerCase().includes('estacionamento')) {
            featuresObj.garage = value;
          } else if (label.toLowerCase().includes('elevador') || label.toLowerCase().includes('ascensor')) {
            featuresObj.elevator = value;
          } else if (label.toLowerCase().includes('varanda') || label.toLowerCase().includes('terraço')) {
            featuresObj.balcony = value;
          }
        }
      });
      
      // Adicionar texto completo para processamento
      featuresObj._rawText = featuresText.join(' ');
      
      return featuresObj;
    });
    
    return features;
  } catch (error) {
    return { _rawText: '' };
  }
}

/**
 * Extrai ID do anúncio da URL
 */
function extractAdId(url) {
  try {
    const match = url.match(/ID([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Função principal de extração
 */
async function extractRawData(page, url) {
  console.log('[OLX Extract] 🔍 Iniciando extração de dados brutos...');
  
  const raw = {
    title: await extractTitle(page),
    price: await extractPrice(page),
    location: await extractLocation(page),
    coordinates: await extractCoordinates(page),
    dates: await extractDates(page),
    advertiser: await extractAdvertiser(page),
    description: await extractDescription(page),
    photos: await extractPhotos(page),
    features: await extractPropertyFeatures(page),
    ad_id: extractAdId(url)
  };
  
  console.log('[OLX Extract] ✅ Extração concluída');
  
  return raw;
}

module.exports = extractRawData;


/**
 * Extrai dados brutos (raw) da página OLX
 * Sem limpeza ou normalização - apenas extração
 */

const selectors = require('./selectors');

/**
 * Aguarda elemento aparecer na página
 */
async function waitForElement(page, selector, timeout = 3000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'attached' }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Tenta extrair usando múltiplos seletores com espera
 */
async function extractWithSelectors(page, selectorList, extractFn = null, waitFirst = false) {
  for (const selector of selectorList) {
    try {
      // Tentar esperar pelo primeiro seletor
      if (waitFirst && selector === selectorList[0]) {
        await waitForElement(page, selector, 2000);
      }
      
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
 * Extrai título com múltiplos métodos
 */
async function extractTitle(page) {
  // Método 1: Seletores CSS
  let title = await extractWithSelectors(page, selectors.title, null, true);
  if (title) return title;
  
  // Método 2: Procurar em h1, h2, h3, h4
  title = await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3, h4');
    for (const h of headings) {
      const text = h.textContent?.trim();
      if (text && text.length > 10 && text.length < 200) {
        return text;
      }
    }
    return null;
  });
  if (title) return title;
  
  // Método 3: Procurar em meta tags
  title = await page.evaluate(() => {
    const metaTitle = document.querySelector('meta[property="og:title"]') || 
                      document.querySelector('meta[name="title"]');
    if (metaTitle) {
      return metaTitle.getAttribute('content')?.trim();
    }
    return null;
  });
  if (title) return title;
  
  // Método 4: Procurar em JSON-LD
  title = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.name || data.headline) {
          return data.name || data.headline;
        }
      } catch (e) {}
    }
    return null;
  });
  
  return title;
}

/**
 * Extrai preço com múltiplos métodos
 */
async function extractPrice(page) {
  // Método 1: Seletores CSS
  let price = await extractWithSelectors(page, selectors.price, null, true);
  if (price) return price;
  
  // Método 2: Procurar por padrões de preço no texto
  price = await page.evaluate(() => {
    // Procurar elementos com €
    const priceElements = document.querySelectorAll('h1, h2, h3, h4, h5, span, div, p, strong');
    for (const el of priceElements) {
      const text = el.textContent?.trim() || '';
      // Padrão: número seguido de €
      const match = text.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*€/);
      if (match) {
        return match[0].trim();
      }
    }
    return null;
  });
  if (price) return price;
  
  // Método 3: Procurar em meta tags
  price = await page.evaluate(() => {
    const metaPrice = document.querySelector('meta[property="product:price:amount"]') ||
                      document.querySelector('meta[name="price"]');
    if (metaPrice) {
      const value = metaPrice.getAttribute('content');
      if (value) return `${value}€`;
    }
    return null;
  });
  if (price) return price;
  
  // Método 4: Procurar em JSON-LD
  price = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.offers?.price || data.price) {
          const priceValue = data.offers?.price || data.price;
          return `${priceValue}€`;
        }
      } catch (e) {}
    }
    return null;
  });
  
  return price;
}

/**
 * Extrai localização com múltiplos métodos
 */
async function extractLocation(page) {
  try {
    // Método 1: Seletores CSS específicos
    let locationData = await page.evaluate(() => {
      const locationEl = document.querySelector('.css-1deibjd');
      if (locationEl) {
        const paragraphs = Array.from(locationEl.querySelectorAll('p'));
        const parts = paragraphs.map(p => p.textContent.trim()).filter(Boolean);
        if (parts.length > 0) {
          return parts;
        }
      }
      return null;
    });
    
    if (locationData && locationData.length > 0) {
      return {
        raw: locationData.join(', '),
        parts: locationData
      };
    }
    
    // Método 2: Seletores alternativos
    const locationStr = await extractWithSelectors(page, selectors.location);
    if (locationStr) {
      const parts = locationStr.split(',').map(p => p.trim()).filter(Boolean);
      return { raw: locationStr, parts: parts.length > 0 ? parts : [locationStr] };
    }
    
    // Método 3: Procurar em elementos com data attributes
    locationData = await page.evaluate(() => {
      const locationSelectors = [
        '[data-testid="location"]',
        '[data-cy="location"]',
        '[class*="location"]',
        '[id*="location"]'
      ];
      
      for (const selector of locationSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent?.trim() || '';
          if (text && text.length > 3) {
            const parts = text.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length > 0) {
              return parts;
            }
          }
        }
      }
      return null;
    });
    
    if (locationData && locationData.length > 0) {
      return {
        raw: locationData.join(', '),
        parts: locationData
      };
    }
    
    // Método 4: Procurar em meta tags
    const metaLocation = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:locality"]') ||
                   document.querySelector('meta[name="locality"]');
      if (meta) {
        return meta.getAttribute('content')?.trim();
      }
      return null;
    });
    
    if (metaLocation) {
      return { raw: metaLocation, parts: [metaLocation] };
    }
    
    return null;
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
 * Extrai descrição com múltiplos métodos
 */
async function extractDescription(page) {
  try {
    // Método 1: Procurar h3/h2 com texto "Descrição" e pegar próximo elemento
    let description = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
      for (const heading of headings) {
        const text = heading.textContent?.toLowerCase() || '';
        if (text.includes('descrição') || text.includes('descricao')) {
          // Procurar próximo elemento irmão
          let next = heading.nextElementSibling;
          let attempts = 0;
          while (next && attempts < 5) {
            const content = next.textContent?.trim() || '';
            if (content.length > 20) {
              return content;
            }
            next = next.nextElementSibling;
            attempts++;
          }
          
          // Se não encontrou, procurar no próximo div
          const parent = heading.parentElement;
          if (parent) {
            const allText = parent.textContent || '';
            const descIndex = allText.toLowerCase().indexOf('descrição');
            if (descIndex > -1) {
              const descText = allText.substring(descIndex + 'descrição'.length).trim();
              if (descText.length > 20) {
                return descText.split('\n')[0].trim();
              }
            }
          }
        }
      }
      return null;
    });
    
    if (description && description.length > 20) return description;
    
    // Método 2: Seletores CSS
    description = await extractWithSelectors(page, selectors.description);
    if (description && description.length > 20) return description;
    
    // Método 3: Procurar em meta tags
    description = await page.evaluate(() => {
      const metaDesc = document.querySelector('meta[property="og:description"]') ||
                       document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const content = metaDesc.getAttribute('content')?.trim();
        if (content && content.length > 20) {
          return content;
        }
      }
      return null;
    });
    if (description && description.length > 20) return description;
    
    // Método 4: Procurar em JSON-LD
    description = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data.description) {
            return data.description;
          }
        } catch (e) {}
      }
      return null;
    });
    if (description && description.length > 20) return description;
    
    // Método 5: Procurar em divs com classes relacionadas
    description = await page.evaluate(() => {
      const descSelectors = [
        '[class*="description"]',
        '[class*="descricao"]',
        '[id*="description"]',
        '[id*="descricao"]',
        '[data-cy*="description"]',
        '[data-testid*="description"]'
      ];
      
      for (const selector of descSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent?.trim() || '';
          if (text.length > 20 && !text.toLowerCase().includes('descrição')) {
            return text;
          }
        }
      }
      return null;
    });
    
    return description;
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
 * Extrai características/propriedades brutas com múltiplos métodos
 * Retorna texto completo para processamento posterior
 */
async function extractPropertyFeatures(page) {
  try {
    const features = await page.evaluate(() => {
      const featuresObj = {};
      const featuresText = [];
      
      // Método 1: Procurar em parágrafos com padrão "Label: Value"
      const paragraphs = Array.from(document.querySelectorAll('p'));
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text) {
          featuresText.push(text);
          
          const colonIndex = text.indexOf(':');
          if (colonIndex > 0) {
            const label = text.substring(0, colonIndex).trim().toLowerCase();
            const value = text.substring(colonIndex + 1).trim();
            
            // Mapear labels conhecidos
            if (label.includes('tipologia') || label.includes('tipo')) {
              featuresObj.tipology = value;
            } else if (label.includes('área') || label.includes('area')) {
              featuresObj.area = value;
            } else if (label.includes('ano') || label.includes('construção') || label.includes('construcao')) {
              featuresObj.year = value;
            } else if (label.includes('andar') || label.includes('piso')) {
              featuresObj.floor = value;
            } else if (label.includes('condição') || label.includes('condicao') || label.includes('estado')) {
              featuresObj.condition = value;
            } else if (label.includes('casas de banho') || label.includes('wc') || label.includes('banheiros')) {
              featuresObj.bathrooms = value;
            } else if (label.includes('certificado energético') || label.includes('energia') || label.includes('certificado')) {
              featuresObj.energy = value;
            } else if (label.includes('garagem') || label.includes('estacionamento')) {
              featuresObj.garage = value;
            } else if (label.includes('elevador') || label.includes('ascensor')) {
              featuresObj.elevator = value;
            } else if (label.includes('varanda') || label.includes('terraço') || label.includes('terrac')) {
              featuresObj.balcony = value;
            }
          }
        }
      });
      
      // Método 2: Procurar em divs com classes específicas
      const featureContainers = document.querySelectorAll('[class*="feature"], [class*="characteristic"], [class*="property"], [data-cy*="feature"], [data-testid*="feature"]');
      featureContainers.forEach(container => {
        const text = container.textContent?.trim() || '';
        if (text) {
          featuresText.push(text);
          
          // Procurar padrões dentro do container
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const label = line.substring(0, colonIndex).trim().toLowerCase();
              const value = line.substring(colonIndex + 1).trim();
              
              if (label.includes('tipologia') && !featuresObj.tipology) {
                featuresObj.tipology = value;
              } else if ((label.includes('área') || label.includes('area')) && !featuresObj.area) {
                featuresObj.area = value;
              } else if ((label.includes('ano') || label.includes('construção')) && !featuresObj.year) {
                featuresObj.year = value;
              }
            }
          });
        }
      });
      
      // Método 3: Procurar em listas (ul, ol)
      const lists = document.querySelectorAll('ul, ol');
      lists.forEach(list => {
        const items = Array.from(list.querySelectorAll('li'));
        items.forEach(item => {
          const text = item.textContent?.trim() || '';
          if (text) {
            featuresText.push(text);
            
            const colonIndex = text.indexOf(':');
            if (colonIndex > 0) {
              const label = text.substring(0, colonIndex).trim().toLowerCase();
              const value = text.substring(colonIndex + 1).trim();
              
              if (label.includes('tipologia') && !featuresObj.tipology) {
                featuresObj.tipology = value;
              } else if ((label.includes('área') || label.includes('area')) && !featuresObj.area) {
                featuresObj.area = value;
              }
            }
          }
        });
      });
      
      // Método 4: Procurar padrões diretos no texto (ex: "T2", "T3", "120 m²")
      const allText = document.body.textContent || '';
      
      // Procurar tipologia (T1, T2, T3, etc)
      if (!featuresObj.tipology) {
        const tipologyMatch = allText.match(/\bT[0-9]\+?[0-9]?\b/i);
        if (tipologyMatch) {
          featuresObj.tipology = tipologyMatch[0];
        }
      }
      
      // Procurar área (ex: "120 m²", "120m²")
      if (!featuresObj.area) {
        const areaMatch = allText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
        if (areaMatch) {
          featuresObj.area = `${areaMatch[1]} m²`;
        }
      }
      
      // Procurar ano de construção
      if (!featuresObj.year) {
        const yearMatch = allText.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          featuresObj.year = yearMatch[0];
        }
      }
      
      // Adicionar texto completo para processamento
      featuresObj._rawText = featuresText.join(' ');
      
      return featuresObj;
    });
    
    return features;
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair características:', error.message);
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


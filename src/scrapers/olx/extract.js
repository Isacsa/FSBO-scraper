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
  if (title && title.length > 5) return title;
  
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
  if (title && title.length > 5) return title;
  
  // Método 3: Procurar em meta tags
  title = await page.evaluate(() => {
    const metaTitle = document.querySelector('meta[property="og:title"]') || 
                      document.querySelector('meta[name="title"]');
    if (metaTitle) {
      const content = metaTitle.getAttribute('content')?.trim();
      if (content && content.length > 5) {
        return content;
      }
    }
    return null;
  });
  if (title && title.length > 5) return title;
  
  // Método 4: Procurar em JSON-LD
  title = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.name || data.headline) {
          const result = data.name || data.headline;
          if (result && result.length > 5) {
            return result;
          }
        }
      } catch (e) {}
    }
    return null;
  });
  if (title && title.length > 5) return title;
  
  // Método 5: Fallback - procurar qualquer texto que pareça título
  title = await page.evaluate(() => {
    // Procurar em elementos com classes que podem conter título
    const possibleTitleSelectors = [
      '[class*="title"]',
      '[class*="heading"]',
      '[id*="title"]',
      'header h1, header h2, header h3',
      'main h1, main h2, main h3',
      'article h1, article h2, article h3'
    ];
    
    for (const selector of possibleTitleSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (text && text.length > 10 && text.length < 200) {
            return text;
          }
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
    
    // Método 4: __NEXT_DATA__ (Next.js hydration — mais estável que classes CSS)
    const nextDataLocation = await page.evaluate(() => {
      try {
        const el = document.getElementById('__NEXT_DATA__');
        if (!el) return null;
        const data = JSON.parse(el.textContent);
        // Percorrer props para encontrar dados do anúncio
        const ad = data?.props?.pageProps?.ad ||
                   data?.props?.pageProps?.adData ||
                   data?.props?.pageProps?.listing;
        if (!ad) return null;
        // location pode ser string ou objeto
        const loc = ad.location || ad.locationLabel || ad.city;
        if (typeof loc === 'string' && loc.length > 2) return loc;
        if (loc && typeof loc === 'object') {
          const parts = [loc.city, loc.region, loc.district, loc.regionLabel]
            .filter(Boolean);
          return parts.length > 0 ? parts.join(', ') : null;
        }
        return null;
      } catch (e) { return null; }
    });
    if (nextDataLocation) {
      const parts = nextDataLocation.split(',').map(p => p.trim()).filter(Boolean);
      return { raw: nextDataLocation, parts: parts.length > 0 ? parts : [nextDataLocation] };
    }

    // Método 5: JSON-LD PostalAddress
    const jsonLdLocation = await page.evaluate(() => {
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          const data = JSON.parse(script.textContent);
          // Procurar PostalAddress em qualquer nível
          function findAddress(obj) {
            if (!obj || typeof obj !== 'object') return null;
            if (obj['@type'] === 'PostalAddress') {
              return [obj.addressLocality, obj.addressRegion, obj.addressCountry]
                .filter(Boolean).join(', ');
            }
            for (const val of Object.values(obj)) {
              const found = findAddress(val);
              if (found) return found;
            }
            return null;
          }
          const addr = findAddress(Array.isArray(data) ? { items: data } : data);
          if (addr) return addr;
        }
        return null;
      } catch (e) { return null; }
    });
    if (jsonLdLocation) {
      const parts = jsonLdLocation.split(',').map(p => p.trim()).filter(Boolean);
      return { raw: jsonLdLocation, parts: parts.length > 0 ? parts : [jsonLdLocation] };
    }

    // Método 6: Meta tags og:locality / breadcrumb
    const metaLocation = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:locality"]') ||
                   document.querySelector('meta[name="locality"]');
      if (meta) return meta.getAttribute('content')?.trim();
      // Breadcrumb frequentemente contém localização
      const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a, nav[aria-label*="bread"] a');
      const parts = Array.from(breadcrumbs)
        .map(a => a.textContent.trim())
        .filter(t => t && t.length > 2 && !/imóveis|início|home|portugal/i.test(t));
      return parts.length > 0 ? parts.join(', ') : null;
    });

    if (metaLocation) {
      return { raw: metaLocation, parts: metaLocation.split(',').map(p => p.trim()).filter(Boolean) };
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
 * Verifica se a página carregou corretamente
 */
async function verifyPageLoaded(page) {
  try {
    // Verificar se há conteúdo na página
    const hasContent = await page.evaluate(() => {
      const bodyText = document.body?.textContent || '';
      return bodyText.length > 100; // Pelo menos 100 caracteres
    });
    
    if (!hasContent) {
      console.warn('[OLX Extract] ⚠️  Página parece vazia, aguardando mais tempo...');
      await page.waitForTimeout(3000);
      
      // Verificar novamente
      const hasContentAfterWait = await page.evaluate(() => {
        const bodyText = document.body?.textContent || '';
        return bodyText.length > 100;
      });
      
      if (!hasContentAfterWait) {
        console.warn('[OLX Extract] ⚠️  Página ainda parece vazia após espera');
        return false;
      }
    }
    
    // Verificar se há elementos básicos
    const hasBasicElements = await page.evaluate(() => {
      return document.querySelector('h1, h2, h3, h4') !== null ||
             document.querySelector('[data-testid*="title"]') !== null ||
             document.querySelector('[data-cy*="title"]') !== null;
    });
    
    if (!hasBasicElements) {
      console.warn('[OLX Extract] ⚠️  Não encontrados elementos básicos na página');
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao verificar carregamento:', error.message);
    return false;
  }
}

/**
 * Função principal de extração
 */
async function extractRawData(page, url) {
  console.log('[OLX Extract] 🔍 Iniciando extração de dados brutos...');
  
  // Verificar se a página carregou
  const pageLoaded = await verifyPageLoaded(page);
  if (!pageLoaded) {
    console.warn('[OLX Extract] ⚠️  Página pode não ter carregado completamente');
    // Continuar mesmo assim, mas com mais espera
    await page.waitForTimeout(2000);
  }
  
  // Extrair dados com tratamento de erros individual
  let raw = {
    title: null,
    price: null,
    location: null,
    coordinates: null,
    dates: { published: null, updated: null },
    advertiser: { name: null, url: null },
    description: null,
    photos: null,
    features: { _rawText: '' },
    ad_id: extractAdId(url)
  };
  
  try {
    raw.title = await extractTitle(page);
    if (!raw.title) {
      console.warn('[OLX Extract] ⚠️  Título não encontrado');
    }
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair título:', error.message);
  }
  
  try {
    raw.price = await extractPrice(page);
    if (!raw.price) {
      console.warn('[OLX Extract] ⚠️  Preço não encontrado');
    }
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair preço:', error.message);
  }
  
  try {
    raw.location = await extractLocation(page);
    if (!raw.location) {
      console.warn('[OLX Extract] ⚠️  Localização não encontrada');
    }
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair localização:', error.message);
  }
  
  try {
    raw.coordinates = await extractCoordinates(page);
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair coordenadas:', error.message);
  }
  
  try {
    raw.dates = await extractDates(page);
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair datas:', error.message);
  }
  
  try {
    raw.advertiser = await extractAdvertiser(page);
    if (!raw.advertiser.name && !raw.advertiser.url) {
      console.warn('[OLX Extract] ⚠️  Anunciante não encontrado');
    }
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair anunciante:', error.message);
  }
  
  try {
    raw.description = await extractDescription(page);
    if (!raw.description) {
      console.warn('[OLX Extract] ⚠️  Descrição não encontrada');
    }
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair descrição:', error.message);
  }
  
  try {
    raw.photos = await extractPhotos(page);
    if (!raw.photos || raw.photos.length === 0) {
      console.warn('[OLX Extract] ⚠️  Fotos não encontradas');
    }
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair fotos:', error.message);
  }
  
  try {
    raw.features = await extractPropertyFeatures(page);
  } catch (error) {
    console.warn('[OLX Extract] ⚠️  Erro ao extrair características:', error.message);
  }
  
  // Verificar se extraímos dados mínimos
  const hasMinimalData = raw.title || raw.price || raw.description;
  if (!hasMinimalData) {
    console.error('[OLX Extract] ❌ ERRO CRÍTICO: Nenhum dado mínimo extraído!');
    console.error('[OLX Extract] URL:', url);
    
    // Tentar obter HTML para debug
    try {
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.error('[OLX Extract] Título da página:', pageTitle);
      console.error('[OLX Extract] URL atual:', pageUrl);
      
      // Verificar se estamos na página correta
      if (!pageUrl.includes('olx.pt') || pageUrl.includes('error') || pageUrl.includes('404')) {
        console.error('[OLX Extract] ❌ Página pode estar com erro ou redirecionada!');
      }
      
      // Tentar extração de emergência - pegar qualquer texto que pareça título/preço
      console.warn('[OLX Extract] 🔄 Tentando extração de emergência...');
      
      const emergencyData = await page.evaluate(() => {
        const result = { title: null, price: null, description: null };
        
        // Procurar título em qualquer lugar
        const allText = document.body?.textContent || '';
        const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 10 && l.length < 200);
        if (lines.length > 0) {
          result.title = lines[0];
        }
        
        // Procurar preço
        const priceMatch = allText.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*€/);
        if (priceMatch) {
          result.price = priceMatch[0];
        }
        
        // Procurar descrição (primeiro parágrafo longo)
        for (const line of lines) {
          if (line.length > 50 && !line.includes('€') && !line.match(/^\d+$/)) {
            result.description = line;
            break;
          }
        }
        
        return result;
      });
      
      if (emergencyData.title) {
        console.warn('[OLX Extract] ✅ Extração de emergência encontrou título');
        raw.title = emergencyData.title;
      }
      if (emergencyData.price) {
        console.warn('[OLX Extract] ✅ Extração de emergência encontrou preço');
        raw.price = emergencyData.price;
      }
      if (emergencyData.description) {
        console.warn('[OLX Extract] ✅ Extração de emergência encontrou descrição');
        raw.description = emergencyData.description;
      }
    } catch (e) {
      console.error('[OLX Extract] Não foi possível obter informações da página:', e.message);
    }
  } else {
    console.log('[OLX Extract] ✅ Extração concluída com dados mínimos');
  }
  
  return raw;
}

module.exports = extractRawData;


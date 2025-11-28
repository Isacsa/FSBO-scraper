/**
 * Extrai dados brutos (raw) da página Idealista
 * Extração agressiva: DOM + JSON-LD + endpoints async
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
 * Extrai dados de JSON-LD (structured data)
 */
async function extractJsonLd(page) {
  try {
    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const data = [];
      
      scripts.forEach(script => {
        try {
          const json = JSON.parse(script.textContent);
          data.push(json);
        } catch (e) {
          // Ignorar scripts inválidos
        }
      });
      
      return data;
    });
    
    return jsonLd.length > 0 ? jsonLd : null;
  } catch (error) {
    return null;
  }
}

/**
 * Extrai título
 */
async function extractTitle(page) {
  // Tentar JSON-LD primeiro
  const jsonLd = await extractJsonLd(page);
  if (jsonLd) {
    for (const item of jsonLd) {
      if (item.name || item.headline) {
        return item.name || item.headline;
      }
    }
  }
  
  return await extractWithSelectors(page, selectors.title);
}

/**
 * Extrai preço
 */
async function extractPrice(page) {
  // Tentar JSON-LD primeiro
  const jsonLd = await extractJsonLd(page);
  if (jsonLd) {
    for (const item of jsonLd) {
      if (item.offers && item.offers.price) {
        return item.offers.price.toString();
      }
      if (item.price) {
        return item.price.toString();
      }
    }
  }
  
  return await extractWithSelectors(page, selectors.price);
}

/**
 * Extrai localização
 */
async function extractLocation(page) {
  try {
    const locationData = await page.evaluate(() => {
      const parts = [];
      
      // Procurar breadcrumbs
      const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a, [class*="breadcrumb"] span');
      breadcrumbs.forEach(el => {
        const text = el.textContent.trim();
        if (text && text.length > 0 && text.length < 100 && !text.includes('Idealista')) {
          parts.push(text);
        }
      });
      
      // Procurar elementos de localização
      const locationSelectors = [
        '[class*="location"]',
        '[class*="address"]',
        'a[href*="#map"]',
        '[itemprop="address"]'
      ];
      
      for (const selector of locationSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length > 0 && text.length < 200) {
            parts.push(text);
          }
        });
      }
      
      // Remover duplicados e limpar
      const uniqueParts = [...new Set(parts)].filter(p => 
        !p.includes('Idealista') && 
        !p.includes('Anúncios') &&
        p.length > 2
      );
      
      return uniqueParts.length > 0 ? uniqueParts : null;
    });
    
    if (locationData && locationData.length > 0) {
      return {
        raw: locationData.join(', '),
        parts: locationData
      };
    }
    
    // Fallback
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
        
        const latMatch2 = src.match(/lat=([^&]+)/);
        const lngMatch2 = src.match(/lng=([^&]+)/);
        if (latMatch2 && lngMatch2) {
          return { 
            lat: parseFloat(latMatch2[1]), 
            lng: parseFloat(lngMatch2[1]) 
          };
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
      
      // Tentar encontrar coordenadas no JavaScript da página
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = script.textContent || '';
        const coordMatch = content.match(/lat[itude]*["\s:]*([\d.]+).*lng[itude]*["\s:]*([\d.-]+)/i);
        if (coordMatch) {
          return { 
            lat: parseFloat(coordMatch[1]), 
            lng: parseFloat(coordMatch[2]) 
          };
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
      
      // Procurar elementos time com atributo datetime
      const timeElements = document.querySelectorAll('time[datetime]');
      for (const timeEl of timeElements) {
        const datetime = timeEl.getAttribute('datetime');
        const text = timeEl.textContent.trim();
        
        if (text.toLowerCase().includes('publicado') || !result.published) {
          result.published = datetime || text;
        }
        if (text.toLowerCase().includes('atualizado')) {
          result.updated = datetime || text;
        }
      }
      
      // Procurar por texto "Publicado" ou "Atualizado"
      const allText = document.body.textContent || '';
      
      const publishedSelectors = [
        '[class*="published"]',
        '[class*="date"]',
        '[class*="posted"]',
        'span:has-text("Publicado")',
        'div:has-text("Publicado")'
      ];
      
      for (const selector of publishedSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent.trim();
            if ((text.toLowerCase().includes('publicado') || 
                 text.toLowerCase().includes('hoje') ||
                 text.toLowerCase().includes('ontem') ||
                 text.match(/\d{1,2}[\/\-]\d{1,2}/)) && !result.published) {
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
        '[class*="updated"]',
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
    console.warn('[Idealista Extract] ⚠️  Erro ao extrair datas:', error.message);
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
      let name = null;
      const nameSelectors = [
        '[class*="advertiser"] [class*="name"]',
        '[class*="owner"] [class*="name"]',
        '[class*="seller"] [class*="name"]',
        '[class*="contact"] [class*="name"]',
        '[class*="agent"] [class*="name"]',
        'h3[class*="name"]',
        'h4[class*="name"]'
      ];
      
      for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          name = el.textContent.trim();
          if (name) break;
        }
      }
      
      // URL
      let url = null;
      const urlSelectors = [
        'a[href*="/imobiliarias/"]',
        'a[href*="/agentes/"]',
        'a[href*="/empresas/"]',
        '[class*="advertiser"] a',
        '[class*="owner"] a',
        '[class*="contact"] a'
      ];
      
      for (const selector of urlSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const href = el.getAttribute('href');
          if (href) {
            url = href.startsWith('http') ? href : `https://www.idealista.pt${href}`;
            break;
          }
        }
      }
      
      // AMI
      let ami = null;
      const amiSelectors = [
        '[class*="ami"]',
        '[class*="license"]',
        'span:has-text("AMI")'
      ];
      
      for (const selector of amiSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          ami = el.textContent.trim();
          if (ami) break;
        }
      }
      
      return { name, url, ami };
    });
    
    return advertiserData;
  } catch (error) {
    return { name: null, url: null, ami: null };
  }
}

/**
 * Extrai descrição
 */
async function extractDescription(page) {
  try {
    const description = await page.evaluate(() => {
      // Procurar div com classe que contenha "description"
      const descSelectors = [
        '[class*="description"]',
        '[class*="detail-description"]',
        '[class*="content"]',
        '[id*="description"]',
        '[itemprop="description"]'
      ];
      
      for (const selector of descSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          // Filtrar descrições muito curtas
          if (text.length > 50) {
            return text;
          }
        }
      }
      
      // Procurar h2 ou h3 com texto "Descrição" e pegar próximo elemento
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      const descHeading = headings.find(h => 
        h.textContent.toLowerCase().includes('descrição')
      );
      
      if (descHeading) {
        let next = descHeading.nextElementSibling;
        while (next) {
          const text = next.textContent.trim();
          if (text.length > 50) {
            return text;
          }
          next = next.nextElementSibling;
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
      const imageSelectors = [
        'img[src*="idealista"]',
        'img[data-src*="idealista"]',
        '[class*="gallery"] img',
        '[class*="photo"] img',
        '[class*="image"] img',
        '[class*="carousel"] img',
        '[class*="slider"] img'
      ];
      
      for (const selector of imageSelectors) {
        const images = document.querySelectorAll(selector);
        images.forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
          if (src && (src.includes('idealista') || src.includes('apollo.olxcdn.com'))) {
            // Tentar obter URL de alta resolução
            let highResUrl = src;
            
            // Remover parâmetros de redimensionamento
            highResUrl = highResUrl.replace(/[?&]resize=[^&]*/g, '');
            highResUrl = highResUrl.replace(/[?&]w=\d+/g, '');
            highResUrl = highResUrl.replace(/[?&]h=\d+/g, '');
            highResUrl = highResUrl.replace(/[?&]width=\d+/g, '');
            highResUrl = highResUrl.replace(/[?&]height=\d+/g, '');
            
            // Adicionar parâmetro para máxima resolução
            if (!highResUrl.includes('?')) {
              highResUrl += '?width=1920';
            } else {
              highResUrl += '&width=1920';
            }
            
            // Filtrar imagens muito pequenas (ícones)
            if (!highResUrl.includes('icon') && !highResUrl.includes('logo')) {
              photoUrls.add(highResUrl);
            }
          }
        });
      }
      
      return Array.from(photoUrls);
    });
    
    return photos.length > 0 ? photos : null;
  } catch (error) {
    return null;
  }
}

/**
 * Extrai características/propriedades brutas
 */
async function extractPropertyFeatures(page) {
  try {
    const features = await page.evaluate(() => {
      const featuresObj = {};
      const featuresText = [];
      
      // Procurar container de features
      const containerSelectors = [
        '[class*="features"]',
        '[class*="characteristics"]',
        '[class*="details"]',
        '[class*="specs"]',
        '[class*="properties"]'
      ];
      
      let container = null;
      for (const selector of containerSelectors) {
        container = document.querySelector(selector);
        if (container) break;
      }
      
      const searchArea = container || document.body;
      
      // Procurar elementos de feature
      const itemSelectors = [
        '[class*="feature"]',
        '[class*="characteristic"]',
        '[class*="detail-item"]',
        '[class*="spec"]',
        'li[class*="feature"]',
        'div[class*="feature"]'
      ];
      
      const items = [];
      for (const selector of itemSelectors) {
        const elements = searchArea.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length > 0 && text.length < 200) {
            items.push(text);
          }
        });
      }
      
      // Procurar padrões "Label: Value" em parágrafos
      const paragraphs = Array.from(searchArea.querySelectorAll('p, span, div'));
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text && text.includes(':')) {
          const colonIndex = text.indexOf(':');
          if (colonIndex > 0 && colonIndex < text.length - 1) {
            const label = text.substring(0, colonIndex).trim();
            const value = text.substring(colonIndex + 1).trim();
            
            if (value.length > 0 && value.length < 100) {
              featuresText.push(text);
              
              // Mapear labels conhecidos
              const lowerLabel = label.toLowerCase();
              if (lowerLabel.includes('tipologia') || lowerLabel.includes('quartos')) {
                featuresObj.tipology = value;
              } else if (lowerLabel.includes('área total') || lowerLabel.includes('area total') || lowerLabel.includes('área bruta')) {
                featuresObj.area_total = value;
              } else if (lowerLabel.includes('área útil') || lowerLabel.includes('area util') || lowerLabel.includes('área útil')) {
                featuresObj.area_useful = value;
              } else if (lowerLabel.includes('ano') || lowerLabel.includes('construção')) {
                featuresObj.year = value;
              } else if (lowerLabel.includes('andar') || lowerLabel.includes('piso')) {
                featuresObj.floor = value;
              } else if (lowerLabel.includes('condição') || lowerLabel.includes('estado')) {
                featuresObj.condition = value;
              } else if (lowerLabel.includes('casas de banho') || lowerLabel.includes('wc') || lowerLabel.includes('banheiros')) {
                featuresObj.bathrooms = value;
              } else if (lowerLabel.includes('certificado energético') || lowerLabel.includes('energia')) {
                featuresObj.energy = value;
              } else if (lowerLabel.includes('garagem') || lowerLabel.includes('estacionamento')) {
                featuresObj.garage = value;
              } else if (lowerLabel.includes('elevador') || lowerLabel.includes('ascensor')) {
                featuresObj.elevator = value;
              } else if (lowerLabel.includes('varanda') || lowerLabel.includes('terraço')) {
                featuresObj.balcony = value;
              } else if (lowerLabel.includes('piscina')) {
                featuresObj.pool = value;
              } else if (lowerLabel.includes('terreno')) {
                featuresObj.land = value;
              }
            }
          }
        }
      });
      
      featuresObj._rawText = [...items, ...featuresText].join(' ');
      featuresObj._rawItems = items;
      
      return featuresObj;
    });
    
    return features;
  } catch (error) {
    return { _rawText: '', _rawItems: [] };
  }
}

/**
 * Extrai ID do anúncio da URL ou HTML
 */
function extractAdId(url) {
  try {
    // Tentar extrair da URL
    const urlMatch = url.match(/\/(\d+)(?:\.html|$)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Tentar padrão com ID no final
    const idMatch = url.match(/ID([A-Za-z0-9]+)/);
    if (idMatch) {
      return idMatch[1];
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Função principal de extração
 */
async function extractRawData(page, url) {
  console.log('[Idealista Extract] 🔍 Iniciando extração de dados brutos...');
  
  // Aguardar carregamento completo
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  
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
    ad_id: extractAdId(url),
    jsonLd: await extractJsonLd(page)
  };
  
  console.log('[Idealista Extract] ✅ Extração concluída');
  
  return raw;
}

module.exports = extractRawData;


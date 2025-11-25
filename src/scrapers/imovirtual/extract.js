/**
 * Extrai dados brutos (raw) da página Imovirtual
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
  try {
    const price = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1) {
        const container = h1.closest('div') || h1.parentElement;
        const strongElements = container.querySelectorAll('strong');
        for (const strong of strongElements) {
          if (strong.textContent.includes('€')) {
            return strong.textContent.trim();
          }
        }
      }
      const allStrongs = document.querySelectorAll('strong');
      for (const strong of allStrongs) {
        if (strong.textContent.includes('€') && strong.textContent.length < 50) {
          return strong.textContent.trim();
        }
      }
      return null;
    });
    return price;
  } catch (error) {
    return await extractWithSelectors(page, selectors.price);
  }
}

/**
 * Extrai localização
 */
async function extractLocation(page) {
  try {
    const locationElement = await page.$('a[href="#map"]');
    if (locationElement) {
      const text = await locationElement.textContent().catch(() => '');
      if (text && text.trim()) {
        const parts = text.split(',').map(p => p.trim());
        return {
          raw: text.trim(),
          parts: parts
        };
      }
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
      const iframe = document.querySelector('iframe[src*="maps"]');
      if (iframe) {
        const src = iframe.getAttribute('src');
        const latMatch = src.match(/[?&]ll=([^,&]+)/);
        if (latMatch) {
          const [lat, lng] = latMatch[1].split(',');
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
 * Extrai data de publicação/atualização
 */
async function extractDates(page) {
  try {
    const dates = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'));
      const datePara = paragraphs.find(p => p.textContent.includes('Última atualização'));
      return datePara ? datePara.textContent.trim() : null;
    });
    
    return {
      published: dates,
      updated: dates // Imovirtual geralmente mostra "Última atualização"
    };
  } catch (error) {
    return { published: null, updated: null };
  }
}

/**
 * Extrai dados do anunciante
 */
async function extractAdvertiser(page) {
  try {
    const advertiserData = await page.evaluate(() => {
      const h4Elements = Array.from(document.querySelectorAll('h4'));
      const agencyH4 = h4Elements.find(h4 => h4.textContent.toLowerCase().includes('agência'));
      
      if (agencyH4) {
        const container = agencyH4.closest('div') || agencyH4.parentElement;
        const strong = container.querySelector('strong');
        const name = strong ? strong.textContent.trim() : null;
        
        const urlEl = container.querySelector('a[href*="/empresas/"], a[href*="/agencias-imobiliarias/"]');
        const url = urlEl ? urlEl.getAttribute('href') : null;
        const fullUrl = url && !url.startsWith('http') ? `https://www.imovirtual.com${url}` : url;
        
        return { name, url: fullUrl };
      }
      
      return { name: null, url: null };
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
      const h2Elements = Array.from(document.querySelectorAll('h2'));
      const descH2 = h2Elements.find(h2 => h2.textContent.includes('Descrição'));
      if (descH2) {
        const nextSibling = descH2.nextElementSibling;
        if (nextSibling) {
          return nextSibling.textContent.trim();
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
      
      // Procurar imagens na galeria principal (evitar logos e ícones)
      const galleryImages = document.querySelectorAll('[class*="gallery"] img, [class*="image"] img, [class*="photo"] img, button img[alt*="imagem"], button img[alt*="foto"]');
      
      galleryImages.forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (src) {
          // Filtrar logos e ícones
          const lowerSrc = src.toLowerCase();
          if (lowerSrc.includes('logo') || 
              lowerSrc.includes('icon') || 
              lowerSrc.includes('svg') ||
              lowerSrc.includes('footer') ||
              lowerSrc.includes('header') ||
              lowerSrc.includes('app_store') ||
              lowerSrc.includes('google_play')) {
            return; // Pular logos e ícones
          }
          
          // Aceitar apenas imagens de anúncios (olxcdn ou padrões de imagem)
          if (src.includes('olxcdn') || 
              src.includes('apollo.olxcdn') ||
              src.match(/\.(jpg|jpeg|png|webp)/i)) {
            
            // Tentar obter URL de alta resolução
            let highResUrl = src;
            
            // Remover parâmetros de redimensionamento
            highResUrl = highResUrl.replace(/[?&]resize=[^&]*/g, '');
            highResUrl = highResUrl.replace(/[?&]w=\d+/g, '');
            highResUrl = highResUrl.replace(/[?&]h=\d+/g, '');
            highResUrl = highResUrl.replace(/[?&]s=[^&]*/g, '');
            
            // Adicionar parâmetro para máxima resolução se for olxcdn
            if (highResUrl.includes('olxcdn')) {
              if (!highResUrl.includes('?')) {
                highResUrl += '?width=1920';
              } else {
                highResUrl += '&width=1920';
              }
            }
            
            photoUrls.add(highResUrl);
          }
        }
      });
      
      return Array.from(photoUrls);
    });
    
    return photos.length > 0 ? photos : null;
  } catch (error) {
    console.warn('[Imovirtual Extract] ⚠️  Erro ao extrair fotos:', error.message);
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
      
      const h2Elements = Array.from(document.querySelectorAll('h2'));
      const featuresH2 = h2Elements.find(h2 => h2.textContent.includes('Casa para') || h2.textContent.includes('Apartamento'));
      
      if (featuresH2) {
        const container = featuresH2.nextElementSibling;
        if (container) {
          const items = container.querySelectorAll('div > div');
          items.forEach(item => {
            const divs = item.querySelectorAll('div');
            if (divs.length >= 2) {
              const label = divs[0].textContent.trim();
              const value = divs[1].textContent.trim();
              const fullText = `${label}: ${value}`;
              
              featuresText.push(fullText); // Guardar texto completo
              
              if (label.includes('Área')) {
                featuresObj.area = value;
              } else if (label.includes('Tipologia')) {
                featuresObj.tipology = value;
              } else if (label.includes('casas de banho')) {
                featuresObj.bathrooms = value;
              } else if (label.includes('Tipo de imóvel')) {
                featuresObj.type = value;
              } else if (label.includes('Fase de acabamento')) {
                featuresObj.condition = value;
              } else if (label.includes('Nova construção')) {
                featuresObj.new_construction = value;
              } else if (label.includes('Tipo de anunciante')) {
                featuresObj.advertiser_type = value;
              } else if (label.includes('Ano') || label.includes('Construção')) {
                featuresObj.year = value;
              } else if (label.includes('Andar') || label.includes('Piso')) {
                featuresObj.floor = value;
              }
            }
          });
        }
      }
      
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
  console.log('[Imovirtual Extract] 🔍 Iniciando extração de dados brutos...');
  
  const dates = await extractDates(page);
  
  const raw = {
    title: await extractTitle(page),
    price: await extractPrice(page),
    location: await extractLocation(page),
    coordinates: await extractCoordinates(page),
    published_date: dates.published,
    updated_date: dates.updated,
    advertiser: await extractAdvertiser(page),
    description: await extractDescription(page),
    photos: await extractPhotos(page),
    features: await extractPropertyFeatures(page),
    ad_id: extractAdId(url)
  };
  
  console.log('[Imovirtual Extract] ✅ Extração concluída');
  
  return raw;
}

module.exports = extractRawData;


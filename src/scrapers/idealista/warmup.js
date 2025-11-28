/**
 * Warmup sequence humana para desarmar anti-bot
 */

/**
 * Gera delay aleatório entre min e max
 */
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Move o rato de forma natural
 */
async function humanMouseMove(page) {
  try {
    const viewport = page.viewportSize();
    if (!viewport) return;
    
    // Movimento aleatório pequeno
    const x = Math.floor(Math.random() * 100) - 50;
    const y = Math.floor(Math.random() * 100) - 50;
    
    await page.mouse.move(
      viewport.width / 2 + x,
      viewport.height / 2 + y,
      { steps: 5 + Math.floor(Math.random() * 5) }
    );
    
    await page.waitForTimeout(randomDelay(100, 300));
  } catch (error) {
    // Ignorar erros de movimento do rato
  }
}

/**
 * Scroll humano progressivo
 */
async function humanScroll(page, direction = 'down', distance = null) {
  try {
    const viewport = page.viewportSize();
    if (!viewport) return;
    
    const scrollDistance = distance || (viewport.height * (0.3 + Math.random() * 0.4));
    const steps = 10 + Math.floor(Math.random() * 10);
    
    if (direction === 'down') {
      await page.mouse.wheel(0, scrollDistance);
    } else {
      await page.mouse.wheel(0, -scrollDistance);
    }
    
    // Delay aleatório após scroll
    await page.waitForTimeout(randomDelay(200, 600));
    
    // Pequeno movimento de rato após scroll
    await humanMouseMove(page);
  } catch (error) {
    // Ignorar erros
  }
}

/**
 * Simula tempo de leitura
 */
async function simulateReading(page, minMs = 300, maxMs = 2000) {
  await page.waitForTimeout(randomDelay(minMs, maxMs));
}

/**
 * Fecha popups de forma humana
 */
async function humanClosePopups(page) {
  try {
    await page.waitForTimeout(randomDelay(500, 1500));
    
    const closed = await page.evaluate(() => {
      let closedCount = 0;
      
      // Procurar popups de cookies/consentimento
      const popupSelectors = [
        '[class*="cookie"]',
        '[class*="consent"]',
        '[id*="cookie"]',
        '[id*="consent"]',
        '[class*="popup"]',
        '[class*="modal"]'
      ];
      
      for (const selector of popupSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const closeButtons = el.querySelectorAll(
              'button[class*="close"], ' +
              'button[class*="accept"], ' +
              'button[class*="dismiss"], ' +
              'button:has-text("Aceitar"), ' +
              'button:has-text("Fechar"), ' +
              '[aria-label*="close"], ' +
              '[aria-label*="fechar"]'
            );
            
            closeButtons.forEach(btn => {
              btn.click();
              closedCount++;
            });
            
            if (closeButtons.length === 0 && window.getComputedStyle(el).zIndex > 1000) {
              el.style.display = 'none';
              closedCount++;
            }
          });
        } catch (e) {
          // Continuar
        }
      }
      
      return closedCount;
    });
    
    if (closed > 0) {
      console.log(`[Warmup] ✅ Fechados ${closed} popups`);
      await simulateReading(page, 300, 800);
    }
  } catch (error) {
    // Ignorar erros
  }
}

/**
 * Warmup sequence completa - obrigatória antes de scrapear
 */
async function performWarmupSequence(page) {
  console.log('[Warmup] 🚀 Iniciando warmup sequence humana...');
  
  try {
    // 1. Ir para homepage do Idealista
    console.log('[Warmup] 📍 Passo 1: Navegando para homepage...');
    await page.goto('https://www.idealista.pt/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await simulateReading(page, 1500, 2500);
    await humanClosePopups(page);
    
    // 2. Scroll até meio da página
    console.log('[Warmup] 📜 Passo 2: Scroll natural...');
    const viewport = page.viewportSize();
    if (viewport) {
      const scrollSteps = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < scrollSteps; i++) {
        await humanScroll(page, 'down');
        await simulateReading(page, 500, 1500);
      }
    }
    
    // 3. Movimento de rato natural
    await humanMouseMove(page);
    await simulateReading(page, 800, 1500);
    
    // 4. Clicar num anúncio aleatório da homepage
    console.log('[Warmup] 🖱️  Passo 3: Clicando em anúncio aleatório...');
    const clicked = await page.evaluate(() => {
      // Procurar links de anúncios
      const adLinks = Array.from(document.querySelectorAll('a[href*="/imovel/"]'));
      if (adLinks.length === 0) return false;
      
      // Escolher um aleatório
      const randomLink = adLinks[Math.floor(Math.random() * Math.min(adLinks.length, 5))];
      if (randomLink) {
        randomLink.click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      await simulateReading(page, 2000, 3500);
      
      // 5. Voltar atrás
      console.log('[Warmup] ⬅️  Passo 4: Voltando atrás...');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await simulateReading(page, 1500, 2500);
    }
    
    // 6. Scroll final
    await humanScroll(page, 'down');
    await simulateReading(page, 1000, 2000);
    
    console.log('[Warmup] ✅ Warmup sequence concluída');
    
  } catch (error) {
    console.warn('[Warmup] ⚠️  Erro durante warmup:', error.message);
    // Continuar mesmo com erro
  }
}

module.exports = {
  performWarmupSequence,
  humanScroll,
  humanMouseMove,
  simulateReading,
  humanClosePopups,
  randomDelay
};


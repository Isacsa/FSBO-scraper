/**
 * Helpers compartilhados entre scrapers
 */

/**
 * Fecha popups, modais, overlays e banners que podem bloquear o conteúdo
 * @param {Page} page - Instância da página
 * @param {string} platform - Nome da plataforma (para logs)
 */
async function closePopupsAndOverlays(page, platform = 'Scraper') {
  console.log(`[${platform}] 🔍 Procurando e fechando popups/overlays...`);
  
  const popupSelectors = [
    // Cookies e termos
    '[id*="cookie"] button',
    '[id*="Cookie"] button',
    '[class*="cookie"] button',
    '[class*="Cookie"] button',
    '[data-cy*="cookie"] button',
    '[data-testid*="cookie"] button',
    'button:has-text("Aceitar")',
    'button:has-text("Aceitar todos")',
    'button:has-text("Aceitar cookies")',
    
    // Login modal
    '[data-cy*="login-modal"] button[aria-label*="fechar" i]',
    '[data-cy*="login-modal"] button[aria-label*="close" i]',
    '[data-cy*="login"] [class*="close"]',
    '[data-testid*="login"] [class*="close"]',
    '[class*="login-modal"] [class*="close"]',
    '[class*="Login-modal"] [class*="close"]',
    
    // Location banner
    '[class*="location-banner"] button',
    '[class*="Location-banner"] button',
    '[data-cy*="location-banner"] button',
    '[data-testid*="location-banner"] button',
    
    // Overlays e modais genéricos
    '[class*="overlay"] [class*="close-button"]',
    '[class*="overlay"] [class*="close"]',
    '[class*="modal"] [class*="close-button"]',
    '[class*="modal"] [class*="close"]',
    '[class*="popup"] [class*="close-button"]',
    '[class*="popup"] [class*="close"]',
    '[role="dialog"] button[aria-label*="close" i]',
    '[role="dialog"] button[aria-label*="fechar" i]',
    
    // Botões de fechar genéricos em modais
    '[class*="modal"] button[aria-label*="close" i]',
    '[class*="overlay"] button[aria-label*="close" i]',
    '[class*="popup"] button[aria-label*="close" i]',
    
    // Botões de aceitar/continuar genéricos
    'button:has-text("Aceitar")',
    'button:has-text("Continuar")',
    'button:has-text("Fechar")',
    'button:has-text("X")',
  ];

  let closedCount = 0;
  const maxAttempts = 3;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let foundAny = false;
    
    for (const selector of popupSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            const boundingBox = await element.boundingBox().catch(() => null);
            if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
              await element.click({ timeout: 2000 }).catch(() => {});
              closedCount++;
              foundAny = true;
              console.log(`[${platform}] ✅ Fechado popup: ${selector}`);
              await page.waitForTimeout(300);
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!foundAny) {
      break;
    }
    
    await page.waitForTimeout(500);
  }

  if (closedCount > 0) {
    console.log(`[${platform}] ✅ Fechados ${closedCount} popup(s)/overlay(s)`);
  } else {
    console.log(`[${platform}] ℹ️  Nenhum popup encontrado para fechar`);
  }

  await page.waitForTimeout(1000);
}

module.exports = {
  closePopupsAndOverlays
};


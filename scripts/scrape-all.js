#!/usr/bin/env node

/**
 * Script para executar scrape de todos os websites suportados
 * 
 * Uso:
 *   node scripts/scrape-all.js
 *   node scripts/scrape-all.js --config config.json
 *   node scripts/scrape-all.js --olx-url URL --custojusto-url URL ...
 */

const path = require('path');
const fs = require('fs');
const { configureOutput, printJSON, log } = require('../src/utils/output');
const { normalizeFinalObject } = require('../src/utils/finalNormalizer');
const { calculateFsboScores } = require('../pipeline/fsboScore');
const { dedupeListInMemory } = require('../pipeline/deduplicate');

// Importar scrapers
const scrapeOLX = require('../src/scrapers/olx');
const scrapeImovirtual = require('../src/scrapers/imovirtual');
const scrapeIdealistaLobstr = require('../src/scrapers/idealista_lobstr/idealista.scraper');
const scrapeCustoJusto = require('../src/scrapers/custojusto/custojusto.scraper');
const scrapeCasaSapo = require('../src/scrapers/casasapo/casasapo.scraper');

const SUPPORTED_PLATFORMS = ['olx', 'imovirtual', 'idealista', 'custojusto', 'casasapo'];

/**
 * Parse argumentos da linha de comando
 */
function parseArgs(argv) {
  const args = {
    config: null,
    urls: {},
    options: {
      headless: true,
      onlyNew: false,
      maxPages: null,
      maxAds: null,
      maxResults: null
    },
    parallel: false,
    outputFile: null,
    silent: false,
    jsonOnly: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '--config' && i + 1 < argv.length) {
      args.config = argv[++i];
    } else if (arg.startsWith('--') && arg.includes('-url')) {
      const platform = arg.replace('--', '').replace('-url', '');
      if (SUPPORTED_PLATFORMS.includes(platform) && i + 1 < argv.length) {
        args.urls[platform] = argv[++i];
      }
    } else if (arg === '--headless' && i + 1 < argv.length) {
      args.options.headless = argv[++i] === 'true';
    } else if (arg === '--only-new') {
      args.options.onlyNew = true;
    } else if (arg === '--max-pages' && i + 1 < argv.length) {
      args.options.maxPages = parseInt(argv[++i]);
    } else if (arg === '--max-ads' && i + 1 < argv.length) {
      args.options.maxAds = parseInt(argv[++i]);
    } else if (arg === '--max-results' && i + 1 < argv.length) {
      args.options.maxResults = parseInt(argv[++i]);
    } else if (arg === '--parallel') {
      args.parallel = true;
    } else if (arg === '--output' && i + 1 < argv.length) {
      args.outputFile = argv[++i];
    } else if (arg === '--silent') {
      args.silent = true;
    } else if (arg === '--json-only') {
      args.jsonOnly = true;
    }
  }

  return args;
}

/**
 * Carregar configuração de arquivo
 */
function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Arquivo de configuração não encontrado: ${configPath}`);
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(content);
}

/**
 * Executar scraper individual
 */
async function runScraper(platform, url, options) {
  const startTime = Date.now();
  
  try {
    log(`[${platform.toUpperCase()}] 🚀 Iniciando scrape...`);
    log(`[${platform.toUpperCase()}] URL: ${url}`);
    
    let rawResponse = null;
    let results = [];
    
    if (platform === 'olx') {
      const data = await scrapeOLX(url, { headless: options.headless });
      results = [normalizeFinalObject(data)];
    } else if (platform === 'imovirtual') {
      const data = await scrapeImovirtual(url, { headless: options.headless });
      results = [normalizeFinalObject(data)];
    } else if (platform === 'idealista') {
      rawResponse = await scrapeIdealistaLobstr(url, { 
        maxResults: options.maxResults || null 
      });
      results = (rawResponse.items || []).map(item => normalizeFinalObject(item));
    } else if (platform === 'custojusto') {
      rawResponse = await scrapeCustoJusto(url, {
        onlyNew: options.onlyNew,
        maxPages: options.maxPages || null,
        maxAds: options.maxAds || null,
        headless: options.headless
      });
      const ads = rawResponse.items || rawResponse.all_ads || rawResponse.new_ads || [];
      results = ads.map(item => normalizeFinalObject(item));
    } else if (platform === 'casasapo') {
      rawResponse = await scrapeCasaSapo(url, {
        onlyNew: options.onlyNew,
        maxPages: options.maxPages || null,
        maxAds: options.maxAds || null,
        headless: options.headless
      });
      const ads = rawResponse.items || rawResponse.all_ads || [];
      results = ads.map(item => normalizeFinalObject(item));
    }
    
    const duration = Date.now() - startTime;
    log(`[${platform.toUpperCase()}] ✅ Concluído: ${results.length} anúncios em ${(duration / 1000).toFixed(2)}s`);
    
    return {
      success: true,
      platform,
      url,
      duration_ms: duration,
      count: results.length,
      results,
      rawResponse: rawResponse || null
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`[${platform.toUpperCase()}] ❌ Erro: ${error.message}`);
    
    return {
      success: false,
      platform,
      url,
      duration_ms: duration,
      error: error.message,
      count: 0,
      results: []
    };
  }
}

/**
 * Executar todos os scrapers
 */
async function runAllScrapers(urls, options, parallel = false) {
  const platforms = Object.keys(urls).filter(p => urls[p]);
  
  if (platforms.length === 0) {
    throw new Error('Nenhuma URL fornecida. Use --config ou --PLATFORM-url para especificar URLs.');
  }
  
  log(`\n🚀 Executando scrape de ${platforms.length} plataforma(s): ${platforms.join(', ')}\n`);
  
  const startTime = Date.now();
  const results = {};
  
  if (parallel) {
    // Executar em paralelo
    log('⚡ Modo paralelo ativado\n');
    const promises = platforms.map(platform => 
      runScraper(platform, urls[platform], options)
        .then(result => ({ platform, result }))
    );
    
    const completed = await Promise.allSettled(promises);
    
    completed.forEach(({ status, value, reason }) => {
      if (status === 'fulfilled') {
        results[value.platform] = value.result;
      } else {
        const platform = platforms.find(p => !results[p]);
        results[platform] = {
          success: false,
          platform: platform || 'unknown',
          error: reason?.message || 'Unknown error',
          count: 0,
          results: []
        };
      }
    });
  } else {
    // Executar sequencialmente
    log('📋 Modo sequencial\n');
    for (const platform of platforms) {
      results[platform] = await runScraper(platform, urls[platform], options);
    }
  }
  
  // Combinar todos os resultados
  let allResults = [];
  let totalCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  for (const platform of platforms) {
    const result = results[platform];
    if (result.success) {
      allResults = allResults.concat(result.results);
      totalCount += result.count;
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  // Pipeline: Deduplicar e calcular FSBO Score
  let processedResults = allResults;
  
  if (allResults.length > 0) {
    try {
      // 1. Deduplicar
      const dedupeResult = dedupeListInMemory(processedResults);
      processedResults = dedupeResult.unique;
      
      if (dedupeResult.duplicates.length > 0) {
        log(`\n📊 Removidos ${dedupeResult.duplicates.length} duplicados`);
      }
      
      // 2. Calcular FSBO Score
      processedResults = calculateFsboScores(processedResults);
    } catch (pipelineError) {
      log(`⚠️  Erro no pipeline: ${pipelineError.message}`);
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  const finalResult = {
    success: true,
    timestamp: new Date().toISOString(),
    duration_ms: totalDuration,
    platforms: {
      total: platforms.length,
      successful: successCount,
      failed: errorCount
    },
    results: processedResults,
    count: processedResults.length,
    by_platform: results,
    meta: {
      total_before_dedupe: allResults.length,
      total_after_dedupe: processedResults.length,
      duplicates_removed: allResults.length - processedResults.length
    }
  };
  
  return finalResult;
}

/**
 * Main
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  // Configurar output
  configureOutput({
    silent: args.silent,
    jsonOnly: args.jsonOnly,
    debug: false
  });
  
  let urls = { ...args.urls };
  let options = { ...args.options };
  
  // Carregar configuração se fornecida
  if (args.config) {
    const config = loadConfig(args.config);
    urls = { ...urls, ...(config.urls || {}) };
    options = { ...options, ...(config.options || {}) };
  }
  
  try {
    const result = await runAllScrapers(urls, options, args.parallel);
    
    // Salvar em arquivo se especificado
    if (args.outputFile) {
      const outputPath = path.resolve(args.outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
      log(`\n💾 Resultado salvo em: ${outputPath}`);
    }
    
    // Imprimir resultado
    printJSON(result);
    
    // Resumo
    if (!args.jsonOnly) {
      log('\n' + '='.repeat(80));
      log('📊 RESUMO');
      log('='.repeat(80));
      log(`✅ Plataformas bem-sucedidas: ${result.platforms.successful}/${result.platforms.total}`);
      log(`❌ Plataformas com erro: ${result.platforms.failed}`);
      log(`📋 Total de anúncios: ${result.count}`);
      log(`⏱️  Duração total: ${(result.duration_ms / 1000).toFixed(2)}s`);
      log('='.repeat(80));
    }
    
    process.exit(result.platforms.failed > 0 ? 1 : 0);
  } catch (error) {
    log(`\n❌ ERRO FATAL: ${error.message}`);
    if (error.stack) {
      log(error.stack);
    }
    
    printJSON({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    process.exit(1);
  }
}

main();


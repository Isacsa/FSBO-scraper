#!/usr/bin/env node

/**
 * Diagnóstico Lobstr para Idealista:
 * - valida autenticação
 * - lista squids acessíveis
 * - confirma o squid Idealista selecionado
 * - cria task/run
 * - obtém results brutos
 * - mostra classificação FSBO vs agência
 *
 * Uso:
 *   node scripts/test-lobstr-connection.js
 *   node scripts/test-lobstr-connection.js --url="https://www.idealista.pt/comprar-casas/lisboa/"
 *   node scripts/test-lobstr-connection.js --max-results=5 --max-wait=600000
 *   node scripts/test-lobstr-connection.js --allow-partial
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const {
  listSquids,
  findIdealistaSquid,
  getIdealistaSquidId,
  createTask,
  createRun,
  getRun,
  getRuns,
  pollRunUntilComplete,
  getAllResults
} = require('../src/scrapers/idealista_lobstr/idealista.client');
const { findActiveIdealistaRun } = require('../src/scrapers/idealista_lobstr/idealista.extract');
const { parseLobstrResults } = require('../src/scrapers/idealista_lobstr/idealista.parse');
const { normalizeListings } = require('../src/scrapers/idealista_lobstr/idealista.normalize');

const args = process.argv.slice(2);

function getArg(name, fallback = null) {
  const flag = args.find(arg => arg.startsWith(`--${name}=`));
  return flag ? flag.split('=').slice(1).join('=') : fallback;
}

function summarizePropertyTypes(parsedItems) {
  return parsedItems.reduce((acc, item) => {
    const key = item.property_type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function summarizeDecisions(parsedItems) {
  return parsedItems.reduce((acc, item) => {
    const key = item.fsbo_decision || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const searchUrl = getArg('url', null);
  const maxResults = parseInt(getArg('max-results', '5'), 10);
  const maxWait = parseInt(getArg('max-wait', '600000'), 10);
  const allowPartial = args.includes('--allow-partial');

  if (!process.env.LOBSTR_API_KEY) {
    throw new Error('LOBSTR_API_KEY env var is required to run Lobstr diagnostics.');
  }

  console.error('[lobstr-test] Starting Lobstr Idealista diagnostic...');
  if (searchUrl) {
    console.error(`[lobstr-test] URL: ${searchUrl}`);
  } else {
    console.error('[lobstr-test] No URL provided; using squid defaults if configured.');
  }

  const squids = await listSquids();
  const detectedIdealistaSquidId = await findIdealistaSquid();
  const activeSquidId = await getIdealistaSquidId();

  const activeRun = findActiveIdealistaRun(await getRuns(activeSquidId));
  if (activeRun) {
    const activeRunId = activeRun.id || activeRun.run_id || 'unknown';
    const activeRunStatus = activeRun.status || activeRun.state || 'unknown';
    throw new Error(
      `Já existe um run Lobstr ativo para o squid Idealista (${activeRunId}, status=${activeRunStatus}). ` +
      'Aguarde a conclusão antes de lançar um novo diagnóstico.'
    );
  }

  const { taskId } = await createTask(searchUrl);
  const { runId } = await createRun(activeSquidId);

  let pollWarning = null;
  try {
    await pollRunUntilComplete(runId, { interval: 4000, maxWait });
  } catch (error) {
    if (!allowPartial) {
      throw error;
    }
    pollWarning = error.message || String(error);
    console.error(`[lobstr-test] Polling did not complete cleanly: ${pollWarning}`);
    console.error('[lobstr-test] Attempting to fetch currently available results anyway...');
  }

  const runInfo = await getRun(runId);

  const rawResults = await getAllResults(activeSquidId, runId, maxResults);
  const parsedResults = parseLobstrResults(rawResults);

  const agencies = parsedResults.filter(item => item.is_agency === true);
  const fsboCandidates = parsedResults.filter(item => item.fsbo_decision === 'fsbo');
  const uncertain = parsedResults.filter(item => item.fsbo_decision === 'uncertain');
  const normalizedFsbo = normalizeListings(fsboCandidates);

  const rawFieldSet = [...new Set(rawResults.flatMap(item => Object.keys(item || {})))].sort();

  const report = {
    success: true,
    timestamp: new Date().toISOString(),
    auth: {
      has_lobstr_api_key: true,
      configured_squid_id: process.env.IDEALISTA_SQUID_ID || null,
      detected_idealista_squid_id: detectedIdealistaSquidId,
      active_squid_id: activeSquidId,
      accessible_squids: squids.length
    },
    run: {
      task_id: taskId,
      run_id: runId,
      status_at_fetch: runInfo.status || runInfo.state || 'unknown',
      total_results_reported: runInfo.total_results || 0,
      polling_warning: pollWarning,
      max_results_requested: maxResults,
      max_wait_ms: maxWait
    },
    raw_results: {
      total: rawResults.length,
      fields: rawFieldSet,
      sample: rawResults[0] || null
    },
    classification: {
      total_parsed: parsedResults.length,
      decisions: summarizeDecisions(parsedResults),
      agencies_detected: agencies.length,
      fsbo_candidates: fsboCandidates.length,
      uncertain_detected: uncertain.length,
      property_types: summarizePropertyTypes(parsedResults),
      sample_agency: agencies[0] || null,
      sample_fsbo_candidate: fsboCandidates[0] || null
    },
    normalized_fsbo: {
      total: normalizedFsbo.length,
      sample: normalizedFsbo[0] || null
    }
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main().catch(error => {
  const report = {
    success: false,
    error: error.message || String(error),
    timestamp: new Date().toISOString()
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(1);
});

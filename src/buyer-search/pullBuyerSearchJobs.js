/**
 * Pull pending buyer search jobs from the APP Fastify API.
 * Follows the same pattern as pullConfigs.js.
 */

const axios = require('axios');

/**
 * Fetch buyer search jobs that need scraping.
 *
 * @param {Object} options
 * @param {string} options.apiUrl - base URL (e.g. "https://api.app.com")
 * @param {string} options.apiKey - scraper API key
 * @param {string} options.tenantId - tenant UUID
 * @param {number} [options.timeout=10000]
 * @returns {Promise<Object[]>} array of job objects: { id, criteria, lastScrapedAt }
 */
async function pullBuyerSearchJobs({ apiUrl, apiKey, tenantId, timeout = 10000, httpClient = axios }) {
  const url = `${apiUrl.replace(/\/+$/, '')}/api/scraper/buyer-search-jobs`;

  const response = await httpClient.get(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Tenant-Id': tenantId,
    },
    timeout,
  });

  if (!response.data?.jobs || !Array.isArray(response.data.jobs)) {
    throw new Error(`[pullBuyerSearchJobs] Unexpected response: ${JSON.stringify(response.data)}`);
  }

  return response.data.jobs;
}

module.exports = { pullBuyerSearchJobs };

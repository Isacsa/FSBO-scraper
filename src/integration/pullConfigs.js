/**
 * Pull scraper configs from the APP Fastify API.
 * The scraper is stateless — it asks the APP what to scrape each time.
 */

const axios = require('axios');

/**
 * Fetch active scraper configs from the APP.
 *
 * @param {Object} options
 * @param {string} options.apiUrl - base URL (e.g. "https://api.app.com")
 * @param {string} options.apiKey - scraper API key
 * @param {string} options.tenantId - tenant UUID
 * @param {number} [options.timeout=10000]
 * @returns {Promise<Object[]>} array of config objects
 */
async function pullConfigs({ apiUrl, apiKey, tenantId, timeout = 10000 }) {
  const url = `${apiUrl.replace(/\/+$/, '')}/api/scraper/configs`;

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Tenant-Id': tenantId,
    },
    params: { active_only: true },
    timeout,
  });

  if (!response.data?.configs || !Array.isArray(response.data.configs)) {
    throw new Error(`[pullConfigs] Unexpected response: ${JSON.stringify(response.data)}`);
  }

  return response.data.configs;
}

module.exports = { pullConfigs };

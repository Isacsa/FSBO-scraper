/**
 * Platform registry (connectors) for scrapers.
 *
 * Goal: centralize platform→module mapping without changing portal logic.
 * Each connector wraps existing scrapers as-is.
 */

const SUPPORTED_PLATFORMS = ['olx', 'imovirtual', 'idealista', 'custojusto', 'casasapo'];

function getConnector(platform) {
  switch (platform) {
    case 'olx':
      return {
        platform: 'olx',
        scrape: require('../scrapers/olx/olx.scraper')
      };
    case 'imovirtual':
      return {
        platform: 'imovirtual',
        scrape: require('../scrapers/imovirtual/imovirtual.scraper')
      };
    case 'idealista':
      // Note: this is the Lobstr-based scraper.
      return {
        platform: 'idealista',
        scrape: require('../scrapers/idealista_lobstr/idealista.scraper')
      };
    case 'custojusto':
      return {
        platform: 'custojusto',
        scrape: require('../scrapers/custojusto/custojusto.scraper')
      };
    case 'casasapo':
      return {
        platform: 'casasapo',
        scrape: require('../scrapers/casasapo/casasapo.scraper')
      };
    default:
      return null;
  }
}

module.exports = {
  SUPPORTED_PLATFORMS,
  getConnector
};


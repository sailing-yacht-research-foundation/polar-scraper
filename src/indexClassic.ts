import logger from './logger';
import { scrapeClassic } from './scrapers/classic';

const currentDate = new Date();
const currentYear = currentDate.getFullYear();

(async () => {
  // TODO: Include year 2020 (Cannot use the same function, has different layout)
  // 1. Scrape ORR Full certs
  for (let year = currentYear; year >= 2017; year--) {
    logger.info(`Start scraping Classic year: ${year}`);
    await scrapeClassic(year);
    logger.info(`Finished scraping Classic year: ${year}`);
  }
})();

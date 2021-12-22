import logger from './logger';
import { scrapeORRez, scrapeORRFull } from './scrapers/orr';

const currentDate = new Date();
const currentYear = currentDate.getFullYear();

(async () => {
  // TODO: Include year 2020 (Cannot use the same function, has different layout)
  // 1. Scrape ORR Full certs
  for (let year = 2021; year <= currentYear; year++) {
    logger.info(`Start scraping ORR Full year: ${year}`);
    await scrapeORRFull(year);
    logger.info(`Finished scraping ORR Full year: ${year}`);
  }

  // 2. Scrape ORR EZ certs
  for (let year = 2021; year <= currentYear; year++) {
    logger.info(`Start scraping ORR EZ year: ${year}`);
    await scrapeORRez(year);
    logger.info(`Finished scraping ORR EZ year: ${year}`);
  }
})();

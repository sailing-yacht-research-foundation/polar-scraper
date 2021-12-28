import logger from './logger';
import { scrapeORRez, scrapeORRFull, scrapeORROneDesign } from './scrapers/orr';

const currentDate = new Date();
const currentYear = currentDate.getFullYear();

(async () => {
  // Note: 2020 version doesn't have polar, and different Layout. Will we need them if they don't have polars
  // 1. Scrape ORR Full certs
  for (let year = 2021; year <= currentYear; year++) {
    logger.info(`Start scraping ORR Full year: ${year}`);
    await scrapeORRFull(year);
    logger.info(`Finished scraping ORR Full year: ${year}`);
  }

  // 2. Scrape ORR EZ certs
  for (let year = 2020; year <= currentYear; year++) {
    logger.info(`Start scraping ORR EZ year: ${year}`);
    await scrapeORRez(year);
    logger.info(`Finished scraping ORR EZ year: ${year}`);
  }

  // 3. Scrape ORR One Design certs
  await scrapeORROneDesign();
})();

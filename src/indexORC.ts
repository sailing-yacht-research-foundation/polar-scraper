import logger from './logger';
import { scrapeORC } from './scrapers/orc';

const currentDate = new Date();
const currentYear = currentDate.getFullYear();

(async () => {
  for (let year = 2020; year <= currentYear; year++) {
    logger.info(`Start scraping ORC  - ${year}`);
    await scrapeORC(year);
    logger.info(`Finish scraping ORC - ${year}`);
  }
})();

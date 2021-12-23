import logger from './logger';
import { scrapeORC } from './scrapers/orc';

const currentDate = new Date();
const currentYear = currentDate.getFullYear();

(async () => {
  logger.info('Start scraping ORC');
  await scrapeORC(currentYear);
  logger.info('Finish scraping ORC');
})();

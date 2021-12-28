import logger from './logger';
import { scrapeIRC } from './scrapers/irc';

(async () => {
  logger.info('Start scraping IRC');
  await scrapeIRC();
  logger.info('Finish scraping IRC');
})();

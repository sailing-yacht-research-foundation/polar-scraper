import { organizations } from './enum';
import { executeClassicCertScrape } from './scrapers/classic';
import { executeIRCCertScrape } from './scrapers/irc';
import { executeORCCertScrape } from './scrapers/orc';
import { executeORRCertScrape } from './scrapers/orr';

let selectedScraper = null;
if (process.argv[2]) {
  selectedScraper = process.argv[2];
}

async function executeAll() {
  await executeClassicCertScrape();
  await executeIRCCertScrape();
  await executeORRCertScrape();
  await executeORCCertScrape();
}

(async () => {
  switch (selectedScraper) {
    case organizations.irc:
      await executeIRCCertScrape();
      break;
    case organizations.classic:
      await executeClassicCertScrape();
      break;
    case organizations.orr:
      await executeORRCertScrape();
      break;
    case organizations.orc:
      await executeORCCertScrape();
      break;
    default:
      await executeAll();
  }
})();

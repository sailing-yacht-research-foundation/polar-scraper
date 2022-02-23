import dotenv from 'dotenv';
dotenv.config();
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

import logger from '../logger';
import makeCert from '../utils/makeCert';
import { saveCert } from '../services/certificateService';
import { organizations } from '../enum';
import { closePageAndBrowser, launchBrowser } from '../utils/puppeteerLauncher';
import { getExistingCerts } from '../utils/getExistingCert';

import { ClassicCertData } from '../types/ClassicType';
import { ExistingCertData } from '../types/GeneralType';

export async function scrapeClassic(
  year: number,
  existingCerts: Map<string, ExistingCertData>,
) {
  const browser = await launchBrowser();
  let page = await browser.newPage();

  const url = `https://secure.headwaytechnology.com/crf.headwaydomain.com/page/validlist/?show=summary&filterby=all&sortby=lname&phyear=${year}&phkeyword=`;
  let classicCerts: ClassicCertData[] = [];
  try {
    await page.goto(url);
    classicCerts = await page.evaluate(() => {
      const certs: ClassicCertData[] = [];
      document
        .querySelectorAll(
          'body > div > div > div > div > center > div > table > tbody > tr',
        )
        .forEach((row) => {
          if (row.children[0].textContent !== 'Name') {
            certs.push({
              owner: row.children[0].textContent || '',
              boatName: row.children[1].textContent || '',
              className: row.children[2].textContent || undefined,
              division: row.children[3].textContent || '',
              subDivision: row.children[4].textContent || undefined,
              sailNumber: row.children[5].textContent || undefined,
              nonSpinnaker: row.children[6].textContent
                ? parseFloat(row.children[6].textContent)
                : undefined,
              nonSpinnakerTA: row.children[7].textContent
                ? parseFloat(row.children[7].textContent)
                : undefined,
              spinnaker: row.children[8].textContent
                ? parseFloat(row.children[8].textContent)
                : undefined,
              spinnakerTA: row.children[9].textContent
                ? parseFloat(row.children[9].textContent)
                : undefined,
              type: row.children[10].textContent || '',
              recorded: row.children[11].textContent || undefined,
              certId: row.children[12].textContent || '',
            });
          }
        });
      return certs;
    });
  } catch (error) {
    logger.error(`Error getting classic certs. Error: ${error}`);
  }
  await closePageAndBrowser({ page, browser });

  const skippedCerts = [];
  for (let i = 0; i < classicCerts.length; i++) {
    const cert = classicCerts[i];
    if (existingCerts.has(cert.certId)) {
      skippedCerts.push(cert.certId);
      continue;
    }
    const issuedDate = cert.recorded
      ? dayjs.utc(cert.recorded, 'MM/DD/YYYY')
      : undefined;
    const expiredDate = issuedDate ? issuedDate.add(1, 'year') : undefined;
    const classicCert = makeCert({
      organization: organizations.classic,
      certType: cert.division,
      owner: cert.owner,
      certNumber: cert.certId,
      issuedDate: issuedDate?.toISOString(),
      expireDate: expiredDate?.toISOString(),
      sailNumber: cert.sailNumber,
      boatName: cert.boatName,
      className: cert.className,
      extras: JSON.stringify(cert),
      hasPolars: false,
      hasTimeAllowances: false,
      originalId: cert.certId,
    });
    try {
      const result = await saveCert(classicCert.syrf_id, classicCert);
      logger.info(`New cert saved: id: ${result._id}, certId: ${cert.certId}`);
    } catch (error) {
      logger.error(
        `Error saving classic cert json with Cert ID: ${cert.certId}. Cert Type: ${cert.division}. Error: ${error}`,
      );
    }
  }
  logger.info(
    `Scraped Classic year ${year}. Stats: ${classicCerts.length} certificates, skipped ${skippedCerts.length} of it.`,
  );
  return;
}

export async function executeClassicCertScrape() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const { existingCerts, finishLoading } = await getExistingCerts(
    organizations.classic,
  );
  if (finishLoading) {
    for (let year = currentYear; year >= 2017; year--) {
      logger.info(`Start scraping Classic year: ${year}`);
      await scrapeClassic(year, existingCerts);
      logger.info(`Finished scraping Classic year: ${year}`);
    }
  }
}

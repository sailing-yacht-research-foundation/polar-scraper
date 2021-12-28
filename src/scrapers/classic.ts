import dotenv from 'dotenv';
dotenv.config();
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

import logger from '../logger';
import makeCert from '../utils/makeCert';
import { saveCert, searchExistingCert } from '../services/certificateService';
import { organizations } from '../enum';
import { closePageAndBrowser, launchBrowser } from '../utils/puppeteerLauncher';

export async function scrapeClassic(year: number) {
  const browser = await launchBrowser();
  let page = await browser.newPage();

  const url = `https://secure.headwaytechnology.com/crf.headwaydomain.com/page/validlist/?show=summary&filterby=all&sortby=lname&phyear=${year}&phkeyword=`;
  let classicCerts: {
    owner: string;
    boatName: string;
    className: string | null;
    division: string;
    subDivision: string | null;
    sailNumber: string | null;
    nonSpinnaker: number | null;
    nonSpinnakerTA: number | null;
    spinnaker: number | null;
    spinnakerTA: number | null;
    type: string;
    recorded: string | null;
    certId: string;
  }[] = [];
  try {
    await page.goto(url);
    classicCerts = await page.evaluate(() => {
      const certs: {
        owner: string;
        boatName: string;
        className: string | null;
        division: string;
        subDivision: string | null;
        sailNumber: string | null;
        nonSpinnaker: number | null;
        nonSpinnakerTA: number | null;
        spinnaker: number | null;
        spinnakerTA: number | null;
        type: string;
        recorded: string | null;
        certId: string;
      }[] = [];
      document
        .querySelectorAll(
          'body > div > div > div > div > center > div > table > tbody > tr',
        )
        .forEach((row) => {
          if (row.children[0].textContent !== 'Name') {
            console.log('asd', row.children[3]);
            certs.push({
              owner: row.children[0].textContent || '',
              boatName: row.children[1].textContent || '',
              className: row.children[2].textContent || null,
              division: row.children[3].textContent || '',
              subDivision: row.children[4].textContent || null,
              sailNumber: row.children[5].textContent || null,
              nonSpinnaker: row.children[6].textContent
                ? parseFloat(row.children[6].textContent)
                : null,
              nonSpinnakerTA: row.children[7].textContent
                ? parseFloat(row.children[7].textContent)
                : null,
              spinnaker: row.children[8].textContent
                ? parseFloat(row.children[8].textContent)
                : null,
              spinnakerTA: row.children[9].textContent
                ? parseFloat(row.children[9].textContent)
                : null,
              type: row.children[10].textContent || '',
              recorded: row.children[11].textContent || null,
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

  for (let i = 0; i < classicCerts.length; i++) {
    const cert = classicCerts[i];
    const existingCert = await searchExistingCert({
      organization: organizations.classic,
      certType: cert.division,
      originalId: cert.certId,
    });
    if (existingCert.length > 0) {
      logger.info(`Cert: ${cert.certId} of Classic exists, skipping`);
      continue;
    }
    const issuedDate = cert.recorded
      ? dayjs.utc(cert.recorded, 'MM/DD/YYYY')
      : undefined;
    const expiredDate = issuedDate ? issuedDate.add(1, 'year') : undefined;
    const classicCert = makeCert({
      organization: organizations.classic,
      subOrganization: 'None',
      certType: cert.division,
      builder: 'Unknown',
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
      const result = await saveCert(classicCert.syrfId, classicCert);
      logger.info(`New cert saved: id: ${result._id}, certId: ${cert.certId}`);
    } catch (error) {
      logger.error(
        `Error saving classic cert json with Cert ID: ${cert.certId}. Cert Type: ${cert.division}. Error: ${error}`,
      );
    }
  }
  return;
}

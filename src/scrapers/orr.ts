import dotenv from 'dotenv';
dotenv.config();
import { AxiosError } from 'axios';

import logger from '../logger';
import makeCert from '../utils/makeCert';
import { closePageAndBrowser, launchBrowser } from '../utils/puppeteerLauncher';
import { saveCert, searchExistingCert } from '../services/certificateService';

import { certificationTypes, organizations } from '../enum';

const defaultORRTimeOut = 10000;

export async function scrapeORRFull(year: number) {
  const browser = await launchBrowser();
  let page = await browser.newPage();
  //  ORR full certs with polars.

  const url = `https://www.regattaman.com/cert_list.php?yr=${year}&lType=all&org=327&goback=%2Fcertificate_page.php%3Fcp_tab&ctyp=ORR&rnum=0&sort=0&ssort=0&sdir=true&ssdir=true`;
  let orrCertRecords: {
    skuId: string | undefined;
    certNumber: string | undefined;
    effectiveDate: string;
    expireDate: string;
    yacht: string;
    boatType: string;
  }[] = [];
  try {
    await page.goto(url, { timeout: defaultORRTimeOut, waitUntil: 'load' });

    orrCertRecords = await page.$$eval('#resTable-0 > tbody > tr', (rows) => {
      return Array.from(rows, (row) => {
        const columns = row.querySelectorAll('td');
        const linkBtn = columns[0].querySelector('a');
        const skuId = linkBtn?.onclick
          ?.toString()
          .split('sku=')[1]
          .split("'")[0];
        const certNumber = linkBtn?.innerHTML;
        const effectiveDate = columns[1].innerHTML;
        const expireDate = columns[2].innerHTML;
        const yacht = columns[3].innerHTML;
        const boatType = columns[4].innerHTML;
        return {
          skuId,
          certNumber,
          effectiveDate,
          expireDate,
          yacht,
          boatType,
        };
      });
    });
  } catch (error) {
    logger.error(`Failed to Scrape ORR Certs`, error);
  }
  for (let i = 0; i < orrCertRecords.length; i++) {
    const {
      skuId,
      yacht: boatName,
      effectiveDate,
      expireDate,
      certNumber,
    } = orrCertRecords[i];
    const originalId = String(skuId).replace(/-/g, '_');
    try {
      const result = await searchExistingCert({
        organization: organizations.orr,
        certType: certificationTypes.orrFull,
        originalId,
      });
      if (result.length > 0) {
        logger.info(
          `Cert: ${certNumber} of ORR Full - ${skuId} exists, skipping`,
        );
        continue;
        // TODO: Should we instead of skipping, update the values? Will this changes frequently, or is it impossible to change
      }
    } catch (error) {
      logger.error(
        `Checking cert exists failed:`,
        (error as AxiosError).response?.data,
      );
      continue;
    }

    try {
      let orrUrl = `https://www.regattaman.com/cert_form.php?sku=${skuId}&rnum=0&sort=undefined&ssort=undefined&sdir=true&ssdir=true`;
      await page.goto(orrUrl, {
        timeout: defaultORRTimeOut,
        waitUntil: 'load',
      });
      const certInfo = await page.evaluate(parseORRFullPolarInformations);
      const extras = await page.content();
      const certificate = makeCert({
        organization: organizations.orr,
        certType: certificationTypes.orrFull,
        boatName,
        issuedDate: effectiveDate,
        expireDate,
        ...certInfo,
        extras,
        originalId,
      });
      const result = await saveCert(certificate.syrf_id, certificate);
      logger.info(
        `New cert saved: id: ${result._id}, originalId: ${originalId}`,
      );
    } catch (error) {
      logger.error('Failed scraping cert or pushing to ES', error);
    }
  }

  await closePageAndBrowser({ page, browser });
  return;
}

export async function scrapeORRez(year: number) {
  const browser = await launchBrowser();
  let page = await browser.newPage();

  const url = `https://www.regattaman.com/cert_list.php?yr=${year}&lType=all&org=327&goback=%2Fcertificate_page.php%3Fcp_tab%3D0&ctyp=ORR-Ez%2CORR-Ez-SH%20Request%20Method:%20GET`;
  let orrCertRecords: {
    skuId: string | undefined;
    certNumber: string | undefined;
    effectiveDate: string;
    expireDate: string;
    yacht: string;
    boatType: string;
  }[] = [];
  try {
    await page.goto(url, { timeout: defaultORRTimeOut, waitUntil: 'load' });

    orrCertRecords = await page.$$eval('#resTable-0 > tbody > tr', (rows) => {
      return Array.from(rows, (row) => {
        const columns = row.querySelectorAll('td');
        const linkBtn = columns[0].querySelector('a');
        const skuId = linkBtn?.onclick
          ?.toString()
          .split('sku=')[1]
          .split("'")[0];
        const certNumber = linkBtn?.innerHTML;
        const effectiveDate = columns[1].innerHTML;
        const expireDate = columns[2].innerHTML;
        const yacht = columns[3].innerHTML;
        const boatType = columns[4].innerHTML;
        return {
          skuId,
          certNumber,
          effectiveDate,
          expireDate,
          yacht,
          boatType,
        };
      });
    });
  } catch (error) {
    logger.error(`Failed to Scrape ORR EZ Certs`, error);
  }
  for (let i = 0; i < orrCertRecords.length; i++) {
    const {
      skuId,
      yacht: boatName,
      effectiveDate,
      expireDate,
      certNumber,
    } = orrCertRecords[i];
    const originalId = String(skuId).replace(/-/g, '_');
    try {
      const result = await searchExistingCert({
        organization: organizations.orr,
        certType: certificationTypes.orrEZ,
        originalId,
      });
      if (result.length > 0) {
        logger.info(
          `Cert: ${certNumber} of ORR EZ - ${skuId} exists, skipping`,
        );
        continue;
      }
    } catch (error) {
      logger.error(
        `Checking cert exists failed:`,
        (error as AxiosError).response?.data,
      );
      continue;
    }

    try {
      let ezUrl = `https://www.regattaman.com/cert_form.php?sku=${skuId}&rnum=0`;
      await page.goto(ezUrl, {
        timeout: defaultORRTimeOut,
        waitUntil: 'load',
      });
      const certInfo = await page.evaluate(parseORREZInformations);
      const extras = await page.content();
      const certificate = makeCert({
        organization: organizations.orr,
        certType: certificationTypes.orrEZ,
        boatName,
        issuedDate: effectiveDate,
        expireDate,
        ...certInfo,
        extras,
        originalId,
      });
      const result = await saveCert(certificate.syrf_id, certificate);
      logger.info(
        `New cert saved: id: ${result._id}, originalId: ${originalId}`,
      );
    } catch (error) {
      logger.error('Failed scraping cert or pushing to ES', error);
    }
  }

  await closePageAndBrowser({ page, browser });
  return;
}

export async function scrapeORROneDesign() {
  const browser = await launchBrowser();
  let page = await browser.newPage();

  const url = 'https://www.regattaman.com/certificate_page.php';
  let oneDesignUrls: string[] = [];
  try {
    await page.goto(url, { timeout: defaultORRTimeOut, waitUntil: 'load' });

    oneDesignUrls = await page.evaluate(() => {
      const urls: string[] = [];
      document
        .querySelectorAll<HTMLAnchorElement>(
          '#odcert > tbody > tr > td > span > a',
        )
        .forEach((c) => {
          urls.push(c.href);
        });
      return urls;
    });
  } catch (error) {
    logger.error(`Failed to Scrape ORR EZ One Design Certs`, error);
  }

  for (let i = 0; i < oneDesignUrls.length; i++) {
    const skuId = oneDesignUrls[i].toString().split('sku=')[1];
    const originalId = String(skuId).replace(/-/g, '_');
    try {
      const result = await searchExistingCert({
        organization: organizations.orr,
        certType: certificationTypes.orrOD,
        originalId,
      });
      if (result.length > 0) {
        logger.info(`Cert: ORR EZ One Design - ${skuId} exists, skipping`);
        continue;
      }
    } catch (error) {
      logger.error(
        `Checking cert exists failed:`,
        (error as AxiosError).response?.data,
      );
      continue;
    }

    try {
      await page.goto(oneDesignUrls[i], {
        timeout: defaultORRTimeOut,
        waitUntil: 'load',
      });
      const certInfo = await page.evaluate(parseORRODInformations);
      const extras = await page.content();
      const certificate = makeCert({
        organization: organizations.orr,
        certType: certificationTypes.orrOD,
        ...certInfo,
        extras,
        originalId,
      });
      const result = await saveCert(certificate.syrf_id, certificate);
      logger.info(
        `New cert saved: id: ${result._id}, originalId: ${originalId}`,
      );
    } catch (error) {
      logger.error('Failed scraping cert or pushing to ES', error);
    }
  }

  await closePageAndBrowser({ page, browser });
  return;
}

function parseORRFullPolarInformations() {
  const builder = document.querySelector('#builder')?.textContent || undefined;
  const owner = document.querySelector('#owner')?.textContent || undefined;
  const certNumber =
    document.querySelector('#cert_id')?.textContent || undefined;
  const measureDate =
    document.querySelector('#meas_date')?.textContent || undefined;
  const country = 'Unknown'; // maybe they're all usa.
  const sailNumber = document
    .querySelector('span#boat_name_sail')
    ?.textContent?.split('   ')[1];
  const className =
    document.querySelector('#boat_type')?.textContent || undefined;
  const beam =
    document.querySelector('#beam_max')?.textContent != null
      ? Number(document.querySelector('#beam_max')?.textContent)
      : undefined;
  const draft =
    document.querySelector('#draft_mt')?.textContent != null
      ? Number(document.querySelector('#draft_mt')?.textContent)
      : undefined;
  const displacement =
    document.querySelector('#disp_mt')?.textContent != null
      ? Number(document.querySelector('#disp_mt')?.textContent)
      : undefined;
  const hasPolars = true;
  const hasTimeAllowances = true;
  const windSpeeds: number[] = [];
  let skippedFirst = false;
  // skip 'Wind Speeds kts' text.
  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_speed > div > div > table > thead > tr > th',
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        const wSpeed = record.textContent?.replace('kts', '');
        if (wSpeed !== undefined) {
          windSpeeds.push(parseFloat(wSpeed));
        }
      }
    });

  const optBeatAngles: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_speed > div > div > table > tbody > tr:nth-child(1) > td',
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        const beatAngle = record.textContent?.replace('°', '');
        if (beatAngle !== undefined) {
          optBeatAngles.push(parseFloat(beatAngle));
        }
      }
    });

  // opt beat speeds;
  const optBeatSpeedsKts: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_speed > div > div > table > tbody > tr:nth-child(2) > td',
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        if (record.textContent !== null) {
          optBeatSpeedsKts.push(parseFloat(record.textContent));
        }
      }
    });

  const trueWindAngles: { twa: number; speeds: number[] }[] = [];
  let currentIndex = 0;
  let lastTWAIndex = 0;

  document
    .querySelectorAll(
      '#polar_speed > div > div > table > tbody > tr > td:nth-child(1)',
    )
    .forEach((record) => {
      let twa: number | undefined;
      if (record.textContent !== null) {
        twa = parseFloat(record.textContent.replace('°', ''));
      }
      if (twa && !isNaN(twa)) {
        const speeds: number[] = [];
        skippedFirst = false;
        lastTWAIndex = currentIndex + 1;
        document
          .querySelectorAll<HTMLTableCellElement>(
            `#polar_speed > div > div > table > tbody > tr:nth-child(${lastTWAIndex}) > td`,
          )
          .forEach((innerRecord) => {
            if (!skippedFirst) {
              skippedFirst = true;
            } else {
              if (innerRecord.textContent !== null) {
                speeds.push(parseFloat(innerRecord.textContent));
              }
            }
          });

        trueWindAngles.push({
          twa,
          speeds,
        });
      }
      currentIndex++;
    });

  // Optimum run speeds kts : '#polar_speed > div > div > table > tbody > tr:nth-child(13) > td'
  const optRunSpeedsKts: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      `#polar_speed > div > div > table > tbody > tr:nth-child(${
        lastTWAIndex + 1
      }) > td`,
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        if (record.textContent !== null) {
          optRunSpeedsKts.push(parseFloat(record.textContent));
        }
      }
    });

  // optimum run angles '#polar_speed > div > div > table > tbody > tr:nth-child(14) > td'
  const optRunAngles: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      `#polar_speed > div > div > table > tbody > tr:nth-child(${
        lastTWAIndex + 2
      }) > td`,
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        if (record.textContent !== null) {
          optRunAngles.push(parseFloat(record.textContent.replace('°', '')));
        }
      }
    });

  const polars = {
    windSpeeds,
    beatAngles: optBeatAngles,
    beatVMGs: optBeatSpeedsKts,
    polars: trueWindAngles,
    runVMGs: optRunSpeedsKts,
    gybeAngles: optRunAngles,
  };

  /** Time allowances */

  const windSpeedsTA: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_time > div > div > table > thead > tr > th',
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        const wSpeedTA = record.textContent?.replace('kts', '');
        if (wSpeedTA !== undefined) {
          windSpeedsTA.push(parseFloat(wSpeedTA));
        }
      }
    });

  const optBeatAnglesTA = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_time > div > div > table > tbody > tr:nth-child(1) > td',
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        const beatAngleTA = record.textContent?.replace('°', '');
        if (beatAngleTA !== undefined) {
          const beatAngleTAFloat = parseFloat(beatAngleTA);
          if (!isNaN(beatAngleTAFloat)) {
            optBeatAnglesTA.push(beatAngleTAFloat);
          }
        }
      }
    });

  // opt beat speeds;
  const optBeatSpeedsKtsTA: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_time > div > div > table > tbody > tr:nth-child(2) > td',
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        const beatSpeedTA = record.textContent
          ?.replace('kts', '')
          .replace(/,/g, '');
        if (beatSpeedTA !== undefined) {
          optBeatSpeedsKtsTA.push(parseFloat(beatSpeedTA));
        }
      }
    });

  const trueWindAnglesTA: { twa: number; speeds: number[] }[] = [];
  currentIndex = 0;
  lastTWAIndex = 0;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_time > div > div > table > tbody > tr > td:nth-child(1)',
    )
    .forEach((record) => {
      let twa: number | undefined;
      if (record.textContent !== null) {
        twa = parseFloat(record.textContent.replace('°', ''));
      }
      if (twa && !isNaN(twa)) {
        const speeds: number[] = [];
        skippedFirst = false;
        lastTWAIndex = currentIndex + 1;

        document
          .querySelectorAll<HTMLTableCellElement>(
            `#polar_time > div > div > table > tbody > tr:nth-child(${lastTWAIndex}) > td`,
          )
          .forEach((innerRecord) => {
            if (!skippedFirst) {
              skippedFirst = true;
            } else {
              if (innerRecord.textContent !== null) {
                speeds.push(
                  parseFloat(innerRecord.textContent.replace(/,/g, '')),
                );
              }
            }
          });
        trueWindAnglesTA.push({
          twa,
          speeds: speeds,
        });
      }
      currentIndex++;
    });

  const optRunSpeedsKtsTA: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      `#polar_time > div > div > table > tbody > tr:nth-child(${
        lastTWAIndex + 1
      }) > td`,
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        if (record.textContent !== null) {
          optRunSpeedsKtsTA.push(
            parseFloat(record.textContent.replace(/,/g, '')),
          );
        }
      }
    });

  const optRunAnglesTA: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      `#polar_time > div > div > table > tbody > tr:nth-child(${
        lastTWAIndex + 2
      }) > td`,
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        if (record.textContent !== null) {
          optRunAnglesTA.push(parseFloat(record.textContent.replace('°', '')));
        }
      }
    });

  const timeAllowances = {
    windSpeeds: windSpeedsTA,
    beatVMGs: optBeatSpeedsKtsTA,
    timeAllowances: trueWindAnglesTA,
    runVMGs: optRunSpeedsKtsTA,
    gybeAngles: optRunAnglesTA,
  };

  return {
    builder,
    owner,
    certNumber,
    measureDate,
    country,
    sailNumber,
    className,
    beam,
    draft,
    displacement,
    hasPolars,
    hasTimeAllowances,
    polars,
    timeAllowances,
  };
}

function parseORREZInformations() {
  // Note: To force undefined value instead of null (textContent may return string | null according to puppeteer types)
  const subOrganization =
    document.querySelector('#cert_group')?.textContent || undefined;
  const builder = document.querySelector('#builder')?.textContent || undefined;
  const owner = document.querySelector('#owner')?.textContent || undefined;
  const certNumber =
    document.querySelector('#cert_id')?.textContent || undefined;
  const country = 'Unknown'; // maybe they're all usa.
  const sailNumber =
    document.querySelector('#sail_id')?.textContent || undefined;
  const className =
    document.querySelector('#boat_type')?.textContent || undefined;
  const beam =
    document.querySelector('#beam_max')?.textContent != null
      ? Number(document.querySelector('#beam_max')?.textContent)
      : undefined;
  const draft =
    document.querySelector('#draft_mt')?.textContent != null
      ? Number(document.querySelector('#draft_mt')?.textContent)
      : undefined;
  const displacement =
    document.querySelector('#disp_mt')?.textContent != null
      ? Number(document.querySelector('#disp_mt')?.textContent)
      : undefined;

  return {
    subOrganization,
    builder,
    owner,
    certNumber,
    country,
    sailNumber,
    className,
    beam,
    draft,
    displacement,
    hasPolars: false,
    hasTimeAllowances: false,
  };
}

function parseORRODInformations() {
  const boatName = document.querySelector('#boat_name')?.textContent || '';
  const subOrganization =
    document.querySelector('#cert_group')?.textContent || undefined;
  const builder = document.querySelector('#builder')?.textContent || undefined;
  const owner = document.querySelector('#owner')?.textContent || undefined;
  const certNumber =
    document.querySelector('#cert_id')?.textContent || undefined;
  const country = 'Unknown'; // maybe they're all usa.
  const sailNumber =
    document.querySelector('#sail_id')?.textContent || undefined;
  const className =
    document.querySelector('#boat_type')?.textContent || undefined;
  const beam =
    document.querySelector('#beam_max')?.textContent != null
      ? Number(document.querySelector('#beam_max')?.textContent)
      : undefined;
  const draft =
    document.querySelector('#draft_mt')?.textContent != null
      ? Number(document.querySelector('#draft_mt')?.textContent)
      : undefined;
  const displacement =
    document.querySelector('#disp_mt')?.textContent != null
      ? Number(document.querySelector('#disp_mt')?.textContent)
      : undefined;
  const issuedDate =
    document.querySelector('#date_eff')?.textContent || undefined;
  // const expireDate = 'Unknown'; // Need to convert issued date into date object and then add a year.
  return {
    subOrganization,
    boatName,
    issuedDate,
    // expireDate,
    builder,
    owner,
    certNumber,
    country,
    sailNumber,
    className,
    beam,
    draft,
    displacement,
    hasPolars: false,
    hasTimeAllowances: false,
  };
}

export async function executeORRCertScrape() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
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
}

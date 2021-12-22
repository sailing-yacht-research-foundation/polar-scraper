import dotenv from 'dotenv';
dotenv.config();
import puppeteer from 'puppeteer';

import { closePageAndBrowser, launchBrowser } from '../utils/puppeteerLauncher';
import logger from '../logger';
import makeCert from '../utils/makeCert';
import { saveCert, searchExistingCert } from '../services/certificateService';
import { AxiosError } from 'axios';

const defaultORRTimeOut = 10000;
export async function scrapeORRFull(year: number) {
  const browser = await launchBrowser();
  let page: puppeteer.Page | undefined;
  //  ORR full certs with polars.

  const orrFullCerts = [];
  const url = `https://www.regattaman.com/cert_list.php?yr=${year}&lType=all&org=327&goback=%2Fcertificate_page.php%3Fcp_tab&ctyp=ORR&rnum=0&sort=0&ssort=0&sdir=true&ssdir=true`;
  try {
    page = await browser.newPage();
    await page.goto(url, { timeout: defaultORRTimeOut, waitUntil: 'load' });

    const orrCertRecords = await page.$$eval(
      '#resTable-0 > tbody > tr',
      (rows) => {
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
      },
    );

    for (let i = 0; i < orrCertRecords.length; i++) {
      const {
        skuId,
        yacht: boatName,
        effectiveDate,
        expireDate,
        certNumber,
      } = orrCertRecords[i];
      try {
        const result = await searchExistingCert({
          organization: 'ORR',
          certType: 'ORR Full',
          certNumber,
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

      let orrUrl = `https://www.regattaman.com/cert_form.php?sku=${skuId}&rnum=0&sort=undefined&ssort=undefined&sdir=true&ssdir=true`;
      await page.goto(orrUrl, {
        timeout: defaultORRTimeOut,
        waitUntil: 'load',
      });
      const certInfo = await page.evaluate(parseORRFullPolarInformations);
      const extras = await page.content();
      const certificate = makeCert({
        organization: 'ORR',
        subOrganization: 'None',
        certType: 'ORR Full',
        boatName,
        issuedDate: effectiveDate,
        expireDate,
        ...certInfo,
        extras,
      });
      orrFullCerts.push(certificate);
      try {
        const result = await saveCert(certificate.syrfId, certificate);
        console.log(result);
      } catch (error) {
        logger.error('Failed pushing to ES', error);
      }
    }
  } catch (error) {
    logger.error(`Failed to Scrape ORR Certs`, error);
  } finally {
    closePageAndBrowser({ page, browser });
  }
  return orrFullCerts;
}

function parseORRFullPolarInformations() {
  const builder = document.querySelector('#builder')?.textContent;
  const owner = document.querySelector('#owner')?.textContent;
  const certNumber = document.querySelector('#cert_id')?.textContent;
  const measureDate = document.querySelector('#meas_date')?.textContent;
  const country = 'Unknown'; // maybe they're all usa.
  const sailNumber = document
    .querySelector('span#boat_name_sail')
    ?.textContent?.split('   ')[1];
  const className = document.querySelector('#class')?.textContent;
  const beam = Number(document.querySelector('#beam_max')?.textContent);
  const draft = Number(document.querySelector('#draft_mt')?.textContent);
  const displacement = Number(document.querySelector('#disp_mt')?.textContent);
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

  document
    .querySelectorAll(
      '#polar_speed > div > div > table > tbody > tr > td:nth-child(1)',
    )
    .forEach((record) => {
      if (currentIndex >= 2 && currentIndex <= 11) {
        const speeds: number[] = [];
        skippedFirst = false;
        document
          .querySelectorAll<HTMLTableCellElement>(
            `#polar_speed > div > div > table > tbody > tr:nth-child(${
              currentIndex + 1
            }) > td`,
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

        if (record.textContent !== null) {
          trueWindAngles.push({
            twa: parseFloat(record.textContent.replace('°', '')),
            speeds: speeds,
          });
        }
      }
      currentIndex++;
    });

  // Optimum run speeds kts : '#polar_speed > div > div > table > tbody > tr:nth-child(13) > td'
  const optRunSpeedsKts: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_speed > div > div > table > tbody > tr:nth-child(13) > td',
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
      '#polar_speed > div > div > table > tbody > tr:nth-child(14) > td',
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
        const beatAngleTA = record.textContent?.replace('kts', '');
        if (beatAngleTA !== undefined) {
          optBeatAnglesTA.push(parseFloat(beatAngleTA));
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
        const beatSpeedTA = record.textContent?.replace('kts', '');
        if (beatSpeedTA !== undefined) {
          optBeatSpeedsKtsTA.push(parseFloat(beatSpeedTA));
        }
      }
    });

  const trueWindAnglesTA: { twa: number; speeds: number[] }[] = [];
  currentIndex = 0;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_time > div > div > table > tbody > tr > td:nth-child(1)',
    )
    .forEach((record) => {
      if (currentIndex >= 2 && currentIndex <= 11) {
        const speeds: number[] = [];
        skippedFirst = false;

        document
          .querySelectorAll<HTMLTableCellElement>(
            `#polar_time > div > div > table > tbody > tr:nth-child(${
              currentIndex + 1
            }) > td`,
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

        if (record.textContent !== null) {
          trueWindAnglesTA.push({
            twa: parseFloat(record.textContent.replace('°', '')),
            speeds: speeds,
          });
        }
      }
      currentIndex++;
    });

  const optRunSpeedsKtsTA: number[] = [];
  skippedFirst = false;

  document
    .querySelectorAll<HTMLTableCellElement>(
      '#polar_time > div > div > table > tbody > tr:nth-child(13) > td',
    )
    .forEach((record) => {
      if (!skippedFirst) {
        skippedFirst = true;
      } else {
        if (record.textContent !== null) {
          optRunSpeedsKtsTA.push(parseFloat(record.textContent));
        }
      }
    });

  const timeAllowances = {
    windSpeeds: windSpeedsTA,
    beatVMGs: optBeatSpeedsKtsTA,
    timeAllowances: trueWindAnglesTA,
    runVMGs: optRunSpeedsKtsTA,
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

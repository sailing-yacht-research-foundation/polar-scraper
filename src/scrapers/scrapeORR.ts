import puppeteer from 'puppeteer';
import axios from 'axios';

import { closePageAndBrowser, launchBrowser } from '../utils/puppeteerLauncher';
import logger from '../logger';

const defaultORRTimeOut = 10000;

async function scrapeORR() {
  const browser = await launchBrowser();
  let page: puppeteer.Page | undefined;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  //  ORR full certs with polars.

  const url = `https://www.regattaman.com/cert_list.php?yr=${currentYear}&lType=all&org=327&goback=%2Fcertificate_page.php%3Fcp_tab&ctyp=ORR&rnum=0&sort=0&ssort=0&sdir=true&ssdir=true`;
  try {
    page = await browser.newPage();
    await page.goto(url, { timeout: defaultORRTimeOut, waitUntil: 'load' });

    const orrCertIds = await page.evaluate(() => {
      const skuList: string[] = [];
      document
        .querySelectorAll<HTMLLinkElement>('#resTable-0 > tbody > tr > td > a')
        .forEach((btn) => {
          if (btn.onclick) {
            skuList.push(btn.onclick.toString().split('sku=')[1].split("'")[0]);
          }
        });
      return skuList;
    });

    const orrFullCerts = [];
    for (let i = 0; i < orrCertIds.length; i++) {
      let orrUrl = `https://www.regattaman.com/cert_form.php?sku=${orrCertIds[i]}&rnum=0&sort=undefined&ssort=undefined&sdir=true&ssdir=true`;
      await page.goto(orrUrl, {
        timeout: defaultORRTimeOut,
        waitUntil: 'load',
      });
      let certInfo = await page.evaluate(parsePolarInformations);
      console.log(certInfo);
      break;
    }
  } catch (error) {
    logger.error(`Failed to Scrape ORR Certs`, error);
  } finally {
    closePageAndBrowser({ page, browser });
  }
}

function parsePolarInformations() {
  const boatName = document
    .querySelector('span#boat_name_sail')
    ?.textContent?.split('   ')[0];
  const organization = 'ORR';
  const subOrganization = 'None';
  const certType = 'ORR Full';

  const builder = document.querySelector('#builder')?.textContent;
  const owner = document.querySelector('#owner')?.textContent;
  const certNumber = document.querySelector('#cert_id')?.textContent;
  const issuedDate = document.querySelector('#date_eff')?.textContent;

  const expireDate = 'Unknown';
  const measureDate = document.querySelector('#meas_date')?.textContent;
  const country = 'Unknown'; // maybe they're all usa.
  const sailNum = document
    .querySelector('span#boat_name_sail')
    ?.textContent?.split('   ')[1];
  const className = document.querySelector('#class')?.textContent;
  const beamFt = document.querySelector('#beam_max')?.textContent;
  const draftFt = document.querySelector('#draft_mt')?.textContent;
  const displacementKg = document.querySelector('#disp_mt')?.textContent;
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
          .forEach((record) => {
            if (!skippedFirst) {
              skippedFirst = true;
            } else {
              if (record.textContent !== null) {
                speeds.push(parseFloat(record.textContent));
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

  return {
    organization,
    subOrganization,
    certType,
    boatName,
    builder,
    owner,
    certNumber,
    issuedDate,
    expireDate,
    measureDate,
    country,
    sailNum,
    className,
    beamFt,
    draftFt,
    displacementKg,
    hasPolars,
    hasTimeAllowances,
    polars,
  };
}

scrapeORR();

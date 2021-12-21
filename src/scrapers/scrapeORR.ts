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
      let certInfo = await page.evaluate(() => {
        const boatName = document
          .querySelector('span#boat_name_sail')
          ?.textContent?.split('   ')[0];
        const org = 'ORR';
        const suborg = 'None';
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

        const polars = {
          windSpeeds,
          //   beatAngles: optBeatAngles,
          //   beatVMGs: optBeatSpeedsKts,
          //   polars: trueWindAngles,
          //   runVMGs: optRunSpeedsKts,
          //   gybeAngles: optRunAngles,
        };

        return {
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
      });
      console.log(certInfo);
      break;
    }
  } catch (error) {
    logger.error(`Failed to Scrape ORR Certs`, error);
  } finally {
    closePageAndBrowser({ page, browser });
  }
}

scrapeORR();

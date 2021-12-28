import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

import logger from '../logger';
import makeCert from '../utils/makeCert';
import { closePageAndBrowser, launchBrowser } from '../utils/puppeteerLauncher';
import { saveCert, searchExistingCert } from '../services/certificateService';
import { organizations } from '../enum';

import { ORCAllowances, RMS } from '../types/ORCType';

const ORC_URL = 'https://data.orc.org/public/WPub.dll/RMS';

export async function scrapeORC(year: number) {
  const browser = await launchBrowser();
  let page = await browser.newPage();

  let countryCodes: {
    data: {
      name: string;
      value: string;
    };
    countries: {
      code: string;
      name: string;
    }[];
  }[] = [];
  try {
    await page.goto(ORC_URL);

    const orcStandardCountries = await page.evaluate(() => {
      const countries: {
        code: string;
        name: string;
      }[] = [];
      document
        .querySelectorAll<HTMLTableColElement>(
          '#rms1 > table > tbody > tr > td.country',
        )
        .forEach((td) => {
          const img = td.querySelector<HTMLImageElement>('img');
          const span = td.querySelector<HTMLSpanElement>('span');
          if (img && span) {
            countries.push({
              code: img.src.split('public/')[1].split('.gif')[0],
              name: span.textContent || '',
            });
          }
        });
      return countries;
    });
    countryCodes.push({
      data: {
        name: 'ORC Standard',
        value: '1',
      },
      countries: orcStandardCountries,
    });

    const doubleHandedCountries = await page.evaluate(() => {
      const countries: {
        code: string;
        name: string;
      }[] = [];
      document
        .querySelectorAll<HTMLTableColElement>(
          '#rms3 > table > tbody > tr > td.country',
        )
        .forEach((td) => {
          const img = td.querySelector<HTMLImageElement>('img');
          const span = td.querySelector<HTMLSpanElement>('span');
          if (img && span) {
            countries.push({
              code: img.src.split('public/')[1].split('.gif')[0],
              name: span.textContent || '',
            });
          }
        });
      return countries;
    });
    countryCodes.push({
      data: {
        name: 'Double Handed',
        value: '3',
      },
      countries: doubleHandedCountries,
    });

    const nonSpinnakerCountries = await page.evaluate(() => {
      const countries: {
        code: string;
        name: string;
      }[] = [];
      document
        .querySelectorAll<HTMLImageElement>(
          '#rms5 > table > tbody > tr > td.country',
        )
        .forEach((td) => {
          const img = td.querySelector<HTMLImageElement>('img');
          const span = td.querySelector<HTMLSpanElement>('span');
          if (img && span) {
            countries.push({
              code: img.src.split('public/')[1].split('.gif')[0],
              name: span.textContent || '',
            });
          }
        });

      return countries;
    });
    countryCodes.push({
      data: {
        name: 'Non Spinnaker',
        value: '5',
      },
      countries: nonSpinnakerCountries,
    });
    logger.info('Done fetching countries');
  } catch (error) {
    logger.error(`Failed to Scrape ORC Certs`, error);
  }
  await closePageAndBrowser({ page, browser });

  for (let i = 0; i < countryCodes.length; i++) {
    const { data, countries } = countryCodes[i];

    for (const country of countries) {
      await downloadORCCerts(country, data.value, data.name, year);
    }
  }

  return;
}

export async function downloadORCCerts(
  country: {
    code: string;
    name: string;
  },
  certCode: string,
  certType: string,
  year: number,
) {
  let rms: RMS[] = [];
  try {
    const result = await axios.get<{
      rms?: RMS[];
      Countries: {
        CountryId: string;
        Name: string;
      }[];
      ScoringOptions: {
        Families: string[];
        CountryId: string;
        Kind: string;
        Fieldname: string;
        Name: string;
      }[];
    }>(
      `https://data.orc.org/public/WPub.dll?action=DownRMS&CountryId=${country.code}&ext=json&Family=${certCode}&VPPYear=${year}`,
    );
    rms = result.data.rms || [];
  } catch (error) {
    logger.error(
      `Error downloading orc cert json. Year: ${year} Country: ${country.name} Cert Type: ${certType}. Error: ${error}`,
    );
  }
  if (rms) {
    for (let i = 0; i < rms.length; i++) {
      const cert = rms[i];
      const existingCert = await searchExistingCert({
        organization: organizations.orc,
        certType,
        originalId: cert.RefNo,
      });
      if (existingCert.length > 0) {
        logger.info(
          `Cert: ${cert.CertNo} - ${cert.RefNo} of ORC exists, skipping`,
        );
        continue;
      }
      const beatVmgs: number[] = [];
      cert.Allowances.Beat.forEach((s) => {
        beatVmgs.push(3600.0 / s);
      });

      const runVmgs: number[] = [];
      cert.Allowances.Run.forEach((s) => {
        runVmgs.push(3600.0 / s);
      });

      const p: {
        twa: number;
        speeds: number[];
      }[] = [];
      const ta: {
        twa: number;
        speeds: number[];
      }[] = [];

      let count = 0;
      Object.keys(cert.Allowances).forEach((k) => {
        const angle = parseFloat(k.split('R')[1]);
        if (!isNaN(angle)) {
          const speedsKnots: number[] = [];
          const speedsSecMile: number[] = [];
          cert.Allowances[k as keyof ORCAllowances].forEach((s) => {
            speedsKnots.push(3600.0 / s);
            speedsSecMile.push(s);
          });
          p.push({ twa: angle, speeds: speedsKnots });
          ta.push({ twa: angle, speeds: speedsSecMile });
        }
        count++;
      });
      const polars = {
        windSpeeds: cert.Allowances.WindSpeeds,
        beatAngles: cert.Allowances.BeatAngle,
        beatVMGs: beatVmgs,
        polars: p,
        runVMGs: runVmgs,
        gybeAngles: cert.Allowances.GybeAngle,
      };
      const issueDate = new Date(cert.IssueDate);
      const expiredDate = new Date(
        issueDate.getFullYear() + 1,
        issueDate.getMonth(),
        issueDate.getDate(),
      );

      const orcCert = makeCert({
        organization: organizations.orc,
        certType,
        builder: cert.Builder,
        certNumber: cert.CertNo,
        issuedDate: cert.IssueDate,
        expireDate: expiredDate.toISOString(),
        country: country.name,
        sailNumber: cert.SailNo,
        boatName: cert.YachtName,
        className: cert.Class,
        extras: JSON.stringify(cert),
        hasPolars: true,
        polars,
        hasTimeAllowances: true,
        timeAllowances: {
          windSpeeds: cert.Allowances.WindSpeeds,
          beatVMGs: cert.Allowances.Beat,
          timeAllowances: ta,
          runVMGs: cert.Allowances.Run,
          gybeAngles: cert.Allowances.GybeAngle,
        },
        originalId: cert.RefNo,
      });
      try {
        const result = await saveCert(orcCert.syrfId, orcCert);
        logger.info(
          `New cert saved: id: ${result._id}, originalId: ${cert.RefNo}`,
        );
      } catch (error) {
        logger.error(
          `Error saving orc cert json with refNo: ${cert.RefNo}. Year: ${year} Country: ${country.name} Cert Type: ${certType}. Error: ${error}`,
        );
      }
    }
  }
}

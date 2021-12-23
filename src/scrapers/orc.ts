import dotenv from 'dotenv';
dotenv.config();
import axios, { AxiosError } from 'axios';

import logger from '../logger';
import makeCert from '../utils/makeCert';
import { closePageAndBrowser, launchBrowser } from '../utils/puppeteerLauncher';
// import { saveCert, searchExistingCert } from '../services/certificateService';

import { organizations } from '../enum';

const ORC_URL = 'https://data.orc.org/public/WPub.dll/RMS';

type ORCAllowances = {
  WindSpeeds: number[];
  WindAngles: number[];
  R52: number[];
  R60: number[];
  R75: number[];
  R90: number[];
  R110: number[];
  R120: number[];
  R135: number[];
  R150: number[];
  Beat: number[];
  Run: number[];
  BeatAngle: number[];
  GybeAngle: number[];
  WL: number[];
  CR: number[];
  OC: number[];
};
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
      let familyCode = data.value;
      let familyName = data.name;

      const result = await axios.get<{
        rms?: {
          NatAuth: string;
          BIN: string;
          CertNo: string;
          RefNo: string;
          SailNo: string;
          YachtName: string;
          Class: string;
          Builder: string;
          Designer: string;
          Address3: string;
          C_Type: string;
          Family: string;
          Division: string;
          IssueDate: string;
          Dspl_Sailing: number;
          WSS: number;
          Area_Main: number;
          Area_Jib: number;
          Area_Sym: number;
          Area_Asym: number;
          Age_Year: number;
          CrewWT: number;
          LOA: number;
          IMSL: number;
          Draft: number;
          MB: number;
          Dspl_Measurement: number;
          Stability_Index: number;
          Dynamic_Allowance: number;
          GPH: number;
          CDL: number;
          ILCWA: number;
          TMF_Inshore: number;
          APHD: number;
          APHT: number;
          OSN: number;
          TMF_Offshore: number;
          TND_Offshore_Low: number;
          TN_Offshore_Low: number;
          TND_Offshore_Medium: number;
          TN_Offshore_Medium: number;
          TND_Offshore_High: number;
          TN_Offshore_High: number;
          TND_Inshore_Low: number;
          TN_Inshore_Low: number;
          TND_Inshore_Medium: number;
          TN_Inshore_Medium: number;
          TND_Inshore_High: number;
          TN_Inshore_High: number;
          Pred_Up_TOD: number;
          Pred_Up_TOT: number;
          Pred_Down_TOD: number;
          Pred_Down_TOT: number;
          US_PREDUP_L_TOD: number;
          US_PREDUP_L_TOT: number;
          US_PREDUP_M_TOD: number;
          US_PREDUP_M_TOT: number;
          US_PREDUP_H_TOD: number;
          US_PREDUP_H_TOT: number;
          US_PREDDN_L_TOD: number;
          US_PREDDN_L_TOT: number;
          US_PREDDN_M_TOD: number;
          US_PREDDN_M_TOT: number;
          US_PREDDN_H_TOD: number;
          US_PREDDN_H_TOT: number;
          US_CHIMAC_UP_TOT: number;
          US_CHIMAC_AP_TOT: number;
          US_CHIMAC_DN_TOT: number;
          US_BAYMAC_CV_TOT: number;
          US_BAYMAC_SH_TOT: number;
          US_HARVMOON_TOD: number;
          US_HARVMOON_TOT: number;
          US_VICMAUI_TOT: number;
          KR_PREDR_TOD: number;
          RSA_CD_INS_TOD: number;
          RSA_CD_INS_TOT: number;
          RSA_CD_OFF_TOD: number;
          RSA_CD_OFF_TOT: number;
          Allowances: ORCAllowances;
        }[];
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
        `https://data.orc.org/public/WPub.dll?action=DownRMS&CountryId=${country.code}&ext=json&Family=${familyCode}&VPPYear=${year}`,
      );
      const { rms } = result.data;
      if (rms) {
        logger.info(`Building certs starting`);
        rms.forEach((cert) => {
          const beatVmgs: number[] = [];
          cert.Allowances.Beat.forEach((s) => {
            beatVmgs.push(s / 3600.0);
          });

          const runVmgs: number[] = [];
          cert.Allowances.Run.forEach((s) => {
            runVmgs.push(s / 3600.0);
          });

          const p: {
            twa: number;
            speeds: number[];
          }[] = [];

          let count = 0;
          Object.keys(cert.Allowances).forEach((k) => {
            if (count >= 2 && count <= 9) {
              const angle = parseFloat(k.split('R')[1]);

              const speeds: number[] = [];
              cert.Allowances[k as keyof ORCAllowances].forEach((s) => {
                speeds.push(s / 3600.0);
              });
              p.push({ twa: angle, speeds: speeds });
            }
            count++;
          });
          const polars = {
            windSpeeds: cert['Allowances'].WindSpeeds,
            beatAngles: cert['Allowances'].BeatAngle,
            beatVMGs: beatVmgs,
            polars: p,
            runVMGs: runVmgs,
            gybeAngles: cert['Allowances'].GybeAngle,
          };
          var d = new Date(cert.IssueDate);
          var year = d.getFullYear();
          var month = d.getMonth();
          var day = d.getDate();
          var expiredDate = new Date(year + 1, month, day);

          makeCert({
            organization: organizations.orc,
            subOrganization: 'None',
            certType: familyName,
            builder: cert.Builder,
            owner: undefined,
            certNumber: cert.CertNo,
            issuedDate: cert.IssueDate,
            expireDate: expiredDate.toISOString(),
            measureDate: 'Unknown',
            country: country.name,
            sailNumber: cert.SailNo,
            boatName: cert.YachtName,
            className: cert.Class,
            beam: undefined,
            draft: undefined,
            displacement: undefined,
            extras: JSON.stringify(cert),
            hasPolars: true,
            polars,
            hasTimeAllowances: true,
            timeAllowances: cert.Allowances,
            originalId: cert.RefNo,
          });
          logger.info(`Cert for refNo: ${cert.RefNo} finished`);
        });
      }
    }
  }

  return;
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
    subOrganization: 'NONE',
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

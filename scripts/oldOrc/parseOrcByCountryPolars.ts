import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

import makeCert from '../../src/utils/makeCert';
import getCountry from '../../src/utils/getCountry';
import { organizations } from '../../src/enum';

import { ExistingCertMapData } from '.';
import { ORCAllowances, RMS } from '../../src/types/ORCType';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readDirectory = promisify(fs.readdir);

const mainFolder = path.resolve(
  __dirname,
  `../../files/jeiterPolars/2020ORCPolarsByCountryFromORCCountryListSite`,
);
export async function parseOrcByCountryPolars(
  existingCerts: Map<string, ExistingCertMapData[]>,
) {
  const validCerts = [];
  const duplicateCerts = [];
  const subFolders = ['f3', 'orc']; // All files inside 'dh' are empty jsons, all under 1KB
  for (
    let subFolderIterator = 0;
    subFolderIterator < subFolders.length;
    subFolderIterator++
  ) {
    const folder = subFolders[subFolderIterator];
    const orcFiles = await readDirectory(`${mainFolder}/${folder}`);
    for (let i = 0; i < orcFiles.length; i++) {
      if (!orcFiles[i].endsWith('.json')) {
        continue;
      }
      const fileContent = (
        await readFile(`${mainFolder}/${folder}/${orcFiles[i]}`, 'utf-8')
      ).replace(/[\u200B-\u200D\uFEFF]/g, '');
      // Files are corrupt with zero width break space.
      let parsedData = JSON.parse(fileContent);
      if (typeof parsedData === 'string') {
        // Files require double json parsing, cause it's double stringified
        parsedData = JSON.parse(parsedData);
      }
      const countryCode = orcFiles[i].substring(0, 3);
      const country = getCountry(countryCode);
      if (parsedData.rms?.length > 0) {
        // console.log(orcFiles[i], parsedData.rms[0]?.Builder);
        for (let j = 0; j < parsedData.rms.length; j++) {
          const cert: RMS = parsedData.rms[j];
          const beatVmgs: number[] = [];
          cert.Allowances.Beat.forEach((s) => {
            beatVmgs.push(3600.0 / s);
          });

          if (subFolderIterator === 1 && i === 1 && j === 0) {
            fs.writeFileSync(
              path.resolve(
                __dirname,
                `../../files/2020ORCPolarsBCFOC_debug.json`,
              ),
              JSON.stringify(cert),
              'utf-8',
            );
          }
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
            builder: cert.Builder,
            certNumber: cert.CertNo,
            beam: cert.MB,
            draft: cert.Draft,
            displacement: cert.Dspl_Measurement,
            issuedDate: cert.IssueDate,
            expireDate: expiredDate.toISOString(),
            country: country,
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

          const certYear = issueDate.getFullYear().toString();
          const existKey = `${String(
            orcCert.boat_name,
          ).toLowerCase()}|${certYear}`;
          const existCerts = existingCerts.get(existKey);
          let isExist = false;
          if (existCerts) {
            isExist =
              existCerts.findIndex((existRow) => {
                if (orcCert.builder && orcCert.builder === existRow.builder) {
                  return true;
                }
                return false;
              }) !== -1;
          }

          if (!isExist) {
            validCerts.push(orcCert);
            const newData = {
              boatName: orcCert.boat_name,
              issueYear: certYear,
              builder: orcCert.builder,
            };
            if (existCerts) {
              existCerts.push(newData);
            } else {
              existingCerts.set(existKey, [newData]);
            }
          } else {
            duplicateCerts.push(orcCert);
          }
        }
      } else {
        console.log(
          `${mainFolder}/${folder}/${orcFiles[i]}`,
          'has no content inside rms object. Size: ',
          fs.statSync(`${mainFolder}/${folder}/${orcFiles[i]}`).size,
        );
      }
    }
  }

  fs.writeFileSync(
    path.resolve(__dirname, `../../files/2020ORCPolarsBCFOC_result.json`),
    JSON.stringify(validCerts),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `../../files/2020ORCPolarsBCFOC_duplicates.json`),
    JSON.stringify(duplicateCerts),
    'utf-8',
  );
}

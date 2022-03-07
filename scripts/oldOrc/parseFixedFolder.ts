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
import { convertKnotsToSecPerMile } from '../../src/utils/conversionUtils';
import { organizations } from '../../src/enum';

import { Polar, TimeAllowance } from '../../src/types/GeneralType';
import { ExistingCertMapData, JeiterPolarGeneralFormat } from '.';

const readFile = promisify(fs.readFile);
const readDirectory = promisify(fs.readdir);

const mainFolder = '../../files';
export async function parseFixedFolder(
  existingCerts: Map<string, ExistingCertMapData[]>,
) {
  const countrylessData: string[] = [];
  const validCerts: any[] = [];
  const duplicateCerts: any[] = [];
  const orcDirectory = path.resolve(
    __dirname,
    `${mainFolder}/jeiterPolars/FixedFiles`,
  );
  const files = await readDirectory(orcDirectory);

  let validJsonFileCount = 0;
  let invalidJsonFileCount = 0;
  for (let i = 0; i < files.length; i++) {
    if (!files[i].endsWith('.json')) {
      invalidJsonFileCount++;
      // console.log(`${filesToProcess[i].fileName} is not json`);
      continue;
    }
    validJsonFileCount++;
    const fileName = files[i];
    const fileNameWithoutExt = fileName.split('.json')[0];
    //   const countryCode = '';//TODO: Get from sailnumber
    const certs = await readFile(
      path.resolve(__dirname, `${orcDirectory}/${fileName}`),
      'utf-8',
    );
    try {
      const year = fileNameWithoutExt.substring(0, 4);
      let countryCode = '';
      if (fileNameWithoutExt.length > 4) {
        // Contains country information
        countryCode = fileNameWithoutExt.substring(4);
      }
      const certificates: JeiterPolarGeneralFormat[] = JSON.parse(certs);
      // Hardcoded to the year/folder it's in, there's no field for issue date and expire date
      const issuedDate = `${year}-01-01T00:00:00.000Z`;
      const expireDate = `${year}-12-31T00:00:00.000Z`;

      for (let j = 0; j < certificates.length; j++) {
        const {
          sailnumber: sailNumber,
          name: boatName,
          owner,
          boat,
          vpp,
          country: fileCountryCode,
        } = certificates[j];

        const { builder, type: className } = boat;
        const { beam, draft, displacement } = boat.sizes;

        let country = getCountry(fileCountryCode || countryCode);
        if (!country) {
          countrylessData.push(fileName);
        }

        let hasPolars = false;
        let hasTimeAllowances = false;
        const {
          beat_vmg: beatVMGs,
          beat_angle: beatAngles,
          angles,
          speeds,
          run_angle: gybeAngles,
          run_vmg: runVMGs,
        } = vpp;
        let polars: Polar | undefined = undefined;
        let timeAllowances: TimeAllowance | undefined = undefined;
        if (vpp) {
          hasPolars = true;
          hasTimeAllowances = true;
          polars = {
            windSpeeds: speeds,
            beatAngles,
            beatVMGs,
            polars: angles.map((twa) => {
              return {
                twa,
                speeds: (vpp as any)[String(twa)],
              };
            }),
            runVMGs,
            gybeAngles,
          };
          timeAllowances = {
            windSpeeds: speeds,
            beatVMGs: beatVMGs.map((vmg) => convertKnotsToSecPerMile(vmg)),
            runVMGs: runVMGs?.map((vmg) => convertKnotsToSecPerMile(vmg)),
            timeAllowances: angles.map((twa) => {
              return {
                twa,
                speeds: ((vpp as any)[String(twa)] as number[]).map((speed) =>
                  convertKnotsToSecPerMile(speed),
                ),
              };
            }),
          };
        }

        const formattedCert = makeCert({
          organization: organizations.orc,
          builder,
          issuedDate,
          expireDate,
          country,
          sailNumber,
          boatName,
          owner,
          className,
          beam,
          draft,
          displacement,
          extras: JSON.stringify(certificates[j]),
          hasPolars,
          hasTimeAllowances,
          timeAllowances,
          polars,
          originalId: `jeiterPolars_${fileNameWithoutExt}_${String(j).padStart(
            4,
            '0',
          )}`,
        });

        // For these file, replace boatName with Sailing Number if boatName is empty string
        // Each file has around 6-8 nameless boat
        const existKey = `${String(
          boatName || sailNumber,
        ).toLowerCase()}|${new Date(issuedDate).getFullYear()}`;
        const existCerts = existingCerts.get(existKey);
        let isExist = false;
        if (existCerts) {
          isExist =
            existCerts.findIndex((existRow) => {
              if (builder && builder === existRow.builder) {
                return true;
              }
              return false;
            }) !== -1;
        }

        if (!isExist) {
          validCerts.push(formattedCert);
          const newData = {
            boatName,
            issueYear: year,
            builder,
          };
          if (existCerts) {
            existCerts.push(newData);
          } else {
            existingCerts.set(existKey, [newData]);
          }
        } else {
          duplicateCerts.push(formattedCert);
        }
      }
    } catch (error) {
      console.log(fileName);
      console.trace(error);
    }
  }

  if (!fs.existsSync(path.resolve(__dirname, `${mainFolder}/jeiter`))) {
    fs.mkdirSync(path.resolve(__dirname, `${mainFolder}/jeiter`));
  }
  if (
    !fs.existsSync(path.resolve(__dirname, `${mainFolder}/jeiter/FixedFiles`))
  ) {
    fs.mkdirSync(path.resolve(__dirname, `${mainFolder}/jeiter/FixedFiles`));
  }
  fs.writeFileSync(
    path.resolve(__dirname, `${mainFolder}/jeiter/FixedFiles/valid.json`),
    JSON.stringify(validCerts),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `${mainFolder}/jeiter/FixedFiles/duplicates.json`),
    JSON.stringify(duplicateCerts),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `${mainFolder}/jeiter/FixedFiles/countryless.json`),
    JSON.stringify(countrylessData),
    'utf-8',
  );
  console.log('ORC Jeiter Polar - Large Files - Fixed - DONE');
  console.table({
    totalCertFound: validJsonFileCount,
    totalInvalidFile: invalidJsonFileCount,
    validCertsCount: validCerts.length,
    duplicatesCount: duplicateCerts.length,
    countryLessCount: countrylessData.length,
  });
}

// (async () => {
//   await parseFixedFolder(new Map());
// })();

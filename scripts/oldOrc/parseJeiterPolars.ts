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
import { convertKnotsToSecPerMile } from '../../src/utils/conversionUtils';
import { organizations } from '../../src/enum';
import { searchExistingCert } from '../../src/services/certificateService';

import { AxiosError } from 'axios';
import {
  ExistingCertData,
  Polar,
  TimeAllowance,
} from '../../src/types/GeneralType';
import { ExistingCertMapData } from '.';

type JeiterPolarGeneralFormat = {
  rating: {
    triple_offshore: number[];
    gph: number;
    triple_inshore: number[];
  };
  sailnumber: string;
  name: string;
  country?: string; // Folder 2015 & 2016-1 don't have this
  owner: string;
  boat: {
    builder: string;
    designer: string;
    type: string;
    sizes: {
      beam: number;
      spinnaker: number;
      loa: number;
      draft: number;
      main: number;
      genoa: number;
      displacement: number;
      spinnaker_asym: number;
    };
    year: string;
  };
  vpp: {
    beat_vmg: number[];
    '150': number[];
    '135': number[];
    '75': number[];
    run_angle: number[];
    '110': number[];
    '52': number[];
    beat_angle: number[];
    angles: number[];
    '120': number[];
    '90': number[];
    '60': number[];
    speeds: number[];
    run_vmg: number[];
  };
};

const readFile = promisify(fs.readFile);
const readDirectory = promisify(fs.readdir);

async function getSubdirectories(mainFolder: string) {
  const subFolders = await readDirectory(mainFolder, { withFileTypes: true });
  return subFolders.reduce((arr: string[], row) => {
    if (row.isDirectory()) {
      arr.push(row.name);
    }
    return arr;
  }, []);
}

const folders = [
  {
    folderName: '2015',
    isSubfolder: false,
  },
  {
    folderName: '2016-1',
    isSubfolder: false,
  },
  {
    folderName: '2016-2',
    isSubfolder: true,
  },
  {
    folderName: '2016-3',
    isSubfolder: true,
  },
  {
    folderName: '2016ORC',
    isSubfolder: true,
  },
  {
    folderName: '2017ORC',
    isSubfolder: true,
  },
  {
    folderName: '2018ORC',
    isSubfolder: true,
  },
  {
    folderName: '2019ORC',
    isSubfolder: true,
  },
  {
    folderName: '2019ORCPolars',
    isSubfolder: false,
  },
  {
    folderName: '2020ORC',
    isSubfolder: true,
  },
];

const mainFolder = '../../files';
export async function parseJeiterPolars(
  existingCerts: Map<string, ExistingCertMapData[]>,
) {
  async function parseFolder(folder: string, isSubfolder: boolean) {
    const countrylessData: string[] = [];
    const validCerts: any[] = [];
    const duplicateCerts: any[] = [];
    const orcDirectory = path.resolve(
      __dirname,
      `${mainFolder}/jeiterPolars/${folder}`,
    );
    let filesToProcess: {
      subFolder?: string;
      fileName: string;
    }[] = [];
    if (isSubfolder) {
      const subFolders = await getSubdirectories(orcDirectory);
      for (let i = 0; i < subFolders.length; i++) {
        const subFiles = await readDirectory(
          `${orcDirectory}/${subFolders[i]}`,
        );
        subFiles.forEach((fileName) => {
          filesToProcess.push({
            subFolder: subFolders[i],
            fileName,
          });
        });
      }
    } else {
      const files = await readDirectory(orcDirectory);
      files.forEach((fileName) => {
        filesToProcess.push({
          fileName,
        });
      });
    }
    let validJsonFileCount = 0;
    let invalidJsonFileCount = 0;
    for (let i = 0; i < filesToProcess.length; i++) {
      if (!filesToProcess[i].fileName.endsWith('.json')) {
        invalidJsonFileCount++;
        // console.log(`${filesToProcess[i].fileName} is not json`);
        continue;
      }
      validJsonFileCount++;
      const { fileName, subFolder } = filesToProcess[i];
      const fileNameWithoutExt = fileName.split('.json')[0];
      const countryCode = subFolder || fileNameWithoutExt.substring(0, 3);
      const extras = await readFile(
        path.resolve(
          __dirname,
          `${orcDirectory}${subFolder ? `/${subFolder}` : ''}/${fileName}`,
        ),
        'utf-8',
      );
      try {
        const year = folder.substring(0, 4);
        const jsonData: JeiterPolarGeneralFormat = JSON.parse(extras);
        // Hardcoded to the year/folder it's in, there's no field for issue date and expire date
        const issuedDate = `${year}-01-01T00:00:00.000Z`;
        const expireDate = `${year}-12-31T00:00:00.000Z`;
        const {
          sailnumber: sailNumber,
          name: boatName,
          owner,
          boat,
          vpp,
          country: fileCountryCode,
        } = jsonData;
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
          run_angle: gybeAngles,
          beat_angle: beatAngles,
          angles,
          speeds,
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
            runVMGs: runVMGs.map((vmg) => convertKnotsToSecPerMile(vmg)),
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
          extras,
          hasPolars,
          hasTimeAllowances,
          timeAllowances,
          polars,
          originalId: `jeiterPolars_${folder}_${fileNameWithoutExt}`,
        });

        const existKey = `${String(boatName).toLowerCase()}|${new Date(
          issuedDate,
        ).getFullYear()}`;
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
      } catch (error) {
        console.log(fileName);
        console.trace(error);
      }
    }

    if (!fs.existsSync(path.resolve(__dirname, `${mainFolder}/jeiter`))) {
      fs.mkdirSync(path.resolve(__dirname, `${mainFolder}/jeiter`));
    }
    if (
      !fs.existsSync(path.resolve(__dirname, `${mainFolder}/jeiter/${folder}`))
    ) {
      fs.mkdirSync(path.resolve(__dirname, `${mainFolder}/jeiter/${folder}`));
    }
    // TODO: Comment this if we only want the combined version
    fs.writeFileSync(
      path.resolve(__dirname, `${mainFolder}/jeiter/${folder}/valid.json`),
      JSON.stringify(validCerts),
      'utf-8',
    );
    fs.writeFileSync(
      path.resolve(__dirname, `${mainFolder}/jeiter/${folder}/duplicates.json`),
      JSON.stringify(duplicateCerts),
      'utf-8',
    );
    fs.writeFileSync(
      path.resolve(
        __dirname,
        `${mainFolder}/jeiter/${folder}/countryless.json`,
      ),
      JSON.stringify(countrylessData),
      'utf-8',
    );
    return {
      folder,
      totalCertFound: validJsonFileCount,
      totalInvalidFile: invalidJsonFileCount,
      validCertsCount: validCerts.length,
      duplicatesCount: duplicateCerts.length,
      countryLessCount: countrylessData.length,
      filesToProcess: filesToProcess.length,
      validCerts,
    };
  }
  const parseResults: {
    folder: string;
    totalCertFound: number;
    totalInvalidFile: number;
    validCertsCount: number;
    duplicatesCount: number;
    countryLessCount: number;
    filesToProcess: number;
  }[] = [];
  let certToAdd: any[] = [];
  for (let i = 0; i < folders.length; i++) {
    const { folderName, isSubfolder } = folders[i];
    const { validCerts, ...result } = await parseFolder(
      folderName,
      isSubfolder,
    );
    certToAdd.push(...validCerts);
    parseResults.push(result);
  }
  fs.writeFileSync(
    path.resolve(
      __dirname,
      `${mainFolder}/jeiter/combined_2015-2020ORC_valid.json`,
    ),
    JSON.stringify(certToAdd),
    'utf-8',
  );
  console.log('ORC Jeiter Polar 2015 - 2020');
  console.table(parseResults);
}

/*
created polar for reference
{
  syrf_id: '7b14a421-931e-4e13-a7e2-9233b66f4046',
  organization: 'ORC',
  cert_type: null,
  builder: 'M BOATS',
  owner: 'FERNANDO CHAIN',
  issued_date: '2015-01-01T00:00:00.000Z',
  expire_date: '2015-12-31T00:00:00.000Z',
  measure_date: null,
  country: 'Argentina',
  sail_number: 'ARG001',
  boat_name: 'MAC',
  class_name: 'S 40 OD',
  beam: 3.75,
  draft: 2.6,
  displacement: 4289,
  extras:
    '{\r\n  "rating": {\r\n    "triple_offshore": [1.1635, 1.4779, 1.6918],\r\n    "gph": 511.9,\r\n    "triple_inshore": [0.8888, 1.1718, 1.358]\r\n  },\r\n  "sailnumber": "ARG001",\r\n  "name": "MAC",\r\n  "owner": "FERNANDO CHAIN",\r\n  "boat": {\r\n    "builder": "M BOATS",\r\n    "designer": "SOTO ACEBAL",\r\n    "type": "S 40 OD",\r\n    "sizes": {\r\n      "beam": 3.75,\r\n      "spinnaker": 0.0,\r\n      "loa": 12.32,\r\n      "draft": 2.6,\r\n      "main": 63.4,\r\n      "genoa": 41.1,\r\n      "displacement": 4289.0,\r\n      "spinnaker_asym": 168.0\r\n    },\r\n    "year": "2008"\r\n  },\r\n  "vpp": {\r\n    "beat_vmg": [4.16, 5.08, 5.56, 5.82, 5.97, 6.01, 6.04],\r\n    "150": [5.09, 6.42, 7.5, 8.31, 9.0, 9.92, 12.69],\r\n    "135": [6.17, 7.72, 8.51, 9.4, 10.54, 11.79, 13.33],\r\n    "75": [7.41, 8.32, 8.94, 9.36, 9.63, 9.82, 10.14],\r\n    "run_angle": [137.7, 137.6, 146.5, 153.5, 159.3, 141.9, 142.6],\r\n    "110": [7.36, 8.4, 9.0, 9.76, 10.33, 10.89, 12.69],\r\n    "52": [6.46, 7.71, 8.12, 8.32, 8.46, 8.55, 8.65],\r\n    "beat_angle": [44.1, 42.9, 40.4, 38.8, 38.4, 38.6, 38.8],\r\n    "angles": [52, 60, 75, 90, 110, 120, 135, 150],\r\n    "120": [6.99, 8.25, 9.28, 10.09, 10.67, 11.23, 12.69],\r\n    "90": [7.39, 8.29, 9.04, 9.86, 10.38, 10.71, 11.09],\r\n    "60": [6.94, 8.05, 8.42, 8.66, 8.85, 9.0, 9.18],\r\n    "speeds": [6, 8, 10, 12, 14, 16, 20],\r\n    "run_vmg": [4.41, 5.56, 6.49, 7.21, 7.81, 8.59, 10.99]\r\n  }\r\n}\r\n',
  has_polars: true,
  polars: {
    wind_speeds: [6, 8, 10, 12, 14, 16, 20],
    beat_angles: [44.1, 42.9, 40.4, 38.8, 38.4, 38.6, 38.8],
    beat_vmgs: [4.16, 5.08, 5.56, 5.82, 5.97, 6.01, 6.04],
    polars: [
      { twa: 52, speeds: [6.46, 7.71, 8.12, 8.32, 8.46, 8.55, 8.65] },
      { twa: 60, speeds: [6.94, 8.05, 8.42, 8.66, 8.85, 9, 9.18] },
      { twa: 75, speeds: [7.41, 8.32, 8.94, 9.36, 9.63, 9.82, 10.14] },
      { twa: 90, speeds: [7.39, 8.29, 9.04, 9.86, 10.38, 10.71, 11.09] },
      { twa: 110, speeds: [7.36, 8.4, 9, 9.76, 10.33, 10.89, 12.69] },
      { twa: 120, speeds: [6.99, 8.25, 9.28, 10.09, 10.67, 11.23, 12.69] },
      { twa: 135, speeds: [6.17, 7.72, 8.51, 9.4, 10.54, 11.79, 13.33] },
      { twa: 150, speeds: [5.09, 6.42, 7.5, 8.31, 9, 9.92, 12.69] },
    ],
    run_vmgs: [4.41, 5.56, 6.49, 7.21, 7.81, 8.59, 10.99],
    gybe_angles: [137.7, 137.6, 146.5, 153.5, 159.3, 141.9, 142.6],
  },
  has_time_allowances: true,
  time_allowances: {
    wind_speeds: [6, 8, 10, 12, 14, 16, 20],
    beat_vmgs: [865.4, 708.7, 647.5, 618.6, 603, 599, 596],
    time_allowances: [
      { twa: 52, speeds: [557.3, 466.9, 443.3, 432.7, 425.5, 421.1, 416.2] },
      { twa: 60, speeds: [518.7, 447.2, 427.6, 415.7, 406.8, 400, 392.2] },
      { twa: 75, speeds: [485.8, 432.7, 402.7, 384.6, 373.8, 366.6, 355] },
      { twa: 90, speeds: [487.1, 434.3, 398.2, 365.1, 346.8, 336.1, 324.6] },
      { twa: 110, speeds: [489.1, 428.6, 400, 368.9, 348.5, 330.6, 283.7] },
      { twa: 120, speeds: [515, 436.4, 387.9, 356.8, 337.4, 320.6, 283.7] },
      { twa: 135, speeds: [583.5, 466.3, 423, 383, 341.6, 305.3, 270.1] },
      { twa: 150, speeds: [707.3, 560.7, 480, 433.2, 400, 362.9, 283.7] },
    ],
    run_vmgs: [816.3, 647.5, 554.7, 499.3, 460.9, 419.1, 327.6],
  },
  original_id: 'jeiterPolars_2015_ARG001',
};

*/

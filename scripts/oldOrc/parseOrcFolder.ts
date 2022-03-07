import dotenv from 'dotenv';
dotenv.config();

import fs, { unlink } from 'fs';
import path from 'path';
import { promisify } from 'util';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import _ from 'lodash';
dayjs.extend(customParseFormat);
dayjs.extend(utc);

import makeCert from '../../src/utils/makeCert';
import getCountry from '../../src/utils/getCountry';
import { convertKnotsToSecPerMile } from '../../src/utils/conversionUtils';
import { certIndexName, organizations } from '../../src/enum';

import {
  ElasticSearchQueryResult,
  Polar,
  TimeAllowance,
} from '../../src/types/GeneralType';
import { ExistingCertMapData, JeiterPolarGeneralFormat } from '.';
import elasticSearchAPI from '../../src/services/elasticSearchAPI';
import { saveCert } from '../../src/services/certificateService';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const deleteFile = promisify(fs.unlink);
const readDirectory = promisify(fs.readdir);

const rootFolder = path.resolve(__dirname, '../../files');

type ExistingCertResult = {
  syrfId: string;
  organization: string;
  originalId: string;
  boatName?: string;
  country?: string;
  builder?: string;
  polars?: {
    wind_speeds: number[];
    beat_angles: number[];
    beat_vmgs: number[];
    polars: {
      twa: number;
      speeds: number[];
    }[];
    gybe_angles: number[];
    run_vmgs: number[];
  };
};

export async function parseOrcFolder() {
  const countrylessData: string[] = [];
  const validCerts: any[] = [];
  const duplicateCerts: any[] = [];
  const orcDirectory = path.resolve(
    __dirname,
    `${rootFolder}/jeiterPolars/ORCPolars`,
  );
  const files = await readDirectory(orcDirectory);
  console.log(files.length, 'found');

  let validJsonFileCount = 0;
  let invalidJsonFileCount = 0;
  const existCertMap = new Map<string, ExistingCertResult[]>();

  if (
    !fs.existsSync(path.resolve(__dirname, `${rootFolder}/jeiter/ORCPolars`))
  ) {
    fs.mkdirSync(path.resolve(__dirname, `${rootFolder}/jeiter/ORCPolars`));
  }
  const intervalID = setInterval(async () => {
    await writeFile(
      `${rootFolder}/jeiter/ORCPolars/duplicates.json`,
      JSON.stringify(duplicateCerts),
      'utf-8',
    );
    console.log('Written to file');
  }, 30000);

  for (let i = 0; i < files.length; i++) {
    if (!files[i].endsWith('.json')) {
      invalidJsonFileCount++;
      // console.log(`${filesToProcess[i].fileName} is not json`);
      continue;
    }
    validJsonFileCount++;
    const fileName = files[i];
    const fileNameWithoutExt = fileName.split('.json')[0];

    try {
      let shouldDelete = true;
      const certificate: JeiterPolarGeneralFormat = JSON.parse(
        await readFile(`${orcDirectory}/${fileName}`, 'utf-8'),
      );
      let countryCode = '';
      if (fileNameWithoutExt.length > 4) {
        // Contains country information, for fallback purpose
        countryCode = fileNameWithoutExt.substring(0, 4);
      }

      const {
        sailnumber: sailNumber,
        name: boatName,
        owner,
        boat,
        vpp,
        country: fileCountryCode,
      } = certificate;

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
        country,
        sailNumber,
        boatName,
        owner,
        className,
        beam,
        draft,
        displacement,
        extras: JSON.stringify(certificate),
        hasPolars,
        hasTimeAllowances,
        timeAllowances,
        polars,
        originalId: `jeiterPolars_ORCPolars_${fileNameWithoutExt}`,
      });

      if (!existCertMap.has(boatName)) {
        const existingCerts = await searchExistingCert(boatName);
        existCertMap.set(boatName, existingCerts);
      }

      const similarCerts = existCertMap.get(boatName);
      console.log(`Found similar: ${similarCerts?.length}`);
      let isExist = false;
      if (similarCerts) {
        for (let simCert of similarCerts) {
          const isPolarEqual = _.isEqual(formattedCert.polars, simCert.polars);
          if (isPolarEqual) {
            isExist = true;
            break;
          }
        }
      }
      if (!isExist) {
        // No similar cert is equal in polar, need to save this, and also add this to the map
        if (similarCerts) {
          similarCerts.push({
            syrfId: formattedCert.syrf_id,
            organization: formattedCert.organization,
            originalId: formattedCert.original_id,
            boatName: formattedCert.boat_name,
            country: formattedCert.country,
            builder: formattedCert.builder,
            polars: formattedCert.polars,
          });
        }

        try {
          const result = await saveCert(formattedCert.syrf_id, formattedCert);
          console.log(
            `New cert saved: id: ${formattedCert.syrf_id}, file: ${fileNameWithoutExt}`,
          );
        } catch (error) {
          console.error(
            `Error saving orc cert json with filename: ${fileNameWithoutExt}. Error: ${error}`,
          );
          shouldDelete = false;
        }
      } else {
        //push to duplicates
        console.log(boatName, 'is dupe');
        duplicateCerts.push(formattedCert);
      }
      if (shouldDelete) {
        await deleteFile(`${orcDirectory}/${fileName}`);
      }
    } catch (error) {
      console.log(fileName);
      console.trace(error);
    }
  }
  if (
    !fs.existsSync(path.resolve(__dirname, `${rootFolder}/jeiter/ORCPolars`))
  ) {
    fs.mkdirSync(path.resolve(__dirname, `${rootFolder}/jeiter/ORCPolars`));
  }
  fs.writeFileSync(
    path.resolve(__dirname, `${rootFolder}/jeiter/ORCPolars/duplicates.json`),
    JSON.stringify(duplicateCerts),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `${rootFolder}/jeiter/ORCPolars/countryless.json`),
    JSON.stringify(countrylessData),
    'utf-8',
  );
  console.log('ORC Jeiter Polar - ORCPolars Folder - DONE');
  console.table({
    totalCertFound: validJsonFileCount,
    totalInvalidFile: invalidJsonFileCount,
    validCertsCount: validCerts.length,
    duplicatesCount: duplicateCerts.length,
    countryLessCount: countrylessData.length,
  });
  clearTimeout(intervalID);
}

async function searchExistingCert(
  boatName: string,
): Promise<ExistingCertResult[]> {
  console.log('Searching to ES');
  const queries: any[] = [
    {
      match: {
        organization: organizations.orc,
      },
    },
    {
      match: {
        boat_name: boatName,
      },
    },
    {
      match: {
        has_polars: true,
      },
    },
  ];

  const esResult: ElasticSearchQueryResult<{
    syrf_id: string;
    organization: string;
    original_id: string;
    builder?: string;
    boat_name: string;
    country?: string;
    polars: {
      wind_speeds: number[];
      beat_angles: number[];
      beat_vmgs: number[];
      polars: {
        twa: number;
        speeds: number[];
      }[];
      gybe_angles: number[];
      run_vmgs: number[];
    };
  }> = await elasticSearchAPI.query(
    `/${certIndexName}/_search`,
    Object.assign(
      {},
      {
        query: {
          bool: {
            must: queries,
          },
        },
        _source: [
          'syrf_id',
          'organization',
          'original_id',
          'boat_name',
          'builder',
          'country',
          'polars',
        ],
        size: 50,
      },
    ),
  );

  const data: ExistingCertResult[] = esResult.data.hits.hits.map((row) => {
    const {
      syrf_id: syrfId,
      organization,
      original_id: originalId,
      boat_name: boatName,
      country,
      builder,
      polars,
    } = row._source;
    return {
      syrfId,
      organization,
      originalId,
      boatName,
      country,
      builder,
      polars,
    };
  });
  return data;
}

(async () => {
  await parseOrcFolder();
})();

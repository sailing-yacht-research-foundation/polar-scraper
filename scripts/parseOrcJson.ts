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

import makeCert from '../src/utils/makeCert';
import getCountry from '../src/utils/getCountry';
import { organizations } from '../src/enum';
import { searchExistingCert } from '../src/services/certificateService';

import { ExistingCertData } from '../src/types/GeneralType';
import { AxiosError } from 'axios';

const orcFilePath = path.resolve(
  __dirname,
  `../files/certs_from_orc_pdfs.json`,
);
const readFile = promisify(fs.readFile);
const M_TO_FEET = 3.2808;
const KG_TO_LBS = 2.2046;

async function getExistingByBoatName(organization: string, certType?: string) {
  let existingCerts: Map<string, ExistingCertData> = new Map();
  let finishLoading = false;
  const fetchSize = 500;
  try {
    let scrollId: string | undefined;
    let hasMoreData = true;
    let failedCount = 0;
    do {
      console.log('fetching');
      try {
        const certResult = await searchExistingCert(
          {
            organization,
            certType,
          },
          fetchSize,
          scrollId,
        );
        scrollId = certResult.scrollId;
        if (certResult.data.length < fetchSize) {
          hasMoreData = false;
          finishLoading = true;
        }
        certResult.data.forEach((row) => {
          existingCerts.set(
            `${row.boatName?.toLowerCase()}|${row.certNumber}|${
              row.issuedDate ? new Date(row.issuedDate).getFullYear() : '-'
            }`,
            row,
          );
        });
      } catch (error) {
        console.trace(error);
        failedCount++;
        if (failedCount >= 5) {
          break;
        }
      }
    } while (hasMoreData);
  } catch (error) {
    console.log(
      `Getting ${organization} - ${certType} certs failed: ${
        (error as AxiosError).response?.data
      }`,
    );
  }
  return {
    existingCerts,
    finishLoading,
  };
}

function getValidDate(dateString: string) {
  const date = dayjs.utc(dateString).toDate();
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date.toISOString();
  } else {
    return undefined;
  }
}

const validFilePath = path.resolve(__dirname, `../files/valid_certs.json`);
const invalidFilePath = path.resolve(__dirname, `../files/invalid_certs.json`);
const duplicateFilePath = path.resolve(
  __dirname,
  `../files/duplicate_certs.json`,
);

(async () => {
  const { existingCerts, finishLoading } = await getExistingByBoatName(
    organizations.orc,
  );
  if (!finishLoading) {
    console.log('Failed to load existing certs, stopping');
    process.exit(0);
  }
  console.log('Found existing certs: ', existingCerts.size);
  const rawCertData = await readFile(orcFilePath, 'utf-8');
  const certificates = JSON.parse(rawCertData);
  /*
  console.log(`Certificates Found: ${certificates.length}`);
  const setKeys = new Set();
  for (let i = 0; i < certificates.length; i++) {
    Object.keys(certificates[i]).forEach((key) => {
      setKeys.add(key);
    });
  }
  console.log(Array.from(setKeys));
  //==========================
  Certificates Found: 125610
    [
    'name',           'displacementKg',   'loaM',
    'mbM',            'draftM',           'cdl',
    'lps',            'si',               'loM',
    'maxBM',          'gph',              'measurementDate',
    'measurer',       'hasPolars',        'polars',
    'timeAllowances', 'vppVersion',       'sailNumber',
    'boatName',       'series',           'ageAllowance',
    'age',            'dynamicAllowance', 'imsl',
    'rl',             'vcgd',             'vcgm',
    'sink',           'ws',               'lsm',
    'certNumber',     'orcRef',           'issuedDate',
    'validUntil',     'className',        'designerName',
    'builderName'
    ]
  //==========================
  */
  let invalidDatesCount = 0;
  let countryLessCount = 0;
  let validCerts: any[] = [];
  let invalidCerts: any[] = [];
  let duplicateCerts: any[] = [];
  let invalidSailNumberToCountry: string[] = [];

  let existingKeys: string[] = Array.from(existingCerts.keys());
  let newKeys: string[] = [];
  for (let i = 0; i < certificates.length; i++) {
    const {
      certNumber,
      issuedDate: rawIssueDate,
      boatName,
      sailNumber,
      displacementKg,
      // loaM, // Length Overall LOA Meters
      mbM, // Maximum Beam Meters
      draftM, // Draft Meters
      //   cdl, //
      //   lps,
      //   si,
      //   loM,
      //   maxBM,
      //   gph,
      measurementDate,
      measurer,
      hasPolars,
      polars,
      timeAllowances,
      //   vppVersion,
      //   series,
      //   ageAllowance,
      //   age,
      //   dynamicAllowance,
      //   imsl,
      //   rl,
      //   vcgd,
      //   vcgm,
      //   sink,
      //   ws,
      //   lsm,
      orcRef,
      validUntil,
      className,
      // designerName,
      builderName: builder,
    } = certificates[i];
    //  TODO: Save everything in metrics, need to update existing elasticsearch instead to convert impertial to metrics (ORR)
    const beam = mbM !== '' && !isNaN(Number(mbM)) ? Number(mbM) : undefined;
    const draft =
      draftM !== '' && !isNaN(Number(draftM)) ? Number(draftM) : undefined;
    const displacement =
      displacementKg !== '' && !isNaN(Number(displacementKg))
        ? Number(displacementKg)
        : undefined;
    const country = getCountry(String(sailNumber).substring(0, 3));

    let issuedDate = getValidDate(rawIssueDate); // Possibly "Invalid Date" string in json
    let expireDate = getValidDate(validUntil);
    if (!issuedDate && expireDate) {
      issuedDate = dayjs(expireDate).subtract(1, 'year').toISOString();
    }
    if (!expireDate && issuedDate) {
      // If undefined, set to 1 year after issuedDate
      expireDate = dayjs(issuedDate).add(1, 'year').toISOString();
    }
    const measureDate = getValidDate(measurementDate);

    if (!issuedDate || !expireDate) {
      invalidDatesCount++;
    }

    if (!country) {
      countryLessCount++;
      invalidSailNumberToCountry.push(sailNumber);
      // console.log(certNumber, boatName, sailNumber, country);
    }

    const formattedCert = makeCert({
      organization: organizations.orc,
      builder,
      certNumber,
      issuedDate,
      expireDate,
      measureDate,
      country,
      sailNumber,
      boatName,
      className,
      beam,
      draft,
      displacement,
      extras: JSON.stringify(certificates[i]),
      hasPolars,
      hasTimeAllowances: false,
      originalId: orcRef,
    });

    if (!issuedDate || !expireDate || !country) {
      invalidCerts.push(certificates[i]);
    } else {
      newKeys.push(
        `${boatName}|${certNumber}|${new Date(issuedDate).getFullYear()}`,
      );
      const existCert = existingCerts.get(
        `${String(boatName).toLowerCase()}|${certNumber}|${new Date(
          issuedDate,
        ).getFullYear()}`,
      );
      if (existCert) {
        duplicateCerts.push(formattedCert);
      } else {
        validCerts.push(formattedCert);
      }
    }
  }
  console.table({
    invalidDatesCount,
    countryLessCount,
  });
  // Invalid Country by sail number -> 8016
  // Invalid issue Date count -> 37097

  fs.writeFileSync(validFilePath, JSON.stringify(validCerts), 'utf-8');
  fs.writeFileSync(invalidFilePath, JSON.stringify(invalidCerts), 'utf-8');
  fs.writeFileSync(duplicateFilePath, JSON.stringify(duplicateCerts), 'utf-8');

  fs.writeFileSync(
    path.resolve(__dirname, `../files/existing_keys.json`),
    JSON.stringify(existingKeys),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `../files/new_keys.json`),
    JSON.stringify(newKeys),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `../files/sail_number_invalid_country.json`),
    JSON.stringify(invalidSailNumberToCountry),
    'utf-8',
  );
})();

/*

Task 1: Convert all certificates found in certs_from_orc_pdfs.json from Format B into Format A and import all non-existing certificates. Be certain the expire date is set to 1 year after the initialized or issued date. Be sure to check the polar data to ensure you’re not importing duplicates. 
If the year of issue, country, boat name, cert number, etc is the same, then it’s the same certificate. 


issuedDate -> Year of issue
countrty -> ?
boatName  ->  ? 
certNumber -> cert number
*/

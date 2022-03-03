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

const readFile = promisify(fs.readFile);

function getValidDate(dateString: string) {
  const date = dayjs.utc(dateString).toDate();
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date.toISOString();
  } else {
    return undefined;
  }
}

export async function parseOrcJson(
  existingCerts: Map<string, ExistingCertMapData[]>,
) {
  const rawCertData = await readFile(
    path.resolve(__dirname, `../../files/certs_from_orc_pdfs.json`),
    'utf-8',
  );
  const certificates = JSON.parse(rawCertData);
  let invalidDatesCount = 0;
  let countryLessCount = 0;
  let validCerts: any[] = [];
  let invalidCerts: any[] = [];
  let duplicateCerts: any[] = [];
  let invalidSailNumberToCountry: string[] = [];
  let mismatchPolarTime: string[] = [];

  for (let i = 0; i < certificates.length; i++) {
    const {
      certNumber,
      issuedDate: rawIssueDate,
      boatName,
      sailNumber,
      displacementKg,
      mbM, // Maximum Beam Meters
      draftM, // Draft Meters
      measurementDate,
      hasPolars,
      polars,
      timeAllowances,
      orcRef,
      validUntil,
      className,
      builderName: builder,
    } = certificates[i];
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

    let hasTimeAllowances = false;
    if (timeAllowances?.timeAllowances?.length > 0) {
      hasTimeAllowances = true;
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
      timeAllowances: hasTimeAllowances ? timeAllowances : undefined,
      polars: hasPolars ? polars : undefined,
      originalId: orcRef,
    });

    if (!hasTimeAllowances || !hasPolars) {
      if (hasTimeAllowances || hasPolars) {
        mismatchPolarTime.push(orcRef);
      }
    }

    if (!issuedDate || !expireDate) {
      invalidCerts.push(certificates[i]);
    } else {
      const issueYear = new Date(issuedDate).getFullYear().toString();
      const existKey = `${String(boatName).toLowerCase()}|${new Date(
        issuedDate,
      ).getFullYear()}`;
      const existCerts = existingCerts.get(existKey);
      let isExist = false;
      if (existCerts) {
        isExist =
          existCerts.findIndex((existRow) => {
            if (certNumber && certNumber === existRow.certNumber) {
              return true;
            }
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
          issueYear,
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
  }
  console.table({
    invalidDatesCount,
    countryLessCount,
    mismatchPolarCount: mismatchPolarTime.length,
  });

  fs.writeFileSync(
    path.resolve(__dirname, `../../files/valid_certs.json`),
    JSON.stringify(validCerts),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `../../files/invalid_certs.json`),
    JSON.stringify(invalidCerts),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `../../files/duplicate_certs.json`),
    JSON.stringify(duplicateCerts),
    'utf-8',
  );

  fs.writeFileSync(
    path.resolve(__dirname, `../../files/sail_number_invalid_country.json`),
    JSON.stringify(invalidSailNumberToCountry),
    'utf-8',
  );
  fs.writeFileSync(
    path.resolve(__dirname, `../../files/mismatch_polar.json`),
    JSON.stringify(mismatchPolarTime),
    'utf-8',
  );
}

/*

Task 1: Convert all certificates found in certs_from_orc_pdfs.json from Format B into Format A and import all non-existing certificates. Be certain the expire date is set to 1 year after the initialized or issued date. Be sure to check the polar data to ensure you’re not importing duplicates. 
If the year of issue, country, boat name, cert number, etc is the same, then it’s the same certificate. 


issuedDate -> Year of issue
countrty -> ?
boatName  ->  ? 
certNumber -> cert number
*/

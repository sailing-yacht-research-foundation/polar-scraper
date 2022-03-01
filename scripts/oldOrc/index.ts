import dotenv from 'dotenv';
dotenv.config();

import { organizations } from '../../src/enum';
import { searchExistingCert } from '../../src/services/certificateService';

import { parseJeiterPolars } from './parseJeiterPolars';

import { AxiosError } from 'axios';

export type ExistingCertMapData = {
  boatName?: string;
  certNumber?: string;
  builder?: string;
  issueYear?: string;
};

/*
Objective of this script would be to combine all scraping of old files in 1 go, so it can utilise the newly scraped
certificates to check existing cert, instead of fetching to the Elastic Search every files, which will take a lot of query
the later it gets
*/

async function getExistingORCCert() {
  let existingCerts: Map<
    string,
    {
      boatName?: string;
      certNumber?: string;
      builder?: string;
      issueYear?: string;
    }[]
  > = new Map();
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
            organization: organizations.orc,
          },
          fetchSize,
          scrollId,
        );
        scrollId = certResult.scrollId;
        if (certResult.data.length < fetchSize) {
          hasMoreData = false;
          finishLoading = true;
        }
        // Cert Numbers are only available on the "certs_from_orc_pdfs.json" file, so cannot be used to compare directly with other jeiterPolars file
        // Adding via boatName and issue year only, with value as array to check for lower number of checks.
        // Checking via array find took too long since we are processing millions of record, and will add more to the data while parsing the files
        certResult.data.forEach((row) => {
          const key = `${row.boatName?.toLowerCase()}|${
            row.issuedDate ? new Date(row.issuedDate).getFullYear() : '-'
          }`;
          const data = {
            boatName: row.boatName?.toLowerCase(),
            certNumber: row.certNumber?.toLowerCase(),
            builder: row.builder?.toLowerCase(),
            issueYear: row.issuedDate
              ? new Date(row.issuedDate).getFullYear().toString()
              : '-',
          };
          if (!existingCerts.has(key)) {
            existingCerts.set(key, [data]);
          }
          const certArray = existingCerts.get(key);
          if (certArray) {
            const isExist =
              certArray.findIndex((existRow) => {
                if (row.certNumber && row.certNumber === existRow.certNumber) {
                  return true;
                }
                if (row.builder && row.builder === existRow.builder) {
                  return true;
                }
                return false;
              }) !== -1;
            if (!isExist) {
              certArray.push(data);
            }
          }
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
      `Getting existing ORC certs failed: ${
        (error as AxiosError).response?.data
      }`,
    );
  }
  return {
    existingCerts,
    finishLoading,
  };
}

(async () => {
  const { existingCerts, finishLoading } = await getExistingORCCert();
  if (!finishLoading) {
    console.log('Failed to load existing ORC certs, stopping');
    process.exit(0);
  }
  console.log('PRE Existing cert size', existingCerts.size);
  await parseJeiterPolars(existingCerts);
  console.log('POST Existing cert size', existingCerts.size);
})();

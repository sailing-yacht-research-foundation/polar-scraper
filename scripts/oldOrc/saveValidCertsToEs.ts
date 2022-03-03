import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { saveCert } from '../../src/services/certificateService';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const mainFolder = path.resolve(__dirname, '../../files');
const validCertFiles = [
  `${mainFolder}/valid_certs.json`, // From certs_from_orc_pdfs.json
  `${mainFolder}/jeiter/combined_2015-2020ORC_valid.json`, // From jeiter organized folder
  `${mainFolder}/2020ORCPolarsBCFOC_result.json`, // From 2020ORCPolarsByCountryFromORCCountryListSite folder
  `${mainFolder}/jeiter/FixedFiles/valid.json`, // All fixed files valid certs
];

(async () => {
  let doneList = new Set(
    JSON.parse(await readFile(`${mainFolder}/donelist_es.json`, 'utf-8')),
  );
  let failedList = new Set(
    JSON.parse(await readFile(`${mainFolder}/failedlist_es.json`, 'utf-8')),
  );
  try {
    for (let i = 0; i < validCertFiles.length; i++) {
      const certificates = JSON.parse(
        await readFile(validCertFiles[i], 'utf-8'),
      );
      for (let j = 0; j < certificates.length; j++) {
        if (!doneList.has(certificates[j].syrf_id)) {
          try {
            await saveCert(certificates[j].syrf_id, certificates[j]);
            doneList.add(certificates[j].syrf_id);
          } catch (error) {
            console.error(
              `Error saving orc cert json with ${certificates[j].syrf_id} from file ${validCertFiles[i]}`,
            );
            failedList.add(certificates[j].syrf_id);
          }
        }
      }
    }
  } catch (error) {
    console.log(`ERRORED`);
    console.trace(error);
  } finally {
    await writeFile(
      `${mainFolder}/donelist_es.json`,
      JSON.stringify(Array.from(doneList)),
      'utf-8',
    );
    await writeFile(
      `${mainFolder}/failedlist_es.json`,
      JSON.stringify(Array.from(failedList)),
      'utf-8',
    );
  }
})();

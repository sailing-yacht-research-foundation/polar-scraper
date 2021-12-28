import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import logger from '../logger';
import makeCert from '../utils/makeCert';
import { saveCert, searchExistingCert } from '../services/certificateService';
import { organizations } from '../enum';

const IRC_URL = 'https://www.topyacht.com.au/rorc/data/ClubListing.csv';

export async function scrapeIRC() {
  const response = await axios.get<string>(IRC_URL, {
    responseType: 'blob',
  });
  const certs: string[] = response.data.split('\r\n');
  const valuesList = certs[0].split(',');
  for (let i = 1; i < certs.length; i++) {
    const values = certs[i].split(',');
    if (values.length > 2) {
      const boatName = values[0];
      const sailNumber = values[1];
      const certNumber = values[2];
      const issuedDate = values[3];
      const beam = parseFloat(values[12]);
      const draft = parseFloat(values[13]);
      const certType = values[21];
      const extras = { names: valuesList, values: values };
      const formattedIssuedDate = dayjs(issuedDate, 'DD/MM/YYYY');
      const expireDate = dayjs(issuedDate, 'DD/MM/YYYY').add(1, 'year');
      const originalId = `${certNumber}_${sailNumber}`;

      const existingCert = await searchExistingCert({
        organization: organizations.orc,
        certType,
        originalId,
      });
      if (existingCert.length > 0) {
        logger.info(`Cert: ${originalId} of IRC exists, skipping`);
        continue;
      }

      const ircCert = makeCert({
        organization: organizations.irc,
        subOrganization: 'None',
        certType,
        builder: 'Unknown',
        owner: 'Unknown',
        certNumber,
        issuedDate: formattedIssuedDate.toISOString(),
        expireDate: expireDate.toISOString(),
        sailNumber,
        boatName,
        className: 'Unknown',
        beam,
        draft,
        extras: JSON.stringify(extras),
        hasPolars: false,
        hasTimeAllowances: false,
        originalId: `${certNumber}_${sailNumber}`,
      });
      try {
        const result = await saveCert(ircCert.syrfId, ircCert);
        logger.info(
          `New cert saved: id: ${result._id}, originalId: ${originalId}`,
        );
      } catch (error) {
        logger.error(
          `Error saving irc cert json with SailNumber: ${sailNumber}. Cert Type: ${certType}. Error: ${error}`,
        );
      }
    }
  }

  return;
}

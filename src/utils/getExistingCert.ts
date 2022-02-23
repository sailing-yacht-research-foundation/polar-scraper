import { AxiosError } from 'axios';
import logger from '../logger';
import { searchExistingCert } from '../services/certificateService';
import { ExistingCertData } from '../types/GeneralType';

export async function getExistingCerts(organization: string, certType: string) {
  let existingCerts: Map<string, ExistingCertData> = new Map();
  let finishLoading = false;
  try {
    let scrollId: string | undefined;
    let hasMoreData = true;
    do {
      const certResult = await searchExistingCert(
        {
          organization,
          certType,
        },
        scrollId,
      );
      scrollId = certResult.scrollId;
      if (certResult.data.length === 0) {
        hasMoreData = false;
        finishLoading = true;
      } else {
        certResult.data.forEach((row) => {
          existingCerts.set(row.originalId, row);
        });
      }
    } while (hasMoreData);
  } catch (error) {
    logger.error(
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

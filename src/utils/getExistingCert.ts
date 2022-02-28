import { AxiosError } from 'axios';
import { fetchExistingCertCount } from '../enum';
import logger from '../logger';
import { searchExistingCert } from '../services/certificateService';

import { ExistingCertData } from '../types/GeneralType';

export async function getExistingCerts(
  organization: string,
  certType?: string,
) {
  let existingCerts: Map<string, ExistingCertData> = new Map();
  let finishLoading = false;
  try {
    let scrollId: string | undefined;
    let hasMoreData = true;
    let failedCount = 0;
    do {
      try {
        const certResult = await searchExistingCert(
          {
            organization,
            certType,
          },
          fetchExistingCertCount,
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
      } catch (error) {
        console.trace(error);
        failedCount++;
        if (failedCount >= 5) {
          break;
        }
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

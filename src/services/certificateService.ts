import elasticSearchAPI from './elasticSearchAPI';
import { certIndexName } from '../enum';

import {
  ElasticSearchQueryResult,
  ExistingCertData,
} from '../types/GeneralType';

export const searchExistingCert = async (
  searchQuery: {
    organization: string;
    certType?: string;
    originalId?: string;
  },
  scrollId?: string,
): Promise<{ scrollId: string; data: ExistingCertData[] }> => {
  // Using scroll search. Our elasticsearch uses version 7.9, unable to use Point in Time searches (available at 7.10)
  const { organization, certType, originalId } = searchQuery;
  const queries: any[] = [
    {
      match: {
        organization,
      },
    },
  ];
  if (certType) {
    queries.push({
      match: {
        cert_type: certType,
      },
    });
  }
  if (originalId) {
    queries.push({
      match: {
        originalId,
      },
    });
  }
  const esResult: ElasticSearchQueryResult<{
    syrf_id: string;
    organization: string;
    cert_type: string;
    cert_number: string;
    original_id: string;
  }> = await elasticSearchAPI.query(
    scrollId ? `/_search/scroll` : `/${certIndexName}/_search?scroll=1m`,
    Object.assign(
      {},
      scrollId
        ? {
            scroll_id: scrollId,
            scroll: '1m',
          }
        : {
            query: {
              bool: {
                must: queries,
              },
            },
            _source: [
              'syrf_id',
              'organization',
              'cert_type',
              'cert_number',
              'original_id',
            ],
            size: 10,
          },
    ),
  );
  let returnedScrollId: string =
    scrollId || String(esResult.data['_scroll_id']);
  const data = esResult.data.hits.hits.map((row) => {
    const {
      syrf_id: syrfId,
      organization,
      cert_type: certType,
      cert_number: certNumber,
      original_id: originalId,
    } = row._source;
    return { syrfId, organization, certType, certNumber, originalId };
  });
  return {
    scrollId: returnedScrollId,
    data,
  };
};

export const saveCert = async (id: string, data: any) => {
  const result = await elasticSearchAPI.push(
    `/${certIndexName}/_doc/${id}`,
    data,
  );
  return result.data;
};

export const removeCert = async (id: string) => {
  const result = await elasticSearchAPI.deleteDoc(
    `/${certIndexName}/_doc/${id}`,
  );
  return result.data;
};

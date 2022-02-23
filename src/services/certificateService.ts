import elasticSearchAPI from './elasticSearchAPI';
import { certIndexName } from '../enum';

import { ElasticSearchQueryResult } from '../types/GeneralType';

export const searchExistingCert = async (searchQuery: {
  organization: string;
  certType: string;
  originalId?: string;
}) => {
  const { organization, certType, originalId } = searchQuery;
  const queries: any[] = [
    {
      match: {
        organization,
      },
    },
    {
      match: {
        certType,
      },
    },
  ];
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
  }> = await elasticSearchAPI.query(`/${certIndexName}/_search`, {
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
  });
  return esResult.data.hits.hits.map((row) => {
    const {
      syrf_id: syrfId,
      organization,
      cert_type: certType,
      cert_number: certNumber,
      original_id: originalId,
    } = row._source;
    return { syrfId, organization, certType, certNumber, originalId };
  });
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

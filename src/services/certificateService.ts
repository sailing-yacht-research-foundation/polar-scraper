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
    syrfId: string;
    organization: string;
    certType: string;
    certNumber: string;
    originalId: string;
  }> = await elasticSearchAPI.query(`/${certIndexName}/_search`, {
    query: {
      bool: {
        must: queries,
      },
    },
    _source: ['syrfId', 'organization', 'certType', 'certNumber', 'originalId'],
  });
  return esResult.data.hits.hits.map((row) => {
    const { syrfId, organization, certType, certNumber, originalId } =
      row._source;
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

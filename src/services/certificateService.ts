import { ElasticSearchQueryResult } from '../types/GeneralType';
import elasticSearchAPI from './elasticSearchAPI';
const CERT_INDEX = 'vessel-cert';

export const searchExistingCert = async (searchQuery: {
  organization: string;
  certType: string;
  certNumber?: string;
  originalId?: string;
}) => {
  const { organization, certType, certNumber, originalId } = searchQuery;
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
  if (certNumber) {
    queries.push({
      match: {
        certNumber,
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
    syrfId: string;
    organization: string;
    certType: string;
    certNumber: string;
  }> = await elasticSearchAPI.query(`/${CERT_INDEX}/_search`, {
    query: {
      bool: {
        must: queries,
      },
    },
    _source: ['syrfId', 'organization', 'certType', 'certNumber'],
  });
  return esResult.data.hits.hits.map((row) => {
    const { syrfId, organization, certType, certNumber } = row._source;
    return { syrfId, organization, certType, certNumber };
  });
};

export const saveCert = async (id: string, data: any) => {
  const result = await elasticSearchAPI.push(`/${CERT_INDEX}/_doc/${id}`, data);
  return result.data;
};

export const removeCert = async (id: string) => {
  const result = await elasticSearchAPI.deleteDoc(`/${CERT_INDEX}/_doc/${id}`);
  return result.data;
};

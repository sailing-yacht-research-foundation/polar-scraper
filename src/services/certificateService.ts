import elasticSearchAPI from './elasticSearchAPI';
const CERT_INDEX = 'vessel-cert';

export const searchExistingCert = async (query: any) => {
  const result = await elasticSearchAPI.query(`/${CERT_INDEX}/_search`, query);
  return result;
};

export const saveCert = async (id: string, data: any) => {
  const result = await elasticSearchAPI.push(`/${CERT_INDEX}/_doc/${id}`, data);
  return result.data;
};

export const removeCert = async (id: string) => {
  const result = await elasticSearchAPI.deleteDoc(`/${CERT_INDEX}/_doc/${id}`);
  return result.data;
};

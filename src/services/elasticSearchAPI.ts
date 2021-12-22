import axios from 'axios';
import { ElasticSearchQueryResult } from '../types/GeneralType';

const basicAuth = Buffer.from(
  `${process.env.ELASTIC_SEARCH_USERNAME}:${process.env.ELASTIC_SEARCH_PASSWORD}`,
).toString('base64');

let api = axios.create({
  baseURL: process.env.ELASTIC_SEARCH_HOST,
  headers: {
    Authorization: 'Basic ' + basicAuth,
  },
});

const query = async (
  urlPath = '',
  query: any,
): Promise<ElasticSearchQueryResult<any>> => {
  return await api.post(urlPath, query);
};

const push = async (path = '', data: any) => {
  return await api.put(path, data);
};

const deleteDoc = async (urlPath = '') => {
  return await api.delete(urlPath);
};

export default { query, push, deleteDoc };

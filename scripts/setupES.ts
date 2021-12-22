import dotenv from 'dotenv';
dotenv.config();
import axios, { AxiosError } from 'axios';

const CERT_INDEX = 'vessel-cert';
const basicAuth = Buffer.from(
  `${process.env.ELASTIC_SEARCH_USERNAME}:${process.env.ELASTIC_SEARCH_PASSWORD}`,
).toString('base64');

let api = axios.create({
  baseURL: process.env.ELASTIC_SEARCH_HOST,
  headers: {
    Authorization: 'Basic ' + basicAuth,
  },
});

// Script to initate the new index
// Required, because the auto mapping won't work on the first insert, because of float & long differences on the data:
// "type": "illegal_argument_exception", "reason": "mapper [polars.beatAngles] cannot be changed from type [float] to [long]"
// and vice versa. Think this is caused by some data start with no decimal, and then decimal or vice versa
// By forcing these mapping, it will not trigger any map changes on insertions
(async () => {
  try {
    await api.put(`${CERT_INDEX}`, {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
    });
  } catch (error) {
    console.log(
      'Error creating new index: ',
      (error as AxiosError).response?.data,
    );
  }
  try {
    const result = await api.put(`${CERT_INDEX}/_mapping`, {
      properties: {
        'polars.beatAngles': { type: 'long' },
        'polars.gybeAngles': { type: 'long' },
        'polars.polars.speeds': { type: 'long' },
        'timeAllowances.beatVMGs': { type: 'long' },
        'timeAllowances.runVMGs': { type: 'long' },
        'timeAllowances.timeAllowances.speeds': { type: 'long' },
      },
    });
    console.log(`${CERT_INDEX} mapped: ${JSON.stringify(result.data)}`);
  } catch (error) {
    console.log('Error setting mapper: ', (error as AxiosError).response?.data);
  }
})();

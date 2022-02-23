import dotenv from 'dotenv';
dotenv.config();
import axios, { AxiosError } from 'axios';

import { certIndexName } from '../src/enum';

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
    await api.put(`${certIndexName}`, {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
    });
  } catch (error) {
    console.log(
      'Error creating new index: ',
      (error as AxiosError).response?.data,
    );
  }
  try {
    const result = await api.put(`${certIndexName}/_mapping`, {
      properties: {
        'polars.wind_speeds': { type: 'double' },
        'polars.beat_angles': { type: 'double' },
        'polars.beat_vmgs': { type: 'double' },
        'polars.polars.speeds': { type: 'double' },
        'polars.run_vmgs': { type: 'double' },
        'polars.gybe_angles': { type: 'double' },
        'time_allowances.wind_speeds': { type: 'double' },
        'time_allowances.beat_vmgs': { type: 'double' },
        'time_allowances.time_allowances.speeds': { type: 'double' },
        'time_allowances.run_vmgs': { type: 'double' },
        'time_allowances.gybe_angles': { type: 'double' },
      },
    });
    console.log(`${certIndexName} mapped: ${JSON.stringify(result.data)}`);
  } catch (error) {
    console.log('Error setting mapper: ', (error as AxiosError).response?.data);
  }
})();

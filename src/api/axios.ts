import { captureException } from '@sentry/node';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { Api, HttpClient } from './config.js';

const httpClient = new HttpClient({
  baseURL: `${process.env.INTERNAL_API_BASE_URL}/v1`,
  securityWorker: () => {
    return {
      headers: {
        'x-api-key': `${process.env.INTERNAL_API_KEY}`
      }
    };
  }
});

httpClient.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const client = container.resolve(Client);
    client.logger.error(`${error.response?.data?.message || error.code}`, { label: 'AXIOS' });

    captureException(error);
  }
);

export const encode = (str: string) => encodeURIComponent(str);

export const api = new Api(httpClient);

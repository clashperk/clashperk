import { captureException, setContext } from '@sentry/node';
import { AxiosError } from 'axios';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { Api, HttpClient } from './generated.js';

const httpClient = new HttpClient({
  baseURL: `${process.env.INTERNAL_API_BASE_URL}/v1`,
  secure: true,
  securityWorker: () => {
    return {
      headers: {
        'x-api-key': process.env.INTERNAL_API_KEY
      }
    };
  }
});

httpClient.instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message: string }>) => {
    const client = container.resolve(Client);
    client.logger.error(`${JSON.stringify(error.response?.data || error.code, null, 0)}`, {
      label: 'AXIOS'
    });

    setContext('http_call_errored', {
      response: error.response?.data || {},
      url: error.config?.url,
      code: error.code,
      message: error.message,
      method: error.config?.method,
      params: error.config?.params,
      data: error.config?.data
    });

    captureException(error);
  }
);

export const encode = (str: string) => encodeURIComponent(str);

export const api = new Api(httpClient);

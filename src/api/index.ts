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

export const encode = (str: string) => encodeURIComponent(str);

export const api = new Api(httpClient);

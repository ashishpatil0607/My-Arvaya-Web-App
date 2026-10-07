import axios from 'axios';
import { clearAuthData, getValidToken } from './antworkAuthService';

// Proxied to https://secure-ant.ant.works/secure-api (vite.config.js in dev, vercel.json in prod) — the API has no CORS headers
export const BASE_URL = '/antwork-api';

export const Antworkapi = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  timeoutErrorMessage: "We're having a bit of a snag connecting to the server. Let's try again later.",
});

/**
 * Request Interceptor
 */
Antworkapi.interceptors.request.use(
  async (config) => {
    try {
      const token = await getValidToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor
 */
Antworkapi.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        await clearAuthData();
        return Promise.reject({
          code: 401,
          message: 'Session expired',
        });
      }

      if (error.response) {
        return Promise.reject({
          code: error.response.status,
          message:
            error.response.data?.message ||
            error.response.data?.error_description ||
            error.response.data?.error ||
            'Something went wrong',
          data: error.response.data,
        });
      }

      return Promise.reject({
        code: 999,
        message: error.message,
        data: error.code,
      });
    }

    // Non-axios errors (e.g. token fetch failure in the request interceptor)
    return Promise.reject({
      code: 999,
      message: error?.message || 'Unexpected error occurred',
    });
  }
);

export default Antworkapi;

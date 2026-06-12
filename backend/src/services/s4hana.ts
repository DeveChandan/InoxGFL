import { executeHttpRequest, HttpResponse } from '@sap-cloud-sdk/http-client';

const DESTINATION_NAME = 'S4_DEV';

/**
 * Wrapper for SAP Cloud SDK executeHttpRequest.
 * Automatically targets the s4hana-onpremise destination.
 */
export const s4hanaRequest = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  data?: any,
  headers?: any,
  jwtToken?: string
): Promise<any> => {
  try {
    const destOptions: any = { destinationName: DESTINATION_NAME };
    if (jwtToken) {
      destOptions.jwt = jwtToken;
    }

    let requestHeaders: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    // If it's a mutating request, fetch the CSRF token manually from the service root
    if (method !== 'GET') {
      try {
        const serviceRoot = path.split('/').slice(0, 6).join('/') + '/';
        const csrfResponse = await executeHttpRequest(
          destOptions,
          {
            method: 'GET',
            url: serviceRoot,
            headers: {
              'x-csrf-token': 'fetch'
            }
          },
          { fetchCsrfToken: false }
        );
        
        const csrfToken = csrfResponse.headers['x-csrf-token'];
        const cookies = csrfResponse.headers['set-cookie'];
        
        if (csrfToken) {
          requestHeaders['x-csrf-token'] = csrfToken;
        }
        if (cookies) {
          requestHeaders['Cookie'] = Array.isArray(cookies) ? cookies.join('; ') : cookies;
        }
      } catch (csrfErr: any) {
        console.warn('Manual CSRF fetch failed. Falling back to SDK auto-fetch.', csrfErr.message);
      }
    }

    const response: HttpResponse = await executeHttpRequest(
      destOptions,
      {
        method,
        url: path,
        data,
        headers: requestHeaders
      },
      { fetchCsrfToken: false } // We manually fetched it
    );

    return response.data;
  } catch (error: any) {
    console.error(`S/4HANA Request Error [${method} ${path}]:`, error.message);
    if (error.cause) console.error('Error Cause:', error.cause.message || error.cause);
    if (error.rootCause) console.error('Error Root Cause:', error.rootCause.message || error.rootCause);
    if (error.response?.data) console.error('Error Response Data:', JSON.stringify(error.response.data));
    
    let detailedErrorMessage = error.message;
    if (error.response?.data?.error?.message?.value) {
      detailedErrorMessage = error.response.data.error.message.value;
    } else if (error.response?.data?.error?.message) {
      detailedErrorMessage = error.response.data.error.message;
    }
    
    throw new Error(`Failed to communicate with S/4HANA: ${detailedErrorMessage}`);
  }
};

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s4hanaRequest = void 0;
const http_client_1 = require("@sap-cloud-sdk/http-client");
const DESTINATION_NAME = 'S4_DEV';
/**
 * Wrapper for SAP Cloud SDK executeHttpRequest.
 * Automatically targets the s4hana-onpremise destination.
 */
const s4hanaRequest = (method, path, data, headers, jwtToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const destOptions = { destinationName: DESTINATION_NAME };
        if (jwtToken) {
            destOptions.jwt = jwtToken;
        }
        let requestHeaders = Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, headers);
        // If it's a mutating request, fetch the CSRF token manually from the service root
        if (method !== 'GET') {
            try {
                const serviceRoot = path.split('/').slice(0, 6).join('/') + '/';
                const csrfResponse = yield (0, http_client_1.executeHttpRequest)(destOptions, {
                    method: 'GET',
                    url: serviceRoot,
                    headers: {
                        'x-csrf-token': 'fetch'
                    }
                }, { fetchCsrfToken: false });
                const csrfToken = csrfResponse.headers['x-csrf-token'];
                const cookies = csrfResponse.headers['set-cookie'];
                if (csrfToken) {
                    requestHeaders['x-csrf-token'] = csrfToken;
                }
                if (cookies) {
                    requestHeaders['Cookie'] = Array.isArray(cookies) ? cookies.join('; ') : cookies;
                }
            }
            catch (csrfErr) {
                console.warn('Manual CSRF fetch failed. Falling back to SDK auto-fetch.', csrfErr.message);
            }
        }
        const response = yield (0, http_client_1.executeHttpRequest)(destOptions, {
            method,
            url: path,
            data,
            headers: requestHeaders
        }, { fetchCsrfToken: false } // We manually fetched it
        );
        return response.data;
    }
    catch (error) {
        console.error(`S/4HANA Request Error [${method} ${path}]:`, error.message);
        if (error.cause)
            console.error('Error Cause:', error.cause.message || error.cause);
        if (error.rootCause)
            console.error('Error Root Cause:', error.rootCause.message || error.rootCause);
        if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data)
            console.error('Error Response Data:', JSON.stringify(error.response.data));
        let detailedErrorMessage = error.message;
        if ((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.value) {
            detailedErrorMessage = error.response.data.error.message.value;
        }
        else if ((_h = (_g = (_f = error.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.error) === null || _h === void 0 ? void 0 : _h.message) {
            detailedErrorMessage = error.response.data.error.message;
        }
        throw new Error(`Failed to communicate with S/4HANA: ${detailedErrorMessage}`);
    }
});
exports.s4hanaRequest = s4hanaRequest;

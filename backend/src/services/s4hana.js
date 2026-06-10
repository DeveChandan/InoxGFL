"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s4hanaRequest = void 0;
var http_client_1 = require("@sap-cloud-sdk/http-client");
var DESTINATION_NAME = 'S4_DEV';
/**
 * Wrapper for SAP Cloud SDK executeHttpRequest.
 * Automatically targets the s4hana-onpremise destination.
 */
var s4hanaRequest = function (method, path, data, headers, jwtToken) { return __awaiter(void 0, void 0, void 0, function () {
    var destOptions, requestHeaders, csrfUrl, csrfResponse, csrfToken, cookies, csrfErr_1, response, error_1, detailedErrorMessage;
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                _j.trys.push([0, 6, , 7]);
                destOptions = { destinationName: DESTINATION_NAME };
                if (jwtToken) {
                    destOptions.jwt = jwtToken;
                }
                requestHeaders = __assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, headers);
                if (!(method !== 'GET')) return [3 /*break*/, 4];
                _j.label = 1;
            case 1:
                _j.trys.push([1, 3, , 4]);
                csrfUrl = path.includes('?') ? "".concat(path, "&$top=1") : "".concat(path, "?$top=1");
                return [4 /*yield*/, (0, http_client_1.executeHttpRequest)(destOptions, {
                        method: 'GET',
                        url: csrfUrl,
                        headers: {
                            'x-csrf-token': 'fetch'
                        }
                    }, { fetchCsrfToken: false })];
            case 2:
                csrfResponse = _j.sent();
                csrfToken = csrfResponse.headers['x-csrf-token'];
                cookies = csrfResponse.headers['set-cookie'];
                if (csrfToken) {
                    requestHeaders['x-csrf-token'] = csrfToken;
                }
                if (cookies) {
                    requestHeaders['Cookie'] = Array.isArray(cookies) ? cookies.join('; ') : cookies;
                }
                return [3 /*break*/, 4];
            case 3:
                csrfErr_1 = _j.sent();
                console.warn('Manual CSRF fetch failed. Falling back to SDK auto-fetch.', csrfErr_1.message);
                return [3 /*break*/, 4];
            case 4: return [4 /*yield*/, (0, http_client_1.executeHttpRequest)(destOptions, {
                    method: method,
                    url: path,
                    data: data,
                    headers: requestHeaders
                }, { fetchCsrfToken: false } // We manually fetched it
                )];
            case 5:
                response = _j.sent();
                return [2 /*return*/, response.data];
            case 6:
                error_1 = _j.sent();
                console.error("S/4HANA Request Error [".concat(method, " ").concat(path, "]:"), error_1.message);
                if (error_1.cause)
                    console.error('Error Cause:', error_1.cause.message || error_1.cause);
                if (error_1.rootCause)
                    console.error('Error Root Cause:', error_1.rootCause.message || error_1.rootCause);
                if ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data)
                    console.error('Error Response Data:', JSON.stringify(error_1.response.data));
                detailedErrorMessage = error_1.message;
                if ((_e = (_d = (_c = (_b = error_1.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.value) {
                    detailedErrorMessage = error_1.response.data.error.message.value;
                }
                else if ((_h = (_g = (_f = error_1.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.error) === null || _h === void 0 ? void 0 : _h.message) {
                    detailedErrorMessage = error_1.response.data.error.message;
                }
                throw new Error("Failed to communicate with S/4HANA: ".concat(detailedErrorMessage));
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.s4hanaRequest = s4hanaRequest;

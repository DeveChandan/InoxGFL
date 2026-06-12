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
const s4hana_1 = require("./services/s4hana");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const res = yield (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet');
            const vendors = ((_a = res.d) === null || _a === void 0 ? void 0 : _a.results) || res.d || [];
            console.log('VENDORS IN S/4HANA:');
            vendors.forEach((v) => {
                console.log(`Code: ${v.Vendorcode}, Name: ${v.Vendorname}`);
            });
        }
        catch (err) {
            console.error('Failed to query vendors:', err.message);
        }
    });
}
run();

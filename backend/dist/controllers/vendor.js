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
exports.createVendor = exports.getVendors = void 0;
const s4hana_1 = require("../services/s4hana");
const getVendors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        // ABAP URL Placeholder: /sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet
        const response = yield (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet', undefined, undefined, jwtToken);
        // Map S/4HANA fields to frontend expected fields
        const rawVendors = ((_b = response.d) === null || _b === void 0 ? void 0 : _b.results) || response.d || response || [];
        const mappedVendors = (Array.isArray(rawVendors) ? rawVendors : [rawVendors]).map((v) => ({
            id: v.Vendorcode || v.vendor_code,
            vendor_code: v.Vendorcode || v.vendor_code,
            vendor_name: v.Vendorname || v.vendor_name,
            total_emp: v.Totalemp || v.total_emp,
            rate: v.Rate || v.rate,
            contract_person: v.Contractperson || v.contract_person,
            contact_email: v.Contactemail || v.contact_email,
            contact_phone: v.Contactphone || v.contact_phone,
            contact_address: v.Contactaddress || v.contact_address,
            status: v.Status || v.status || 'ACTIVE'
        }));
        res.json({ message: 'Success', vendors: mappedVendors });
    }
    catch (error) {
        console.error('getVendors Error:', error);
        res.status(500).json({ message: 'Error fetching vendors from S/4HANA', error: error.message });
    }
});
exports.getVendors = getVendors;
const createVendor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const vendorData = req.body;
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        // Map frontend fields to S/4HANA fields
        const s4hanaData = {
            Vendorcode: vendorData.vendor_code || vendorData.Vendorcode,
            Vendorname: vendorData.vendor_name || vendorData.Vendorname,
            Totalemp: vendorData.total_emp || vendorData.Totalemp || "0",
            Rate: vendorData.rate || vendorData.Rate || "0.00",
            Contractperson: vendorData.contract_person || vendorData.Contractperson || "",
            Contactemail: vendorData.contact_email || vendorData.Contactemail || "",
            Contactphone: vendorData.contact_phone || vendorData.Contactphone || "",
            Contactaddress: vendorData.contact_address || vendorData.Contactaddress || "",
            Status: vendorData.status || vendorData.Status || "ACTIVE"
        };
        // ABAP URL Placeholder: /sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet
        const response = yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet', s4hanaData, undefined, jwtToken);
        res.json({ message: 'Vendor created successfully in S/4HANA', data: response.d || response });
    }
    catch (error) {
        console.error('createVendor Error:', error);
        res.status(500).json({ message: 'Error creating vendor in S/4HANA', error: error.message });
    }
});
exports.createVendor = createVendor;

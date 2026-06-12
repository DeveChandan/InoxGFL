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
exports.updateVendorStatus = exports.createVendor = exports.getVendors = void 0;
const s4hana_1 = require("../services/s4hana");
const getVendors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        // Fetch both vendors and users in parallel to optimize response time
        const [vendorsRes, usersRes] = yield Promise.all([
            (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet', undefined, undefined, jwtToken),
            (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet', undefined, undefined, jwtToken).catch(err => {
                console.warn('Could not fetch users to calculate dynamic employee counts:', err.message);
                return { d: { results: [] } };
            })
        ]);
        const rawUsers = ((_b = usersRes.d) === null || _b === void 0 ? void 0 : _b.results) || usersRes.d || [];
        const empCounts = {};
        (Array.isArray(rawUsers) ? rawUsers : [rawUsers]).forEach((u) => {
            const vCode = (u.Vendorcode || u.vendor_code || '').toUpperCase().trim();
            if (vCode) {
                empCounts[vCode] = (empCounts[vCode] || 0) + 1;
            }
        });
        const rawVendors = ((_c = vendorsRes.d) === null || _c === void 0 ? void 0 : _c.results) || vendorsRes.d || vendorsRes || [];
        const mappedVendors = (Array.isArray(rawVendors) ? rawVendors : [rawVendors]).map((v) => {
            const vCode = (v.Vendorcode || v.vendor_code || '').toUpperCase().trim();
            return {
                id: v.Vendorcode || v.vendor_code,
                vendor_code: v.Vendorcode || v.vendor_code,
                vendor_name: v.Vendorname || v.vendor_name,
                total_emp: empCounts[vCode] || 0,
                rate: v.Rate || v.rate,
                contract_person: v.Contractperson || v.contract_person,
                contact_email: v.Contactemail || v.contact_email,
                contact_phone: v.Contactphone || v.contact_phone,
                contact_address: v.Contactaddress || v.contact_address,
                status: v.Status || v.status || 'ACTIVE'
            };
        });
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
const updateVendorStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { vendor_code } = req.params;
        const { status } = req.body;
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!vendor_code || !status) {
            return res.status(400).json({ message: 'Vendor code and status are required' });
        }
        // Fetch existing vendor to preserve fields
        let existingVendor = {};
        try {
            const vRes = yield (0, s4hana_1.s4hanaRequest)('GET', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet?$filter=Vendorcode eq '${vendor_code.toUpperCase()}'`, undefined, undefined, jwtToken);
            const vendorsList = ((_b = vRes.d) === null || _b === void 0 ? void 0 : _b.results) || vRes.d || [];
            const found = Array.isArray(vendorsList) ? vendorsList.find((v) => { var _a; return ((_a = v.Vendorcode) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === vendor_code.toUpperCase(); }) : vendorsList;
            if (found) {
                existingVendor = found;
            }
        }
        catch (err) {
            console.warn('Could not fetch existing vendor details for update status:', err.message);
        }
        const s4hanaData = {
            Vendorcode: vendor_code.toUpperCase(),
            Vendorname: existingVendor.Vendorname || existingVendor.vendor_name || vendor_code.toUpperCase(),
            Totalemp: existingVendor.Totalemp || "0",
            Rate: existingVendor.Rate || "0.00",
            Contractperson: existingVendor.Contractperson || "",
            Contactemail: existingVendor.Contactemail || "",
            Contactphone: existingVendor.Contactphone || "",
            Contactaddress: existingVendor.Contactaddress || "",
            Status: status.toUpperCase()
        };
        let updateRes;
        let updateMethod = 'PUT';
        // Fallback try chain: PUT -> PATCH -> POST
        try {
            updateRes = yield (0, s4hana_1.s4hanaRequest)('PUT', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet('${vendor_code.toUpperCase()}')`, s4hanaData, undefined, jwtToken);
            updateMethod = 'PUT';
        }
        catch (putErr) {
            console.warn(`PUT vendor status failed, trying PATCH:`, putErr.message);
            try {
                updateRes = yield (0, s4hana_1.s4hanaRequest)('PATCH', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet('${vendor_code.toUpperCase()}')`, s4hanaData, undefined, jwtToken);
                updateMethod = 'PATCH';
            }
            catch (patchErr) {
                console.warn(`PATCH vendor status failed, falling back to POST:`, patchErr.message);
                try {
                    updateRes = yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet', s4hanaData, undefined, jwtToken);
                    updateMethod = 'POST';
                }
                catch (postErr) {
                    throw new Error(`Failed to update vendor status in S/4HANA via all methods: ${postErr.message}`);
                }
            }
        }
        res.json({ message: `Vendor status updated successfully using ${updateMethod}`, data: updateRes });
    }
    catch (error) {
        console.error('updateVendorStatus Error:', error);
        res.status(500).json({ message: 'Error updating vendor status in S/4HANA', error: error.message });
    }
});
exports.updateVendorStatus = updateVendorStatus;

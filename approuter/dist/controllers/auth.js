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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedInitialData = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const s4hana_1 = require("../services/s4hana");
// In BTP with XSUAA, login is handled by the platform.
// This endpoint now checks the user against S/4HANA.
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // req.user is populated by passport/xssec
        let user = req.user;
        // Prioritize the email submitted in the login form so we can test different users,
        // otherwise fallback to the BTP XSUAA session user, or finally a default mock user.
        const rawEmail = req.body.email || (user ? (user.email || user.id) : null) || 'vineet.kumar@gfl.co.in';
        const userEmail = rawEmail; // DO NOT lowercase this! S/4HANA OData query is case-sensitive!
        // Default fallback values
        let assignedRole = 'EMPLOYEE';
        let assignedName = 'Unknown User';
        let assignedVendor = null;
        let isMasterKey = false;
        // MASTER SUPER ADMIN CHECK
        if (userEmail.toLowerCase() === 'vineet.kumar@gfl.co.in') {
            assignedRole = 'SUPER_ADMIN';
            assignedName = 'Vineet Kumar';
            isMasterKey = true;
        }
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        try {
            // Query S/4HANA to see if the user exists in ZINOX_USERS
            const response = yield (0, s4hana_1.s4hanaRequest)('GET', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$filter=Email eq '${userEmail}'`, undefined, undefined, jwtToken);
            if (response.d && response.d.results && response.d.results.length > 0) {
                // Manually find the matching user in case the ABAP backend ignores the $filter query
                const s4User = response.d.results.find((u) => { var _a; return ((_a = u.Email) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === userEmail.toLowerCase(); });
                if (s4User) {
                    assignedRole = isMasterKey ? 'SUPER_ADMIN' : (s4User.Systemrole || s4User.SystemRole || assignedRole);
                    assignedName = s4User.Name || assignedName;
                    assignedVendor = s4User.Vendorcode || s4User.vendor_code || null;
                }
                else if (!isMasterKey) {
                    return res.status(403).json({ message: 'Access Denied: You are not registered in the system.' });
                }
            }
            else if (!isMasterKey) {
                // If they are not in the database and NOT the master key, deny access
                return res.status(403).json({ message: 'Access Denied: You are not registered in the system.' });
            }
        }
        catch (s4Err) {
            console.warn('Could not connect to S/4HANA for auth check, using fallback.', s4Err);
        }
        const customToken = jsonwebtoken_1.default.sign({ email: userEmail, role: assignedRole, vendor_code: assignedVendor }, process.env.JWT_SECRET || 'super_secret_jwt_key_inoxgfl_2026', { expiresIn: '12h' });
        res.json({
            message: 'Authentication successful via SAP BTP',
            token: customToken,
            user: {
                email: userEmail,
                name: assignedName,
                role: assignedRole,
                vendor_code: assignedVendor
            }
        });
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.login = login;
const seedInitialData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(400).json({ message: 'Seeding is disabled on SAP BTP. Data is managed in S/4HANA.' });
});
exports.seedInitialData = seedInitialData;

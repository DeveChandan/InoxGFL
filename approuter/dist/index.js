"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("passport"));
const xssec_1 = require("@sap/xssec");
const xsenv_1 = __importDefault(require("@sap/xsenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// SAP BTP Security Middleware
try {
    const services = xsenv_1.default.getServices({ uaa: { tag: 'xsuaa' } });
    passport_1.default.use(new xssec_1.JWTStrategy(services.uaa));
    app.use(passport_1.default.initialize());
    // Authenticate using BTP JWT tokens, but allow passthrough for Local Dev mock logic
    app.use((req, res, next) => {
        passport_1.default.authenticate('JWT', { session: false }, (err, user) => {
            if (user)
                req.user = user;
            next();
        })(req, res, next);
    });
    console.log('SAP XSUAA Security Initialized');
}
catch (error) {
    console.warn('WARNING: XSUAA Service not found. Running without BTP security (local dev mode only).');
}
const PORT = process.env.PORT || 5000;
const auth_1 = __importDefault(require("./routes/auth"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const worksheet_1 = __importDefault(require("./routes/worksheet"));
const report_1 = __importDefault(require("./routes/report"));
const vendor_1 = __importDefault(require("./routes/vendor"));
const user_1 = __importDefault(require("./routes/user"));
const approvals_1 = __importDefault(require("./routes/approvals"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/worksheet', worksheet_1.default);
app.use('/api/report', report_1.default);
app.use('/api/vendor', vendor_1.default);
app.use('/api/user', user_1.default);
app.use('/api/approvals', approvals_1.default);
// Basic health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'InoxGFL API is running' });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

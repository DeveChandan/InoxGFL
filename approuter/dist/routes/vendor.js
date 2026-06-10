"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_1 = require("../controllers/vendor");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All vendor routes require an authenticated user
router.use(auth_1.authenticateJWT);
// Only SUPER_ADMIN can manage vendors
router.get('/', (0, auth_1.requireRole)(['SUPER_ADMIN']), vendor_1.getVendors);
router.post('/', (0, auth_1.requireRole)(['SUPER_ADMIN']), vendor_1.createVendor);
exports.default = router;

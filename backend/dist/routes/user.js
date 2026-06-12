"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../controllers/user");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Unauthenticated debug routes (disabled for security)
// router.get('/debug-users', debugUsers);
// router.get('/list-debug', listDebugUsers);
// All user routes require an authenticated user
router.use(auth_1.authenticateJWT);
// Both SUPER_ADMIN and VENDOR_ADMIN can manage users (logic handles specifics)
router.get('/', (0, auth_1.requireRole)(['SUPER_ADMIN', 'VENDOR_ADMIN']), user_1.getUsers);
router.post('/', (0, auth_1.requireRole)(['SUPER_ADMIN', 'VENDOR_ADMIN']), user_1.createUser);
exports.default = router;

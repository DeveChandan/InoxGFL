"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const router = (0, express_1.Router)();
router.post('/login', auth_1.login);
router.get('/seed', auth_1.seedInitialData); // Only for setup purposes
exports.default = router;

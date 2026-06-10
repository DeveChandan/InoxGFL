"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const worksheet_1 = require("../controllers/worksheet");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
router.post('/submit', worksheet_1.submitWorksheet);
exports.default = router;

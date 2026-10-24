"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const progressController_1 = require("../controllers/progressController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateJWT);
router.post('/submit', (0, authMiddleware_1.requireRoles)('student'), progressController_1.submitWeeklyProgress);
exports.default = router;

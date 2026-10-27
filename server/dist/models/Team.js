"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Team = void 0;
const mongoose_1 = require("mongoose");
const teamSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    yearCohort: { type: String, default: '3rd Year' },
    leaderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    mentorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    department: { type: String, default: 'Computer Science' },
    createdAt: { type: Date, default: Date.now }
});
exports.Team = (0, mongoose_1.model)('Team', teamSchema);

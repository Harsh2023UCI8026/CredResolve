"use strict";
// System Type Definitions for SmartDialer
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMINAL_CALL_STATES = exports.CALL_STATE_RANKS = void 0;
exports.CALL_STATE_RANKS = {
    QUEUED: 1,
    RESERVED: 2,
    INITIATED: 3,
    RINGING: 4,
    ANSWERED: 5,
    CONNECTED: 6,
    COMPLETED: 7,
    FAILED: 7,
    CANCELLED: 7
};
exports.TERMINAL_CALL_STATES = ['COMPLETED', 'FAILED', 'CANCELLED'];

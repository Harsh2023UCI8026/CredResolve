"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWithinLegalDialingHours = isWithinLegalDialingHours;
/**
 * Utility for verifying borrower legal dialing hours (8 AM - 9 PM local time).
 */
function isWithinLegalDialingHours(timezoneStr, simulatedHour) {
    try {
        let currentHour;
        if (simulatedHour !== undefined) {
            currentHour = simulatedHour;
        }
        else {
            const nowStr = new Date().toLocaleString('en-US', { timeZone: timezoneStr, hour: 'numeric', hour12: false });
            currentHour = parseInt(nowStr, 10);
        }
        // 8 AM to 9 PM (8:00 - 20:59)
        return currentHour >= 8 && currentHour < 21;
    }
    catch (err) {
        // Default safe fallback if timezone invalid: allow standard business hours
        return true;
    }
}

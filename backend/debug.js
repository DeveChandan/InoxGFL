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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const activeAttendance = yield prisma.attendance.findFirst({
                where: { status: 'working' },
                orderBy: { id: 'desc' }
            });
            if (!activeAttendance) {
                console.log('No active working shift found. Please log in and click Clock In first.');
                return;
            }
            console.log('Found active attendance:', activeAttendance);
            const now = new Date();
            const diffMs = now.getTime() - activeAttendance.clock_in_time.getTime();
            const hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
            console.log('Calculated hours:', hours);
            // Let's check if the worksheet exists
            const worksheet = yield prisma.worksheet.findFirst({
                where: { user_id: activeAttendance.user_id, work_date: activeAttendance.work_date }
            });
            if (worksheet) {
                console.log('Found worksheet:', worksheet);
            }
            else {
                console.log('No worksheet found. We will attempt the update as if it exists (for debugging).');
            }
            try {
                console.log('Attempting to update attendance...');
                const updated = yield prisma.attendance.update({
                    where: { id: activeAttendance.id },
                    data: {
                        clock_out_time: now,
                        status: 'completed',
                        hours_worked: hours,
                        manual_location: 'Dahej-A'
                    }
                });
                console.log('Attendance update successful:', updated);
                if (worksheet) {
                    console.log('Attempting to update worksheet...');
                    const wsUpdated = yield prisma.worksheet.update({
                        where: { id: worksheet.id },
                        data: { hours_spent: hours }
                    });
                    console.log('Worksheet update successful:', wsUpdated);
                }
            }
            catch (updateError) {
                console.error('FAILED TO UPDATE DB:', updateError.message || updateError);
            }
        }
        catch (err) {
            console.error('Fatal error in debug script:', err);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
main();

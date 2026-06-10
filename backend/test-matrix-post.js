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
function testPost() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const rule = yield prisma.approvalMatrix.create({
                data: {
                    vendor_id: 1, // Make sure a vendor with ID 1 exists
                    employee_role: 'CTM',
                    track: 'S4HANA',
                    module: 'PP',
                    level: 1,
                    approver_id: 1, // Make sure user with ID 1 exists
                    approver_type: 'ML'
                }
            });
            console.log("Success:", rule);
        }
        catch (error) {
            console.error("Failed to create rule:", error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
testPost();

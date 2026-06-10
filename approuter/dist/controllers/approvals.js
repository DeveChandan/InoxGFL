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
exports.updateMatrixRule = exports.deleteMatrixRule = exports.createMatrixRule = exports.getMatrixRules = exports.bulkActionApproval = exports.actionApproval = exports.getPendingApprovals = void 0;
const getPendingApprovals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: 'STUB: getPendingApprovals OData call to S/4HANA needed', data: [] });
});
exports.getPendingApprovals = getPendingApprovals;
const actionApproval = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: 'STUB: actionApproval OData POST to S/4HANA needed' });
});
exports.actionApproval = actionApproval;
const bulkActionApproval = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: 'STUB: bulkActionApproval OData POST to S/4HANA needed' });
});
exports.bulkActionApproval = bulkActionApproval;
const getMatrixRules = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: 'STUB: getMatrixRules OData call to S/4HANA needed', data: [] });
});
exports.getMatrixRules = getMatrixRules;
const createMatrixRule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: 'STUB: createMatrixRule OData POST to S/4HANA needed' });
});
exports.createMatrixRule = createMatrixRule;
const deleteMatrixRule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: 'STUB: deleteMatrixRule OData DELETE to S/4HANA needed' });
});
exports.deleteMatrixRule = deleteMatrixRule;
const updateMatrixRule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: 'STUB: updateMatrixRule OData PUT to S/4HANA needed' });
});
exports.updateMatrixRule = updateMatrixRule;

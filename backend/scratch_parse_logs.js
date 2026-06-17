"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
function main() {
    const logPath = 'D:\\AI_Project\\InoxGFL\\cf_logs.txt';
    if (!fs.existsSync(logPath)) {
        console.error("Log file does not exist");
        return;
    }
    // Read in UTF-16LE encoding
    const content = fs.readFileSync(logPath, 'utf16le');
    console.log("File read successfully, character length:", content.length);
    // Match any letters following Z_INOXGFL_SRV_SRV/
    const regex = /Z_INOXGFL_SRV_SRV\/([A-Za-z0-9_]+)/g;
    const matches = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.add(match[1]);
    }
    console.log("Matched entities in logs:");
    console.log(Array.from(matches));
}
main();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUuidV7 = void 0;
const crypto_1 = require("crypto");
const generateUuidV7 = () => {
    const timestamp = Date.now();
    const timestampHex = timestamp.toString(16).padStart(12, '0');
    const randomPart = (0, crypto_1.randomBytes)(10);
    randomPart[0] = (randomPart[0] & 0x0f) | 0x70;
    randomPart[2] = (randomPart[2] & 0x3f) | 0x80;
    const hex = randomPart.toString('hex');
    const part1 = timestampHex.substring(0, 8);
    const part2 = timestampHex.substring(8, 12);
    const part3 = hex.substring(0, 4);
    const part4 = hex.substring(4, 8);
    const part5 = hex.substring(8, 20);
    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
};
exports.generateUuidV7 = generateUuidV7;

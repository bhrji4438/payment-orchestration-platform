"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialEncryptionService = exports.CredentialEncryptionService = void 0;
const crypto_1 = require("crypto");
class CredentialEncryptionService {
    masterKey;
    constructor() {
        const rawKey = process.env.ENCRYPTION_MASTER_KEY;
        if (!rawKey) {
            throw new Error('FATAL: ENCRYPTION_MASTER_KEY environment variable is not defined.');
        }
        this.masterKey = Buffer.from(rawKey, 'base64');
        if (this.masterKey.length !== 32) {
            this.masterKey = (0, crypto_1.createHash)('sha256').update(this.masterKey).digest();
        }
    }
    encrypt(plainText) {
        const iv = (0, crypto_1.randomBytes)(12);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', this.masterKey, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${encrypted}:${tag}`;
    }
    decrypt(cipherText) {
        const parts = cipherText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted credentials format. Expected iv:encrypted:tag');
        }
        const [ivHex, encryptedHex, tagHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', this.masterKey, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    }
    rotateKeys(oldCipherText, newMasterKeyBase64) {
        const decrypted = this.decrypt(oldCipherText);
        let newKey = Buffer.from(newMasterKeyBase64, 'base64');
        if (newKey.length !== 32) {
            newKey = (0, crypto_1.createHash)('sha256').update(newKey).digest();
        }
        const iv = (0, crypto_1.randomBytes)(12);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', newKey, iv);
        let encrypted = cipher.update(decrypted, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${encrypted}:${tag}`;
    }
}
exports.CredentialEncryptionService = CredentialEncryptionService;
exports.credentialEncryptionService = new CredentialEncryptionService();
exports.default = exports.credentialEncryptionService;

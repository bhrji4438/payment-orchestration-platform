import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || 'default-32-character-secret-key-!'; // User might pass string of any length
const ENCRYPTION_KEY = createHash('sha256').update(ENCRYPTION_KEY_RAW).digest(); // Guarantee 32 bytes

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

export class EncryptionService {
  /**
   * Encrypts a JSON payload (or any string) using AES-256-CBC.
   * Format: iv:encryptedData
   */
  public static encrypt(data: any): string {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypts an AES-256-CBC payload.
   * Format: iv:encryptedData
   */
  public static decrypt(text: string): any {
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift()!, 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      const decryptedString = decrypted.toString();

      try {
        return JSON.parse(decryptedString);
      } catch (e) {
        return decryptedString;
      }
    } catch (error) {
      console.error('Decryption failed', error);
      return null;
    }
  }
}

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export class CredentialEncryptionService {
  private masterKey: Buffer;

  constructor() {
    const rawKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!rawKey) {
      throw new Error('FATAL: ENCRYPTION_MASTER_KEY environment variable is not defined.');
    }
    this.masterKey = Buffer.from(rawKey, 'base64');
    
    if (this.masterKey.length !== 32) {
      this.masterKey = createHash('sha256').update(this.masterKey).digest();
    }
  }

  public encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${encrypted}:${tag}`;
  }

  public decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted credentials format. Expected iv:encrypted:tag');
    }

    const [ivHex, encryptedHex, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  public rotateKeys(oldCipherText: string, newMasterKeyBase64: string): string {
    const decrypted = this.decrypt(oldCipherText);
    
    let newKey = Buffer.from(newMasterKeyBase64, 'base64');
    if (newKey.length !== 32) {
      newKey = createHash('sha256').update(newKey).digest();
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', newKey, iv);

    let encrypted = cipher.update(decrypted, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${encrypted}:${tag}`;
  }
}

export const credentialEncryptionService = new CredentialEncryptionService();
export default credentialEncryptionService;

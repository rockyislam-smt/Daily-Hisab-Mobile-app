import CryptoJS from 'crypto-js';

const BACKUP_PREFIX = 'POCKETFLOW_ENCRYPTED_V1:';

/**
 * Encrypts a string (e.g. JSON backup) with a user-supplied password.
 * Uses AES with PBKDF2 key derivation.
 */
export function encryptData(payload: string, pass: string): string {
  if (!pass || pass.trim() === '') {
    throw new Error('Password cannot be empty');
  }
  const encrypted = CryptoJS.AES.encrypt(payload, pass).toString();
  return `${BACKUP_PREFIX}${encrypted}`;
}

/**
 * Decrypts an encrypted payload with a user-supplied password.
 */
export function decryptData(cipherText: string, pass: string): string {
  if (!cipherText.startsWith(BACKUP_PREFIX)) {
    throw new Error('Invalid or unsupported encrypted backup format');
  }
  const pureCipher = cipherText.substring(BACKUP_PREFIX.length);
  try {
    const bytes = CryptoJS.AES.decrypt(pureCipher, pass);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Incorrect password or corrupted backup file');
    }
    return decrypted;
  } catch (err: any) {
    throw new Error('Failed to decrypt: Incorrect password or corrupted backup file');
  }
}

/**
 * Checks if a string looks like an encrypted backup.
 */
export function isEncryptedBackup(content: string): boolean {
  return content.trim().startsWith(BACKUP_PREFIX);
}

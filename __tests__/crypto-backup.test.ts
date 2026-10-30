import { encryptData, decryptData, isEncryptedBackup } from '../src/utils/crypto';

describe('Offline Encrypted Backup & Security Utilities', () => {
  const sampleJson = JSON.stringify({
    version: 1,
    appName: 'PocketFlow',
    exportedAt: '2026-10-30T10:00:00Z',
    data: {
      accounts: [{ id: 'acc_1', name: 'Cash', balance: 5000 }],
      transactions: [{ id: 'tx_1', amount: 500 }],
    },
  });

  const password = 'SuperSecretPocketFlowPassword!2026';

  test('encrypts JSON backup string with password', () => {
    const cipherText = encryptData(sampleJson, password);
    expect(cipherText).toContain('POCKETFLOW_ENCRYPTED_V1:');
    expect(isEncryptedBackup(cipherText)).toBe(true);
    expect(cipherText).not.toContain('PocketFlow');
  });

  test('successfully decrypts with correct password', () => {
    const cipherText = encryptData(sampleJson, password);
    const decrypted = decryptData(cipherText, password);
    expect(decrypted).toBe(sampleJson);
    const parsed = JSON.parse(decrypted);
    expect(parsed.appName).toBe('PocketFlow');
    expect(parsed.data.accounts.length).toBe(1);
  });

  test('fails decryption when provided with wrong password', () => {
    const cipherText = encryptData(sampleJson, password);
    expect(() => {
      decryptData(cipherText, 'WrongPassword123');
    }).toThrow('Failed to decrypt: Incorrect password or corrupted backup file');
  });

  test('rejects unencrypted plain text passed to decryptData', () => {
    expect(() => {
      decryptData('plain-unencrypted-string', password);
    }).toThrow('Invalid or unsupported encrypted backup format');
  });

  test('rejects empty password for encryption', () => {
    expect(() => {
      encryptData(sampleJson, '');
    }).toThrow('Password cannot be empty');
  });
});

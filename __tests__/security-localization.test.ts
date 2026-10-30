import { en, bn, translate } from '../src/localization';
import CryptoJS from 'crypto-js';

describe('Security & Localization Verification', () => {
  test('both English and Bangla dictionaries have identical top-level keys', () => {
    const enKeys = Object.keys(en).sort();
    const bnKeys = Object.keys(bn).sort();

    expect(enKeys).toEqual(bnKeys);
  });

  test('translate function resolves correct strings in both languages', () => {
    expect(translate('en', 'appName')).toBe('PocketFlow');
    expect(translate('bn', 'appName')).toBe('পকেটফ্লো');
    expect(translate('bn', 'totalBalance')).toBe('মোট বর্তমান ব্যালেন্স');
    expect(translate('en', 'totalBalance')).toBe('Available Balance');
  });

  test('PIN code SHA-256 hash verifies integrity securely without plaintext exposure', () => {
    const pin = '1234';
    const hash = CryptoJS.SHA256(pin).toString();

    // Ensure hash is 64 hex characters (256 bits)
    expect(hash.length).toBe(64);
    expect(hash).not.toContain('1234');

    // Matching pin matches hash
    const inputHash = CryptoJS.SHA256('1234').toString();
    expect(inputHash).toBe(hash);

    // Wrong pin produces completely different hash
    const wrongHash = CryptoJS.SHA256('4321').toString();
    expect(wrongHash).not.toBe(hash);
  });
});

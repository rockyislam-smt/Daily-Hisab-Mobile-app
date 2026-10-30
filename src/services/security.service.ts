import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import CryptoJS from 'crypto-js';

const KEY_APP_LOCK_TYPE = 'pf_app_lock_type'; // 'pin' | 'password' | 'none'
const KEY_HASHED_CREDENTIAL = 'pf_hashed_credential';
const KEY_BIOMETRICS_ALLOWED = 'pf_biometrics_allowed';

export class SecurityService {
  /**
   * Hashes a PIN or password with SHA-256 so plain text is never stored.
   */
  private static hashSecret(secret: string): string {
    return CryptoJS.SHA256(secret).toString();
  }

  static async isBiometricsAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }

  static async authenticateWithBiometrics(promptMessage: string = 'Unlock PocketFlow'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Enter PIN/Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  static async setLockCredentials(
    type: 'pin' | 'password',
    secret: string,
    allowBiometrics: boolean = false
  ): Promise<void> {
    if (!secret || secret.trim().length === 0) {
      throw new Error('Secret cannot be empty');
    }
    const hashed = this.hashSecret(secret);
    await SecureStore.setItemAsync(KEY_APP_LOCK_TYPE, type);
    await SecureStore.setItemAsync(KEY_HASHED_CREDENTIAL, hashed);
    await SecureStore.setItemAsync(KEY_BIOMETRICS_ALLOWED, allowBiometrics ? 'true' : 'false');
  }

  static async verifyCredentials(secret: string): Promise<boolean> {
    try {
      const storedHash = await SecureStore.getItemAsync(KEY_HASHED_CREDENTIAL);
      if (!storedHash) return false;
      const inputHash = this.hashSecret(secret);
      return storedHash === inputHash;
    } catch {
      return false;
    }
  }

  static async disableAppLock(currentSecret: string): Promise<boolean> {
    const isValid = await this.verifyCredentials(currentSecret);
    if (!isValid) return false;

    await this.clearAppLock();
    return true;
  }

  static async clearAppLock(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY_APP_LOCK_TYPE);
    await SecureStore.deleteItemAsync(KEY_HASHED_CREDENTIAL);
    await SecureStore.deleteItemAsync(KEY_BIOMETRICS_ALLOWED);
  }

  static async getLockType(): Promise<'pin' | 'password' | 'none'> {
    try {
      const type = await SecureStore.getItemAsync(KEY_APP_LOCK_TYPE);
      if (type === 'pin' || type === 'password') {
        return type;
      }
      return 'none';
    } catch {
      return 'none';
    }
  }

  static async isBiometricsEnabled(): Promise<boolean> {
    try {
      const allowed = await SecureStore.getItemAsync(KEY_BIOMETRICS_ALLOWED);
      return allowed === 'true';
    } catch {
      return false;
    }
  }
}

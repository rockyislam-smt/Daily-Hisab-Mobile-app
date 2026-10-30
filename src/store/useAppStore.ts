import { create } from 'zustand';
import { SettingsRepository } from '../database/repositories/settings.repository';
import { SecurityService } from '../services/security.service';
import { AppSettings } from '../types';

interface AppState {
  // Localization & Currency
  language: 'en' | 'bn';
  baseCurrency: string;
  setLanguage: (lang: 'en' | 'bn') => Promise<void>;
  setBaseCurrency: (currency: string) => Promise<void>;

  // Theme & UI
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => Promise<void>;
  hideBalances: boolean;
  toggleHideBalances: () => void;

  // Security & Lock
  isAppLockEnabled: boolean;
  lockType: 'pin' | 'password' | 'none';
  isBiometricsEnabled: boolean;
  isUnlocked: boolean;
  setUnlocked: (unlocked: boolean) => void;
  checkLockStatus: () => Promise<void>;

  // Onboarding
  isOnboardingCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => Promise<void>;

  // Global Refresh Trigger
  refreshTrigger: number;
  triggerRefresh: () => void;

  // Settings
  settings: AppSettings | null;
  loadAppSettings: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'bn',
  baseCurrency: 'BDT',
  themeMode: 'system',
  hideBalances: false,
  isAppLockEnabled: false,
  lockType: 'none',
  isBiometricsEnabled: false,
  isUnlocked: true, // initially unlocked until checkLockStatus runs
  isOnboardingCompleted: true,
  refreshTrigger: 0,
  settings: null,

  setLanguage: async (lang) => {
    set({ language: lang });
    await SettingsRepository.setSetting('language', lang);
  },

  setBaseCurrency: async (curr) => {
    set({ baseCurrency: curr });
    await SettingsRepository.setSetting('base_currency', curr);
  },

  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    await SettingsRepository.setSetting('theme_mode', mode);
  },

  toggleHideBalances: () => {
    set((state) => ({ hideBalances: !state.hideBalances }));
  },

  setUnlocked: (unlocked) => {
    set({ isUnlocked: unlocked });
  },

  checkLockStatus: async () => {
    const lockType = await SecurityService.getLockType();
    const isBio = await SecurityService.isBiometricsEnabled();
    const isLockEnabled = lockType !== 'none';

    set({
      lockType,
      isBiometricsEnabled: isBio,
      isAppLockEnabled: isLockEnabled,
      isUnlocked: !isLockEnabled, // If lock enabled, user must authenticate
    });
  },

  setOnboardingCompleted: async (val) => {
    set({ isOnboardingCompleted: val });
    await SettingsRepository.setSetting('is_onboarding_completed', val ? 'true' : 'false');
  },

  triggerRefresh: () => {
    set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }));
  },

  loadAppSettings: async () => {
    try {
      const allSettings = await SettingsRepository.getAllSettings();
      set({
        settings: allSettings,
        language: allSettings.language,
        baseCurrency: allSettings.base_currency,
        themeMode: allSettings.theme_mode,
        hideBalances: allSettings.hide_balances_by_default,
        isOnboardingCompleted: allSettings.is_onboarding_completed,
      });
      await get().checkLockStatus();
    } catch (err) {
      // Fallback defaults
      set({ language: 'bn', baseCurrency: 'BDT', themeMode: 'system', isUnlocked: true });
    }
  },
}));

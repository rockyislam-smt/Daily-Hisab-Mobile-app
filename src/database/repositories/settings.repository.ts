import { getDb } from '../db';
import { AppSettings, CurrencyRate } from '../../types';

export class SettingsRepository {
  static async getSetting(key: string, defaultValue: string = ''): Promise<string> {
    const db = getDb();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?;',
      [key]
    );
    return result ? result.value : defaultValue;
  }

  static async setSetting(key: string, value: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
      [key, value]
    );
  }

  static async getAllSettings(): Promise<AppSettings> {
    const db = getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings;'
    );

    const map: { [key: string]: string } = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }

    return {
      language: (map['language'] as 'en' | 'bn') || 'bn',
      base_currency: map['base_currency'] || 'BDT',
      theme_mode: (map['theme_mode'] as 'light' | 'dark' | 'system') || 'system',
      is_app_lock_enabled: map['is_app_lock_enabled'] === 'true',
      lock_type: (map['lock_type'] as 'pin' | 'password' | 'none') || 'none',
      is_biometrics_enabled: map['is_biometrics_enabled'] === 'true',
      lock_timeout_minutes: parseInt(map['lock_timeout_minutes'] || '0', 10),
      hide_balances_by_default: map['hide_balances_by_default'] === 'true',
      default_account_id: map['default_account_id'] || 'acc_cash_hand',
      week_start_day: (parseInt(map['week_start_day'] || '6', 10) as 0 | 1 | 6),
      date_format: map['date_format'] || 'dd MMM, yyyy',
      user_profile_name: map['user_profile_name'] || 'PocketFlow User',
      is_onboarding_completed: map['is_onboarding_completed'] === 'true',
      notify_budget_alerts: map['notify_budget_alerts'] !== 'false',
      notify_bill_reminders: map['notify_bill_reminders'] !== 'false',
      notify_daily_summary: map['notify_daily_summary'] !== 'false',
      daily_reminder_time: map['daily_reminder_time'] || '21:00',
    };
  }

  static async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
          await db.runAsync(
            'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
            [key, String(value)]
          );
        }
      }
    });
  }

  static async getCurrencies(): Promise<CurrencyRate[]> {
    const db = getDb();
    return await db.getAllAsync<CurrencyRate>(
      'SELECT * FROM currency_rates ORDER BY currency_code ASC;'
    );
  }

  static async updateCurrencyRate(currency_code: string, rate_to_base: number): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'UPDATE currency_rates SET rate_to_base = ?, updated_at = datetime("now") WHERE currency_code = ?;',
      [rate_to_base, currency_code]
    );
  }
}


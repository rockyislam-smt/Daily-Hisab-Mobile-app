import * as SQLite from 'expo-sqlite';
import { SCHEMA_STATEMENTS } from './schema';
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_ACCOUNTS,
  DEFAULT_CURRENCY_RATES,
} from './seed';
import { getCurrentISOString } from '../utils/date';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('pocketflow.db');
  }
  return dbInstance;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = getDb();

  // Enable foreign keys and WAL mode for reliability and performance
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Run schema creation
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement);
  }

  // Seed default data if database is empty
  const categoryCountResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories;'
  );

  if (!categoryCountResult || categoryCountResult.count === 0) {
    await seedDefaultData(db);
  }

  return db;
}

async function seedDefaultData(db: SQLite.SQLiteDatabase): Promise<void> {
  const now = getCurrentISOString();

  await db.withTransactionAsync(async () => {
    // 1. Seed Income Categories
    for (let i = 0; i < DEFAULT_INCOME_CATEGORIES.length; i++) {
      const cat = DEFAULT_INCOME_CATEGORIES[i];
      const id = `cat_inc_${i + 1}`;
      await db.runAsync(
        `INSERT INTO categories (id, name, name_bn, type, icon, color, is_default, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [id, cat.name, cat.name_bn || null, cat.type, cat.icon, cat.color, cat.is_default, now, now]
      );
    }

    // 2. Seed Expense Categories
    for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
      const cat = DEFAULT_EXPENSE_CATEGORIES[i];
      const id = `cat_exp_${i + 1}`;
      await db.runAsync(
        `INSERT INTO categories (id, name, name_bn, type, icon, color, is_default, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [id, cat.name, cat.name_bn || null, cat.type, cat.icon, cat.color, cat.is_default, now, now]
      );
    }

    // 3. Seed Default Accounts
    for (const acc of DEFAULT_ACCOUNTS) {
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, opening_balance, current_balance, currency, description, color, icon, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [
          acc.id,
          acc.name,
          acc.type,
          acc.opening_balance,
          acc.current_balance,
          acc.currency,
          acc.description,
          acc.color,
          acc.icon,
          now,
          now,
        ]
      );
    }

    // 4. Seed Currencies
    for (const cur of DEFAULT_CURRENCY_RATES) {
      await db.runAsync(
        `INSERT INTO currency_rates (currency_code, name, symbol, rate_to_base, updated_at)
         VALUES (?, ?, ?, ?, ?);`,
        [cur.currency_code, cur.name, cur.symbol, cur.rate_to_base, now]
      );
    }

    // 5. Seed Initial Settings
    const defaultSettings: Array<[string, string]> = [
      ['language', 'bn'],
      ['base_currency', 'BDT'],
      ['theme_mode', 'system'],
      ['is_app_lock_enabled', 'false'],
      ['lock_type', 'none'],
      ['is_biometrics_enabled', 'false'],
      ['lock_timeout_minutes', '0'],
      ['hide_balances_by_default', 'false'],
      ['default_account_id', 'acc_cash_hand'],
      ['week_start_day', '6'],
      ['date_format', 'dd MMM, yyyy'],
      ['user_profile_name', 'PocketFlow User'],
      ['is_onboarding_completed', 'false'],
      ['notify_budget_alerts', 'true'],
      ['notify_bill_reminders', 'true'],
      ['notify_daily_summary', 'true'],
      ['daily_reminder_time', '21:00'],
    ];

    for (const [key, value] of defaultSettings) {
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);`,
        [key, value]
      );
    }
  });
}

/**
 * Resets the entire local database to fresh factory state.
 */
export async function resetDatabase(): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM balance_adjustments;
      DELETE FROM daily_balances;
      DELETE FROM debt_payments;
      DELETE FROM debts;
      DELETE FROM savings_contributions;
      DELETE FROM savings_goals;
      DELETE FROM planned_expenses;
      DELETE FROM expected_income;
      DELETE FROM budgets;
      DELETE FROM recurring_transactions;
      DELETE FROM subcategories;
      DELETE FROM categories;
      DELETE FROM accounts;
      DELETE FROM currency_rates;
      DELETE FROM app_settings;
    `);
  });
  await seedDefaultData(db);
}

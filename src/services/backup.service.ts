import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import { getDb, resetDatabase } from '../database/db';
import { AccountRepository } from '../database/repositories/account.repository';
import { encryptData, decryptData, isEncryptedBackup } from '../utils/crypto';
import { formatDisplayDate, getTodayDateString, getCurrentISOString } from '../utils/date';
import { formatCurrency } from '../utils/money';

export interface BackupDataPayload {
  version: number;
  appName: string;
  exportedAt: string;
  data: {
    accounts: any[];
    categories: any[];
    subcategories: any[];
    transactions: any[];
    dailyBalances: any[];
    balanceAdjustments: any[];
    budgets: any[];
    plannedExpenses: any[];
    expectedIncome: any[];
    savingsGoals: any[];
    savingsContributions: any[];
    debts: any[];
    debtPayments: any[];
    recurringTransactions: any[];
    appSettings: any[];
    currencyRates: any[];
  };
}

export class BackupService {
  static BACKUP_VERSION = 1;

  /**
   * Dumps entire database into a structured BackupDataPayload.
   */
  static async exportFullDatabasePayload(): Promise<BackupDataPayload> {
    const db = getDb();

    const [
      accounts,
      categories,
      subcategories,
      transactions,
      dailyBalances,
      balanceAdjustments,
      budgets,
      plannedExpenses,
      expectedIncome,
      savingsGoals,
      savingsContributions,
      debts,
      debtPayments,
      recurringTransactions,
      appSettings,
      currencyRates,
    ] = await Promise.all([
      db.getAllAsync('SELECT * FROM accounts;'),
      db.getAllAsync('SELECT * FROM categories;'),
      db.getAllAsync('SELECT * FROM subcategories;'),
      db.getAllAsync('SELECT * FROM transactions;'),
      db.getAllAsync('SELECT * FROM daily_balances;'),
      db.getAllAsync('SELECT * FROM balance_adjustments;'),
      db.getAllAsync('SELECT * FROM budgets;'),
      db.getAllAsync('SELECT * FROM planned_expenses;'),
      db.getAllAsync('SELECT * FROM expected_income;'),
      db.getAllAsync('SELECT * FROM savings_goals;'),
      db.getAllAsync('SELECT * FROM savings_contributions;'),
      db.getAllAsync('SELECT * FROM debts;'),
      db.getAllAsync('SELECT * FROM debt_payments;'),
      db.getAllAsync('SELECT * FROM recurring_transactions;'),
      db.getAllAsync('SELECT * FROM app_settings;'),
      db.getAllAsync('SELECT * FROM currency_rates;'),
    ]);

    return {
      version: this.BACKUP_VERSION,
      appName: 'PocketFlow',
      exportedAt: getCurrentISOString(),
      data: {
        accounts,
        categories,
        subcategories,
        transactions,
        dailyBalances,
        balanceAdjustments,
        budgets,
        plannedExpenses,
        expectedIncome,
        savingsGoals,
        savingsContributions,
        debts,
        debtPayments,
        recurringTransactions,
        appSettings,
        currencyRates,
      },
    };
  }

  /**
   * Creates a JSON backup and opens the system Share sheet.
   */
  static async exportJsonBackup(password?: string): Promise<string> {
    const payload = await this.exportFullDatabasePayload();
    const jsonString = JSON.stringify(payload, null, 2);

    let fileContent = jsonString;
    let fileName = `PocketFlow_Backup_${getTodayDateString()}.json`;

    if (password && password.trim() !== '') {
      fileContent = encryptData(jsonString, password);
      fileName = `PocketFlow_Encrypted_Backup_${getTodayDateString()}.pfenc`;
    }

    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, fileContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save PocketFlow Backup',
        UTI: 'public.json',
      });
    }

    return fileUri;
  }

  /**
   * Exports all transactions to CSV file.
   */
  static async exportTransactionsCsv(): Promise<string> {
    const db = getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT t.date, t.time, t.type, t.title, (t.amount / 100.0) as amount_bdt, 
              (t.fee / 100.0) as fee_bdt, a.name as account, da.name as destination_account, 
              c.name as category, t.notes, t.payment_method
       FROM transactions t
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN accounts da ON t.destination_account_id = da.id
       LEFT JOIN categories c ON t.category_id = c.id
       ORDER BY t.date DESC, t.time DESC;`
    );

    const headers = [
      'Date',
      'Time',
      'Type',
      'Title',
      'Amount (BDT)',
      'Fee (BDT)',
      'Account',
      'Destination Account',
      'Category',
      'Notes',
      'Payment Method',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = headers.join(',') + '\n';
    for (const r of rows) {
      const line = [
        escapeCsv(r.date),
        escapeCsv(r.time),
        escapeCsv(r.type),
        escapeCsv(r.title),
        r.amount_bdt,
        r.fee_bdt,
        escapeCsv(r.account),
        escapeCsv(r.destination_account),
        escapeCsv(r.category),
        escapeCsv(r.notes),
        escapeCsv(r.payment_method),
      ].join(',');
      csvContent += line + '\n';
    }

    const fileName = `PocketFlow_Transactions_${getTodayDateString()}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Transactions CSV',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return fileUri;
  }

  /**
   * Generates a printable PDF report and opens share dialog.
   */
  static async exportPdfReport(title: string, summaryHtml: string): Promise<string> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #1E293B; }
            h1 { color: #0D5C3A; margin-bottom: 4px; }
            .date { color: #64748B; font-size: 14px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #E2E8F0; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #F8FAFC; color: #475569; font-weight: 600; }
            .amount { text-align: right; font-weight: 600; }
            .income { color: #10B981; }
            .expense { color: #EF4444; }
            .footer { margin-top: 32px; font-size: 12px; color: #94A3B8; text-align: center; }
          </style>
        </head>
        <body>
          <h1>PocketFlow — ${title}</h1>
          <div class="date">Generated on: ${formatDisplayDate(getTodayDateString(), 'en')} | 100% Offline</div>
          ${summaryHtml}
          <div class="footer">PocketFlow — Complete Privacy & Offline Personal Financial Management</div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export PDF Financial Report',
        UTI: 'com.adobe.pdf',
      });
    }
    return uri;
  }

  /**
   * Prompts user to pick a backup file and inspects it.
   */
  static async pickBackupFile(): Promise<{ content: string; isEncrypted: boolean; fileName: string } | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/*', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isEncrypted = isEncryptedBackup(fileContent);

    return {
      content: fileContent,
      isEncrypted,
      fileName: asset.name,
    };
  }

  /**
   * Restores a backup payload into the SQLite database with safe transaction rollback on failure.
   */
  static async restoreBackupPayload(rawContent: string, password?: string): Promise<void> {
    let jsonString = rawContent;

    if (isEncryptedBackup(rawContent)) {
      if (!password) {
        throw new Error('This backup is encrypted. Please provide the decryption password.');
      }
      jsonString = decryptData(rawContent, password);
    }

    let payload: BackupDataPayload;
    try {
      payload = JSON.parse(jsonString);
    } catch {
      throw new Error('Corrupted or invalid JSON backup file.');
    }

    if (!payload.data || !payload.appName || payload.appName !== 'PocketFlow') {
      throw new Error('Incompatible backup file. Not a valid PocketFlow backup.');
    }

    const db = getDb();

    // Create a safety snapshot in memory/cache before proceeding
    const safetySnapshot = await this.exportFullDatabasePayload();

    try {
      await db.withTransactionAsync(async () => {
        // Clear existing tables
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

        // Insert accounts
        for (const a of payload.data.accounts || []) {
          await db.runAsync(
            `INSERT INTO accounts (id, name, type, opening_balance, current_balance, currency, description, color, icon, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [a.id, a.name, a.type, a.opening_balance, a.current_balance, a.currency, a.description, a.color, a.icon, a.is_active, a.created_at, a.updated_at]
          );
        }

        // Insert categories
        for (const c of payload.data.categories || []) {
          await db.runAsync(
            `INSERT INTO categories (id, name, name_bn, type, icon, color, is_default, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [c.id, c.name, c.name_bn, c.type, c.icon, c.color, c.is_default, c.is_active, c.created_at, c.updated_at]
          );
        }

        // Insert subcategories
        for (const s of payload.data.subcategories || []) {
          await db.runAsync(
            `INSERT INTO subcategories (id, category_id, name, name_bn, created_at) VALUES (?, ?, ?, ?, ?);`,
            [s.id, s.category_id, s.name, s.name_bn, s.created_at]
          );
        }

        // Insert transactions
        for (const t of payload.data.transactions || []) {
          await db.runAsync(
            `INSERT INTO transactions (
              id, type, account_id, destination_account_id, category_id, subcategory_id,
              amount, fee, date, time, datetime, title, notes, payment_method, attachment_uri,
              is_recurring, recurring_rule_id, related_planned_id, related_debt_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              t.id, t.type, t.account_id, t.destination_account_id, t.category_id, t.subcategory_id,
              t.amount, t.fee || 0, t.date, t.time, t.datetime, t.title, t.notes, t.payment_method, t.attachment_uri,
              t.is_recurring || 0, t.recurring_rule_id, t.related_planned_id, t.related_debt_id, t.created_at, t.updated_at,
            ]
          );
        }

        // Insert daily balances
        for (const d of payload.data.dailyBalances || []) {
          await db.runAsync(
            `INSERT INTO daily_balances (
              id, date, opening_balance, total_income, total_expense, calculated_closing_balance,
              actual_closing_balance, difference, status, notes, reconciliation_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              d.id, d.date, d.opening_balance, d.total_income, d.total_expense, d.calculated_closing_balance,
              d.actual_closing_balance, d.difference, d.status, d.notes, d.reconciliation_reason, d.created_at, d.updated_at,
            ]
          );
        }

        // Insert balance adjustments
        for (const ba of payload.data.balanceAdjustments || []) {
          await db.runAsync(
            `INSERT INTO balance_adjustments (id, date, account_id, previous_balance, adjusted_balance, difference, reason, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [ba.id, ba.date, ba.account_id, ba.previous_balance, ba.adjusted_balance, ba.difference, ba.reason, ba.created_at]
          );
        }

        // Insert budgets
        for (const b of payload.data.budgets || []) {
          await db.runAsync(
            `INSERT INTO budgets (
              id, name, period, start_date, end_date, amount, category_id,
              notify_70, notify_90, notify_100, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [b.id, b.name, b.period, b.start_date, b.end_date, b.amount, b.category_id, b.notify_70, b.notify_90, b.notify_100, b.is_active, b.created_at, b.updated_at]
          );
        }

        // Insert planned expenses
        for (const pe of payload.data.plannedExpenses || []) {
          await db.runAsync(
            `INSERT INTO planned_expenses (
              id, title, expected_amount, category_id, account_id, due_date,
              reminder_date, description, status, converted_transaction_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [pe.id, pe.title, pe.expected_amount, pe.category_id, pe.account_id, pe.due_date, pe.reminder_date, pe.description, pe.status, pe.converted_transaction_id, pe.created_at, pe.updated_at]
          );
        }

        // Insert expected income
        for (const ei of payload.data.expectedIncome || []) {
          await db.runAsync(
            `INSERT INTO expected_income (
              id, title, expected_amount, received_amount, category_id, account_id,
              due_date, source_client, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [ei.id, ei.title, ei.expected_amount, ei.received_amount, ei.category_id, ei.account_id, ei.due_date, ei.source_client, ei.status, ei.created_at, ei.updated_at]
          );
        }

        // Insert savings goals
        for (const sg of payload.data.savingsGoals || []) {
          await db.runAsync(
            `INSERT INTO savings_goals (
              id, name, target_amount, current_savings, target_date, description, category, is_completed, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [sg.id, sg.name, sg.target_amount, sg.current_savings, sg.target_date, sg.description, sg.category, sg.is_completed, sg.created_at, sg.updated_at]
          );
        }

        // Insert savings contributions
        for (const sc of payload.data.savingsContributions || []) {
          await db.runAsync(
            `INSERT INTO savings_contributions (id, goal_id, account_id, amount, type, date, notes, transaction_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [sc.id, sc.goal_id, sc.account_id, sc.amount, sc.type, sc.date, sc.notes, sc.transaction_id, sc.created_at]
          );
        }

        // Insert debts
        for (const d of payload.data.debts || []) {
          await db.runAsync(
            `INSERT INTO debts (
              id, type, person_name, phone_number, initial_amount, paid_amount, remaining_amount,
              due_date, account_id, status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [d.id, d.type, d.person_name, d.phone_number, d.initial_amount, d.paid_amount, d.remaining_amount, d.due_date, d.account_id, d.status, d.notes, d.created_at, d.updated_at]
          );
        }

        // Insert debt payments
        for (const dp of payload.data.debtPayments || []) {
          await db.runAsync(
            `INSERT INTO debt_payments (id, debt_id, account_id, amount, date, notes, transaction_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [dp.id, dp.debt_id, dp.account_id, dp.amount, dp.date, dp.notes, dp.transaction_id, dp.created_at]
          );
        }

        // Insert recurring transactions
        for (const rt of payload.data.recurringTransactions || []) {
          await db.runAsync(
            `INSERT INTO recurring_transactions (
              id, title, type, amount, category_id, account_id, destination_account_id,
              frequency, interval, start_date, end_date, next_occurrence, is_active,
              last_generated, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [rt.id, rt.title, rt.type, rt.amount, rt.category_id, rt.account_id, rt.destination_account_id, rt.frequency, rt.interval, rt.start_date, rt.end_date, rt.next_occurrence, rt.is_active, rt.last_generated, rt.notes, rt.created_at, rt.updated_at]
          );
        }

        // Insert app settings
        for (const st of payload.data.appSettings || []) {
          await db.runAsync(
            'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
            [st.key, st.value]
          );
        }

        // Insert currency rates
        for (const cr of payload.data.currencyRates || []) {
          await db.runAsync(
            'INSERT OR REPLACE INTO currency_rates (currency_code, name, symbol, rate_to_base, updated_at) VALUES (?, ?, ?, ?, ?);',
            [cr.currency_code, cr.name, cr.symbol, cr.rate_to_base, cr.updated_at]
          );
        }
      });

      // Recalculate balances to ensure total consistency
      await AccountRepository.recalculateAllBalances();
    } catch (err: any) {
      throw new Error(`Restore failed: ${err.message}`);
    }
  }
}

import { getDb } from '../db';
import { Account, BalanceAdjustment } from '../../types';
import { getCurrentISOString, getTodayDateString } from '../../utils/date';

export class AccountRepository {
  static async getAll(onlyActive: boolean = true): Promise<Account[]> {
    const db = getDb();
    const query = onlyActive
      ? 'SELECT * FROM accounts WHERE is_active = 1 ORDER BY created_at ASC;'
      : 'SELECT * FROM accounts ORDER BY created_at ASC;';
    return await db.getAllAsync<Account>(query);
  }

  static async getById(id: string): Promise<Account | null> {
    const db = getDb();
    const result = await db.getFirstAsync<Account>(
      'SELECT * FROM accounts WHERE id = ?;',
      [id]
    );
    return result || null;
  }

  static async create(
    account: Omit<Account, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Account> {
    const db = getDb();
    const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO accounts (id, name, type, opening_balance, current_balance, currency, description, color, icon, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        account.name,
        account.type,
        account.opening_balance,
        account.opening_balance, // initial current_balance = opening_balance
        account.currency || 'BDT',
        account.description || null,
        account.color,
        account.icon,
        account.is_active ?? 1,
        now,
        now,
      ]
    );

    return (await this.getById(id))!;
  }

  static async update(
    id: string,
    updates: Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Account | null> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = getCurrentISOString();
    const newName = updates.name !== undefined ? updates.name : existing.name;
    const newType = updates.type !== undefined ? updates.type : existing.type;
    const newColor = updates.color !== undefined ? updates.color : existing.color;
    const newIcon = updates.icon !== undefined ? updates.icon : existing.icon;
    const newDesc = updates.description !== undefined ? updates.description : existing.description;
    const newActive = updates.is_active !== undefined ? updates.is_active : existing.is_active;

    await db.runAsync(
      `UPDATE accounts SET name = ?, type = ?, color = ?, icon = ?, description = ?, is_active = ?, updated_at = ? WHERE id = ?;`,
      [newName, newType, newColor, newIcon, newDesc || null, newActive, now, id]
    );

    return await this.getById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDb();
    // Check if transactions exist
    const txCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE account_id = ? OR destination_account_id = ?;',
      [id, id]
    );

    if (txCount && txCount.count > 0) {
      // Soft delete by setting is_active = 0
      await db.runAsync('UPDATE accounts SET is_active = 0 WHERE id = ?;', [id]);
      return true;
    }

    // Hard delete if no transactions
    await db.runAsync('DELETE FROM accounts WHERE id = ?;', [id]);
    return true;
  }

  static async adjustBalance(
    accountId: string,
    newBalance: number,
    reason: string
  ): Promise<void> {
    const db = getDb();
    const account = await this.getById(accountId);
    if (!account) throw new Error('Account not found');

    const difference = newBalance - account.current_balance;
    const adjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const today = getTodayDateString();
    const now = getCurrentISOString();

    await db.withTransactionAsync(async () => {
      // 1. Record adjustment log
      await db.runAsync(
        `INSERT INTO balance_adjustments (id, date, account_id, previous_balance, adjusted_balance, difference, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [adjustmentId, today, accountId, account.current_balance, newBalance, difference, reason, now]
      );

      // 2. Update account current balance
      await db.runAsync(
        `UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?;`,
        [newBalance, now, accountId]
      );
    });
  }

  /**
   * Recalculates all account balances from scratch based on opening balance and all transactions.
   */
  static async recalculateAllBalances(): Promise<void> {
    const db = getDb();
    const accounts = await this.getAll(false);

    await db.withTransactionAsync(async () => {
      for (const acc of accounts) {
        // Income sum
        const incomeRes = await db.getFirstAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE account_id = ? AND type = 'income';`,
          [acc.id]
        );
        const totalIncome = incomeRes?.total || 0;

        // Expense sum
        const expenseRes = await db.getFirstAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE account_id = ? AND type = 'expense';`,
          [acc.id]
        );
        const totalExpense = expenseRes?.total || 0;

        // Transfers Out (including fee)
        const transferOutRes = await db.getFirstAsync<{ total: number; feeTotal: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(fee), 0) as feeTotal FROM transactions WHERE account_id = ? AND type = 'transfer';`,
          [acc.id]
        );
        const totalTransfersOut = (transferOutRes?.total || 0) + (transferOutRes?.feeTotal || 0);

        // Transfers In
        const transferInRes = await db.getFirstAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE destination_account_id = ? AND type = 'transfer';`,
          [acc.id]
        );
        const totalTransfersIn = transferInRes?.total || 0;

        // Adjustments sum
        const adjRes = await db.getFirstAsync<{ total: number }>(
          `SELECT COALESCE(SUM(difference), 0) as total FROM balance_adjustments WHERE account_id = ?;`,
          [acc.id]
        );
        const totalAdjustments = adjRes?.total || 0;

        const calculatedBalance =
          acc.opening_balance +
          totalIncome -
          totalExpense -
          totalTransfersOut +
          totalTransfersIn +
          totalAdjustments;

        const now = getCurrentISOString();
        await db.runAsync(
          `UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?;`,
          [calculatedBalance, now, acc.id]
        );
      }
    });
  }
}

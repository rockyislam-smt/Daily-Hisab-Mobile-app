import { getDb } from '../db';
import { DailyBalance, Transaction } from '../../types';
import { getCurrentISOString, getTodayDateString, formatDisplayDate } from '../../utils/date';
import { AccountRepository } from './account.repository';

export interface DailyDiaryTimelineItem {
  id: string;
  time: string;
  type: 'opening' | 'income' | 'expense' | 'transfer' | 'closing' | 'adjustment';
  title: string;
  amount: number;
  balanceAfter?: number;
  accountName?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  notes?: string;
}

export class DailyBalanceRepository {
  /**
   * Retrieves or automatically computes the daily balance record for a given date.
   */
  static async getOrCreateDailyBalance(date: string): Promise<DailyBalance> {
    const db = getDb();
    const existing = await db.getFirstAsync<DailyBalance>(
      'SELECT * FROM daily_balances WHERE date = ?;',
      [date]
    );

    // Sum income for date
    const incRes = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date = ? AND type = 'income';`,
      [date]
    );
    const todayIncome = incRes?.total || 0;

    // Sum expense for date
    const expRes = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date = ? AND type = 'expense';`,
      [date]
    );
    const todayExpense = expRes?.total || 0;

    if (existing) {
      // If day was already manually confirmed, preserve confirmed actual balance
      const calculatedClosing = existing.opening_balance + todayIncome - todayExpense;
      const difference =
        existing.actual_closing_balance !== null && existing.actual_closing_balance !== undefined
          ? existing.actual_closing_balance - calculatedClosing
          : 0;

      if (
        existing.total_income !== todayIncome ||
        existing.total_expense !== todayExpense ||
        existing.calculated_closing_balance !== calculatedClosing
      ) {
        const now = getCurrentISOString();
        await db.runAsync(
          `UPDATE daily_balances SET total_income = ?, total_expense = ?, calculated_closing_balance = ?, difference = ?, updated_at = ? WHERE date = ?;`,
          [todayIncome, todayExpense, calculatedClosing, difference, now, date]
        );
        return (await db.getFirstAsync<DailyBalance>(
          'SELECT * FROM daily_balances WHERE date = ?;',
          [date]
        ))!;
      }
      return existing;
    }

    // If no existing record, determine opening balance:
    // Look for previous recorded day's closing balance
    const prevDay = await db.getFirstAsync<DailyBalance>(
      `SELECT * FROM daily_balances WHERE date < ? ORDER BY date DESC LIMIT 1;`,
      [date]
    );

    let openingBalance = 0;
    if (prevDay) {
      // Use actual if confirmed, otherwise calculated closing
      openingBalance =
        prevDay.actual_closing_balance !== null && prevDay.actual_closing_balance !== undefined
          ? prevDay.actual_closing_balance
          : prevDay.calculated_closing_balance;
    } else {
      // Fallback: sum of all accounts opening balances
      const accounts = await AccountRepository.getAll(false);
      openingBalance = accounts.reduce((sum, acc) => sum + acc.opening_balance, 0);
    }

    const calculatedClosing = openingBalance + todayIncome - todayExpense;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO daily_balances (
        id, date, opening_balance, total_income, total_expense, calculated_closing_balance,
        actual_closing_balance, difference, status, notes, reconciliation_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 'open', NULL, NULL, ?, ?);`,
      [date, date, openingBalance, todayIncome, todayExpense, calculatedClosing, now, now]
    );

    return (await db.getFirstAsync<DailyBalance>(
      'SELECT * FROM daily_balances WHERE date = ?;',
      [date]
    ))!;
  }

  /**
   * Reconciles and confirms closing balance for the specified date.
   */
  static async confirmDailyBalance(
    date: string,
    actualClosingBalance: number,
    notes?: string,
    reconciliationReason?: string
  ): Promise<DailyBalance> {
    const db = getDb();
    const current = await this.getOrCreateDailyBalance(date);
    const difference = actualClosingBalance - current.calculated_closing_balance;
    const now = getCurrentISOString();
    const status = difference === 0 ? 'confirmed' : 'reconciled';

    await db.runAsync(
      `UPDATE daily_balances SET
        actual_closing_balance = ?,
        difference = ?,
        status = ?,
        notes = ?,
        reconciliation_reason = ?,
        updated_at = ?
       WHERE date = ?;`,
      [actualClosingBalance, difference, status, notes || null, reconciliationReason || null, now, date]
    );

    return (await db.getFirstAsync<DailyBalance>(
      'SELECT * FROM daily_balances WHERE date = ?;',
      [date]
    ))!;
  }

  /**
   * Retrieves chronological timeline of all activities for the Daily Money Diary screen.
   */
  static async getDailyTimeline(date: string): Promise<DailyDiaryTimelineItem[]> {
    const db = getDb();
    const dailyBal = await this.getOrCreateDailyBalance(date);

    const transactions = await db.getAllAsync<Transaction>(
      `SELECT t.*, 
              a.name as account_name,
              da.name as destination_account_name,
              c.name as category_name,
              c.icon as category_icon,
              c.color as category_color
       FROM transactions t
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN accounts da ON t.destination_account_id = da.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.date = ?
       ORDER BY t.time ASC, t.created_at ASC;`,
      [date]
    );

    const items: DailyDiaryTimelineItem[] = [];

    // 1. Morning Opening Balance
    items.push({
      id: `timeline_open_${date}`,
      time: '06:00:00',
      type: 'opening',
      title: 'Morning Opening Balance',
      amount: dailyBal.opening_balance,
      notes: 'Carried forward from previous day closing',
    });

    // 2. Chronological transactions
    let runningBalance = dailyBal.opening_balance;

    for (const tx of transactions) {
      if (tx.type === 'income') {
        runningBalance += tx.amount;
        items.push({
          id: tx.id,
          time: tx.time,
          type: 'income',
          title: tx.title,
          amount: tx.amount,
          balanceAfter: runningBalance,
          accountName: tx.account_name,
          categoryName: tx.category_name,
          categoryIcon: tx.category_icon,
          categoryColor: tx.category_color,
          notes: tx.notes || undefined,
        });
      } else if (tx.type === 'expense') {
        runningBalance -= tx.amount;
        items.push({
          id: tx.id,
          time: tx.time,
          type: 'expense',
          title: tx.title,
          amount: tx.amount,
          balanceAfter: runningBalance,
          accountName: tx.account_name,
          categoryName: tx.category_name,
          categoryIcon: tx.category_icon,
          categoryColor: tx.category_color,
          notes: tx.notes || undefined,
        });
      } else if (tx.type === 'transfer') {
        const fee = tx.fee || 0;
        runningBalance -= fee; // Only fee impacts overall total
        items.push({
          id: tx.id,
          time: tx.time,
          type: 'transfer',
          title: `${tx.account_name} ➔ ${tx.destination_account_name}`,
          amount: tx.amount,
          balanceAfter: runningBalance,
          accountName: tx.account_name,
          notes: fee > 0 ? `Transfer fee: ${fee / 100}` : undefined,
        });
      }
    }

    // 3. Closing reconciliation if confirmed
    if (dailyBal.actual_closing_balance !== null && dailyBal.actual_closing_balance !== undefined) {
      items.push({
        id: `timeline_close_${date}`,
        time: '23:59:59',
        type: 'closing',
        title: 'Daily Closing Reconciled',
        amount: dailyBal.actual_closing_balance,
        balanceAfter: dailyBal.actual_closing_balance,
        notes: dailyBal.notes || dailyBal.reconciliation_reason || undefined,
      });
    }

    return items;
  }
}

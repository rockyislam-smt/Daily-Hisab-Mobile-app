import { getDb } from '../db';
import { PlannedExpense, ExpectedIncome, Transaction } from '../../types';
import { getCurrentISOString, getTodayDateString, getCurrentTimeString } from '../../utils/date';
import { TransactionRepository } from './transaction.repository';

export class PlanningRepository {
  // ==================== PLANNED EXPENSES ====================

  static async getPlannedExpenses(): Promise<PlannedExpense[]> {
    const db = getDb();
    return await db.getAllAsync<PlannedExpense>(
      `SELECT p.*, c.name as category_name, a.name as account_name
       FROM planned_expenses p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN accounts a ON p.account_id = a.id
       ORDER BY p.due_date ASC;`
    );
  }

  static async createPlannedExpense(
    data: Omit<PlannedExpense, 'id' | 'created_at' | 'updated_at' | 'converted_transaction_id'>
  ): Promise<PlannedExpense> {
    const db = getDb();
    const id = `pe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO planned_expenses (
        id, title, expected_amount, category_id, account_id, due_date,
        reminder_date, description, status, converted_transaction_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
      [
        id,
        data.title,
        data.expected_amount,
        data.category_id || null,
        data.account_id || null,
        data.due_date,
        data.reminder_date || null,
        data.description || null,
        data.status || 'planned',
        now,
        now,
      ]
    );

    const result = await db.getFirstAsync<PlannedExpense>(
      'SELECT * FROM planned_expenses WHERE id = ?;',
      [id]
    );
    return result!;
  }

  /**
   * Converts a planned expense into an actual expense transaction.
   * Prevents double-counting by setting status = 'paid' and linking converted_transaction_id.
   */
  static async convertPlannedToActualExpense(
    plannedId: string,
    accountId: string,
    actualAmount?: number
  ): Promise<Transaction> {
    const db = getDb();
    const planned = await db.getFirstAsync<PlannedExpense>(
      'SELECT * FROM planned_expenses WHERE id = ?;',
      [plannedId]
    );

    if (!planned) throw new Error('Planned expense not found');
    if (planned.status === 'paid' && planned.converted_transaction_id) {
      throw new Error('This planned expense is already paid and recorded');
    }

    const amount = actualAmount ?? planned.expected_amount;
    const today = getTodayDateString();
    const time = getCurrentTimeString();
    const now = getCurrentISOString();

    let createdTx: Transaction;

    await db.withTransactionAsync(async () => {
      // 1. Create real transaction
      createdTx = await TransactionRepository.create({
        type: 'expense',
        account_id: accountId,
        category_id: planned.category_id,
        amount,
        date: today,
        time,
        title: planned.title,
        notes: planned.description ? `Planned expense: ${planned.description}` : 'Converted from planned expense',
        related_planned_id: plannedId,
      });

      // 2. Mark planned expense as paid
      await db.runAsync(
        `UPDATE planned_expenses SET status = 'paid', converted_transaction_id = ?, updated_at = ? WHERE id = ?;`,
        [createdTx.id, now, plannedId]
      );
    });

    return createdTx!;
  }

  static async deletePlannedExpense(id: string): Promise<boolean> {
    const db = getDb();
    await db.runAsync('DELETE FROM planned_expenses WHERE id = ?;', [id]);
    return true;
  }

  // ==================== EXPECTED INCOME ====================

  static async getExpectedIncomes(): Promise<ExpectedIncome[]> {
    const db = getDb();
    return await db.getAllAsync<ExpectedIncome>(
      `SELECT e.*, c.name as category_name, a.name as account_name
       FROM expected_income e
       LEFT JOIN categories c ON e.category_id = c.id
       LEFT JOIN accounts a ON e.account_id = a.id
       ORDER BY e.due_date ASC;`
    );
  }

  static async createExpectedIncome(
    data: Omit<ExpectedIncome, 'id' | 'created_at' | 'updated_at' | 'received_amount'>
  ): Promise<ExpectedIncome> {
    const db = getDb();
    const id = `ei_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO expected_income (
        id, title, expected_amount, received_amount, category_id, account_id,
        due_date, source_client, status, created_at, updated_at
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.title,
        data.expected_amount,
        data.category_id || null,
        data.account_id || null,
        data.due_date,
        data.source_client || null,
        data.status || 'expected',
        now,
        now,
      ]
    );

    const result = await db.getFirstAsync<ExpectedIncome>(
      'SELECT * FROM expected_income WHERE id = ?;',
      [id]
    );
    return result!;
  }

  /**
   * Records receipt (partial or full) of expected income into an account.
   */
  static async recordIncomeReceived(
    expectedIncomeId: string,
    accountId: string,
    amountReceived: number
  ): Promise<Transaction> {
    const db = getDb();
    const item = await db.getFirstAsync<ExpectedIncome>(
      'SELECT * FROM expected_income WHERE id = ?;',
      [expectedIncomeId]
    );

    if (!item) throw new Error('Expected income record not found');

    const today = getTodayDateString();
    const time = getCurrentTimeString();
    const now = getCurrentISOString();

    let createdTx: Transaction;

    await db.withTransactionAsync(async () => {
      // 1. Create real income transaction
      createdTx = await TransactionRepository.create({
        type: 'income',
        account_id: accountId,
        category_id: item.category_id,
        amount: amountReceived,
        date: today,
        time,
        title: item.source_client ? `${item.title} (${item.source_client})` : item.title,
        notes: `Received towards expected income ID: ${expectedIncomeId}`,
        related_planned_id: expectedIncomeId,
      });

      // 2. Update expected income
      const newReceived = item.received_amount + amountReceived;
      const newStatus = newReceived >= item.expected_amount ? 'received' : 'partially_received';

      await db.runAsync(
        `UPDATE expected_income SET received_amount = ?, status = ?, updated_at = ? WHERE id = ?;`,
        [newReceived, newStatus, now, expectedIncomeId]
      );
    });

    return createdTx!;
  }

  static async deleteExpectedIncome(id: string): Promise<boolean> {
    const db = getDb();
    await db.runAsync('DELETE FROM expected_income WHERE id = ?;', [id]);
    return true;
  }
}

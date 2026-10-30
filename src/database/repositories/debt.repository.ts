import { getDb } from '../db';
import { Debt, DebtPayment, DebtType, Transaction } from '../../types';
import { getCurrentISOString, getTodayDateString, getCurrentTimeString } from '../../utils/date';
import { TransactionRepository } from './transaction.repository';

export class DebtRepository {
  static async getAll(type?: DebtType): Promise<Debt[]> {
    const db = getDb();
    let query = `
      SELECT d.*, a.name as account_name
      FROM debts d
      LEFT JOIN accounts a ON d.account_id = a.id
    `;
    const params: any[] = [];
    if (type) {
      query += ' WHERE d.type = ?';
      params.push(type);
    }
    query += ' ORDER BY d.status ASC, d.created_at DESC;';

    return await db.getAllAsync<Debt>(query, params);
  }

  static async getById(id: string): Promise<Debt | null> {
    const db = getDb();
    const result = await db.getFirstAsync<Debt>(
      `SELECT d.*, a.name as account_name
       FROM debts d
       LEFT JOIN accounts a ON d.account_id = a.id
       WHERE d.id = ?;`,
      [id]
    );
    return result || null;
  }

  static async create(
    debt: Omit<Debt, 'id' | 'paid_amount' | 'remaining_amount' | 'created_at' | 'updated_at'>,
    reflectInWallet: boolean = false
  ): Promise<Debt> {
    const db = getDb();
    const id = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();
    const today = getTodayDateString();
    const time = getCurrentTimeString();

    await db.withTransactionAsync(async () => {
      // 1. Insert debt record
      await db.runAsync(
        `INSERT INTO debts (
          id, type, person_name, phone_number, initial_amount, paid_amount, remaining_amount,
          due_date, account_id, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          debt.type,
          debt.person_name,
          debt.phone_number || null,
          debt.initial_amount,
          debt.initial_amount, // initially remaining = initial_amount
          debt.due_date || null,
          debt.account_id || null,
          debt.status || 'active',
          debt.notes || null,
          now,
          now,
        ]
      );

      // 2. If reflectInWallet is checked and account is given:
      // If 'i_owe' (borrowed cash), incoming cash increases wallet
      // If 'they_owe_me' (lent cash), outgoing cash decreases wallet
      if (reflectInWallet && debt.account_id) {
        if (debt.type === 'i_owe') {
          await TransactionRepository.create({
            type: 'income',
            account_id: debt.account_id,
            amount: debt.initial_amount,
            date: today,
            time,
            title: `Borrowed from ${debt.person_name}`,
            notes: 'Cash received from loan/borrowing',
            related_debt_id: id,
          });
        } else {
          await TransactionRepository.create({
            type: 'expense',
            account_id: debt.account_id,
            amount: debt.initial_amount,
            date: today,
            time,
            title: `Lent to ${debt.person_name}`,
            notes: 'Cash disbursed as loan',
            related_debt_id: id,
          });
        }
      }
    });

    return (await this.getById(id))!;
  }

  /**
   * Records a partial or full payment on a debt.
   */
  static async recordPayment(
    debtId: string,
    accountId: string,
    paymentAmount: number,
    notes?: string
  ): Promise<DebtPayment> {
    const db = getDb();
    const debt = await this.getById(debtId);
    if (!debt) throw new Error('Debt record not found');

    const paymentId = `dp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const today = getTodayDateString();
    const time = getCurrentTimeString();
    const now = getCurrentISOString();

    let createdTx: Transaction | null = null;

    await db.withTransactionAsync(async () => {
      // 1. If 'i_owe' (repaying money borrowed), wallet balance decreases (expense/repayment)
      // If 'they_owe_me' (receiving debt repayment), wallet balance increases (income/recovery)
      if (debt.type === 'i_owe') {
        createdTx = await TransactionRepository.create({
          type: 'expense',
          account_id: accountId,
          amount: paymentAmount,
          date: today,
          time,
          title: `Debt repayment to ${debt.person_name}`,
          notes: notes || `Repaid loan`,
          related_debt_id: debtId,
        });
      } else {
        createdTx = await TransactionRepository.create({
          type: 'income',
          account_id: accountId,
          amount: paymentAmount,
          date: today,
          time,
          title: `Loan recovery from ${debt.person_name}`,
          notes: notes || `Received debt return`,
          related_debt_id: debtId,
        });
      }

      // 2. Insert payment record
      await db.runAsync(
        `INSERT INTO debt_payments (id, debt_id, account_id, amount, date, notes, transaction_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [paymentId, debtId, accountId, paymentAmount, today, notes || null, createdTx?.id || null, now]
      );

      // 3. Update debt remaining and status
      const newPaid = debt.paid_amount + paymentAmount;
      const newRemaining = Math.max(0, debt.initial_amount - newPaid);
      const newStatus = newRemaining === 0 ? 'settled' : 'active';

      await db.runAsync(
        `UPDATE debts SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = ? WHERE id = ?;`,
        [newPaid, newRemaining, newStatus, now, debtId]
      );
    });

    return (await db.getFirstAsync<DebtPayment>(
      'SELECT * FROM debt_payments WHERE id = ?;',
      [paymentId]
    ))!;
  }

  static async getPayments(debtId: string): Promise<DebtPayment[]> {
    const db = getDb();
    return await db.getAllAsync<DebtPayment>(
      `SELECT dp.*, a.name as account_name
       FROM debt_payments dp
       LEFT JOIN accounts a ON dp.account_id = a.id
       WHERE dp.debt_id = ?
       ORDER BY dp.date DESC, dp.created_at DESC;`,
      [debtId]
    );
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDb();
    await db.runAsync('DELETE FROM debts WHERE id = ?;', [id]);
    return true;
  }
}


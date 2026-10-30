import { getDb } from '../db';
import { Transaction, TransactionType } from '../../types';
import { getCurrentISOString, getCurrentTimeString, getTodayDateString } from '../../utils/date';

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export class TransactionRepository {
  static async getAll(filter: TransactionFilter = {}): Promise<Transaction[]> {
    const db = getDb();
    let query = `
      SELECT t.*, 
             a.name as account_name,
             da.name as destination_account_name,
             c.name as category_name,
             c.icon as category_icon,
             c.color as category_color,
             s.name as subcategory_name
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts da ON t.destination_account_id = da.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter.startDate) {
      query += ' AND t.date >= ?';
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      query += ' AND t.date <= ?';
      params.push(filter.endDate);
    }
    if (filter.type) {
      query += ' AND t.type = ?';
      params.push(filter.type);
    }
    if (filter.accountId) {
      query += ' AND (t.account_id = ? OR t.destination_account_id = ?)';
      params.push(filter.accountId, filter.accountId);
    }
    if (filter.categoryId) {
      query += ' AND t.category_id = ?';
      params.push(filter.categoryId);
    }
    if (filter.searchQuery && filter.searchQuery.trim() !== '') {
      query += ' AND (t.title LIKE ? OR t.notes LIKE ?)';
      params.push(`%${filter.searchQuery.trim()}%`, `%${filter.searchQuery.trim()}%`);
    }

    query += ' ORDER BY t.date DESC, t.time DESC, t.created_at DESC';

    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
      if (filter.offset) {
        query += ' OFFSET ?';
        params.push(filter.offset);
      }
    }

    return await db.getAllAsync<Transaction>(query, params);
  }

  static async getById(id: string): Promise<Transaction | null> {
    const db = getDb();
    const result = await db.getFirstAsync<Transaction>(
      `SELECT t.*, 
              a.name as account_name,
              da.name as destination_account_name,
              c.name as category_name,
              c.icon as category_icon,
              c.color as category_color,
              s.name as subcategory_name
       FROM transactions t
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN accounts da ON t.destination_account_id = da.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       WHERE t.id = ?;`,
      [id]
    );
    return result || null;
  }

  static async create(
    tx: Omit<Transaction, 'id' | 'datetime' | 'created_at' | 'updated_at'>
  ): Promise<Transaction> {
    const db = getDb();
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = getCurrentISOString();
    const time = tx.time || getCurrentTimeString();
    const date = tx.date || getTodayDateString();
    const datetime = `${date}T${time}`;
    const fee = tx.fee || 0;

    await db.withTransactionAsync(async () => {
      // 1. Insert transaction
      await db.runAsync(
        `INSERT INTO transactions (
          id, type, account_id, destination_account_id, category_id, subcategory_id,
          amount, fee, date, time, datetime, title, notes, payment_method, attachment_uri,
          is_recurring, recurring_rule_id, related_planned_id, related_debt_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          tx.type,
          tx.account_id,
          tx.destination_account_id || null,
          tx.category_id || null,
          tx.subcategory_id || null,
          tx.amount,
          fee,
          date,
          time,
          datetime,
          tx.title,
          tx.notes || null,
          tx.payment_method || null,
          tx.attachment_uri || null,
          tx.is_recurring ?? 0,
          tx.recurring_rule_id || null,
          tx.related_planned_id || null,
          tx.related_debt_id || null,
          now,
          now,
        ]
      );

      // 2. Update account balances according to financial calculation rules
      if (tx.type === 'income') {
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;`,
          [tx.amount, now, tx.account_id]
        );
      } else if (tx.type === 'expense') {
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;`,
          [tx.amount, now, tx.account_id]
        );
      } else if (tx.type === 'transfer') {
        if (!tx.destination_account_id) {
          throw new Error('Destination account required for transfer');
        }
        if (tx.account_id === tx.destination_account_id) {
          throw new Error('Source and destination accounts must be different');
        }
        // Deduct transfer amount and fee from source account
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;`,
          [tx.amount + fee, now, tx.account_id]
        );
        // Add transfer amount to destination account
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;`,
          [tx.amount, now, tx.destination_account_id]
        );
      }
    });

    return (await this.getById(id))!;
  }

  static async update(
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Transaction | null> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = getCurrentISOString();

    await db.withTransactionAsync(async () => {
      // 1. REVERSE existing balance impact
      if (existing.type === 'income') {
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;`,
          [existing.amount, now, existing.account_id]
        );
      } else if (existing.type === 'expense') {
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;`,
          [existing.amount, now, existing.account_id]
        );
      } else if (existing.type === 'transfer' && existing.destination_account_id) {
        const oldFee = existing.fee || 0;
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;`,
          [existing.amount + oldFee, now, existing.account_id]
        );
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;`,
          [existing.amount, now, existing.destination_account_id]
        );
      }

      // Merge fields
      const newType = updates.type ?? existing.type;
      const newAccountId = updates.account_id ?? existing.account_id;
      const newDestAccountId = updates.destination_account_id !== undefined ? updates.destination_account_id : existing.destination_account_id;
      const newCategoryId = updates.category_id !== undefined ? updates.category_id : existing.category_id;
      const newSubcategoryId = updates.subcategory_id !== undefined ? updates.subcategory_id : existing.subcategory_id;
      const newAmount = updates.amount ?? existing.amount;
      const newFee = updates.fee !== undefined ? updates.fee : (existing.fee || 0);
      const newDate = updates.date ?? existing.date;
      const newTime = updates.time ?? existing.time;
      const newDatetime = `${newDate}T${newTime}`;
      const newTitle = updates.title ?? existing.title;
      const newNotes = updates.notes !== undefined ? updates.notes : existing.notes;
      const newPaymentMethod = updates.payment_method !== undefined ? updates.payment_method : existing.payment_method;
      const newAttachment = updates.attachment_uri !== undefined ? updates.attachment_uri : existing.attachment_uri;

      // 2. Update transaction record
      await db.runAsync(
        `UPDATE transactions SET
          type = ?, account_id = ?, destination_account_id = ?, category_id = ?, subcategory_id = ?,
          amount = ?, fee = ?, date = ?, time = ?, datetime = ?, title = ?, notes = ?, payment_method = ?,
          attachment_uri = ?, updated_at = ?
         WHERE id = ?;`,
        [
          newType,
          newAccountId,
          newDestAccountId || null,
          newCategoryId || null,
          newSubcategoryId || null,
          newAmount,
          newFee,
          newDate,
          newTime,
          newDatetime,
          newTitle,
          newNotes || null,
          newPaymentMethod || null,
          newAttachment || null,
          now,
          id,
        ]
      );

      // 3. APPLY NEW balance impact
      if (newType === 'income') {
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;`,
          [newAmount, now, newAccountId]
        );
      } else if (newType === 'expense') {
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;`,
          [newAmount, now, newAccountId]
        );
      } else if (newType === 'transfer') {
        if (!newDestAccountId) {
          throw new Error('Destination account required for transfer');
        }
        if (newAccountId === newDestAccountId) {
          throw new Error('Source and destination accounts must be different');
        }
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;`,
          [newAmount + newFee, now, newAccountId]
        );
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;`,
          [newAmount, now, newDestAccountId]
        );
      }
    });

    return await this.getById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return false;

    const now = getCurrentISOString();

    await db.withTransactionAsync(async () => {
      // 1. REVERSE balance impact
      if (existing.type === 'income') {
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;`,
          [existing.amount, now, existing.account_id]
        );
      } else if (existing.type === 'expense') {
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;`,
          [existing.amount, now, existing.account_id]
        );
      } else if (existing.type === 'transfer' && existing.destination_account_id) {
        const fee = existing.fee || 0;
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?;`,
          [existing.amount + fee, now, existing.account_id]
        );
        await db.runAsync(
          `UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?;`,
          [existing.amount, now, existing.destination_account_id]
        );
      }

      // 2. Delete transaction record
      await db.runAsync('DELETE FROM transactions WHERE id = ?;', [id]);
    });

    return true;
  }

  static async getSummaryByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ income: number; expense: number; transferCount: number }> {
    const db = getDb();

    const incomeRes = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date >= ? AND date <= ? AND type = 'income';`,
      [startDate, endDate]
    );

    const expenseRes = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date >= ? AND date <= ? AND type = 'expense';`,
      [startDate, endDate]
    );

    const transferRes = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE date >= ? AND date <= ? AND type = 'transfer';`,
      [startDate, endDate]
    );

    return {
      income: incomeRes?.total || 0,
      expense: expenseRes?.total || 0,
      transferCount: transferRes?.count || 0,
    };
  }
}


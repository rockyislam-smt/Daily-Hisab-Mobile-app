import { getDb } from '../db';
import { RecurringTransaction, RecurrenceFrequency } from '../../types';
import { getCurrentISOString, getTodayDateString, getCurrentTimeString } from '../../utils/date';
import { TransactionRepository } from './transaction.repository';
import { addDays, addWeeks, addMonths, addYears, format, parseISO } from 'date-fns';

export class RecurringRepository {
  static async getAll(onlyActive: boolean = false): Promise<RecurringTransaction[]> {
    const db = getDb();
    const query = onlyActive
      ? `SELECT r.*, c.name as category_name, a.name as account_name, da.name as destination_account_name
         FROM recurring_transactions r
         LEFT JOIN categories c ON r.category_id = c.id
         LEFT JOIN accounts a ON r.account_id = a.id
         LEFT JOIN accounts da ON r.destination_account_id = da.id
         WHERE r.is_active = 1
         ORDER BY r.next_occurrence ASC;`
      : `SELECT r.*, c.name as category_name, a.name as account_name, da.name as destination_account_name
         FROM recurring_transactions r
         LEFT JOIN categories c ON r.category_id = c.id
         LEFT JOIN accounts a ON r.account_id = a.id
         LEFT JOIN accounts da ON r.destination_account_id = da.id
         ORDER BY r.next_occurrence ASC;`;

    return await db.getAllAsync<RecurringTransaction>(query);
  }

  static async getById(id: string): Promise<RecurringTransaction | null> {
    const db = getDb();
    const result = await db.getFirstAsync<RecurringTransaction>(
      `SELECT r.*, c.name as category_name, a.name as account_name, da.name as destination_account_name
       FROM recurring_transactions r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN accounts a ON r.account_id = a.id
       LEFT JOIN accounts da ON r.destination_account_id = da.id
       WHERE r.id = ?;`,
      [id]
    );
    return result || null;
  }

  static async create(
    data: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at' | 'last_generated'>
  ): Promise<RecurringTransaction> {
    const db = getDb();
    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO recurring_transactions (
        id, title, type, amount, category_id, account_id, destination_account_id,
        frequency, interval, start_date, end_date, next_occurrence, is_active,
        last_generated, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?);`,
      [
        id,
        data.title,
        data.type,
        data.amount,
        data.category_id || null,
        data.account_id,
        data.destination_account_id || null,
        data.frequency,
        data.interval || 1,
        data.start_date,
        data.end_date || null,
        data.next_occurrence || data.start_date,
        data.is_active ?? 1,
        data.notes || null,
        now,
        now,
      ]
    );

    return (await this.getById(id))!;
  }

  static async update(
    id: string,
    updates: Partial<Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<RecurringTransaction | null> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = getCurrentISOString();
    const title = updates.title ?? existing.title;
    const type = updates.type ?? existing.type;
    const amount = updates.amount ?? existing.amount;
    const category_id = updates.category_id !== undefined ? updates.category_id : existing.category_id;
    const account_id = updates.account_id ?? existing.account_id;
    const dest_id = updates.destination_account_id !== undefined ? updates.destination_account_id : existing.destination_account_id;
    const frequency = updates.frequency ?? existing.frequency;
    const interval = updates.interval ?? existing.interval;
    const start_date = updates.start_date ?? existing.start_date;
    const end_date = updates.end_date !== undefined ? updates.end_date : existing.end_date;
    const next_occurrence = updates.next_occurrence ?? existing.next_occurrence;
    const is_active = updates.is_active ?? existing.is_active;
    const notes = updates.notes !== undefined ? updates.notes : existing.notes;

    await db.runAsync(
      `UPDATE recurring_transactions SET
        title = ?, type = ?, amount = ?, category_id = ?, account_id = ?,
        destination_account_id = ?, frequency = ?, interval = ?, start_date = ?,
        end_date = ?, next_occurrence = ?, is_active = ?, notes = ?, updated_at = ?
       WHERE id = ?;`,
      [
        title,
        type,
        amount,
        category_id || null,
        account_id,
        dest_id || null,
        frequency,
        interval,
        start_date,
        end_date || null,
        next_occurrence,
        is_active,
        notes || null,
        now,
        id,
      ]
    );

    return await this.getById(id);
  }

  static calculateNextDate(currentDateStr: string, frequency: RecurrenceFrequency, interval: number = 1): string {
    const date = parseISO(currentDateStr);
    let nextDate: Date;
    switch (frequency) {
      case 'daily':
        nextDate = addDays(date, interval);
        break;
      case 'weekly':
        nextDate = addWeeks(date, interval);
        break;
      case 'monthly':
        nextDate = addMonths(date, interval);
        break;
      case 'yearly':
        nextDate = addYears(date, interval);
        break;
      default:
        nextDate = addMonths(date, interval);
    }
    return format(nextDate, 'yyyy-MM-dd');
  }

  /**
   * Processes all due recurring transactions up to today.
   * Creates real transactions and advances next_occurrence.
   * Avoids duplicate generation!
   */
  static async processDueRecurringTransactions(): Promise<number> {
    const db = getDb();
    const today = getTodayDateString();
    const time = getCurrentTimeString();
    const now = getCurrentISOString();

    const dueList = await db.getAllAsync<RecurringTransaction>(
      `SELECT * FROM recurring_transactions
       WHERE is_active = 1 AND next_occurrence <= ?
       ORDER BY next_occurrence ASC;`,
      [today]
    );

    let generatedCount = 0;

    for (const item of dueList) {
      // Guard against end_date
      if (item.end_date && item.next_occurrence > item.end_date) {
        await db.runAsync('UPDATE recurring_transactions SET is_active = 0 WHERE id = ?;', [item.id]);
        continue;
      }

      await db.withTransactionAsync(async () => {
        // 1. Generate transaction
        await TransactionRepository.create({
          type: item.type,
          account_id: item.account_id,
          destination_account_id: item.destination_account_id,
          category_id: item.category_id,
          amount: item.amount,
          date: item.next_occurrence,
          time,
          title: `${item.title} (Recurring)`,
          notes: item.notes || 'Auto-generated recurring transaction',
          is_recurring: 1,
          recurring_rule_id: item.id,
        });

        // 2. Advance next occurrence
        const nextDate = this.calculateNextDate(item.next_occurrence, item.frequency, item.interval);
        const shouldDeactivate = item.end_date && nextDate > item.end_date ? 0 : 1;

        await db.runAsync(
          `UPDATE recurring_transactions SET
            next_occurrence = ?,
            last_generated = ?,
            is_active = ?,
            updated_at = ?
           WHERE id = ?;`,
          [nextDate, item.next_occurrence, shouldDeactivate, now, item.id]
        );

        generatedCount++;
      });
    }

    return generatedCount;
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDb();
    await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?;', [id]);
    return true;
  }
}

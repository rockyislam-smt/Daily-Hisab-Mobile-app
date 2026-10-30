import { getDb } from '../db';
import { Budget } from '../../types';
import { getCurrentISOString } from '../../utils/date';

export class BudgetRepository {
  static async getAll(onlyActive: boolean = true): Promise<Budget[]> {
    const db = getDb();
    const query = onlyActive
      ? `SELECT b.*, c.name as category_name
         FROM budgets b
         LEFT JOIN categories c ON b.category_id = c.id
         WHERE b.is_active = 1
         ORDER BY b.start_date DESC;`
      : `SELECT b.*, c.name as category_name
         FROM budgets b
         LEFT JOIN categories c ON b.category_id = c.id
         ORDER BY b.start_date DESC;`;

    const budgets = await db.getAllAsync<Budget>(query);

    // Calculate actual spent amount and remaining for each budget
    const enriched: Budget[] = [];
    for (const b of budgets) {
      let spentQuery = `SELECT COALESCE(SUM(amount), 0) as spent FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?`;
      const params: any[] = [b.start_date, b.end_date];

      if (b.category_id) {
        spentQuery += ' AND category_id = ?';
        params.push(b.category_id);
      }

      const spentRes = await db.getFirstAsync<{ spent: number }>(spentQuery, params);
      const spent = spentRes?.spent || 0;
      const remaining = b.amount - spent;
      const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;

      enriched.push({
        ...b,
        spent_amount: spent,
        remaining_amount: remaining,
        percentage,
      });
    }

    return enriched;
  }

  static async getById(id: string): Promise<Budget | null> {
    const all = await this.getAll(false);
    return all.find((b) => b.id === id) || null;
  }

  static async create(
    budget: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'spent_amount' | 'remaining_amount' | 'percentage'>
  ): Promise<Budget> {
    const db = getDb();
    const id = `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO budgets (
        id, name, period, start_date, end_date, amount, category_id,
        notify_70, notify_90, notify_100, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        budget.name,
        budget.period,
        budget.start_date,
        budget.end_date,
        budget.amount,
        budget.category_id || null,
        budget.notify_70 ?? 1,
        budget.notify_90 ?? 1,
        budget.notify_100 ?? 1,
        budget.is_active ?? 1,
        now,
        now,
      ]
    );

    return (await this.getById(id))!;
  }

  static async update(
    id: string,
    updates: Partial<Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'spent_amount' | 'remaining_amount' | 'percentage'>>
  ): Promise<Budget | null> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = getCurrentISOString();
    const name = updates.name ?? existing.name;
    const period = updates.period ?? existing.period;
    const start_date = updates.start_date ?? existing.start_date;
    const end_date = updates.end_date ?? existing.end_date;
    const amount = updates.amount ?? existing.amount;
    const category_id = updates.category_id !== undefined ? updates.category_id : existing.category_id;
    const notify_70 = updates.notify_70 ?? existing.notify_70;
    const notify_90 = updates.notify_90 ?? existing.notify_90;
    const notify_100 = updates.notify_100 ?? existing.notify_100;
    const is_active = updates.is_active ?? existing.is_active;

    await db.runAsync(
      `UPDATE budgets SET
        name = ?, period = ?, start_date = ?, end_date = ?, amount = ?, category_id = ?,
        notify_70 = ?, notify_90 = ?, notify_100 = ?, is_active = ?, updated_at = ?
       WHERE id = ?;`,
      [
        name,
        period,
        start_date,
        end_date,
        amount,
        category_id || null,
        notify_70,
        notify_90,
        notify_100,
        is_active,
        now,
        id,
      ]
    );

    return await this.getById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDb();
    await db.runAsync('DELETE FROM budgets WHERE id = ?;', [id]);
    return true;
  }
}


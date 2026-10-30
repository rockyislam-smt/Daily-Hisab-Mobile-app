import { getDb } from '../db';
import { SavingsGoal, SavingsContribution } from '../../types';
import { getCurrentISOString, getTodayDateString } from '../../utils/date';

export class SavingsRepository {
  static async getGoals(): Promise<SavingsGoal[]> {
    const db = getDb();
    const goals = await db.getAllAsync<SavingsGoal>(
      'SELECT * FROM savings_goals ORDER BY target_date ASC;'
    );

    return goals.map((g) => {
      const progress = g.target_amount > 0 ? Math.round((g.current_savings / g.target_amount) * 100) : 0;
      const remaining = Math.max(0, g.target_amount - g.current_savings);
      return {
        ...g,
        progress_percentage: Math.min(100, progress),
        remaining_amount: remaining,
      };
    });
  }

  static async getGoalById(id: string): Promise<SavingsGoal | null> {
    const goals = await this.getGoals();
    return goals.find((g) => g.id === id) || null;
  }

  static async createGoal(
    data: Omit<SavingsGoal, 'id' | 'current_savings' | 'is_completed' | 'created_at' | 'updated_at' | 'progress_percentage' | 'remaining_amount'>
  ): Promise<SavingsGoal> {
    const db = getDb();
    const id = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = getCurrentISOString();

    await db.runAsync(
      `INSERT INTO savings_goals (
        id, name, target_amount, current_savings, target_date, description, category, is_completed, created_at, updated_at
      ) VALUES (?, ?, ?, 0, ?, ?, ?, 0, ?, ?);`,
      [
        id,
        data.name,
        data.target_amount,
        data.target_date,
        data.description || null,
        data.category || null,
        now,
        now,
      ]
    );

    return (await this.getGoalById(id))!;
  }

  static async addContribution(
    goalId: string,
    accountId: string,
    amount: number,
    type: 'deposit' | 'withdrawal',
    notes?: string
  ): Promise<void> {
    const db = getDb();
    const goal = await db.getFirstAsync<SavingsGoal>(
      'SELECT * FROM savings_goals WHERE id = ?;',
      [goalId]
    );
    if (!goal) throw new Error('Goal not found');

    const id = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const today = getTodayDateString();
    const now = getCurrentISOString();

    await db.withTransactionAsync(async () => {
      // 1. Record contribution
      await db.runAsync(
        `INSERT INTO savings_contributions (
          id, goal_id, account_id, amount, type, date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [id, goalId, accountId, amount, type, today, notes || null, now]
      );

      // 2. Update goal current savings
      const delta = type === 'deposit' ? amount : -amount;
      const newSavings = Math.max(0, goal.current_savings + delta);
      const isCompleted = newSavings >= goal.target_amount ? 1 : 0;

      await db.runAsync(
        `UPDATE savings_goals SET current_savings = ?, is_completed = ?, updated_at = ? WHERE id = ?;`,
        [newSavings, isCompleted, now, goalId]
      );
    });
  }

  static async getContributions(goalId: string): Promise<SavingsContribution[]> {
    const db = getDb();
    return await db.getAllAsync<SavingsContribution>(
      `SELECT sc.*, a.name as account_name
       FROM savings_contributions sc
       LEFT JOIN accounts a ON sc.account_id = a.id
       WHERE sc.goal_id = ?
       ORDER BY sc.date DESC, sc.created_at DESC;`,
      [goalId]
    );
  }

  static async deleteGoal(id: string): Promise<boolean> {
    const db = getDb();
    await db.runAsync('DELETE FROM savings_goals WHERE id = ?;', [id]);
    return true;
  }
}

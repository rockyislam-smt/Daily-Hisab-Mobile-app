import { getDb } from '../db';
import { TransactionRepository } from './transaction.repository';
import { AccountRepository } from './account.repository';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: number; // in paisa
  percentage: number;
}

export interface MonthlyTrendItem {
  monthKey: string; // e.g. "2026-10"
  label: string; // e.g. "Oct"
  income: number;
  expense: number;
  netSavings: number;
}

export interface AnalyticsSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number; // percentage
  topExpenseCategory?: CategoryBreakdownItem;
  comparisonWithLastMonth: {
    incomeDiff: number;
    expenseDiff: number;
    expensePercentageChange: number;
  };
  forecast: {
    averageDailyExpense: number;
    projectedMonthEndBalance: number;
    daysRemainingInMonth: number;
  };
}

export class AnalyticsRepository {
  static async getCategoryBreakdown(
    startDate: string,
    endDate: string,
    type: 'expense' | 'income' = 'expense'
  ): Promise<CategoryBreakdownItem[]> {
    const db = getDb();
    const query = `
      SELECT 
        COALESCE(c.id, 'other') as categoryId,
        COALESCE(c.name, 'Uncategorized') as categoryName,
        COALESCE(c.icon, 'folder-outline') as categoryIcon,
        COALESCE(c.color, '#64748B') as categoryColor,
        SUM(t.amount) as totalAmount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = ? AND t.date >= ? AND t.date <= ?
      GROUP BY categoryId
      ORDER BY totalAmount DESC;
    `;

    const rows = await db.getAllAsync<{
      categoryId: string;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      totalAmount: number;
    }>(query, [type, startDate, endDate]);

    const grandTotal = rows.reduce((sum, r) => sum + r.totalAmount, 0);

    return rows.map((r) => ({
      ...r,
      percentage: grandTotal > 0 ? Math.round((r.totalAmount / grandTotal) * 100) : 0,
    }));
  }

  static async getMonthlyTrends(monthsCount: number = 6): Promise<MonthlyTrendItem[]> {
    const db = getDb();
    const now = new Date();
    const trends: MonthlyTrendItem[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      const monthKey = format(monthDate, 'yyyy-MM');
      const label = format(monthDate, 'MMM');

      const incRes = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date <= ?;`,
        [start, end]
      );
      const expRes = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?;`,
        [start, end]
      );

      const income = incRes?.total || 0;
      const expense = expRes?.total || 0;
      const netSavings = income - expense;

      trends.push({
        monthKey,
        label,
        income,
        expense,
        netSavings,
      });
    }

    return trends;
  }

  static async getAnalyticsSummary(startDate: string, endDate: string): Promise<AnalyticsSummary> {
    const db = getDb();
    const { income, expense } = await TransactionRepository.getSummaryByDateRange(startDate, endDate);
    const netSavings = income - expense;
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

    // Top expense category
    const categoryBreakdown = await this.getCategoryBreakdown(startDate, endDate, 'expense');
    const topExpenseCategory = categoryBreakdown[0];

    // Previous month comparison
    const now = new Date();
    const prevMonthDate = subMonths(now, 1);
    const prevStart = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd');
    const prevEnd = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd');
    const prevTotals = await TransactionRepository.getSummaryByDateRange(prevStart, prevEnd);

    const expenseDiff = expense - prevTotals.expense;
    const incomeDiff = income - prevTotals.income;
    const expensePercentageChange =
      prevTotals.expense > 0 ? Math.round((expenseDiff / prevTotals.expense) * 100) : 0;

    // Forecast calculation for the current month
    const curStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const curEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    const daysInMonthTotal = differenceInDays(parseISO(curEnd), parseISO(curStart)) + 1;
    const currentDayOfMonth = now.getDate();
    const daysRemaining = Math.max(0, daysInMonthTotal - currentDayOfMonth);

    const accounts = await AccountRepository.getAll(true);
    const currentTotalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);

    const avgDailyExpense = currentDayOfMonth > 0 ? Math.round(expense / currentDayOfMonth) : 0;
    const avgDailyIncome = currentDayOfMonth > 0 ? Math.round(income / currentDayOfMonth) : 0;
    const projectedMonthEndBalance =
      currentTotalBalance + (avgDailyIncome * daysRemaining) - (avgDailyExpense * daysRemaining);

    return {
      totalIncome: income,
      totalExpense: expense,
      netSavings,
      savingsRate,
      topExpenseCategory,
      comparisonWithLastMonth: {
        incomeDiff,
        expenseDiff,
        expensePercentageChange,
      },
      forecast: {
        averageDailyExpense: avgDailyExpense,
        projectedMonthEndBalance,
        daysRemainingInMonth: daysRemaining,
      },
    };
  }
}


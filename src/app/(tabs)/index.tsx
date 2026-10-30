import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Header } from '../../components/Header';
import { BalanceCard } from '../../components/BalanceCard';
import { QuickActions } from '../../components/QuickActions';
import { TransactionCard } from '../../components/TransactionCard';
import { DateFilterTabs } from '../../components/DateFilterTabs';
import { IncomeVsExpenseBar, CategoryBreakdownChart } from '../../components/SimpleChart';
import { EmptyState } from '../../components/EmptyState';
import { AccountRepository } from '../../database/repositories/account.repository';
import { TransactionRepository } from '../../database/repositories/transaction.repository';
import { AnalyticsRepository, CategoryBreakdownItem } from '../../database/repositories/analytics.repository';
import { PlanningRepository } from '../../database/repositories/planning.repository';
import { BudgetRepository } from '../../database/repositories/budget.repository';
import { SavingsRepository } from '../../database/repositories/savings.repository';
import { Transaction, Account, DateFilterType } from '../../types';
import { getDateRange, getTodayDateString } from '../../utils/date';
import { formatCurrency } from '../../utils/money';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, refreshTrigger } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<DateFilterType>('this_month');

  // Dashboard state computed from SQLite
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [cashInHand, setCashInHand] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [mobileWallets, setMobileWallets] = useState(0);

  const [periodIncome, setPeriodIncome] = useState(0);
  const [periodExpense, setPeriodExpense] = useState(0);

  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);

  const [totalSavings, setTotalSavings] = useState(0);
  const [upcomingExpensesTotal, setUpcomingExpensesTotal] = useState(0);
  const [remainingBudgetTotal, setRemainingBudgetTotal] = useState(0);

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Load accounts balances
      const accounts = await AccountRepository.getAll(true);
      let total = 0;
      let cash = 0;
      let bank = 0;
      let wallets = 0;

      for (const acc of accounts) {
        total += acc.current_balance;
        if (acc.type === 'cash' || acc.type === 'pocket') {
          cash += acc.current_balance;
        } else if (acc.type === 'bank' || acc.type === 'savings') {
          bank += acc.current_balance;
        } else if (acc.type === 'bkash' || acc.type === 'nagad' || acc.type === 'rocket' || acc.type === 'other') {
          wallets += acc.current_balance;
        }
      }

      setTotalAvailable(total);
      setCashInHand(cash);
      setBankBalance(bank);
      setMobileWallets(wallets);

      // 2. Load today's metrics
      const todayStr = getTodayDateString();
      const todaySummary = await TransactionRepository.getSummaryByDateRange(todayStr, todayStr);
      setTodayIncome(todaySummary.income);
      setTodayExpense(todaySummary.expense);

      // 3. Load active filter period metrics
      const range = getDateRange(selectedFilter, undefined, undefined, language);
      const periodSummary = await TransactionRepository.getSummaryByDateRange(
        range.startDate,
        range.endDate
      );
      setPeriodIncome(periodSummary.income);
      setPeriodExpense(periodSummary.expense);

      // 4. Load Category Breakdown
      const breakdown = await AnalyticsRepository.getCategoryBreakdown(
        range.startDate,
        range.endDate,
        'expense'
      );
      setCategoryBreakdown(breakdown);

      // 5. Load Savings & Goals
      const goals = await SavingsRepository.getGoals();
      const savingsSum = goals.reduce((sum, g) => sum + g.current_savings, 0);
      setTotalSavings(savingsSum);

      // 6. Load Planned expenses & Budgets
      const planned = await PlanningRepository.getPlannedExpenses();
      const unpaidPlanned = planned.filter((p) => p.status === 'planned' || p.status === 'upcoming');
      const plannedSum = unpaidPlanned.reduce((sum, p) => sum + p.expected_amount, 0);
      setUpcomingExpensesTotal(plannedSum);

      const budgets = await BudgetRepository.getAll(true);
      const remainingBudget = budgets.reduce((sum, b) => sum + (b.remaining_amount || 0), 0);
      setRemainingBudgetTotal(remainingBudget);

      // 7. Recent Transactions (last 5)
      const recent = await TransactionRepository.getAll({ limit: 5 });
      setRecentTransactions(recent);
    } catch (e) {
      console.warn('Error loading dashboard:', e);
    }
  }, [selectedFilter, language]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <Header
        title={t('appName')}
        subtitle={t('tagline')}
        showEyeToggle
        rightAction={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/calendar')}
              accessibilityLabel="Financial Calendar"
            >
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Main Balance Card */}
        <BalanceCard
          totalAvailable={totalAvailable}
          cashInHand={cashInHand}
          bankBalance={bankBalance}
          mobileWallets={mobileWallets}
          onPressCashTracker={() => router.push('/daily-cash-tracker')}
        />

        {/* Quick Actions (Income, Expense, Transfer, Daily Tracker, Diary) */}
        <QuickActions
          onPressAddIncome={() => router.push({ pathname: '/(tabs)/add', params: { type: 'income' } })}
          onPressAddExpense={() => router.push({ pathname: '/(tabs)/add', params: { type: 'expense' } })}
          onPressTransfer={() => router.push({ pathname: '/(tabs)/add', params: { type: 'transfer' } })}
          onPressDailyTracker={() => router.push('/daily-cash-tracker')}
          onPressDiary={() => router.push('/money-diary')}
        />

        {/* Today's Income & Expense 2-Card Row */}
        <View style={styles.twoCardsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.incomeBg, borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <View style={styles.statIconWrap}>
              <Ionicons name="arrow-down-circle" size={18} color={colors.income} />
              <Text style={[styles.statLabel, { color: colors.income }]}>{t('todayIncome')}</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.income }]}>{renderAmount(todayIncome)}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.expenseBg, borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
            <View style={styles.statIconWrap}>
              <Ionicons name="arrow-up-circle" size={18} color={colors.expense} />
              <Text style={[styles.statLabel, { color: colors.expense }]}>{t('todayExpense')}</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.expense }]}>{renderAmount(todayExpense)}</Text>
          </View>
        </View>

        {/* Date Filter Tabs for Analytics & Charts */}
        <View style={styles.filterSection}>
          <DateFilterTabs selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />
        </View>

        {/* Income vs Expense Bar Chart */}
        <IncomeVsExpenseBar income={periodIncome} expense={periodExpense} />

        {/* Expense Category Breakdown Chart */}
        <CategoryBreakdownChart items={categoryBreakdown} title={t('expenseBreakdown')} />

        {/* Quick Financial Overview Pills (Savings, Upcoming, Remaining Budget) */}
        <View style={styles.overviewSection}>
          <TouchableOpacity
            style={[styles.pillCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
            onPress={() => router.push('/savings-manager')}
          >
            <Ionicons name="sparkles" size={16} color={colors.savings} />
            <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>{t('totalSavings')}</Text>
            <Text style={[styles.pillValue, { color: colors.savings }]}>{renderAmount(totalSavings)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
            onPress={() => router.push('/budgets-manager')}
          >
            <Ionicons name="pie-chart" size={16} color={colors.planning} />
            <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>{t('remainingBudget')}</Text>
            <Text style={[styles.pillValue, { color: colors.planning }]}>{renderAmount(remainingBudgetTotal)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
            onPress={() => router.push('/(tabs)/planning')}
          >
            <Ionicons name="calendar-number" size={16} color={colors.warning} />
            <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>{t('upcomingExpenses')}</Text>
            <Text style={[styles.pillValue, { color: colors.warning }]}>{renderAmount(upcomingExpensesTotal)}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>{t('recentTransactions')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={t('noTransactions')}
            description={t('createFirstTransaction')}
            actionLabel={t('tabAdd')}
            onPressAction={() => router.push('/(tabs)/add')}
          />
        ) : (
          recentTransactions.map((tx) => (
            <TransactionCard
              key={tx.id}
              transaction={tx}
              onPress={() => router.push({ pathname: '/(tabs)/add', params: { editId: tx.id } })}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginVertical: 4,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  filterSection: {
    marginTop: 8,
  },
  overviewSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 8,
  },
  pillCard: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  pillValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

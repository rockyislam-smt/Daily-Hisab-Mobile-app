import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { BudgetRepository } from '../../database/repositories/budget.repository';
import { PlanningRepository } from '../../database/repositories/planning.repository';
import { SavingsRepository } from '../../database/repositories/savings.repository';
import { DebtRepository } from '../../database/repositories/debt.repository';
import { RecurringRepository } from '../../database/repositories/recurring.repository';
import { Budget, PlannedExpense, ExpectedIncome, SavingsGoal, Debt, RecurringTransaction } from '../../types';
import { formatCurrency } from '../../utils/money';
import { formatDisplayDate } from '../../utils/date';

export default function PlanningScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, refreshTrigger } = useAppStore();

  const [activeTab, setActiveTab] = useState<'budgets' | 'planned' | 'savings' | 'debts' | 'recurring'>('budgets');
  const [refreshing, setRefreshing] = useState(false);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([]);

  const loadPlanningData = useCallback(async () => {
    try {
      const [bList, peList, eiList, sgList, dList, rList] = await Promise.all([
        BudgetRepository.getAll(true),
        PlanningRepository.getPlannedExpenses(),
        PlanningRepository.getExpectedIncomes(),
        SavingsRepository.getGoals(),
        DebtRepository.getAll(),
        RecurringRepository.getAll(),
      ]);

      setBudgets(bList);
      setPlannedExpenses(peList);
      setExpectedIncomes(eiList);
      setSavingsGoals(sgList);
      setDebts(dList);
      setRecurringList(rList);
    } catch (e) {
      console.warn('Error loading planning:', e);
    }
  }, []);

  useEffect(() => {
    loadPlanningData();
  }, [loadPlanningData, refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlanningData();
    setRefreshing(false);
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('tabPlanning')}
        subtitle="Budgets, Goals & Debt Management"
        showEyeToggle
      />

      {/* Planning Navigation Segment Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabNavContainer}
      >
        {[
          { key: 'budgets', label: t('budgets'), icon: 'pie-chart-outline' },
          { key: 'planned', label: t('plannedExpenses'), icon: 'calendar-number-outline' },
          { key: 'savings', label: t('savingsGoals'), icon: 'sparkles-outline' },
          { key: 'debts', label: t('debtAndLending'), icon: 'people-outline' },
          { key: 'recurring', label: t('recurringTransactions'), icon: 'repeat-outline' },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.navPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={isSelected ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navPillText,
                  { color: isSelected ? '#FFFFFF' : colors.text },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ==================== 1. BUDGETS TAB ==================== */}
        {activeTab === 'budgets' && (
          <View>
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, { color: colors.text }]}>{t('budgets')}</Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/budgets-manager')}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>{t('addBudget')}</Text>
              </TouchableOpacity>
            </View>

            {budgets.length === 0 ? (
              <EmptyState
                icon="pie-chart-outline"
                title="No Budgets Created"
                description="Set monthly spending limits for categories to stay in control."
                actionLabel={t('addBudget')}
                onPressAction={() => router.push('/budgets-manager')}
              />
            ) : (
              budgets.map((b) => {
                const isExceeded = (b.percentage || 0) > 100;
                return (
                  <View
                    key={b.id}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                  >
                    <View style={styles.cardTopRow}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{b.name}</Text>
                      <Text
                        style={[
                          styles.cardPercentage,
                          { color: isExceeded ? colors.danger : colors.primary },
                        ]}
                      >
                        {b.percentage}%
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={[styles.progressBarTrack, { backgroundColor: colors.cardSecondary }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(100, b.percentage || 0)}%`,
                            backgroundColor: isExceeded ? colors.danger : colors.primary,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.cardBottomRow}>
                      <Text style={[styles.subText, { color: colors.textSecondary }]}>
                        {t('spent')}: {renderAmount(b.spent_amount || 0)}
                      </Text>
                      <Text
                        style={[
                          styles.subText,
                          {
                            color: isExceeded ? colors.danger : colors.textSecondary,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {t('remaining')}: {renderAmount(b.remaining_amount || 0)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ==================== 2. PLANNED & EXPECTED TAB ==================== */}
        {activeTab === 'planned' && (
          <View>
            {/* Planned Expenses Section */}
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, { color: colors.text }]}>{t('plannedExpenses')}</Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/add')}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>{t('add')}</Text>
              </TouchableOpacity>
            </View>

            {plannedExpenses.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No Planned Expenses"
                description="Schedule future bills like rent, tuition, or hosting to track commitments."
              />
            ) : (
              plannedExpenses.map((pe) => (
                <View
                  key={pe.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{pe.title}</Text>
                    <Text style={[styles.cardAmount, { color: colors.expense }]}>
                      {renderAmount(pe.expected_amount)}
                    </Text>
                  </View>
                  <View style={styles.cardBottomRow}>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>
                      Due: {formatDisplayDate(pe.due_date, language)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            pe.status === 'paid' ? colors.incomeBg : colors.warningBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              pe.status === 'paid' ? colors.income : colors.warning,
                          },
                        ]}
                      >
                        {pe.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Expected Income Section */}
            <View style={[styles.tabHeader, { marginTop: 24 }]}>
              <Text style={[styles.tabTitle, { color: colors.text }]}>{t('expectedIncomeTitle')}</Text>
            </View>

            {expectedIncomes.length === 0 ? (
              <EmptyState
                icon="cash-outline"
                title="No Expected Income"
                description="Anticipate incoming payments, freelance invoices, or pending salaries."
              />
            ) : (
              expectedIncomes.map((ei) => (
                <View
                  key={ei.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{ei.title}</Text>
                    <Text style={[styles.cardAmount, { color: colors.income }]}>
                      {renderAmount(ei.expected_amount)}
                    </Text>
                  </View>
                  <View style={styles.cardBottomRow}>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>
                      {ei.source_client ? `From: ${ei.source_client}` : `Due: ${formatDisplayDate(ei.due_date, language)}`}
                    </Text>
                    <Text style={[styles.subText, { color: colors.primary, fontWeight: '700' }]}>
                      Recv: {renderAmount(ei.received_amount)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ==================== 3. SAVINGS GOALS TAB ==================== */}
        {activeTab === 'savings' && (
          <View>
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, { color: colors.text }]}>{t('savingsGoals')}</Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.savings }]}
                onPress={() => router.push('/savings-manager')}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>{t('addSavingsGoal')}</Text>
              </TouchableOpacity>
            </View>

            {savingsGoals.length === 0 ? (
              <EmptyState
                icon="sparkles-outline"
                title="No Savings Goals Yet"
                description="Create goals like Emergency Fund, Laptop, or Travel to start accumulating."
                actionLabel={t('addSavingsGoal')}
                onPressAction={() => router.push('/savings-manager')}
              />
            ) : (
              savingsGoals.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                  onPress={() => router.push('/savings-manager')}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{g.name}</Text>
                    <Text style={[styles.cardPercentage, { color: colors.savings }]}>
                      {g.progress_percentage}%
                    </Text>
                  </View>

                  <View style={[styles.progressBarTrack, { backgroundColor: colors.cardSecondary }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${g.progress_percentage || 0}%`,
                          backgroundColor: colors.savings,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.cardBottomRow}>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>
                      Saved: {renderAmount(g.current_savings)}
                    </Text>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>
                      Target: {renderAmount(g.target_amount)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ==================== 4. DEBT & LENDING TAB ==================== */}
        {activeTab === 'debts' && (
          <View>
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, { color: colors.text }]}>{t('debtAndLending')}</Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/debts-manager')}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>{t('addDebt')}</Text>
              </TouchableOpacity>
            </View>

            {debts.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No Debt or Lending Records"
                description="Keep clear records of money borrowed from others and money lent to friends."
                actionLabel={t('addDebt')}
                onPressAction={() => router.push('/debts-manager')}
              />
            ) : (
              debts.map((d) => {
                const isIOwe = d.type === 'i_owe';
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                    onPress={() => router.push('/debts-manager')}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={isIOwe ? 'arrow-back-circle' : 'arrow-forward-circle'}
                          size={18}
                          color={isIOwe ? colors.expense : colors.income}
                        />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{d.person_name}</Text>
                      </View>
                      <Text
                        style={[
                          styles.cardAmount,
                          { color: isIOwe ? colors.expense : colors.income },
                        ]}
                      >
                        {renderAmount(d.remaining_amount)}
                      </Text>
                    </View>

                    <View style={styles.cardBottomRow}>
                      <Text style={[styles.subText, { color: colors.textSecondary }]}>
                        {isIOwe ? t('borrowed') : t('lent')} (Total: {renderAmount(d.initial_amount)})
                      </Text>
                      <Text style={[styles.subText, { color: colors.primary, fontWeight: '600' }]}>
                        Paid: {renderAmount(d.paid_amount)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ==================== 5. RECURRING TAB ==================== */}
        {activeTab === 'recurring' && (
          <View>
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, { color: colors.text }]}>
                {t('recurringTransactions')}
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/recurring-manager')}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>{t('addRecurring')}</Text>
              </TouchableOpacity>
            </View>

            {recurringList.length === 0 ? (
              <EmptyState
                icon="repeat-outline"
                title="No Recurring Rules"
                description="Set up automatic rules for monthly rent, internet bills, or subscriptions."
                actionLabel={t('addRecurring')}
                onPressAction={() => router.push('/recurring-manager')}
              />
            ) : (
              recurringList.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                  onPress={() => router.push('/recurring-manager')}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{r.title}</Text>
                    <Text
                      style={[
                        styles.cardAmount,
                        { color: r.type === 'income' ? colors.income : colors.expense },
                      ]}
                    >
                      {renderAmount(r.amount)}
                    </Text>
                  </View>
                  <View style={styles.cardBottomRow}>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>
                      Frequency: {r.frequency}
                    </Text>
                    <Text style={[styles.subText, { color: colors.primary, fontWeight: '600' }]}>
                      Next: {formatDisplayDate(r.next_occurrence, language)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
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
  tabNavContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  navPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginVertical: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  subText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});


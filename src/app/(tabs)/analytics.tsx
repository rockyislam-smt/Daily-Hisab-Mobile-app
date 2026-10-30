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
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Header } from '../../components/Header';
import { DateFilterTabs } from '../../components/DateFilterTabs';
import { IncomeVsExpenseBar, CategoryBreakdownChart } from '../../components/SimpleChart';
import { AnalyticsRepository, AnalyticsSummary, CategoryBreakdownItem, MonthlyTrendItem } from '../../database/repositories/analytics.repository';
import { BackupService } from '../../services/backup.service';
import { DateFilterType } from '../../types';
import { getDateRange } from '../../utils/date';
import { formatCurrency } from '../../utils/money';

export default function AnalyticsScreen() {
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, refreshTrigger } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<DateFilterType>('this_month');

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendItem[]>([]);

  const loadAnalytics = useCallback(async () => {
    try {
      const range = getDateRange(selectedFilter, undefined, undefined, language);
      const [sumData, catData, trendData] = await Promise.all([
        AnalyticsRepository.getAnalyticsSummary(range.startDate, range.endDate),
        AnalyticsRepository.getCategoryBreakdown(range.startDate, range.endDate, 'expense'),
        AnalyticsRepository.getMonthlyTrends(6),
      ]);

      setSummary(sumData);
      setCategoryBreakdown(catData);
      setMonthlyTrends(trendData);
    } catch (e) {
      console.warn('Error loading analytics:', e);
    }
  }, [selectedFilter, language]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExportPdf = async () => {
    if (!summary) return;
    try {
      const rowsHtml = categoryBreakdown
        .map(
          (c) => `
          <tr>
            <td>${c.categoryName}</td>
            <td class="amount">${formatCurrency(c.totalAmount, baseCurrency, 'en')}</td>
            <td>${c.percentage}%</td>
          </tr>
        `
        )
        .join('');

      const html = `
        <div style="margin-bottom: 20px;">
          <h3>Financial Performance Summary</h3>
          <p><strong>Total Income:</strong> ${formatCurrency(summary.totalIncome, baseCurrency, 'en')}</p>
          <p><strong>Total Expense:</strong> ${formatCurrency(summary.totalExpense, baseCurrency, 'en')}</p>
          <p><strong>Net Savings:</strong> ${formatCurrency(summary.netSavings, baseCurrency, 'en')} (${summary.savingsRate}%)</p>
        </div>
        <h3>Expense Breakdown by Category</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: right;">Amount</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      await BackupService.exportPdfReport('Analytics & Expense Report', html);
    } catch (err: any) {
      Alert.alert('PDF Export Error', err.message || 'Could not export PDF');
    }
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('financialReports')}
        subtitle="Insights & Local Intelligence"
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.pdfBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleExportPdf}
            accessibilityLabel="Export PDF"
          >
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={[styles.pdfText, { color: colors.primary }]}>PDF</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Date Filter Tabs */}
        <DateFilterTabs selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />

        {/* Top 3 Metric Cards */}
        {summary && (
          <View style={styles.topCardsRow}>
            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t('monthlyIncome')}</Text>
              <Text style={[styles.metricVal, { color: colors.income }]}>{renderAmount(summary.totalIncome)}</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t('monthlyExpense')}</Text>
              <Text style={[styles.metricVal, { color: colors.expense }]}>{renderAmount(summary.totalExpense)}</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t('savingsRate')}</Text>
              <Text style={[styles.metricVal, { color: colors.savings }]}>{summary.savingsRate}%</Text>
            </View>
          </View>
        )}

        {/* Income vs Expense Comparison Chart */}
        {summary && <IncomeVsExpenseBar income={summary.totalIncome} expense={summary.totalExpense} />}

        {/* Category Breakdown Multi-bar & List */}
        <CategoryBreakdownChart items={categoryBreakdown} title={t('expenseBreakdown')} />

        {/* Financial Forecasting Card */}
        {summary && (
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up" size={20} color={colors.planning} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('cashFlowForecast')}</Text>
            </View>

            <Text style={[styles.forecastDesc, { color: colors.textSecondary }]}>
              Based on your daily average spending of {renderAmount(summary.forecast.averageDailyExpense)} with {summary.forecast.daysRemainingInMonth} days left in the month:
            </Text>

            <View style={[styles.forecastResultBox, { backgroundColor: colors.planningBg }]}>
              <Text style={[styles.forecastResultLabel, { color: colors.planning }]}>
                {t('projectedBalance')}
              </Text>
              <Text style={[styles.forecastResultVal, { color: colors.planning }]}>
                {renderAmount(summary.forecast.projectedMonthEndBalance)}
              </Text>
            </View>
          </View>
        )}

        {/* Genuine Data-Driven Financial Insights */}
        {summary && (
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="bulb-outline" size={20} color={colors.warning} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('insights')}</Text>
            </View>

            {/* Insight 1: Top Category */}
            {summary.topExpenseCategory ? (
              <View style={styles.insightItem}>
                <Ionicons name="pie-chart-outline" size={16} color={colors.primary} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  {t('highestExpenseCategory')}:{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {summary.topExpenseCategory.categoryName} ({summary.topExpenseCategory.percentage}%)
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Insight 2: Comparison with last month */}
            <View style={styles.insightItem}>
              <Ionicons name="stats-chart-outline" size={16} color={colors.savings} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                {t('spendingComparison')}:{' '}
                <Text
                  style={{
                    fontWeight: '700',
                    color:
                      summary.comparisonWithLastMonth.expenseDiff > 0
                        ? colors.expense
                        : colors.income,
                  }}
                >
                  {summary.comparisonWithLastMonth.expenseDiff > 0 ? '+' : ''}
                  {renderAmount(summary.comparisonWithLastMonth.expenseDiff)} (
                  {summary.comparisonWithLastMonth.expensePercentageChange}%)
                </Text>
              </Text>
            </View>
          </View>
        )}

        {/* 6 Months Spending Trends Table */}
        {monthlyTrends.length > 0 && (
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('monthlyTrend')}</Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.th, { color: colors.textSecondary }]}>Month</Text>
              <Text style={[styles.th, { color: colors.income, textAlign: 'right' }]}>Income</Text>
              <Text style={[styles.th, { color: colors.expense, textAlign: 'right' }]}>Expense</Text>
              <Text style={[styles.th, { color: colors.savings, textAlign: 'right' }]}>Net</Text>
            </View>

            {monthlyTrends.map((m) => (
              <View key={m.monthKey} style={[styles.tableRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.td, { color: colors.text, fontWeight: '600' }]}>{m.label}</Text>
                <Text style={[styles.td, { color: colors.income, textAlign: 'right' }]}>
                  {renderAmount(m.income)}
                </Text>
                <Text style={[styles.td, { color: colors.expense, textAlign: 'right' }]}>
                  {renderAmount(m.expense)}
                </Text>
                <Text style={[styles.td, { color: colors.savings, textAlign: 'right', fontWeight: '700' }]}>
                  {renderAmount(m.netSavings)}
                </Text>
              </View>
            ))}
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
  scrollContent: {
    paddingBottom: 24,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  pdfText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 8,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  forecastDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  forecastResultBox: {
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  forecastResultLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  forecastResultVal: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 6,
  },
  insightText: {
    fontSize: 13,
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginTop: 8,
  },
  th: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  td: {
    flex: 1,
    fontSize: 12,
  },
});

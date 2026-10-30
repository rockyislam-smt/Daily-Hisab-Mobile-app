import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { Header } from '../components/Header';
import { AmountInput } from '../components/AmountInput';
import { DailyBalanceRepository } from '../database/repositories/daily-balance.repository';
import { DailyBalance } from '../types';
import { getTodayDateString, formatDisplayDate } from '../utils/date';
import { formatCurrency, toPaisa, fromPaisa } from '../utils/money';
import { subDays, addDays, parseISO, format } from 'date-fns';

export default function DailyCashTrackerScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, triggerRefresh } = useAppStore();

  const [currentDate, setCurrentDate] = useState(getTodayDateString());
  const [dailyData, setDailyData] = useState<DailyBalance | null>(null);
  const [actualBalanceStr, setActualBalanceStr] = useState('');
  const [reconciliationReason, setReconciliationReason] = useState('');
  const [dailyNotes, setDailyNotes] = useState('');

  const loadDayBalance = useCallback(async (date: string) => {
    try {
      const data = await DailyBalanceRepository.getOrCreateDailyBalance(date);
      setDailyData(data);
      if (data.actual_closing_balance !== null && data.actual_closing_balance !== undefined) {
        setActualBalanceStr(String(fromPaisa(data.actual_closing_balance)));
      } else {
        setActualBalanceStr(String(fromPaisa(data.calculated_closing_balance)));
      }
      setReconciliationReason(data.reconciliation_reason || '');
      setDailyNotes(data.notes || '');
    } catch (e) {
      console.warn('Error loading daily balance:', e);
    }
  }, []);

  useEffect(() => {
    loadDayBalance(currentDate);
  }, [currentDate, loadDayBalance]);

  const handlePreviousDay = () => {
    const d = parseISO(currentDate);
    const prev = format(subDays(d, 1), 'yyyy-MM-dd');
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const d = parseISO(currentDate);
    const next = format(addDays(d, 1), 'yyyy-MM-dd');
    setCurrentDate(next);
  };

  const handleConfirmAndCloseDay = async () => {
    if (!dailyData) return;
    const actualPaisa = toPaisa(actualBalanceStr);

    try {
      await DailyBalanceRepository.confirmDailyBalance(
        currentDate,
        actualPaisa,
        dailyNotes.trim() || undefined,
        reconciliationReason.trim() || undefined
      );

      triggerRefresh();
      await loadDayBalance(currentDate);
      Alert.alert(
        'Success',
        'Today’s daily balance has been confirmed and safely recorded in your local money diary!'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not reconcile day');
    }
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  const calculatedDifference = dailyData
    ? toPaisa(actualBalanceStr) - dailyData.calculated_closing_balance
    : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('dailyCashTracker')}
        subtitle={formatDisplayDate(currentDate, language)}
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.diaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/money-diary', params: { date: currentDate } })}
            accessibilityLabel="View Diary"
          >
            <Ionicons name="book-outline" size={18} color={colors.primary} />
            <Text style={[styles.diaryBtnText, { color: colors.primary }]}>{t('moneyDiary')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Date Navigation Bar (< Date >) */}
      <View style={[styles.dateNavBar, { backgroundColor: colors.cardSecondary }]}>
        <TouchableOpacity style={styles.navArrow} onPress={handlePreviousDay}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDisplayDate(currentDate, language)}
          </Text>
        </View>

        <TouchableOpacity style={styles.navArrow} onPress={handleNextDay}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {dailyData && (
          <>
            {/* Morning Opening Balance Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="sunny-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                    {t('morningBalance')}
                  </Text>
                  <Text style={[styles.cardAmount, { color: colors.text }]}>
                    {renderAmount(dailyData.opening_balance)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.footnote, { color: colors.textMuted }]}>
                {t('previousDayCarried')}
              </Text>
            </View>

            {/* Daytime Cash Flow (Income vs Expenses) */}
            <View style={styles.twoCardsRow}>
              {/* Money Received */}
              <View style={[styles.flowCard, { backgroundColor: colors.incomeBg, borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Ionicons name="arrow-down-circle" size={20} color={colors.income} />
                <Text style={[styles.flowLabel, { color: colors.income }]}>{t('moneyReceived')}</Text>
                <Text style={[styles.flowAmount, { color: colors.income }]}>
                  {renderAmount(dailyData.total_income)}
                </Text>
              </View>

              {/* Money Spent */}
              <View style={[styles.flowCard, { backgroundColor: colors.expenseBg, borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Ionicons name="arrow-up-circle" size={20} color={colors.expense} />
                <Text style={[styles.flowLabel, { color: colors.expense }]}>{t('moneySpent')}</Text>
                <Text style={[styles.flowAmount, { color: colors.expense }]}>
                  {renderAmount(dailyData.total_expense)}
                </Text>
              </View>
            </View>

            {/* Calculated Closing Balance Formula Card */}
            <View style={[styles.formulaCard, { backgroundColor: colors.cardSecondary }]}>
              <Text style={[styles.formulaTitle, { color: colors.textSecondary }]}>
                {t('calculatedClosing')}
              </Text>
              <Text style={[styles.formulaAmount, { color: colors.text }]}>
                {renderAmount(dailyData.calculated_closing_balance)}
              </Text>
              <Text style={[styles.formulaEquation, { color: colors.textMuted }]}>
                Opening ({renderAmount(dailyData.opening_balance)}) + Income ({renderAmount(dailyData.total_income)}) - Expense ({renderAmount(dailyData.total_expense)})
              </Text>
            </View>

            {/* Actual Closing Balance Input & Reconciliation Section */}
            <View style={[styles.reconcileCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.reconcileTitle, { color: colors.text }]}>
                {t('confirmClosingTitle')}
              </Text>
              <Text style={[styles.reconcileDesc, { color: colors.textSecondary }]}>
                {t('confirmClosingDesc')}
              </Text>

              {/* Amount Input for Actual Hand Cash */}
              <View style={{ marginVertical: 10 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t('actualClosing')}
                </Text>
                <AmountInput
                  value={actualBalanceStr}
                  onChangeText={setActualBalanceStr}
                  currency={baseCurrency}
                />
              </View>

              {/* Difference Banner */}
              <View
                style={[
                  styles.diffBanner,
                  {
                    backgroundColor:
                      calculatedDifference === 0
                        ? colors.incomeBg
                        : calculatedDifference < 0
                        ? colors.expenseBg
                        : colors.warningBg,
                  },
                ]}
              >
                <Ionicons
                  name={
                    calculatedDifference === 0
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={20}
                  color={
                    calculatedDifference === 0
                      ? colors.income
                      : calculatedDifference < 0
                      ? colors.expense
                      : colors.warning
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.diffTitle,
                      {
                        color:
                          calculatedDifference === 0
                            ? colors.income
                            : calculatedDifference < 0
                            ? colors.expense
                            : colors.warning,
                      },
                    ]}
                  >
                    {calculatedDifference === 0
                      ? t('balanced')
                      : calculatedDifference < 0
                      ? `${t('shortage')}: ${renderAmount(calculatedDifference)}`
                      : `${t('surplus')}: +${renderAmount(calculatedDifference)}`}
                  </Text>
                </View>
              </View>

              {/* Adjustment Reason if not balanced */}
              {calculatedDifference !== 0 && (
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {t('adjustmentReason')}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text },
                    ]}
                    value={reconciliationReason}
                    onChangeText={setReconciliationReason}
                    placeholder="e.g. Unrecorded rickshaw fare, cash drawer difference"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              {/* Daily Notes */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t('dailyNotes')}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text },
                  ]}
                  value={dailyNotes}
                  onChangeText={setDailyNotes}
                  placeholder="Notes about today’s cash events..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Confirm & Close Button */}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmAndCloseDay}
                activeOpacity={0.8}
              >
                <Ionicons name="checkbox-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.confirmBtnText}>{t('confirmAndCloseDay')}</Text>
              </TouchableOpacity>
            </View>
          </>
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
  diaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  diaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  navArrow: {
    padding: 6,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  footnote: {
    fontSize: 11,
    marginTop: 8,
  },
  twoCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 6,
  },
  flowCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  flowLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  flowAmount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  formulaCard: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    alignItems: 'center',
  },
  formulaTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  formulaAmount: {
    fontSize: 24,
    fontWeight: '800',
    marginVertical: 4,
  },
  formulaEquation: {
    fontSize: 11,
    textAlign: 'center',
  },
  reconcileCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginVertical: 8,
  },
  reconcileTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  reconcileDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 64,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  formGroup: {
    marginTop: 12,
  },
  diffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  diffTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    elevation: 2,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});


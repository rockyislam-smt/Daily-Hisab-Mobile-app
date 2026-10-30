import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { Header } from '../components/Header';
import { DailyBalanceRepository, DailyDiaryTimelineItem } from '../database/repositories/daily-balance.repository';
import { getTodayDateString, formatDisplayDate, formatDisplayTime } from '../utils/date';
import { formatCurrency } from '../utils/money';
import { subDays, addDays, parseISO, format } from 'date-fns';

export default function MoneyDiaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, refreshTrigger } = useAppStore();

  const [currentDate, setCurrentDate] = useState(params.date || getTodayDateString());
  const [timelineItems, setTimelineItems] = useState<DailyDiaryTimelineItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTimeline = useCallback(async (date: string) => {
    try {
      const items = await DailyBalanceRepository.getDailyTimeline(date);
      setTimelineItems(items);
    } catch (e) {
      console.warn('Error loading daily timeline:', e);
    }
  }, []);

  useEffect(() => {
    loadTimeline(currentDate);
  }, [currentDate, loadTimeline, refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTimeline(currentDate);
    setRefreshing(false);
  };

  const handlePreviousDay = () => {
    const d = parseISO(currentDate);
    setCurrentDate(format(subDays(d, 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const d = parseISO(currentDate);
    setCurrentDate(format(addDays(d, 1), 'yyyy-MM-dd'));
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('moneyDiary')}
        subtitle={formatDisplayDate(currentDate, language)}
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/(tabs)/add', params: { date: currentDate } })}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('add')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Date Navigator */}
      <View style={[styles.dateNavBar, { backgroundColor: colors.cardSecondary }]}>
        <TouchableOpacity style={styles.navArrow} onPress={handlePreviousDay}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Ionicons name="book-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDisplayDate(currentDate, language)}
          </Text>
        </View>

        <TouchableOpacity style={styles.navArrow} onPress={handleNextDay}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[styles.timelineTitle, { color: colors.textSecondary }]}>
          {t('diaryTimeline')}
        </Text>

        {timelineItems.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('noDiaryItems')}
          </Text>
        ) : (
          timelineItems.map((item, idx) => {
            const isOpening = item.type === 'opening';
            const isClosing = item.type === 'closing';
            const isIncome = item.type === 'income';
            const isExpense = item.type === 'expense';
            const isTransfer = item.type === 'transfer';

            const dotColor = isOpening
              ? colors.primary
              : isClosing
              ? colors.planning
              : isIncome
              ? colors.income
              : isExpense
              ? colors.expense
              : colors.savings;

            const iconName = isOpening
              ? 'sunny'
              : isClosing
              ? 'moon'
              : isIncome
              ? 'arrow-down'
              : isExpense
              ? 'arrow-up'
              : 'swap-horizontal';

            return (
              <View key={item.id} style={styles.timelineRow}>
                {/* Vertical Line & Dot */}
                <View style={styles.lineCol}>
                  <View style={[styles.dotCircle, { backgroundColor: dotColor }]}>
                    <Ionicons name={iconName} size={12} color="#FFFFFF" />
                  </View>
                  {idx < timelineItems.length - 1 && (
                    <View style={[styles.vLine, { backgroundColor: colors.border }]} />
                  )}
                </View>

                {/* Content Box */}
                <View
                  style={[
                    styles.contentCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.itemAmount,
                        {
                          color: isIncome
                            ? colors.income
                            : isExpense
                            ? colors.expense
                            : colors.text,
                        },
                      ]}
                    >
                      {isIncome ? '+' : isExpense ? '-' : ''}
                      {renderAmount(item.amount)}
                    </Text>
                  </View>

                  <View style={styles.itemMetaRow}>
                    <Text style={[styles.itemTime, { color: colors.textMuted }]}>
                      {formatDisplayTime(item.time, language)}
                    </Text>
                    {item.accountName ? (
                      <>
                        <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {item.accountName}
                        </Text>
                      </>
                    ) : null}
                    {item.balanceAfter !== undefined ? (
                      <>
                        <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
                        <Text style={[styles.runningBal, { color: colors.textSecondary }]}>
                          Bal: {renderAmount(item.balanceAfter)}
                        </Text>
                      </>
                    ) : null}
                  </View>

                  {item.notes ? (
                    <Text style={[styles.itemNote, { color: colors.textMuted }]}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
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
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  lineCol: {
    alignItems: 'center',
    width: 30,
    marginRight: 8,
  },
  dotCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  contentCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemTime: {
    fontSize: 11,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  runningBal: {
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    marginHorizontal: 5,
    fontSize: 11,
  },
  itemNote: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});


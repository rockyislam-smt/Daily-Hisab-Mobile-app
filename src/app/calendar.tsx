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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { Header } from '../components/Header';
import { TransactionCard } from '../components/TransactionCard';
import { EmptyState } from '../components/EmptyState';
import { TransactionRepository } from '../database/repositories/transaction.repository';
import { Transaction } from '../types';
import { getTodayDateString, formatDisplayDate, getMonthName } from '../utils/date';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  subMonths,
  addMonths,
  getDay,
  isSameDay,
  parseISO,
} from 'date-fns';

export default function FinancialCalendarScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { language, refreshTrigger } = useAppStore();

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayDateString());
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadCalendarData = useCallback(async () => {
    try {
      const monthStart = format(startOfMonth(currentMonthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonthDate), 'yyyy-MM-dd');

      const allInMonth = await TransactionRepository.getAll({
        startDate: monthStart,
        endDate: monthEnd,
      });
      setMonthTransactions(allInMonth);

      const dayTxs = await TransactionRepository.getAll({
        startDate: selectedDateStr,
        endDate: selectedDateStr,
      });
      setDayTransactions(dayTxs);
    } catch (e) {
      console.warn('Error loading calendar:', e);
    }
  }, [currentMonthDate, selectedDateStr]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData, refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendarData();
    setRefreshing(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => addMonths(prev, 1));
  };

  // Calendar matrix calculation
  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0 = Sunday

  const weekHeaders = language === 'bn' ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('financialCalendar')}
        subtitle={formatDisplayDate(selectedDateStr, language)}
        rightAction={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/(tabs)/add', params: { date: selectedDateStr } })}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('add')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Month Navigator Header */}
      <View style={[styles.monthNav, { backgroundColor: colors.cardSecondary }]}>
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {getMonthName(currentMonthDate.getMonth(), language)} {currentMonthDate.getFullYear()}
        </Text>

        <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Calendar Grid Card */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          {/* Day of week headers */}
          <View style={styles.weekHeaderRow}>
            {weekHeaders.map((dh, i) => (
              <Text key={i} style={[styles.weekHeaderCell, { color: colors.textMuted }]}>
                {dh}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {/* Empty slots before start of month */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}

            {daysInMonth.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = dateStr === selectedDateStr;
              const isToday = isSameDay(day, new Date());

              // Check if date has income or expense transactions
              const dayTxs = monthTransactions.filter((tx) => tx.date === dateStr);
              const hasIncome = dayTxs.some((tx) => tx.type === 'income');
              const hasExpense = dayTxs.some((tx) => tx.type === 'expense');

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isSelected && [styles.selectedDayCell, { backgroundColor: colors.primary }],
                    isToday && !isSelected && [styles.todayCell, { borderColor: colors.primary }],
                  ]}
                  onPress={() => setSelectedDateStr(dateStr)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {day.getDate()}
                  </Text>

                  {/* Indicator Dots */}
                  <View style={styles.dotsRow}>
                    {hasIncome && (
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: isSelected ? '#FFFFFF' : colors.income },
                        ]}
                      />
                    )}
                    {hasExpense && (
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: isSelected ? '#FFFFFF' : colors.expense },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            {formatDisplayDate(selectedDateStr, language)}
          </Text>
          <Text style={[styles.txCount, { color: colors.textSecondary }]}>
            {dayTransactions.length} items
          </Text>
        </View>

        {/* Day's Transactions */}
        {dayTransactions.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No transactions for this date"
            description="Tap the + Add button to record an income or expense on this day."
            actionLabel={t('add')}
            onPressAction={() =>
              router.push({ pathname: '/(tabs)/add', params: { date: selectedDateStr } })
            }
          />
        ) : (
          dayTransactions.map((tx) => (
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
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  navBtn: {
    padding: 6,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  calendarCard: {
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  selectedDayCell: {
    elevation: 2,
  },
  todayCell: {
    borderWidth: 1,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  txCount: {
    fontSize: 12,
    fontWeight: '600',
  },
});


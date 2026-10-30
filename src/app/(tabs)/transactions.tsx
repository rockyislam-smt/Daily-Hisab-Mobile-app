import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
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
import { TransactionCard } from '../../components/TransactionCard';
import { DateFilterTabs } from '../../components/DateFilterTabs';
import { EmptyState } from '../../components/EmptyState';
import { TransactionRepository } from '../../database/repositories/transaction.repository';
import { BackupService } from '../../services/backup.service';
import { Transaction, TransactionType, DateFilterType } from '../../types';
import { getDateRange } from '../../utils/date';
import { formatCurrency } from '../../utils/money';

export default function TransactionsScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, refreshTrigger } = useAppStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<DateFilterType>('this_month');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const loadTransactions = useCallback(async () => {
    try {
      const range = getDateRange(selectedFilter, undefined, undefined, language);
      const list = await TransactionRepository.getAll({
        startDate: range.startDate,
        endDate: range.endDate,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        searchQuery: searchQuery.trim() !== '' ? searchQuery : undefined,
      });

      setTransactions(list);

      // Compute totals
      const inc = list
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const exp = list
        .filter((tx) => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

      setTotalIncome(inc);
      setTotalExpense(exp);
    } catch (e) {
      console.warn('Error loading transactions:', e);
    }
  }, [selectedFilter, typeFilter, searchQuery, language]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleExportCsv = async () => {
    try {
      await BackupService.exportTransactionsCsv();
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Could not export CSV');
    }
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('transactions')}
        subtitle={`${transactions.length} records found`}
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleExportCsv}
            accessibilityLabel="Export CSV"
          >
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={[styles.exportText, { color: colors.primary }]}>CSV</Text>
          </TouchableOpacity>
        }
      />

      {/* Date Filter Tabs */}
      <DateFilterTabs selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('search')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Type Filter Pills: All / Income / Expense / Transfer */}
      <View style={styles.typeFilterRow}>
        {(['all', 'income', 'expense', 'transfer'] as const).map((type) => {
          const isSelected = typeFilter === type;
          const label =
            type === 'all'
              ? t('viewAll')
              : type === 'income'
              ? t('income')
              : type === 'expense'
              ? t('expense')
              : t('transfer');

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.typePill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setTypeFilter(type)}
            >
              <Text
                style={[
                  styles.typePillText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Period Totals Summary Bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.cardSecondary }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('income')}</Text>
          <Text style={[styles.summaryValue, { color: colors.income }]}>{renderAmount(totalIncome)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('expense')}</Text>
          <Text style={[styles.summaryValue, { color: colors.expense }]}>{renderAmount(totalExpense)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: totalIncome >= totalExpense ? colors.income : colors.expense },
            ]}
          >
            {renderAmount(totalIncome - totalExpense)}
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onPress={() => router.push({ pathname: '/(tabs)/add', params: { editId: item.id } })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={t('noTransactions')}
            description={t('createFirstTransaction')}
            actionLabel={t('tabAdd')}
            onPressAction={() => router.push('/(tabs)/add')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 8,
  },
  typePill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  listContent: {
    paddingBottom: 24,
  },
});


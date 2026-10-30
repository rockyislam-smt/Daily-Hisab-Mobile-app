import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency } from '../utils/money';
import { formatDisplayDate, formatDisplayTime } from '../utils/date';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onPress,
  onLongPress,
}) => {
  const { colors } = useThemeColors();
  const { hideBalances, baseCurrency, language } = useAppStore();

  const isIncome = transaction.type === 'income';
  const isExpense = transaction.type === 'expense';
  const isTransfer = transaction.type === 'transfer';

  const amountColor = isIncome
    ? colors.income
    : isExpense
    ? colors.expense
    : colors.savings;

  const sign = isIncome ? '+' : isExpense ? '-' : '⇄ ';

  const iconName = isTransfer
    ? 'swap-horizontal'
    : (transaction.category_icon as any) || (isIncome ? 'arrow-down' : 'arrow-up');

  const iconBg = isTransfer
    ? colors.savingsBg
    : transaction.category_color
    ? `${transaction.category_color}20`
    : colors.cardSecondary;

  const iconColor = isTransfer
    ? colors.savings
    : transaction.category_color || colors.primary;

  const formattedAmount = hideBalances
    ? '••••••'
    : `${sign}${formatCurrency(transaction.amount, baseCurrency, language)}`;

  const accountInfo = isTransfer
    ? `${transaction.account_name || 'Account'} ➔ ${transaction.destination_account_name || 'Account'}`
    : transaction.account_name || 'Account';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderSubtle,
          shadowColor: colors.shadow,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Icon Circle */}
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>

      {/* Info Column */}
      <View style={styles.infoCol}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {transaction.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
            {accountInfo}
          </Text>
          <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {formatDisplayDate(transaction.date, language)}
          </Text>
        </View>
      </View>

      {/* Amount Column */}
      <View style={styles.amountCol}>
        <Text style={[styles.amount, { color: amountColor }]}>{formattedAmount}</Text>
        {transaction.notes ? (
          <Text style={[styles.noteSnippet, { color: colors.textMuted }]} numberOfLines={1}>
            {transaction.notes}
          </Text>
        ) : (
          <Text style={[styles.timeSnippet, { color: colors.textMuted }]}>
            {formatDisplayTime(transaction.time, language)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    marginHorizontal: 5,
    fontSize: 12,
  },
  amountCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  noteSnippet: {
    fontSize: 11,
    marginTop: 3,
    maxWidth: 100,
  },
  timeSnippet: {
    fontSize: 11,
    marginTop: 3,
  },
});

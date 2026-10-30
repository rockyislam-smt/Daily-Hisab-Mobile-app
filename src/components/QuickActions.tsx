import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../hooks/useTranslation';

interface QuickActionsProps {
  onPressAddIncome: () => void;
  onPressAddExpense: () => void;
  onPressTransfer: () => void;
  onPressDailyTracker: () => void;
  onPressDiary: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onPressAddIncome,
  onPressAddExpense,
  onPressTransfer,
  onPressDailyTracker,
  onPressDiary,
}) => {
  const { colors } = useThemeColors();
  const { t } = useTranslation();

  const actions = [
    {
      id: 'income',
      label: t('income'),
      icon: 'arrow-down-circle',
      color: colors.income,
      bg: colors.incomeBg,
      onPress: onPressAddIncome,
    },
    {
      id: 'expense',
      label: t('expense'),
      icon: 'arrow-up-circle',
      color: colors.expense,
      bg: colors.expenseBg,
      onPress: onPressAddExpense,
    },
    {
      id: 'transfer',
      label: t('transfer'),
      icon: 'swap-horizontal',
      color: colors.savings,
      bg: colors.savingsBg,
      onPress: onPressTransfer,
    },
    {
      id: 'tracker',
      label: t('dailyCashTracker'),
      icon: 'cash',
      color: colors.primary,
      bg: colors.primaryLight,
      onPress: onPressDailyTracker,
    },
    {
      id: 'diary',
      label: t('moneyDiary'),
      icon: 'book',
      color: colors.planning,
      bg: colors.planningBg,
      onPress: onPressDiary,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quickActions')}</Text>
      <View style={styles.row}>
        {actions.map((act) => (
          <TouchableOpacity
            key={act.id}
            style={styles.actionItem}
            onPress={act.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: act.bg }]}>
              <Ionicons name={act.icon as any} size={22} color={act.color} />
            </View>
            <Text
              style={[styles.actionLabel, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {act.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionItem: {
    alignItems: 'center',
    width: '19%',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

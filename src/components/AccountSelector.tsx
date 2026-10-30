import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../types';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency } from '../utils/money';

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId?: string | null;
  onSelectAccount: (account: Account) => void;
  excludeAccountId?: string | null;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  excludeAccountId,
}) => {
  const { colors } = useThemeColors();
  const { hideBalances, baseCurrency, language } = useAppStore();

  const filtered = accounts.filter((a) => a.id !== excludeAccountId && a.is_active === 1);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {filtered.map((acc) => {
        const isSelected = selectedAccountId === acc.id;
        const formattedBal = hideBalances
          ? '••••••'
          : formatCurrency(acc.current_balance, baseCurrency, language);

        return (
          <TouchableOpacity
            key={acc.id}
            style={[
              styles.card,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelectAccount(acc)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isSelected
                    ? 'rgba(255, 255, 255, 0.2)'
                    : `${acc.color}20`,
                },
              ]}
            >
              <Ionicons
                name={acc.icon as any}
                size={18}
                color={isSelected ? '#FFFFFF' : acc.color}
              />
            </View>
            <View style={styles.textCol}>
              <Text
                style={[
                  styles.accName,
                  { color: isSelected ? '#FFFFFF' : colors.text },
                ]}
                numberOfLines={1}
              >
                {acc.name}
              </Text>
              <Text
                style={[
                  styles.accBal,
                  { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textSecondary },
                ]}
              >
                {formattedBal}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 6,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 140,
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  accName: {
    fontSize: 12,
    fontWeight: '700',
  },
  accBal: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

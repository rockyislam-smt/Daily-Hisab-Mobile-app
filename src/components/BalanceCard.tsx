import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { formatCurrency } from '../utils/money';

interface BalanceCardProps {
  totalAvailable: number; // in paisa
  cashInHand: number;
  bankBalance: number;
  mobileWallets: number;
  onPressCashTracker?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalAvailable,
  cashInHand,
  bankBalance,
  mobileWallets,
  onPressCashTracker,
}) => {
  const { colors } = useThemeColors();
  const { hideBalances, toggleHideBalances, baseCurrency, language } = useAppStore();
  const { t } = useTranslation();

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.secondary, shadowColor: colors.shadow }]}>
      {/* Header with Title and Eye Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <Text style={styles.headerLabel}>{t('totalBalance')}</Text>
          <View style={styles.offlineBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.offlineText}>OFFLINE</Text>
          </View>
        </View>

        <TouchableOpacity onPress={toggleHideBalances} style={styles.eyeBtn}>
          <Ionicons
            name={hideBalances ? 'eye-off' : 'eye'}
            size={18}
            color="#94A3B8"
          />
        </TouchableOpacity>
      </View>

      {/* Main Big Balance */}
      <Text style={styles.mainBalance}>{renderAmount(totalAvailable)}</Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* 3 Sub-balances: Cash in Hand, Bank, Mobile Wallets */}
      <View style={styles.breakdownRow}>
        {/* Cash in Hand */}
        <TouchableOpacity
          style={styles.breakdownItem}
          onPress={onPressCashTracker}
          activeOpacity={onPressCashTracker ? 0.7 : 1}
        >
          <View style={styles.iconCircleCash}>
            <Ionicons name="wallet-outline" size={14} color="#34D399" />
          </View>
          <View>
            <Text style={styles.subLabel}>{t('cashInHand')}</Text>
            <Text style={styles.subValue}>{renderAmount(cashInHand)}</Text>
          </View>
        </TouchableOpacity>

        {/* Bank */}
        <View style={styles.breakdownItem}>
          <View style={styles.iconCircleBank}>
            <Ionicons name="card-outline" size={14} color="#60A5FA" />
          </View>
          <View>
            <Text style={styles.subLabel}>{t('bankBalance')}</Text>
            <Text style={styles.subValue}>{renderAmount(bankBalance)}</Text>
          </View>
        </View>

        {/* Mobile Wallets */}
        <View style={styles.breakdownItem}>
          <View style={styles.iconCircleWallet}>
            <Ionicons name="phone-portrait-outline" size={14} color="#F472B6" />
          </View>
          <View>
            <Text style={styles.subLabel}>{t('mobileWallets')}</Text>
            <Text style={styles.subValue}>{renderAmount(mobileWallets)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  offlineText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eyeBtn: {
    padding: 4,
  },
  mainBalance: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconCircleCash: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleWallet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
  },
  subValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});


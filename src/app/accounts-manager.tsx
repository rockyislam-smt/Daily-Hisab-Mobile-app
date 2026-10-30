import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { Header } from '../components/Header';
import { AmountInput } from '../components/AmountInput';
import { AccountRepository } from '../database/repositories/account.repository';
import { Account, AccountType } from '../types';
import { formatCurrency, toPaisa, fromPaisa } from '../utils/money';

export default function AccountsManagerScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, triggerRefresh, refreshTrigger } = useAppStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);

  // New/Edit account state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('0');
  const [color, setColor] = useState('#2563EB');
  const [icon, setIcon] = useState('card-outline');
  const [description, setDescription] = useState('');

  // Adjust balance state
  const [selectedAccForAdjust, setSelectedAccForAdjust] = useState<Account | null>(null);
  const [adjustedBalanceStr, setAdjustedBalanceStr] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const loadAccounts = useCallback(async () => {
    try {
      const list = await AccountRepository.getAll(false);
      setAccounts(list);
    } catch (e) {
      console.warn('Error loading accounts:', e);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts, refreshTrigger]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setType('bank');
    setOpeningBalanceStr('0');
    setColor('#2563EB');
    setIcon('card-outline');
    setDescription('');
    setModalVisible(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setOpeningBalanceStr(String(fromPaisa(acc.opening_balance)));
    setColor(acc.color);
    setIcon(acc.icon);
    setDescription(acc.description || '');
    setModalVisible(true);
  };

  const handleSaveAccount = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Account name is required');
      return;
    }

    try {
      if (editingAccount) {
        await AccountRepository.update(editingAccount.id, {
          name: name.trim(),
          type,
          color,
          icon,
          description: description.trim() || undefined,
        });
      } else {
        await AccountRepository.create({
          name: name.trim(),
          type,
          opening_balance: toPaisa(openingBalanceStr),
          current_balance: toPaisa(openingBalanceStr),
          currency: baseCurrency,
          color,
          icon,
          description: description.trim() || undefined,
          is_active: 1,
        });
      }

      setModalVisible(false);
      triggerRefresh();
      await loadAccounts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save account');
    }
  };

  const handleDeleteAccount = (acc: Account) => {
    Alert.alert(
      t('deleteAccount'),
      t('deleteAccountWarning'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await AccountRepository.delete(acc.id);
            triggerRefresh();
            await loadAccounts();
          },
        },
      ]
    );
  };

  const openAdjustModal = (acc: Account) => {
    setSelectedAccForAdjust(acc);
    setAdjustedBalanceStr(String(fromPaisa(acc.current_balance)));
    setAdjustReason('');
    setAdjustModalVisible(true);
  };

  const handleSaveAdjust = async () => {
    if (!selectedAccForAdjust) return;
    if (!adjustReason.trim()) {
      Alert.alert('Validation Error', 'Please specify a reason for balance adjustment.');
      return;
    }

    try {
      await AccountRepository.adjustBalance(
        selectedAccForAdjust.id,
        toPaisa(adjustedBalanceStr),
        adjustReason.trim()
      );
      setAdjustModalVisible(false);
      triggerRefresh();
      await loadAccounts();
      Alert.alert('Success', 'Account balance adjusted and audit log created.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not adjust balance');
    }
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('accounts')}
        subtitle="Wallets & Banking"
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={openCreateModal}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('add')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {accounts.map((acc) => (
          <View
            key={acc.id}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: `${acc.color}20` }]}>
                <Ionicons name={acc.icon as any} size={22} color={acc.color} />
              </View>

              <View style={styles.accountInfo}>
                <Text style={[styles.accName, { color: colors.text }]}>{acc.name}</Text>
                <Text style={[styles.accType, { color: colors.textSecondary }]}>
                  {acc.type.toUpperCase()} • {acc.currency}
                </Text>
              </View>

              <Text style={[styles.accBalance, { color: colors.text }]}>
                {renderAmount(acc.current_balance)}
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={[styles.actionsRow, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openAdjustModal(acc)}
              >
                <Ionicons name="construct-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {t('adjust')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openEditModal(acc)}
              >
                <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                  {t('edit')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDeleteAccount(acc)}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>
                  {t('delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal: Add / Edit Account */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingAccount ? t('editAccount') : t('addAccount')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('accountName')}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. bKash, City Bank, Pocket Cash"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                {t('accountType')}
              </Text>
              <View style={styles.typeGrid}>
                {(['cash', 'pocket', 'bank', 'bkash', 'nagad', 'rocket', 'savings', 'credit_card', 'other'] as AccountType[]).map((at) => (
                  <TouchableOpacity
                    key={at}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: type === at ? colors.primary : colors.cardSecondary,
                      },
                    ]}
                    onPress={() => setType(at)}
                  >
                    <Text style={{ color: type === at ? '#FFF' : colors.text, fontSize: 11, fontWeight: '700' }}>
                      {at.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!editingAccount && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {t('openingBalance')}
                  </Text>
                  <AmountInput
                    value={openingBalanceStr}
                    onChangeText={setOpeningBalanceStr}
                    currency={baseCurrency}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveAccount}
              >
                <Text style={styles.modalSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Adjust Balance */}
      <Modal visible={adjustModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Adjust Balance ({selectedAccForAdjust?.name})
              </Text>
              <TouchableOpacity onPress={() => setAdjustModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              New Actual Balance
            </Text>
            <AmountInput
              value={adjustedBalanceStr}
              onChangeText={setAdjustedBalanceStr}
              currency={baseCurrency}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
              Reason for Adjustment
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
              value={adjustReason}
              onChangeText={setAdjustReason}
              placeholder="e.g. Audit correction, missed ATM cash withdrawal"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={handleSaveAdjust}
            >
              <Text style={styles.modalSaveText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 6,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accName: {
    fontSize: 15,
    fontWeight: '700',
  },
  accType: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  accBalance: {
    fontSize: 17,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalSaveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});


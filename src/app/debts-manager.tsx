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
import { AccountSelector } from '../components/AccountSelector';
import { EmptyState } from '../components/EmptyState';
import { DebtRepository } from '../database/repositories/debt.repository';
import { AccountRepository } from '../database/repositories/account.repository';
import { Debt, DebtType, DebtPayment, Account } from '../types';
import { formatCurrency, toPaisa, fromPaisa } from '../utils/money';
import { getTodayDateString, formatDisplayDate } from '../utils/date';

export default function DebtsManagerScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, triggerRefresh, refreshTrigger } = useAppStore();

  const [activeTab, setActiveTab] = useState<DebtType>('i_owe');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Add Debt Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Payment Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState<Debt | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [dList, accList] = await Promise.all([
        DebtRepository.getAll(activeTab),
        AccountRepository.getAll(true),
      ]);
      setDebts(dList);
      setAccounts(accList);
      if (accList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accList[0].id);
        setPaymentAccountId(accList[0].id);
      }
    } catch (e) {
      console.warn('Error loading debts:', e);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleCreateDebt = async () => {
    const paisa = toPaisa(amountStr);
    if (!personName.trim()) {
      Alert.alert('Validation Error', 'Person name is required.');
      return;
    }
    if (paisa <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than zero.');
      return;
    }

    try {
      await DebtRepository.create(
        {
          type: activeTab,
          person_name: personName.trim(),
          phone_number: phone.trim() || undefined,
          initial_amount: paisa,
          due_date: dueDate.trim() || undefined,
          account_id: selectedAccountId,
          status: 'active',
          notes: notes.trim() || undefined,
        },
        true // Reflect initial cash flow in wallet
      );

      setCreateModalVisible(false);
      setPersonName('');
      setPhone('');
      setAmountStr('');
      setDueDate('');
      setNotes('');
      triggerRefresh();
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save debt record');
    }
  };

  const openPaymentModal = (debt: Debt) => {
    setActiveDebtForPayment(debt);
    setPaymentAmountStr(String(fromPaisa(debt.remaining_amount)));
    setPaymentNotes('');
    setPaymentModalVisible(true);
  };

  const handleSavePayment = async () => {
    if (!activeDebtForPayment || !paymentAccountId) return;
    const paisa = toPaisa(paymentAmountStr);
    if (paisa <= 0) {
      Alert.alert('Validation Error', 'Payment amount must be greater than zero.');
      return;
    }

    try {
      await DebtRepository.recordPayment(
        activeDebtForPayment.id,
        paymentAccountId,
        paisa,
        paymentNotes.trim() || undefined
      );

      setPaymentModalVisible(false);
      triggerRefresh();
      await loadData();
      Alert.alert('Payment Recorded', 'Payment has been recorded and wallet updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record payment');
    }
  };

  const handleDeleteDebt = (id: string) => {
    Alert.alert(t('delete'), 'Are you sure you want to delete this debt record?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await DebtRepository.delete(id);
          triggerRefresh();
          await loadData();
        },
      },
    ]);
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('debtAndLending')}
        subtitle="Manage liabilities & receivables"
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('add')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Tabs: Money I Owe vs Money Owed to Me */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardSecondary }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'i_owe' && [styles.tabItemActive, { backgroundColor: colors.expense }],
          ]}
          onPress={() => setActiveTab('i_owe')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'i_owe' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {t('moneyIOwe')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'they_owe_me' && [styles.tabItemActive, { backgroundColor: colors.income }],
          ]}
          onPress={() => setActiveTab('they_owe_me')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'they_owe_me' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {t('moneyOwedToMe')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {debts.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Debt Records in this Section"
            description="Keep your personal lending and borrowing organized."
            actionLabel={t('addDebt')}
            onPressAction={() => setCreateModalVisible(true)}
          />
        ) : (
          debts.map((d) => {
            const isSettled = d.status === 'settled';
            return (
              <View
                key={d.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personName, { color: colors.text }]}>
                      {d.person_name}
                    </Text>
                    {d.phone_number ? (
                      <Text style={[styles.phoneText, { color: colors.textSecondary }]}>
                        {d.phone_number}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.remainingText,
                        { color: activeTab === 'i_owe' ? colors.expense : colors.income },
                      ]}
                    >
                      {renderAmount(d.remaining_amount)}
                    </Text>
                    <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
                      Total: {renderAmount(d.initial_amount)}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: colors.cardSecondary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, (d.paid_amount / d.initial_amount) * 100)}%`,
                        backgroundColor: activeTab === 'i_owe' ? colors.expense : colors.income,
                      },
                    ]}
                  />
                </View>

                {/* Bottom Row */}
                <View style={styles.cardBottomRow}>
                  <Text style={[styles.paidText, { color: colors.textSecondary }]}>
                    Paid: {renderAmount(d.paid_amount)}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {!isSettled && (
                      <TouchableOpacity
                        style={[styles.payBtn, { backgroundColor: colors.primary }]}
                        onPress={() => openPaymentModal(d)}
                      >
                        <Text style={styles.payBtnText}>{t('recordPayment')}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => handleDeleteDebt(d.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal: Create Debt Record */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('addDebt')} ({activeTab === 'i_owe' ? 'Borrowed' : 'Lent'})
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('personName')}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={personName}
                onChangeText={setPersonName}
                placeholder="e.g. Rahim, Uncle Karim, Friend"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                {t('amount')}
              </Text>
              <AmountInput
                value={amountStr}
                onChangeText={setAmountStr}
                currency={baseCurrency}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                {t('account')}
              </Text>
              <AccountSelector
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                {t('phoneNumber')}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="017xxxxxxxx"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateDebt}
              >
                <Text style={styles.modalSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Record Payment */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('recordPayment')} ({activeDebtForPayment?.person_name})
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Payment Amount
            </Text>
            <AmountInput
              value={paymentAmountStr}
              onChangeText={setPaymentAmountStr}
              currency={baseCurrency}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
              Payment Account
            </Text>
            <AccountSelector
              accounts={accounts}
              selectedAccountId={paymentAccountId}
              onSelectAccount={(acc) => setPaymentAccountId(acc.id)}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={handleSavePayment}
            >
              <Text style={styles.modalSaveText}>{t('confirm')}</Text>
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
  },
  phoneText: {
    fontSize: 12,
    marginTop: 2,
  },
  remainingText: {
    fontSize: 16,
    fontWeight: '800',
  },
  totalLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paidText: {
    fontSize: 12,
    fontWeight: '600',
  },
  payBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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


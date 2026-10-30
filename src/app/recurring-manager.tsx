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
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { Header } from '../components/Header';
import { AmountInput } from '../components/AmountInput';
import { AccountSelector } from '../components/AccountSelector';
import { CategorySelector } from '../components/CategorySelector';
import { EmptyState } from '../components/EmptyState';
import { RecurringRepository } from '../database/repositories/recurring.repository';
import { AccountRepository } from '../database/repositories/account.repository';
import { CategoryRepository } from '../database/repositories/category.repository';
import { RecurringTransaction, Account, Category, RecurrenceFrequency, TransactionType } from '../types';
import { formatCurrency, toPaisa } from '../utils/money';
import { getTodayDateString, formatDisplayDate } from '../utils/date';

export default function RecurringManagerScreen() {
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, triggerRefresh, refreshTrigger } = useAppStore();

  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // New recurring state
  const [title, setTitle] = useState('');
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [rList, accList, catList] = await Promise.all([
        RecurringRepository.getAll(false),
        AccountRepository.getAll(true),
        CategoryRepository.getAll('expense'),
      ]);
      setRecurringList(rList);
      setAccounts(accList);
      setCategories(catList);
      if (accList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accList[0].id);
      }
    } catch (e) {
      console.warn('Error loading recurring:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleCreateRecurring = async () => {
    const amountPaisa = toPaisa(amountStr);
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }
    if (amountPaisa <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than zero.');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Validation Error', 'Please select an account.');
      return;
    }

    try {
      await RecurringRepository.create({
        title: title.trim(),
        type: txType,
        amount: amountPaisa,
        category_id: selectedCategoryId || null,
        account_id: selectedAccountId,
        frequency,
        interval: 1,
        start_date: startDate.trim() || getTodayDateString(),
        next_occurrence: startDate.trim() || getTodayDateString(),
        is_active: 1,
      });

      setModalVisible(false);
      setTitle('');
      setAmountStr('');
      triggerRefresh();
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save recurring transaction');
    }
  };

  const handleToggleActive = async (item: RecurringTransaction) => {
    try {
      await RecurringRepository.update(item.id, {
        is_active: item.is_active === 1 ? 0 : 1,
      });
      triggerRefresh();
      await loadData();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('delete'), 'Are you sure you want to delete this recurring rule?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await RecurringRepository.delete(id);
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
        title={t('recurringTransactions')}
        subtitle="Automatic schedule for subscriptions & bills"
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('add')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {recurringList.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title="No Recurring Transactions Found"
            description="Set up automatic rules for salary, internet, Netflix, gym, or house rent."
            actionLabel={t('addRecurring')}
            onPressAction={() => setModalVisible(true)}
          />
        ) : (
          recurringList.map((item) => {
            const isActive = item.is_active === 1;
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.frequencyText, { color: colors.textSecondary }]}>
                      {item.frequency.toUpperCase()} • Account: {item.account_name}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.itemAmount,
                      { color: item.type === 'income' ? colors.income : colors.expense },
                    ]}
                  >
                    {renderAmount(item.amount)}
                  </Text>
                </View>

                <View style={styles.cardBottomRow}>
                  <Text style={[styles.nextText, { color: colors.textSecondary }]}>
                    Next Due: {formatDisplayDate(item.next_occurrence, language)}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.togglePill,
                        {
                          backgroundColor: isActive ? colors.primaryLight : colors.cardSecondary,
                        },
                      ]}
                      onPress={() => handleToggleActive(item)}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          { color: isActive ? colors.primary : colors.textMuted },
                        ]}
                      >
                        {isActive ? t('active') : t('paused')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
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

      {/* Modal: Create Recurring */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('addRecurring')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. WiFi Bill, House Rent, Netflix"
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
                {t('frequency')}
              </Text>
              <View style={styles.freqRow}>
                {(['daily', 'weekly', 'monthly', 'yearly'] as RecurrenceFrequency[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.freqChip,
                      {
                        backgroundColor: frequency === f ? colors.primary : colors.cardSecondary,
                      },
                    ]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text
                      style={{
                        color: frequency === f ? '#FFFFFF' : colors.text,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                Account
              </Text>
              <AccountSelector
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
                onPress={handleCreateRecurring}
              >
                <Text style={styles.modalSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  frequencyText: {
    fontSize: 12,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  nextText: {
    fontSize: 12,
    fontWeight: '500',
  },
  togglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleText: {
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
  freqRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Header } from '../../components/Header';
import { AmountInput } from '../../components/AmountInput';
import { CategorySelector } from '../../components/CategorySelector';
import { AccountSelector } from '../../components/AccountSelector';
import { AccountRepository } from '../../database/repositories/account.repository';
import { CategoryRepository } from '../../database/repositories/category.repository';
import { TransactionRepository } from '../../database/repositories/transaction.repository';
import { Account, Category, Subcategory, TransactionType } from '../../types';
import { getTodayDateString, getCurrentTimeString } from '../../utils/date';
import { toPaisa, fromPaisa } from '../../utils/money';

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; editId?: string }>();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, triggerRefresh } = useAppStore();

  const [txType, setTxType] = useState<TransactionType>(
    (params.type as TransactionType) || 'expense'
  );
  const [amountStr, setAmountStr] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dateStr, setDateStr] = useState(getTodayDateString());
  const [timeStr, setTimeStr] = useState(getCurrentTimeString());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transferFeeStr, setTransferFeeStr] = useState('0');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedDestAccountId, setSelectedDestAccountId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadAccountsAndCategories();
  }, [txType]);

  useEffect(() => {
    if (params.editId) {
      loadExistingTransaction(params.editId);
    } else if (params.type && (params.type === 'income' || params.type === 'expense' || params.type === 'transfer')) {
      setTxType(params.type as TransactionType);
    }
  }, [params.editId, params.type]);

  const loadAccountsAndCategories = async () => {
    try {
      const accList = await AccountRepository.getAll(true);
      setAccounts(accList);
      if (accList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accList[0].id);
      }
      if (accList.length > 1 && !selectedDestAccountId) {
        setSelectedDestAccountId(accList[1].id);
      }

      if (txType !== 'transfer') {
        const catList = await CategoryRepository.getAll(txType);
        setCategories(catList);
        if (catList.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(catList[0].id);
        }
      }
    } catch (e) {
      console.warn('Error loading form data:', e);
    }
  };

  const loadExistingTransaction = async (id: string) => {
    try {
      const tx = await TransactionRepository.getById(id);
      if (!tx) return;

      setIsEditing(true);
      setEditingId(tx.id);
      setTxType(tx.type);
      setAmountStr(String(fromPaisa(tx.amount)));
      setTitle(tx.title);
      setNotes(tx.notes || '');
      setDateStr(tx.date);
      setTimeStr(tx.time);
      setSelectedAccountId(tx.account_id);
      setSelectedDestAccountId(tx.destination_account_id || null);
      setSelectedCategoryId(tx.category_id || null);
      setPaymentMethod(tx.payment_method || '');
      setTransferFeeStr(String(fromPaisa(tx.fee || 0)));
    } catch (e) {
      console.warn('Error loading edit transaction:', e);
    }
  };

  const handleSave = async () => {
    const paisa = toPaisa(amountStr);
    if (paisa <= 0) {
      Alert.alert('Validation Error', t('validation').amountRequired);
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Validation Error', t('validation').accountRequired);
      return;
    }
    if (txType !== 'transfer' && !selectedCategoryId) {
      Alert.alert('Validation Error', t('validation').categoryRequired);
      return;
    }
    if (txType === 'transfer') {
      if (!selectedDestAccountId) {
        Alert.alert('Validation Error', 'Please select a destination account.');
        return;
      }
      if (selectedAccountId === selectedDestAccountId) {
        Alert.alert('Validation Error', t('validation').sameAccountTransfer);
        return;
      }
    }

    const defaultTitle =
      txType === 'transfer'
        ? 'Account Transfer'
        : categories.find((c) => c.id === selectedCategoryId)?.name ||
          (txType === 'income' ? 'Income' : 'Expense');

    const finalTitle = title.trim() !== '' ? title.trim() : defaultTitle;
    const feePaisa = txType === 'transfer' ? toPaisa(transferFeeStr) : 0;

    try {
      if (isEditing && editingId) {
        await TransactionRepository.update(editingId, {
          type: txType,
          account_id: selectedAccountId,
          destination_account_id: txType === 'transfer' ? selectedDestAccountId : null,
          category_id: txType !== 'transfer' ? selectedCategoryId : null,
          amount: paisa,
          fee: feePaisa,
          date: dateStr,
          time: timeStr,
          title: finalTitle,
          notes: notes.trim() || null,
          payment_method: paymentMethod.trim() || null,
        });
      } else {
        await TransactionRepository.create({
          type: txType,
          account_id: selectedAccountId,
          destination_account_id: txType === 'transfer' ? selectedDestAccountId : null,
          category_id: txType !== 'transfer' ? selectedCategoryId : null,
          amount: paisa,
          fee: feePaisa,
          date: dateStr,
          time: timeStr,
          title: finalTitle,
          notes: notes.trim() || null,
          payment_method: paymentMethod.trim() || null,
        });
      }

      triggerRefresh();

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save transaction');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;

    Alert.alert(
      t('delete'),
      t('deleteTransactionConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await TransactionRepository.delete(editingId);
            triggerRefresh();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={isEditing ? 'Edit Transaction' : 'Record Transaction'}
        subtitle="Quick offline entry"
        rightAction={
          isEditing ? (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Toggle Tabs: Income / Expense / Transfer */}
        <View style={[styles.typeToggleContainer, { backgroundColor: colors.cardSecondary }]}>
          <TouchableOpacity
            style={[
              styles.typeTab,
              txType === 'expense' && [styles.typeTabActive, { backgroundColor: colors.expense }],
            ]}
            onPress={() => setTxType('expense')}
          >
            <Text
              style={[
                styles.typeTabText,
                { color: txType === 'expense' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {t('expense')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeTab,
              txType === 'income' && [styles.typeTabActive, { backgroundColor: colors.income }],
            ]}
            onPress={() => setTxType('income')}
          >
            <Text
              style={[
                styles.typeTabText,
                { color: txType === 'income' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {t('income')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeTab,
              txType === 'transfer' && [styles.typeTabActive, { backgroundColor: colors.savings }],
            ]}
            onPress={() => setTxType('transfer')}
          >
            <Text
              style={[
                styles.typeTabText,
                { color: txType === 'transfer' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {t('transfer')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Big Amount Input with Shortcuts (50, 100, 200, 500, 1000) */}
        <View style={styles.formGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('amount')}</Text>
          <AmountInput
            value={amountStr}
            onChangeText={setAmountStr}
            currency={baseCurrency}
            autoFocus={!isEditing}
          />
        </View>

        {/* Source Account Selector */}
        <View style={styles.formGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            {txType === 'transfer' ? t('sourceAccount') : t('account')}
          </Text>
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
          />
        </View>

        {/* Destination Account Selector (Transfer only) */}
        {txType === 'transfer' && (
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('destinationAccount')}
            </Text>
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedDestAccountId}
              onSelectAccount={(acc) => setSelectedDestAccountId(acc.id)}
              excludeAccountId={selectedAccountId}
            />

            {/* Optional Transfer Fee Input */}
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('transferFee')}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={transferFeeStr}
                onChangeText={setTransferFeeStr}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* Category Selector (Income & Expense only) */}
        {txType !== 'transfer' && (
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('category')}</Text>
            <CategorySelector
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={(cat) => setSelectedCategoryId(cat.id)}
            />
          </View>
        )}

        {/* Title / Description */}
        <View style={styles.formGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('title')}</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder={txType === 'income' ? 'e.g. Salary, Client project' : 'e.g. Grocery, Lunch, Uber'}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Date & Time Row */}
        <View style={styles.twoInputsRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('date')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('time')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={timeStr}
              onChangeText={setTimeStr}
              placeholder="HH:mm:ss"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Optional Note */}
        <View style={styles.formGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('note')}</Text>
          <TextInput
            style={[
              styles.textInput,
              styles.textArea,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add extra context or details..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.saveBtnText}>{isEditing ? t('save') : t('record')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deleteBtn: {
    padding: 6,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  typeTabActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    height: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  twoInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

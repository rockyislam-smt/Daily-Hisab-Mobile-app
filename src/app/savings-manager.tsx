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
import { SavingsRepository } from '../database/repositories/savings.repository';
import { AccountRepository } from '../database/repositories/account.repository';
import { SavingsGoal, Account } from '../types';
import { formatCurrency, toPaisa, fromPaisa } from '../utils/money';
import { getTodayDateString, formatDisplayDate } from '../utils/date';

export default function SavingsManagerScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, triggerRefresh, refreshTrigger } = useAppStore();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Add Goal Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [targetDate, setTargetDate] = useState('2026-12-31');
  const [description, setDescription] = useState('');

  // Contribution Modal State
  const [contribModalVisible, setContribModalVisible] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null);
  const [contribType, setContribType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [contribAmountStr, setContribAmountStr] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [contribNotes, setContribNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [gList, accList] = await Promise.all([
        SavingsRepository.getGoals(),
        AccountRepository.getAll(true),
      ]);
      setGoals(gList);
      setAccounts(accList);
      if (accList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accList[0].id);
      }
    } catch (e) {
      console.warn('Error loading savings:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleCreateGoal = async () => {
    const targetPaisa = toPaisa(targetAmountStr);
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Goal name is required.');
      return;
    }
    if (targetPaisa <= 0) {
      Alert.alert('Validation Error', 'Target amount must be greater than zero.');
      return;
    }

    try {
      await SavingsRepository.createGoal({
        name: name.trim(),
        target_amount: targetPaisa,
        target_date: targetDate.trim() || '2026-12-31',
        description: description.trim() || undefined,
      });

      setCreateModalVisible(false);
      setName('');
      setTargetAmountStr('');
      setDescription('');
      triggerRefresh();
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create goal');
    }
  };

  const openContribModal = (goal: SavingsGoal, type: 'deposit' | 'withdrawal') => {
    setActiveGoal(goal);
    setContribType(type);
    setContribAmountStr('');
    setContribNotes('');
    setContribModalVisible(true);
  };

  const handleSaveContrib = async () => {
    if (!activeGoal || !selectedAccountId) return;
    const amountPaisa = toPaisa(contribAmountStr);
    if (amountPaisa <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than zero.');
      return;
    }

    try {
      await SavingsRepository.addContribution(
        activeGoal.id,
        selectedAccountId,
        amountPaisa,
        contribType,
        contribNotes.trim() || undefined
      );

      setContribModalVisible(false);
      setContribAmountStr('');
      setContribNotes('');
      triggerRefresh();
      await loadData();
      Alert.alert('Success', `${contribType === 'deposit' ? 'Deposit' : 'Withdrawal'} completed.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record contribution');
    }
  };

  const handleDeleteGoal = (id: string) => {
    Alert.alert(t('delete'), 'Are you sure you want to delete this savings goal?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await SavingsRepository.deleteGoal(id);
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
        title={t('savingsGoals')}
        subtitle="Track financial targets & wealth accumulation"
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.savings }]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('add')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {goals.length === 0 ? (
          <EmptyState
            icon="sparkles-outline"
            title="No Savings Goals Found"
            description="Create your first savings target (Emergency Fund, Laptop, Gadget, Travel) to stay motivated."
            actionLabel={t('addSavingsGoal')}
            onPressAction={() => setCreateModalVisible(true)}
          />
        ) : (
          goals.map((g) => {
            const isCompleted = g.is_completed === 1;
            return (
              <View
                key={g.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalName, { color: colors.text }]}>{g.name}</Text>
                    <Text style={[styles.targetDateText, { color: colors.textSecondary }]}>
                      Target: {formatDisplayDate(g.target_date, language)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.progressPercentage, { color: colors.savings }]}>
                      {g.progress_percentage}%
                    </Text>
                    {isCompleted && (
                      <Text style={[styles.completedBadge, { color: colors.income }]}>
                        {t('goalCompleted')}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: colors.cardSecondary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, g.progress_percentage || 0)}%`,
                        backgroundColor: isCompleted ? colors.income : colors.savings,
                      },
                    ]}
                  />
                </View>

                {/* Amount details */}
                <View style={styles.cardBottomRow}>
                  <Text style={[styles.amountDetail, { color: colors.textSecondary }]}>
                    Saved: {renderAmount(g.current_savings)} / {renderAmount(g.target_amount)}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: colors.savingsBg }]}
                      onPress={() => openContribModal(g, 'deposit')}
                    >
                      <Ionicons name="add" size={14} color={colors.savings} />
                      <Text style={[styles.smallBtnText, { color: colors.savings }]}>Deposit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: colors.cardSecondary }]}
                      onPress={() => openContribModal(g, 'withdrawal')}
                    >
                      <Ionicons name="remove" size={14} color={colors.textSecondary} />
                      <Text style={[styles.smallBtnText, { color: colors.textSecondary }]}>
                        Withdraw
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDeleteGoal(g.id)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal: Add Goal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('addSavingsGoal')}
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Goal Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Laptop, Emergency Fund, Umrah"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                {t('targetAmount')}
              </Text>
              <AmountInput
                value={targetAmountStr}
                onChangeText={setTargetAmountStr}
                currency={baseCurrency}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                {t('targetDate')}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                Description (Optional)
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Why is this goal important?"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.savings }]}
                onPress={handleCreateGoal}
              >
                <Text style={styles.modalSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Deposit / Withdraw */}
      <Modal visible={contribModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {contribType === 'deposit' ? t('depositSavings') : t('withdrawSavings')} (
                {activeGoal?.name})
              </Text>
              <TouchableOpacity onPress={() => setContribModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('amount')}
            </Text>
            <AmountInput
              value={contribAmountStr}
              onChangeText={setContribAmountStr}
              currency={baseCurrency}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
              Account
            </Text>
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.savings, marginTop: 16 }]}
              onPress={handleSaveContrib}
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
  goalName: {
    fontSize: 16,
    fontWeight: '700',
  },
  targetDateText: {
    fontSize: 12,
    marginTop: 2,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '800',
  },
  completedBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  amountDetail: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  smallBtnText: {
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


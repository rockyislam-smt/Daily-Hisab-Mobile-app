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
import { CategorySelector } from '../components/CategorySelector';
import { EmptyState } from '../components/EmptyState';
import { BudgetRepository } from '../database/repositories/budget.repository';
import { CategoryRepository } from '../database/repositories/category.repository';
import { Budget, Category, BudgetPeriod } from '../types';
import { formatCurrency, toPaisa, fromPaisa } from '../utils/money';
import { getTodayDateString } from '../utils/date';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function BudgetsManagerScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, triggerRefresh, refreshTrigger } = useAppStore();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // New budget state
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [bList, catList] = await Promise.all([
        BudgetRepository.getAll(false),
        CategoryRepository.getAll('expense'),
      ]);
      setBudgets(bList);
      setCategories(catList);
    } catch (e) {
      console.warn('Error loading budgets:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleCreateBudget = async () => {
    const amountPaisa = toPaisa(amountStr);
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Budget name is required.');
      return;
    }
    if (amountPaisa <= 0) {
      Alert.alert('Validation Error', 'Budget amount must be greater than zero.');
      return;
    }

    const now = new Date();
    const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

    try {
      await BudgetRepository.create({
        name: name.trim(),
        period,
        start_date: startDate,
        end_date: endDate,
        amount: amountPaisa,
        category_id: selectedCategoryId || null,
        notify_70: 1,
        notify_90: 1,
        notify_100: 1,
        is_active: 1,
      });

      setModalVisible(false);
      setName('');
      setAmountStr('');
      setSelectedCategoryId(null);
      triggerRefresh();
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create budget');
    }
  };

  const handleDeleteBudget = (id: string) => {
    Alert.alert(t('delete'), 'Are you sure you want to delete this budget?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await BudgetRepository.delete(id);
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
        title={t('budgets')}
        subtitle="Manage category limits & spending caps"
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
        {budgets.length === 0 ? (
          <EmptyState
            icon="pie-chart-outline"
            title="No Budgets Active"
            description="Set monthly spending limits for Food, Shopping, or overall bills to prevent overspending."
            actionLabel={t('addBudget')}
            onPressAction={() => setModalVisible(true)}
          />
        ) : (
          budgets.map((b) => {
            const isExceeded = (b.percentage || 0) > 100;
            return (
              <View
                key={b.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.budgetName, { color: colors.text }]}>{b.name}</Text>
                    <Text style={[styles.catName, { color: colors.textSecondary }]}>
                      {b.category_name || 'Overall Budget'} • {b.period.toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.percentageText,
                        { color: isExceeded ? colors.danger : colors.primary },
                      ]}
                    >
                      {b.percentage}%
                    </Text>
                    {isExceeded && (
                      <Text style={[styles.exceededLabel, { color: colors.danger }]}>
                        {t('budgetExceeded')}
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
                        width: `${Math.min(100, b.percentage || 0)}%`,
                        backgroundColor: isExceeded ? colors.danger : colors.primary,
                      },
                    ]}
                  />
                </View>

                {/* Spent & Remaining Row */}
                <View style={styles.cardBottomRow}>
                  <Text style={[styles.spentText, { color: colors.textSecondary }]}>
                    {t('spent')}: {renderAmount(b.spent_amount || 0)} / {renderAmount(b.amount)}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text
                      style={[
                        styles.remainingText,
                        { color: isExceeded ? colors.danger : colors.primary },
                      ]}
                    >
                      {renderAmount(b.remaining_amount || 0)} left
                    </Text>

                    <TouchableOpacity onPress={() => handleDeleteBudget(b.id)}>
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

      {/* Modal: Create Budget */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('addBudget')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Budget Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Monthly Food, Fuel, Overall"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                {t('budgetLimit')}
              </Text>
              <AmountInput
                value={amountStr}
                onChangeText={setAmountStr}
                currency={baseCurrency}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                Category (Optional, leave unselected for overall)
              </Text>
              <CategorySelector
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(cat) =>
                  setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)
                }
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
                onPress={handleCreateBudget}
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
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '700',
  },
  catName: {
    fontSize: 12,
    marginTop: 2,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '800',
  },
  exceededLabel: {
    fontSize: 10,
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
  },
  spentText: {
    fontSize: 12,
    fontWeight: '500',
  },
  remainingText: {
    fontSize: 12,
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
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});


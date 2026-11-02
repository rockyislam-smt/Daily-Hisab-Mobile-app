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
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { Header } from '../components/Header';
import { AmountInput } from '../components/AmountInput';
import { AccountSelector } from '../components/AccountSelector';
import { CategorySelector } from '../components/CategorySelector';
import { EmptyState } from '../components/EmptyState';
import { ShoppingRepository } from '../database/repositories/shopping.repository';
import { AccountRepository } from '../database/repositories/account.repository';
import { CategoryRepository } from '../database/repositories/category.repository';
import { ShoppingList, ShoppingItem, Account, Category } from '../types';
import { formatCurrency, toPaisa, fromPaisa } from '../utils/money';
import { getTodayDateString, formatDisplayDate } from '../utils/date';

export default function ShoppingListsScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, triggerRefresh, refreshTrigger } = useAppStore();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Expanded List ID for checklist view
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [currentItems, setCurrentItems] = useState<ShoppingItem[]>([]);

  // Create List Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [listTitle, setListTitle] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [targetDate, setTargetDate] = useState(getTodayDateString());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [listNotes, setListNotes] = useState('');

  // Add Item to Expanded List State
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemEstStr, setNewItemEstStr] = useState('');

  // Finish Shopping / Convert to Expense Modal
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [finishingList, setFinishingList] = useState<ShoppingList | null>(null);
  const [finishAccountId, setFinishAccountId] = useState<string | null>(null);
  const [finishCategoryId, setFinishCategoryId] = useState<string | null>(null);

  // Edit Actual Price Modal
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [activeItemForPrice, setActiveItemForPrice] = useState<ShoppingItem | null>(null);
  const [editPriceStr, setEditPriceStr] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [allLists, accList, catList] = await Promise.all([
        ShoppingRepository.getAll(activeTab),
        AccountRepository.getAll(true),
        CategoryRepository.getAll('expense'),
      ]);

      setLists(allLists);
      setAccounts(accList);
      setCategories(catList);

      if (accList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accList[0].id);
        setFinishAccountId(accList[0].id);
      }
      if (catList.length > 0 && !selectedCategoryId) {
        // Find food or grocery category if available
        const groceryCat = catList.find((c) => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('shop'));
        setSelectedCategoryId(groceryCat ? groceryCat.id : catList[0].id);
        setFinishCategoryId(groceryCat ? groceryCat.id : catList[0].id);
      }

      // If an expanded list is currently open, reload its items
      if (expandedListId) {
        const detailed = await ShoppingRepository.getById(expandedListId);
        if (detailed && detailed.items) {
          setCurrentItems(detailed.items);
        }
      } else if (allLists.length > 0 && !expandedListId && activeTab === 'active') {
        // Auto-expand the first list for convenience
        setExpandedListId(allLists[0].id);
        const detailed = await ShoppingRepository.getById(allLists[0].id);
        if (detailed && detailed.items) {
          setCurrentItems(detailed.items);
        }
      }
    } catch (e) {
      console.warn('Error loading shopping lists:', e);
    }
  }, [activeTab, expandedListId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleSelectExpandedList = async (listId: string) => {
    if (expandedListId === listId) {
      setExpandedListId(null);
      setCurrentItems([]);
    } else {
      setExpandedListId(listId);
      const detailed = await ShoppingRepository.getById(listId);
      if (detailed && detailed.items) {
        setCurrentItems(detailed.items);
      }
    }
  };

  const handleCreateList = async () => {
    if (!listTitle.trim()) {
      Alert.alert('Validation Error', t('validation').titleRequired || 'List title is required.');
      return;
    }

    try {
      const created = await ShoppingRepository.create({
        title: listTitle.trim(),
        budget_amount: toPaisa(budgetStr),
        account_id: selectedAccountId,
        category_id: selectedCategoryId,
        target_date: targetDate.trim() || getTodayDateString(),
        status: 'active',
        notes: listNotes.trim() || undefined,
      });

      setCreateModalVisible(false);
      setListTitle('');
      setBudgetStr('');
      setListNotes('');
      setTargetDate(getTodayDateString());
      setExpandedListId(created.id);
      triggerRefresh();
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create shopping list');
    }
  };

  const handleAddItem = async () => {
    if (!expandedListId || !newItemName.trim()) return;

    try {
      await ShoppingRepository.addItem(expandedListId, {
        item_name: newItemName.trim(),
        quantity: newItemQty.trim() || undefined,
        estimated_amount: toPaisa(newItemEstStr),
        actual_amount: 0,
      });

      setNewItemName('');
      setNewItemQty('');
      setNewItemEstStr('');

      // Reload items
      const detailed = await ShoppingRepository.getById(expandedListId);
      if (detailed && detailed.items) {
        setCurrentItems(detailed.items);
      }
      triggerRefresh();
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add item');
    }
  };

  const handleToggleItem = async (item: ShoppingItem) => {
    if (!expandedListId) return;

    const willBePurchased = item.is_purchased === 0;

    // If marking purchased and has no actual price, prompt to enter actual price
    if (willBePurchased && item.actual_amount === 0 && item.estimated_amount > 0) {
      // Auto-set estimated as actual, but user can edit
      await ShoppingRepository.toggleItemPurchased(item.id, true, item.estimated_amount);
    } else {
      await ShoppingRepository.toggleItemPurchased(item.id, willBePurchased);
    }

    const detailed = await ShoppingRepository.getById(expandedListId);
    if (detailed && detailed.items) {
      setCurrentItems(detailed.items);
    }
    triggerRefresh();
    await loadData();
  };

  const openPriceEditModal = (item: ShoppingItem) => {
    setActiveItemForPrice(item);
    setEditPriceStr(String(fromPaisa(item.actual_amount || item.estimated_amount || 0)));
    setPriceModalVisible(true);
  };

  const handleSaveActualPrice = async () => {
    if (!activeItemForPrice || !expandedListId) return;
    const paisa = toPaisa(editPriceStr);

    await ShoppingRepository.updateItem(activeItemForPrice.id, {
      actual_amount: paisa,
      is_purchased: 1, // Auto-mark as purchased when price is confirmed
    });

    setPriceModalVisible(false);
    setActiveItemForPrice(null);
    setEditPriceStr('');

    const detailed = await ShoppingRepository.getById(expandedListId);
    if (detailed && detailed.items) {
      setCurrentItems(detailed.items);
    }
    triggerRefresh();
    await loadData();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!expandedListId) return;
    await ShoppingRepository.deleteItem(itemId);
    const detailed = await ShoppingRepository.getById(expandedListId);
    if (detailed && detailed.items) {
      setCurrentItems(detailed.items);
    }
    triggerRefresh();
    await loadData();
  };

  const openFinishShoppingModal = (list: ShoppingList) => {
    setFinishingList(list);
    setFinishAccountId(list.account_id || (accounts.length > 0 ? accounts[0].id : null));
    setFinishCategoryId(list.category_id || (categories.length > 0 ? categories[0].id : null));
    setFinishModalVisible(true);
  };

  const handleConfirmFinishShopping = async () => {
    if (!finishingList || !finishAccountId) {
      Alert.alert('Validation Error', 'Please select an account to deduct expenses.');
      return;
    }

    try {
      await ShoppingRepository.convertListToExpense(
        finishingList.id,
        finishAccountId,
        finishCategoryId || undefined
      );

      setFinishModalVisible(false);
      setFinishingList(null);
      setExpandedListId(null);
      triggerRefresh();
      await loadData();

      Alert.alert(
        language === 'bn' ? 'বাজার সম্পন্ন 🎉' : 'Shopping Complete 🎉',
        t('shoppingExpenseRecorded')
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not complete shopping');
    }
  };

  const handleDeleteList = (listId: string) => {
    Alert.alert(t('delete'), 'Are you sure you want to delete this shopping list?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await ShoppingRepository.delete(listId);
          if (expandedListId === listId) {
            setExpandedListId(null);
            setCurrentItems([]);
          }
          triggerRefresh();
          await loadData();
        },
      },
    ]);
  };

  const handleShareList = (list: ShoppingList) => {
    if (!currentItems || currentItems.length === 0) return;

    const itemsText = currentItems
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.is_purchased ? '✅' : '⬜'} ${it.item_name} ${it.quantity ? `(${it.quantity})` : ''} - ৳${fromPaisa(it.actual_amount || it.estimated_amount)}`
      )
      .join('\n');

    const totalText = `মোট খরচ: ৳${fromPaisa(list.total_spent)} / বাজেট: ৳${fromPaisa(list.budget_amount)}`;
    const shareMessage = `🛒 ${list.title} (${list.target_date})\n\n${itemsText}\n\n${totalText}\n\nShared from PocketFlow`;

    Share.share({ message: shareMessage });
  };

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, baseCurrency, language);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('shoppingLists')}
        subtitle={t('shoppingSubtitle')}
        showEyeToggle
        rightAction={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{t('add')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Tabs: Active Lists vs Completed Lists */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardSecondary }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'active' && [styles.tabItemActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => {
            setActiveTab('active');
            setExpandedListId(null);
          }}
        >
          <Ionicons
            name="cart-outline"
            size={16}
            color={activeTab === 'active' ? '#FFFFFF' : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'active' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {language === 'bn' ? 'চলমান বাজার ফর্দ' : 'Active Lists'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'completed' && [styles.tabItemActive, { backgroundColor: colors.income }],
          ]}
          onPress={() => {
            setActiveTab('completed');
            setExpandedListId(null);
          }}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={16}
            color={activeTab === 'completed' ? '#FFFFFF' : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'completed' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {language === 'bn' ? 'সম্পন্ন বাজার' : 'Completed'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {lists.length === 0 ? (
          <EmptyState
            icon="cart-outline"
            title={language === 'bn' ? 'কোনো বাজার ফর্দ নেই' : 'No Shopping Lists'}
            description={
              language === 'bn'
                ? 'বাজারে যাওয়ার আগে প্রয়োজনীয় পণ্যের তালিকা ও বাজেট তৈরি করুন।'
                : 'Create shopping lists with budgets, check items while shopping, and auto-record expenses.'
            }
            actionLabel={t('createShoppingList')}
            onPressAction={() => setCreateModalVisible(true)}
          />
        ) : (
          lists.map((list) => {
            const isExpanded = expandedListId === list.id;
            const itemsCount = list.items_count || 0;
            const purchasedCount = list.purchased_count || 0;
            const isOverBudget = list.budget_amount > 0 && list.total_spent > list.budget_amount;
            const remainingBudget = Math.max(0, list.budget_amount - list.total_spent);
            const progressPercent =
              list.budget_amount > 0
                ? Math.min(100, Math.round((list.total_spent / list.budget_amount) * 100))
                : 0;

            return (
              <View
                key={list.id}
                style={[
                  styles.listCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isOverBudget ? colors.danger : colors.borderSubtle,
                  },
                ]}
              >
                {/* List Header Info */}
                <TouchableOpacity
                  style={styles.cardHeaderTouchable}
                  onPress={() => handleSelectExpandedList(list.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.listTitleText, { color: colors.text }]}>{list.title}</Text>
                      {list.status === 'completed' && (
                        <View style={[styles.statusTag, { backgroundColor: `${colors.income}20` }]}>
                          <Ionicons name="checkmark-circle" size={13} color={colors.income} />
                          <Text style={[styles.statusTagText, { color: colors.income }]}>
                            {t('purchased')}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.dateAndCountRow}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {formatDisplayDate(list.target_date, language)}
                      </Text>
                      <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {purchasedCount}/{itemsCount} {t('purchased')}
                      </Text>
                    </View>
                  </View>

                  {/* Financials (Spent & Budget) */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.spentAmountText,
                        { color: isOverBudget ? colors.danger : colors.text },
                      ]}
                    >
                      {renderAmount(list.total_spent)}
                    </Text>
                    {list.budget_amount > 0 && (
                      <Text style={[styles.budgetSubText, { color: colors.textMuted }]}>
                        বাজেট: {renderAmount(list.budget_amount)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Budget Progress Bar */}
                {list.budget_amount > 0 && (
                  <View style={[styles.progressTrack, { backgroundColor: colors.cardSecondary }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: isOverBudget ? colors.danger : colors.primary,
                        },
                      ]}
                    />
                  </View>
                )}

                {/* Remaining Budget & Overbudget Warning */}
                {list.budget_amount > 0 && (
                  <View style={styles.budgetMetricsRow}>
                    <Text style={[styles.budgetMetricLabel, { color: colors.textSecondary }]}>
                      {isOverBudget ? (
                        <Text style={{ color: colors.danger, fontWeight: '700' }}>
                          ⚠️ বাজেট অতিক্রম: {renderAmount(list.total_spent - list.budget_amount)}
                        </Text>
                      ) : (
                        `বাজেট অবশিষ্ট: ${renderAmount(remainingBudget)}`
                      )}
                    </Text>
                    <Text style={[styles.budgetPercentText, { color: colors.textMuted }]}>
                      {progressPercent}%
                    </Text>
                  </View>
                )}

                {/* ==================== EXPANDED ITEMS CHECKLIST ==================== */}
                {isExpanded && (
                  <View style={[styles.expandedBox, { borderTopColor: colors.borderSubtle }]}>
                    {/* Share & Actions Toolbar */}
                    <View style={styles.checklistToolbar}>
                      <Text style={[styles.checklistHeading, { color: colors.text }]}>
                        বাজারের ফর্দ ({currentItems.length} টি)
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => handleShareList(list)}>
                          <Ionicons name="share-social-outline" size={19} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteList(list.id)}>
                          <Ionicons name="trash-outline" size={19} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Quick Add Item Bar */}
                    {list.status === 'active' && (
                      <View style={[styles.addItemRow, { backgroundColor: colors.cardSecondary }]}>
                        <TextInput
                          style={[styles.addItemNameInput, { color: colors.text }]}
                          placeholder="আইটেম (যেমন: চাল, তেল, ডিম)"
                          placeholderTextColor={colors.textMuted}
                          value={newItemName}
                          onChangeText={setNewItemName}
                        />
                        <TextInput
                          style={[styles.addItemQtyInput, { color: colors.text }]}
                          placeholder="পরিমাণ"
                          placeholderTextColor={colors.textMuted}
                          value={newItemQty}
                          onChangeText={setNewItemQty}
                        />
                        <TextInput
                          style={[styles.addItemEstInput, { color: colors.text }]}
                          placeholder="৳ আনুমানিক"
                          placeholderTextColor={colors.textMuted}
                          value={newItemEstStr}
                          onChangeText={setNewItemEstStr}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity
                          style={[styles.addItemBtn, { backgroundColor: colors.primary }]}
                          onPress={handleAddItem}
                        >
                          <Ionicons name="add" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Items List */}
                    {currentItems.length === 0 ? (
                      <Text style={[styles.noItemsNotice, { color: colors.textMuted }]}>
                        ফর্দে এখনো কোনো পণ্য যোগ করা হয়নি। উপরের বক্সে লিখে (+) চাপুন।
                      </Text>
                    ) : (
                      currentItems.map((item) => {
                        const isPurchased = item.is_purchased === 1;
                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.itemRow,
                              {
                                backgroundColor: isPurchased
                                  ? `${colors.income}10`
                                  : colors.cardSecondary,
                              },
                            ]}
                          >
                            {/* Checkbox */}
                            <TouchableOpacity
                              style={[
                                styles.checkbox,
                                {
                                  borderColor: isPurchased ? colors.income : colors.border,
                                  backgroundColor: isPurchased ? colors.income : 'transparent',
                                },
                              ]}
                              onPress={() => handleToggleItem(item)}
                            >
                              {isPurchased && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                            </TouchableOpacity>

                            {/* Item Name & Quantity */}
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text
                                style={[
                                  styles.itemNameText,
                                  {
                                    color: isPurchased ? colors.textMuted : colors.text,
                                    textDecorationLine: isPurchased ? 'line-through' : 'none',
                                  },
                                ]}
                              >
                                {item.item_name}
                              </Text>
                              {item.quantity ? (
                                <Text style={[styles.itemQtyText, { color: colors.textMuted }]}>
                                  {item.quantity}
                                </Text>
                              ) : null}
                            </View>

                            {/* Price (Tap to update actual price) */}
                            <TouchableOpacity
                              style={[
                                styles.priceTag,
                                {
                                  backgroundColor: isPurchased
                                    ? `${colors.income}25`
                                    : colors.background,
                                },
                              ]}
                              onPress={() => openPriceEditModal(item)}
                            >
                              <Text
                                style={[
                                  styles.priceTagText,
                                  { color: isPurchased ? colors.income : colors.textSecondary },
                                ]}
                              >
                                {item.actual_amount > 0
                                  ? renderAmount(item.actual_amount)
                                  : item.estimated_amount > 0
                                  ? `~${renderAmount(item.estimated_amount)}`
                                  : '৳ দাম লিখুন'}
                              </Text>
                            </TouchableOpacity>

                            {/* Delete Item */}
                            {list.status === 'active' && (
                              <TouchableOpacity
                                style={{ marginLeft: 8 }}
                                onPress={() => handleDeleteItem(item.id)}
                              >
                                <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}

                    {/* Finish Shopping Button */}
                    {list.status === 'active' && currentItems.length > 0 && (
                      <TouchableOpacity
                        style={[styles.finishShoppingBtn, { backgroundColor: colors.income }]}
                        onPress={() => openFinishShoppingModal(list)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                        <Text style={styles.finishShoppingBtnText}>
                          {t('finishAndAddToExpense')} ({renderAmount(list.total_spent)})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ==================== MODAL: CREATE SHOPPING LIST ==================== */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('createShoppingList')}
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('listTitle')}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={listTitle}
                onChangeText={setListTitle}
                placeholder="যেমন: আজকের কাঁচাবাজার, মাসিক মুদি বাজার"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                {t('allocatedBudget')}
              </Text>
              <AmountInput
                value={budgetStr}
                onChangeText={setBudgetStr}
                currency={baseCurrency}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                {t('date')} (YYYY-MM-DD)
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder={getTodayDateString()}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                {t('account')} (যে অ্যাকাউন্ট থেকে টাকা খরচ হবে)
              </Text>
              <AccountSelector
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                {t('category')}
              </Text>
              <CategorySelector
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(cat) => setSelectedCategoryId(cat.id)}
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
                onPress={handleCreateList}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: CONFIRM FINISH & RECORD TO EXPENSES ==================== */}
      <Modal visible={finishModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'bn' ? 'বাজার সম্পন্ন ও খরচ নিশ্চিতকরণ' : 'Confirm Shopping Expense'}
              </Text>
              <TouchableOpacity onPress={() => setFinishModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.confirmSpentCard, { backgroundColor: colors.incomeBg }]}>
              <Text style={[styles.confirmSpentLabel, { color: colors.income }]}>
                মোট বাজার খরচ (Total Spent)
              </Text>
              <Text style={[styles.confirmSpentAmount, { color: colors.income }]}>
                {finishingList ? renderAmount(finishingList.total_spent) : '৳0'}
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              কোন ওয়ালেট/অ্যাকাউন্ট থেকে টাকা কাটা হবে?
            </Text>
            <AccountSelector
              accounts={accounts}
              selectedAccountId={finishAccountId}
              onSelectAccount={(acc) => setFinishAccountId(acc.id)}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              খরচের ক্যাটাগরি
            </Text>
            <CategorySelector
              categories={categories}
              selectedCategoryId={finishCategoryId}
              onSelectCategory={(cat) => setFinishCategoryId(cat.id)}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.income, marginTop: 20 }]}
              onPress={handleConfirmFinishShopping}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSaveText}>
                {language === 'bn' ? 'খরচে যুক্ত করুন ও সম্পন্ন করুন' : 'Record Expense & Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: EDIT ACTUAL PRICE ==================== */}
      <Modal visible={priceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {activeItemForPrice?.item_name} - {t('actualPrice')}
              </Text>
              <TouchableOpacity onPress={() => setPriceModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              আসল কেনা দাম লিখুন (টাকা)
            </Text>
            <AmountInput
              value={editPriceStr}
              onChangeText={setEditPriceStr}
              currency={baseCurrency}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
              onPress={handleSaveActualPrice}
              activeOpacity={0.8}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  listCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginVertical: 7,
    elevation: 1,
  },
  cardHeaderTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateAndCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  spentAmountText: {
    fontSize: 17,
    fontWeight: '800',
  },
  budgetSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetMetricLabel: {
    fontSize: 11,
  },
  budgetPercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  expandedBox: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  checklistToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  checklistHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 12,
    marginBottom: 10,
    gap: 6,
  },
  addItemNameInput: {
    flex: 2,
    fontSize: 13,
    paddingHorizontal: 8,
    height: 38,
  },
  addItemQtyInput: {
    flex: 1,
    fontSize: 12,
    paddingHorizontal: 6,
    height: 38,
  },
  addItemEstInput: {
    flex: 1,
    fontSize: 12,
    paddingHorizontal: 6,
    height: 38,
  },
  addItemBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noItemsNotice: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemQtyText: {
    fontSize: 11,
    marginTop: 1,
  },
  priceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  finishShoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
    elevation: 2,
  },
  finishShoppingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '90%',
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
  confirmSpentCard: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  confirmSpentLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmSpentAmount: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  modalSaveBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

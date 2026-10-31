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
  Linking,
  Switch,
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
import { NotificationService } from '../services/notification.service';
import { Debt, DebtType, DebtPayment, Account } from '../types';
import { formatCurrency, toPaisa, fromPaisa } from '../utils/money';
import { getTodayDateString, formatDisplayDate } from '../utils/date';

type FilterStatus = 'all' | 'active' | 'overdue' | 'settled';

export default function DebtsManagerScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const { baseCurrency, language, hideBalances, triggerRefresh, refreshTrigger } = useAppStore();

  const [activeTab, setActiveTab] = useState<DebtType>('they_owe_me');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Net Debt & Summary state
  const [summary, setSummary] = useState({
    totalIOwe: 0,
    totalTheyOweMe: 0,
    netBalance: 0,
    activeCount: 0,
    overdueCount: 0,
  });

  // Add Debt Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [enableAlarm, setEnableAlarm] = useState(true);
  const [reflectInWallet, setReflectInWallet] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Payment Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState<Debt | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(null);

  // Payment History Modal State
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [activeDebtForHistory, setActiveDebtForHistory] = useState<Debt | null>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<DebtPayment[]>([]);

  // Scheduled Alarm Trackers
  const [activeAlarms, setActiveAlarms] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      const [dList, accList, sumData] = await Promise.all([
        DebtRepository.getAll(activeTab),
        AccountRepository.getAll(true),
        DebtRepository.getDebtSummary(),
      ]);
      setDebts(dList);
      setAccounts(accList);
      setSummary(sumData);

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

  // Preset date helper (e.g. +7, +15, +30 days)
  const addDaysToToday = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleCreateDebt = async () => {
    const paisa = toPaisa(amountStr);
    if (!personName.trim()) {
      Alert.alert('Validation Error', t('validation').titleRequired || 'Person name is required.');
      return;
    }
    if (paisa <= 0) {
      Alert.alert('Validation Error', t('validation').amountRequired);
      return;
    }

    try {
      const created = await DebtRepository.create(
        {
          type: activeTab,
          person_name: personName.trim(),
          phone_number: phone.trim() || undefined,
          initial_amount: paisa,
          due_date: dueDate.trim() || undefined,
          account_id: reflectInWallet ? selectedAccountId : null,
          status: 'active',
          notes: notes.trim() || undefined,
        },
        reflectInWallet
      );

      // If user enabled alarm reminder and due date is set, schedule notification
      if (enableAlarm && dueDate.trim()) {
        const formattedAmt = formatCurrency(paisa, baseCurrency, language);
        await NotificationService.scheduleDebtAlarm(created, formattedAmt, language);
        setActiveAlarms((prev) => ({ ...prev, [created.id]: true }));
      }

      setCreateModalVisible(false);
      setPersonName('');
      setPhone('');
      setAmountStr('');
      setDueDate('');
      setNotes('');
      setEnableAlarm(true);
      triggerRefresh();
      await loadData();

      Alert.alert(
        language === 'bn' ? 'সফল হয়েছে!' : 'Success!',
        enableAlarm && dueDate.trim()
          ? language === 'bn'
            ? 'দেনা/পাওনার হিসাব সংরক্ষিত হয়েছে এবং নির্ধারিত তারিখে অ্যালার্ম সেট করা হয়েছে!'
            : 'Debt record saved and alarm reminder scheduled for due date!'
          : language === 'bn'
          ? 'দেনা/পাওনার হিসাব সফলভাবে সংরক্ষিত হয়েছে।'
          : 'Debt record saved successfully.'
      );
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
      Alert.alert('Validation Error', t('validation').amountRequired);
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
      setPaymentAmountStr('');
      setPaymentNotes('');
      triggerRefresh();
      await loadData();
      Alert.alert(
        language === 'bn' ? 'পরিশোধ রেকর্ড সম্পন্ন' : 'Payment Recorded',
        language === 'bn'
          ? 'টাকা পরিশোধের হিসাব সংরক্ষিত হয়েছে এবং ওয়ালেটে সমন্বয় করা হয়েছে।'
          : 'Payment recorded and wallet balance reconciled.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record payment');
    }
  };

  const handleToggleAlarm = async (debt: Debt) => {
    if (!debt.due_date) {
      Alert.alert(
        language === 'bn' ? 'তারিখ নেই' : 'No Due Date',
        language === 'bn'
          ? 'অ্যালার্ম সেট করার জন্য আগে একটি পরিশোধের শেষ তারিখ নির্ধারণ করতে হবে।'
          : 'Please set a due date to schedule an alarm.'
      );
      return;
    }

    const isCurrentlyActive = !!activeAlarms[debt.id];
    if (isCurrentlyActive) {
      await NotificationService.cancelDebtAlarm(debt.id);
      setActiveAlarms((prev) => ({ ...prev, [debt.id]: false }));
      Alert.alert('Alarm', t('alarmCancelled'));
    } else {
      const formattedAmt = formatCurrency(debt.remaining_amount, baseCurrency, language);
      const scheduled = await NotificationService.scheduleDebtAlarm(debt, formattedAmt, language);
      if (scheduled) {
        setActiveAlarms((prev) => ({ ...prev, [debt.id]: true }));
        Alert.alert(
          'Alarm',
          `${t('alarmSetSuccess')} (${formatDisplayDate(debt.due_date, language)} @ 09:00 AM)`
        );
      }
    }
  };

  const handleMakeCall = (phoneNum: string) => {
    Linking.openURL(`tel:${phoneNum}`);
  };

  const handleSendReminderSMS = (debt: Debt) => {
    if (!debt.phone_number) return;
    const formattedAmt = formatCurrency(debt.remaining_amount, baseCurrency, language);
    const dateFormatted = debt.due_date ? formatDisplayDate(debt.due_date, language) : 'শীঘ্রই';

    const msg =
      language === 'bn'
        ? debt.type === 'they_owe_me'
          ? `সালাম ${debt.person_name}, PocketFlow রিমাইন্ডার অনুযায়ী আপনার কাছে ${formattedAmt} টাকা পাওনা রয়েছে (পরিশোধের শেষ তারিখ: ${dateFormatted})। অনুগ্রহ করে টাকাটি পরিশোধ করবেন। ধন্যবাদ!`
          : `সালাম ${debt.person_name}, আমি আপনাকে ${formattedAmt} টাকা ফেরত দেওয়ার কথা মনে রেখেছি (তারিখ: ${dateFormatted})। খুব দ্রুতই পরিশোধ করে দেব। ধন্যবাদ!`
        : debt.type === 'they_owe_me'
        ? `Hello ${debt.person_name}, gentle reminder that ${formattedAmt} is due for payment on ${dateFormatted}. Thank you!`
        : `Hello ${debt.person_name}, confirming that I will repay ${formattedAmt} by ${dateFormatted}. Thank you!`;

    Linking.openURL(`sms:${debt.phone_number}?body=${encodeURIComponent(msg)}`);
  };

  const openHistoryModal = async (debt: Debt) => {
    try {
      const history = await DebtRepository.getPayments(debt.id);
      setActiveDebtForHistory(debt);
      setPaymentsHistory(history);
      setHistoryModalVisible(true);
    } catch (e) {
      console.warn('Error loading payment history:', e);
    }
  };

  const handleDeleteDebt = (id: string) => {
    Alert.alert(t('delete'), 'Are you sure you want to delete this debt record?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await NotificationService.cancelDebtAlarm(id);
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

  // Filter debts by status
  const todayStr = getTodayDateString();
  const filteredDebts = debts.filter((d) => {
    if (filterStatus === 'settled') return d.status === 'settled';
    if (filterStatus === 'active') return d.status === 'active' && d.remaining_amount > 0;
    if (filterStatus === 'overdue') {
      return d.status === 'active' && d.due_date && d.due_date < todayStr;
    }
    return true;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={t('debtAndLending')}
        subtitle="Manage receivables, liabilities & alarms"
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ==================== 1. TOP NET BALANCE CARDS ==================== */}
        <View style={styles.summaryContainer}>
          {/* Card 1: Total to Receive */}
          <View style={[styles.summaryCard, { backgroundColor: colors.incomeBg, borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="arrow-down-circle" size={16} color={colors.income} />
              <Text style={[styles.summaryCardTitle, { color: colors.income }]}>{t('totalReceivable')}</Text>
            </View>
            <Text style={[styles.summaryCardAmount, { color: colors.income }]}>
              {renderAmount(summary.totalTheyOweMe)}
            </Text>
          </View>

          {/* Card 2: Total to Pay */}
          <View style={[styles.summaryCard, { backgroundColor: colors.expenseBg, borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="arrow-up-circle" size={16} color={colors.expense} />
              <Text style={[styles.summaryCardTitle, { color: colors.expense }]}>{t('totalPayable')}</Text>
            </View>
            <Text style={[styles.summaryCardAmount, { color: colors.expense }]}>
              {renderAmount(summary.totalIOwe)}
            </Text>
          </View>

          {/* Card 3: Net Balance */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.summaryCardHeader}>
              <Ionicons
                name="wallet-outline"
                size={16}
                color={summary.netBalance >= 0 ? colors.primary : colors.danger}
              />
              <Text style={[styles.summaryCardTitle, { color: colors.textSecondary }]}>
                {t('netDebtBalance')}
              </Text>
            </View>
            <Text
              style={[
                styles.summaryCardAmount,
                { color: summary.netBalance >= 0 ? colors.primary : colors.danger },
              ]}
            >
              {renderAmount(summary.netBalance)}
            </Text>
          </View>
        </View>

        {/* Overdue Warning Alert Banner */}
        {summary.overdueCount > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.alertBannerText, { color: colors.danger }]}>
              {language === 'bn'
                ? `⚠️ ${summary.overdueCount} টি পাওনা/দেনার মেয়াদ শেষ হয়েছে! অনুগ্রহ করে দ্রুত তাগাদা দিন।`
                : `⚠️ ${summary.overdueCount} record(s) overdue! Follow up or settle repayments.`}
            </Text>
          </View>
        )}

        {/* ==================== 2. MAIN TABS (I OWE vs THEY OWE ME) ==================== */}
        <View style={[styles.tabBar, { backgroundColor: colors.cardSecondary }]}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'they_owe_me' && [styles.tabItemActive, { backgroundColor: colors.income }],
            ]}
            onPress={() => setActiveTab('they_owe_me')}
          >
            <Ionicons
              name="cash-outline"
              size={16}
              color={activeTab === 'they_owe_me' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'they_owe_me' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {t('moneyOwedToMe')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'i_owe' && [styles.tabItemActive, { backgroundColor: colors.expense }],
            ]}
            onPress={() => setActiveTab('i_owe')}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={activeTab === 'i_owe' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'i_owe' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {t('moneyIOwe')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ==================== 3. FILTER CHIPS ==================== */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
          {(['all', 'active', 'overdue', 'settled'] as FilterStatus[]).map((st) => {
            const isSelected = filterStatus === st;
            const label =
              st === 'all'
                ? t('all')
                : st === 'active'
                ? t('active')
                : st === 'overdue'
                ? t('overdue')
                : t('settled');

            return (
              <TouchableOpacity
                key={st}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilterStatus(st)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ==================== 4. LIST OF DEBTS ==================== */}
        {filteredDebts.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={language === 'bn' ? 'কোনো হিসাব পাওয়া যায়নি' : 'No Records in this Section'}
            description={
              language === 'bn'
                ? 'কার কাছে কত টাকা পাবেন বা কার টাকা ফেরত দিতে হবে তা লিখে রাখুন ও অ্যালার্ম সেট করুন।'
                : 'Keep your personal lending, borrowing, and repayment alarms organized.'
            }
            actionLabel={t('addDebt')}
            onPressAction={() => setCreateModalVisible(true)}
          />
        ) : (
          filteredDebts.map((d) => {
            const isSettled = d.status === 'settled' || d.remaining_amount === 0;
            const isOverdue = !isSettled && d.due_date && d.due_date < todayStr;
            const isDueToday = !isSettled && d.due_date && d.due_date === todayStr;
            const isAlarmOn = !!activeAlarms[d.id];

            return (
              <View
                key={d.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isOverdue ? colors.danger : colors.borderSubtle,
                  },
                ]}
              >
                {/* Header row: Avatar, Name, Status Badge, Amount */}
                <View style={styles.cardHeader}>
                  <View style={styles.personRow}>
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor:
                            activeTab === 'they_owe_me' ? `${colors.income}25` : `${colors.expense}25`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarInitial,
                          { color: activeTab === 'they_owe_me' ? colors.income : colors.expense },
                        ]}
                      >
                        {d.person_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.personName, { color: colors.text }]}>{d.person_name}</Text>
                      {d.phone_number ? (
                        <Text style={[styles.phoneText, { color: colors.textSecondary }]}>
                          {d.phone_number}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Amounts */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.remainingText,
                        { color: activeTab === 'they_owe_me' ? colors.income : colors.expense },
                      ]}
                    >
                      {renderAmount(d.remaining_amount)}
                    </Text>
                    <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
                      Total: {renderAmount(d.initial_amount)}
                    </Text>
                  </View>
                </View>

                {/* Status Badges & Due Date */}
                <View style={styles.badgeRow}>
                  {isSettled ? (
                    <View style={[styles.statusBadge, { backgroundColor: `${colors.income}20` }]}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.income} />
                      <Text style={[styles.statusBadgeText, { color: colors.income }]}>
                        {t('settled')}
                      </Text>
                    </View>
                  ) : isOverdue ? (
                    <View style={[styles.statusBadge, { backgroundColor: `${colors.danger}20` }]}>
                      <Ionicons name="alert-circle" size={14} color={colors.danger} />
                      <Text style={[styles.statusBadgeText, { color: colors.danger }]}>
                        {t('overdue')}
                      </Text>
                    </View>
                  ) : isDueToday ? (
                    <View style={[styles.statusBadge, { backgroundColor: `${colors.warning}20` }]}>
                      <Ionicons name="alarm" size={14} color={colors.warning} />
                      <Text style={[styles.statusBadgeText, { color: colors.warning }]}>
                        {t('dueToday')}
                      </Text>
                    </View>
                  ) : null}

                  {d.due_date ? (
                    <View style={styles.dueWrap}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.dueText, { color: colors.textSecondary }]}>
                        {formatDisplayDate(d.due_date, language)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: colors.cardSecondary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, (d.paid_amount / d.initial_amount) * 100)}%`,
                        backgroundColor: activeTab === 'they_owe_me' ? colors.income : colors.expense,
                      },
                    ]}
                  />
                </View>

                {/* Action Buttons: Alarm, Call, SMS, Ledger History, Record Payment */}
                <View style={styles.cardActionsRow}>
                  <View style={styles.quickContactRow}>
                    {/* Alarm Toggle Button */}
                    {!isSettled && (
                      <TouchableOpacity
                        style={[
                          styles.actionIconBtn,
                          {
                            backgroundColor: isAlarmOn ? colors.warning : colors.cardSecondary,
                          },
                        ]}
                        onPress={() => handleToggleAlarm(d)}
                        accessibilityLabel="Set Alarm"
                      >
                        <Ionicons
                          name={isAlarmOn ? 'alarm' : 'alarm-outline'}
                          size={18}
                          color={isAlarmOn ? '#FFFFFF' : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    )}

                    {/* Direct Call Button */}
                    {d.phone_number ? (
                      <TouchableOpacity
                        style={[styles.actionIconBtn, { backgroundColor: `${colors.income}20` }]}
                        onPress={() => handleMakeCall(d.phone_number!)}
                        accessibilityLabel="Call"
                      >
                        <Ionicons name="call" size={16} color={colors.income} />
                      </TouchableOpacity>
                    ) : null}

                    {/* Direct SMS/Reminder Button */}
                    {d.phone_number && !isSettled ? (
                      <TouchableOpacity
                        style={[styles.actionIconBtn, { backgroundColor: `${colors.planning}20` }]}
                        onPress={() => handleSendReminderSMS(d)}
                        accessibilityLabel="Send SMS"
                      >
                        <Ionicons name="chatbubble-ellipses" size={16} color={colors.planning} />
                      </TouchableOpacity>
                    ) : null}

                    {/* Payment History Button */}
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { backgroundColor: colors.cardSecondary }]}
                      onPress={() => openHistoryModal(d)}
                      accessibilityLabel="History"
                    >
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.rightActionBtns}>
                    {!isSettled && (
                      <TouchableOpacity
                        style={[styles.payBtn, { backgroundColor: colors.primary }]}
                        onPress={() => openPaymentModal(d)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.payBtnText}>{t('recordPayment')}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteDebt(d.id)}
                      accessibilityLabel="Delete"
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* ==================== MODAL: ADD DEBT RECORD ==================== */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('addDebt')} ({activeTab === 'they_owe_me' ? t('lent') : t('borrowed')})
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Person Name */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('personName')}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={personName}
                onChangeText={setPersonName}
                placeholder="যেমন: রহিম ভাই, করিম চাচা, বাপ্পী"
                placeholderTextColor={colors.textMuted}
              />

              {/* Amount */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>{t('amount')}</Text>
              <AmountInput
                value={amountStr}
                onChangeText={setAmountStr}
                currency={baseCurrency}
              />

              {/* Account Selector */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>{t('account')}</Text>
              <AccountSelector
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
              />

              {/* Phone Number */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>{t('phoneNumber')}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="017xxxxxxxx"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />

              {/* Due Date & Quick Presets */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>{t('dueDate')} (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder={getTodayDateString()}
                placeholderTextColor={colors.textMuted}
              />

              {/* Quick Preset Buttons for Date */}
              <View style={styles.presetDateRow}>
                <TouchableOpacity
                  style={[styles.presetDateBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={() => setDueDate(addDaysToToday(7))}
                >
                  <Text style={[styles.presetDateText, { color: colors.text }]}>+৭ দিন</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetDateBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={() => setDueDate(addDaysToToday(15))}
                >
                  <Text style={[styles.presetDateText, { color: colors.text }]}>+১৫ দিন</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetDateBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={() => setDueDate(addDaysToToday(30))}
                >
                  <Text style={[styles.presetDateText, { color: colors.text }]}>+১ মাস</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetDateBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={() => setDueDate(addDaysToToday(60))}
                >
                  <Text style={[styles.presetDateText, { color: colors.text }]}>+২ মাস</Text>
                </TouchableOpacity>
              </View>

              {/* Alarm Reminder Switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>{t('setAlarm')}</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    নির্ধারিত তারিখে সকাল ০৯:০০ টায় জোরালো অ্যালার্ম বাজবে
                  </Text>
                </View>
                <Switch
                  value={enableAlarm}
                  onValueChange={setEnableAlarm}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              {/* Reflect in Wallet Balance */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>ওয়ালেটের সাথে ব্যালেন্স আপডেট করুন</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    টাকা লেনদেনের পর অ্যাকাউন্টের ক্যাশ স্বয়ংক্রিয়ভাবে বাড়াবে/কমাবে
                  </Text>
                </View>
                <Switch
                  value={reflectInWallet}
                  onValueChange={setReflectInWallet}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              {/* Optional Notes */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>{t('notes')}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text, height: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="লেনদেনের কোনো বিশেষ শর্ত বা বিবরণ..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateDebt}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: RECORD PAYMENT ==================== */}
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
              {language === 'bn' ? 'পরিশোধের টাকার পরিমাণ' : 'Payment Amount'}
            </Text>
            <AmountInput
              value={paymentAmountStr}
              onChangeText={setPaymentAmountStr}
              currency={baseCurrency}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              {language === 'bn' ? 'কোন অ্যাকাউন্ট থেকে বা অ্যাকাউন্টে জমা হবে' : 'Payment Account'}
            </Text>
            <AccountSelector
              accounts={accounts}
              selectedAccountId={paymentAccountId}
              onSelectAccount={(acc) => setPaymentAccountId(acc.id)}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>{t('notes')}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.cardSecondary, borderColor: colors.border, color: colors.text }]}
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              placeholder="যেমন: ১ম কিস্তি বা আংশিক পরিশোধ"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
              onPress={handleSavePayment}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSaveText}>{t('confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: PAYMENT HISTORY LEDGER ==================== */}
      <Modal visible={historyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('paymentHistory')}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  {activeDebtForHistory?.person_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {paymentsHistory.length === 0 ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginTop: 8 }}>{t('noPaymentsYet')}</Text>
                </View>
              ) : (
                paymentsHistory.map((p) => (
                  <View
                    key={p.id}
                    style={[styles.historyRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyDate, { color: colors.text }]}>
                        {formatDisplayDate(p.date, language)}
                      </Text>
                      {p.account_name ? (
                        <Text style={[styles.historyAccount, { color: colors.textSecondary }]}>
                          Account: {p.account_name}
                        </Text>
                      ) : null}
                      {p.notes ? (
                        <Text style={[styles.historyNote, { color: colors.textMuted }]}>{p.notes}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.historyAmount, { color: colors.income }]}>
                      +{renderAmount(p.amount)}
                    </Text>
                  </View>
                ))
              )}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  summaryCardTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryCardAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  alertBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 6,
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
  filterChipScroll: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginVertical: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
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
    fontSize: 17,
    fontWeight: '800',
  },
  totalLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quickContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
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
  presetDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetDateBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetDateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  modalSaveBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 5,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyAccount: {
    fontSize: 11,
    marginTop: 2,
  },
  historyNote: {
    fontSize: 11,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
});

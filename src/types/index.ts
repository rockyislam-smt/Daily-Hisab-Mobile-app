export type AccountType =
  | 'cash'
  | 'pocket'
  | 'bank'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'savings'
  | 'credit_card'
  | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  opening_balance: number; // in paisa/minor units
  current_balance: number; // in paisa/minor units
  currency: string;
  description?: string;
  color: string;
  icon: string;
  is_active: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  account_id: string;
  destination_account_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  amount: number; // in paisa/minor units (positive)
  fee?: number; // transfer fee in paisa
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  datetime: string; // ISO 8601
  title: string;
  notes?: string | null;
  payment_method?: string | null;
  attachment_uri?: string | null;
  is_recurring?: number;
  recurring_rule_id?: string | null;
  related_planned_id?: string | null;
  related_debt_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  account_name?: string;
  destination_account_name?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  subcategory_name?: string;
}

export interface Category {
  id: string;
  name: string;
  name_bn?: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  name_bn?: string;
  created_at: string;
}

export interface DailyBalance {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  opening_balance: number; // paisa
  total_income: number; // paisa
  total_expense: number; // paisa
  calculated_closing_balance: number; // paisa
  actual_closing_balance?: number | null; // paisa
  difference?: number; // paisa (actual - calculated)
  status: 'open' | 'confirmed' | 'reconciled';
  notes?: string | null;
  reconciliation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceAdjustment {
  id: string;
  date: string;
  account_id: string;
  account_name?: string;
  previous_balance: number;
  adjusted_balance: number;
  difference: number;
  reason: string;
  created_at: string;
}

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface Budget {
  id: string;
  name: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
  amount: number; // in paisa
  category_id?: string | null;
  category_name?: string;
  notify_70: number;
  notify_90: number;
  notify_100: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  spent_amount?: number;
  remaining_amount?: number;
  percentage?: number;
}

export type PlannedStatus = 'planned' | 'upcoming' | 'due' | 'paid' | 'overdue' | 'cancelled';

export interface PlannedExpense {
  id: string;
  title: string;
  expected_amount: number; // in paisa
  category_id?: string | null;
  category_name?: string;
  account_id?: string | null;
  account_name?: string;
  due_date: string; // YYYY-MM-DD
  reminder_date?: string | null;
  description?: string | null;
  status: PlannedStatus;
  converted_transaction_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpectedStatus = 'expected' | 'partially_received' | 'received' | 'overdue' | 'cancelled';

export interface ExpectedIncome {
  id: string;
  title: string;
  expected_amount: number; // paisa
  received_amount: number; // paisa
  category_id?: string | null;
  category_name?: string;
  account_id?: string | null;
  account_name?: string;
  due_date: string;
  source_client?: string | null;
  status: ExpectedStatus;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number; // paisa
  current_savings: number; // paisa
  target_date: string; // YYYY-MM-DD
  description?: string | null;
  category?: string | null;
  is_completed: number;
  created_at: string;
  updated_at: string;
  // Computed
  progress_percentage?: number;
  remaining_amount?: number;
}

export interface SavingsContribution {
  id: string;
  goal_id: string;
  account_id: string;
  account_name?: string;
  amount: number; // paisa
  type: 'deposit' | 'withdrawal';
  date: string;
  notes?: string | null;
  transaction_id?: string | null;
  created_at: string;
}

export type DebtType = 'i_owe' | 'they_owe_me';
export type DebtStatus = 'active' | 'settled' | 'overdue' | 'cancelled';

export interface Debt {
  id: string;
  type: DebtType;
  person_name: string;
  phone_number?: string | null;
  initial_amount: number; // paisa
  paid_amount: number; // paisa
  remaining_amount: number; // paisa
  due_date?: string | null;
  account_id?: string | null;
  account_name?: string;
  status: DebtStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  account_id: string;
  account_name?: string;
  amount: number; // paisa
  date: string;
  notes?: string | null;
  transaction_id?: string | null;
  created_at: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number; // paisa
  category_id?: string | null;
  category_name?: string;
  account_id: string;
  account_name?: string;
  destination_account_id?: string | null;
  destination_account_name?: string;
  frequency: RecurrenceFrequency;
  interval: number;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  next_occurrence: string; // YYYY-MM-DD
  is_active: number;
  last_generated?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrencyRate {
  currency_code: string;
  name: string;
  symbol: string;
  rate_to_base: number; // 1 unit of this currency = X base currency (BDT)
  updated_at: string;
}

export interface ShoppingList {
  id: string;
  title: string;
  budget_amount: number; // in paisa
  total_spent: number;   // in paisa
  account_id?: string | null;
  account_name?: string;
  category_id?: string | null;
  category_name?: string;
  target_date: string;   // YYYY-MM-DD
  status: 'active' | 'completed' | 'cancelled';
  transaction_id?: string | null;
  notes?: string | null;
  items_count?: number;
  purchased_count?: number;
  items?: ShoppingItem[];
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  list_id: string;
  item_name: string;
  quantity?: string | null;
  estimated_amount: number; // in paisa
  actual_amount: number;    // in paisa
  is_purchased: number;     // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  language: 'en' | 'bn';
  base_currency: string;
  theme_mode: 'light' | 'dark' | 'system';
  is_app_lock_enabled: boolean;
  lock_type: 'pin' | 'password' | 'none';
  is_biometrics_enabled: boolean;
  lock_timeout_minutes: number;
  hide_balances_by_default: boolean;
  default_account_id?: string | null;
  week_start_day: 0 | 1 | 6; // Sunday, Monday, Saturday
  date_format: string;
  user_profile_name: string;
  is_onboarding_completed: boolean;
  notify_budget_alerts: boolean;
  notify_bill_reminders: boolean;
  notify_daily_summary: boolean;
  daily_reminder_time: string; // e.g. "20:00"
}

export interface DashboardMetrics {
  totalAvailableBalance: number; // paisa
  totalCashInHand: number;
  totalBankBalance: number;
  totalMobileWalletBalance: number;
  todayIncome: number;
  todayExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalSavings: number;
  upcomingExpenses: number;
  upcomingIncome: number;
  remainingMonthlyBudget: number;
  netWorth: number;
}

export type DateFilterType =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';


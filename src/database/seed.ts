import { Category, Account, CurrencyRate } from '../types';
import { getTodayDateString, getCurrentISOString } from '../utils/date';

export const DEFAULT_INCOME_CATEGORIES: Array<Omit<Category, 'id' | 'is_active' | 'created_at' | 'updated_at'>> = [
  { name: 'Salary', name_bn: 'বেতন', type: 'income', icon: 'cash-outline', color: '#10B981', is_default: 1 },
  { name: 'Freelancing', name_bn: 'ফ্রিল্যান্সিং', type: 'income', icon: 'laptop-outline', color: '#3B82F6', is_default: 1 },
  { name: 'Client Payment', name_bn: 'ক্লায়েন্ট পেমেন্ট', type: 'income', icon: 'briefcase-outline', color: '#6366F1', is_default: 1 },
  { name: 'Business Income', name_bn: 'ব্যবসা থেকে আয়', type: 'income', icon: 'storefront-outline', color: '#8B5CF6', is_default: 1 },
  { name: 'Shopify Development', name_bn: 'শপিফাই ডেভেলপমেন্ট', type: 'income', icon: 'code-slash-outline', color: '#EC4899', is_default: 1 },
  { name: 'Affiliate Income', name_bn: 'অ্যাফিলিয়েট আয়', type: 'income', icon: 'link-outline', color: '#F59E0B', is_default: 1 },
  { name: 'Bonus', name_bn: 'বোনাস', type: 'income', icon: 'gift-outline', color: '#14B8A6', is_default: 1 },
  { name: 'Gift', name_bn: 'উপহার', type: 'income', icon: 'heart-outline', color: '#F43F5E', is_default: 1 },
  { name: 'Investment Returns', name_bn: 'বিনিয়োগ মুনাফা', type: 'income', icon: 'trending-up-outline', color: '#059669', is_default: 1 },
  { name: 'Other Income', name_bn: 'অন্যান্য আয়', type: 'income', icon: 'wallet-outline', color: '#64748B', is_default: 1 },
];

export const DEFAULT_EXPENSE_CATEGORIES: Array<Omit<Category, 'id' | 'is_active' | 'created_at' | 'updated_at'>> = [
  { name: 'Food & Groceries', name_bn: 'খাবার ও বাজার', type: 'expense', icon: 'restaurant-outline', color: '#EF4444', is_default: 1 },
  { name: 'Transportation', name_bn: 'যাতায়াত', type: 'expense', icon: 'car-outline', color: '#F97316', is_default: 1 },
  { name: 'Shopping', name_bn: 'কেনাকাটা', type: 'expense', icon: 'cart-outline', color: '#EC4899', is_default: 1 },
  { name: 'Housing & Rent', name_bn: 'বাসা ভাড়া', type: 'expense', icon: 'home-outline', color: '#8B5CF6', is_default: 1 },
  { name: 'Electricity Bill', name_bn: 'বিদ্যুৎ বিল', type: 'expense', icon: 'flash-outline', color: '#FBBF24', is_default: 1 },
  { name: 'Gas Bill', name_bn: 'গ্যাস বিল', type: 'expense', icon: 'flame-outline', color: '#F59E0B', is_default: 1 },
  { name: 'Internet Bill', name_bn: 'ইন্টারনেট বিল', type: 'expense', icon: 'wifi-outline', color: '#06B6D4', is_default: 1 },
  { name: 'Mobile Bills & Recharge', name_bn: 'মোবাইল রিচার্জ', type: 'expense', icon: 'phone-portrait-outline', color: '#3B82F6', is_default: 1 },
  { name: 'Health & Medical', name_bn: 'চিকিৎসা ও ওষুধ', type: 'expense', icon: 'medkit-outline', color: '#10B981', is_default: 1 },
  { name: 'Education', name_bn: 'পড়াশোনা', type: 'expense', icon: 'school-outline', color: '#6366F1', is_default: 1 },
  { name: 'Family', name_bn: 'পরিবার ও উপহার', type: 'expense', icon: 'people-outline', color: '#A855F7', is_default: 1 },
  { name: 'Personal Care', name_bn: 'ব্যক্তিগত যত্ন', type: 'expense', icon: 'sparkles-outline', color: '#D946EF', is_default: 1 },
  { name: 'Entertainment', name_bn: 'বিনোদন ও আড্ডা', type: 'expense', icon: 'film-outline', color: '#E11D48', is_default: 1 },
  { name: 'Travel & Tours', name_bn: 'ভ্রমণ ও ট্যুর', type: 'expense', icon: 'airplane-outline', color: '#0EA5E9', is_default: 1 },
  { name: 'Business Expenses', name_bn: 'ব্যবসায়িক খরচ', type: 'expense', icon: 'business-outline', color: '#475569', is_default: 1 },
  { name: 'Software & Tools', name_bn: 'সফটওয়্যার ও টুলস', type: 'expense', icon: 'hardware-chip-outline', color: '#4F46E5', is_default: 1 },
  { name: 'Subscriptions', name_bn: 'সাবস্ক্রিপশন', type: 'expense', icon: 'calendar-outline', color: '#7C3AED', is_default: 1 },
  { name: 'Other Expenses', name_bn: 'অন্যান্য খরচ', type: 'expense', icon: 'ellipsis-horizontal-circle-outline', color: '#64748B', is_default: 1 },
];

export const DEFAULT_ACCOUNTS = [
  {
    id: 'acc_cash_hand',
    name: 'Cash in Hand',
    type: 'cash' as const,
    opening_balance: 0,
    current_balance: 0,
    currency: 'BDT',
    description: 'Physical cash in wallet or purse',
    color: '#10B981',
    icon: 'wallet-outline',
  },
  {
    id: 'acc_pocket_money',
    name: 'Pocket Money',
    type: 'pocket' as const,
    opening_balance: 0,
    current_balance: 0,
    currency: 'BDT',
    description: 'Daily petty cash & small changes',
    color: '#0D9488',
    icon: 'cash-outline',
  },
  {
    id: 'acc_bkash',
    name: 'bKash Wallet',
    type: 'bkash' as const,
    opening_balance: 0,
    current_balance: 0,
    currency: 'BDT',
    description: 'Personal bKash account',
    color: '#E2136E',
    icon: 'phone-portrait-outline',
  },
  {
    id: 'acc_bank',
    name: 'Primary Bank Account',
    type: 'bank' as const,
    opening_balance: 0,
    current_balance: 0,
    currency: 'BDT',
    description: 'Savings/Salary bank account',
    color: '#2563EB',
    icon: 'card-outline',
  },
];

export const DEFAULT_CURRENCY_RATES = [
  { currency_code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rate_to_base: 1.0 },
  { currency_code: 'USD', name: 'US Dollar', symbol: '$', rate_to_base: 120.0 },
  { currency_code: 'EUR', name: 'Euro', symbol: '€', rate_to_base: 130.0 },
  { currency_code: 'GBP', name: 'British Pound', symbol: '£', rate_to_base: 155.0 },
  { currency_code: 'INR', name: 'Indian Rupee', symbol: '₹', rate_to_base: 1.45 },
];


# 💰 PocketFlow (পকেটফ্লো)
### Production-Ready Offline Personal Finance & Daily Hisab Mobile Application

PocketFlow is a premium, modern, 100% offline-first personal financial management application built with **React Native**, **Expo SDK 58**, **TypeScript**, **Expo Router**, and **SQLite**.

Designed for complete user privacy and autonomy, PocketFlow operates entirely on-device without requiring internet access, cloud databases, user registration, or login credentials. Every family member can install the APK independently on their own Android smartphone, maintaining their own isolated financial records.

---

## 🌟 Key Product Highlights

- 🔒 **100% Offline & Private:** All financial data remains strictly on the user's phone inside a high-speed SQLite database with WAL mode and foreign key integrity.
- ⚡ **Zero Registration:** No phone numbers, emails, passwords, cloud sync, or third-party tracking required.
- 🇧🇩 **Bangla & English Localization:** Full native language switching with accurate Bengali Unicode typography, ৳ (BDT) currency symbol, and Bengali numeral support.
- 📅 **Daily Hisab & Money Diary:** Morning opening balance carry-forward, cash-in-hand reconciliation, difference auditing, and a chronological money diary timeline.
- 🧮 **Precision Minor-Unit Math:** All money is stored in integer minor units (paisa), completely eliminating IEEE 754 floating-point rounding errors.
- 🛡️ **Optional App Lock & Biometrics:** PIN (4 or 6 digits), password, and biometric unlock (Fingerprint / Face ID) with SHA-256 encrypted credential hashing via `expo-secure-store`.
- 💾 **Manual Encrypted Backup & Restore:** Export full database backups as JSON, CSV spreadsheets, and printable PDF reports. Supports password-based AES-256 encrypted backups.

---

## 📱 Implemented Feature Modules

| # | Feature Module | Status | Description |
|---|---|---|---|
| 1 | **Dashboard** | ✅ Complete | Total available balance, cash in hand, bank balance, mobile wallets, today's income/expense, monthly totals, income vs expense charts, expense breakdown, and date filtering. |
| 2 | **Quick Transaction Entry** | ✅ Complete | Record transactions in seconds. Amount shortcuts (+৳50, +৳100, +৳200, +৳500, +৳1000), account and category selectors, auto date/time, and note support. |
| 3 | **Income Tracking** | ✅ Complete | Default categories (Salary, Freelancing, Client Payment, Business, Shopify Dev, Affiliate, Bonus, Gift, Investment Returns, Other), custom categories, and history. |
| 4 | **Expense Tracking** | ✅ Complete | Default categories (Food, Transportation, Shopping, Housing, Utilities, Internet, Mobile Bills, Health, Education, Family, Personal Care, Entertainment, Travel, Software, etc.) with custom subcategories. |
| 5 | **Wallet & Account Management** | ✅ Complete | Manage Cash in Hand, Pocket Money, Bank Accounts, bKash, Nagad, Rocket, Savings Accounts, and Credit Cards. Internal transfers with fee handling. |
| 6 | **Daily Opening & Closing Balance** | ✅ Complete | Automatic carry-forward of previous closing balance to morning opening balance. Daily formula: `Opening + Income - Expense = Calculated Closing`. |
| 7 | **Daily Cash Tracker** | ✅ Complete | Real-time cash tracking with shortage/surplus calculation, adjustment reasons, and daily reconciliation confirmation. |
| 8 | **Daily Money Diary** | ✅ Complete | Chronological timeline showing morning balance, incoming/outgoing transactions, transfers, running balance, and evening closing. |
| 9 | **Planned Expenses** | ✅ Complete | Schedule future bills with due dates. Convert to actual expense with 1-tap, preventing double-counting. |
| 10 | **Expected Income** | ✅ Complete | Track anticipated client invoices and salary with partial payment receipts and remaining balance. |
| 11 | **Monthly Budgets** | ✅ Complete | Monthly, weekly, and yearly category budgets with spent amounts, remaining amounts, and visual progress bars. |
| 12 | **Savings Goals** | ✅ Complete | Set targets for Emergency Fund, Gadgets, Travel, etc. Track deposits, withdrawals, and progress percentages without inflating net balance. |
| 13 | **Debt & Lending (দেনা/পাওনা)** | ✅ Complete | Distinguish 'Money I Owe' (borrowed) vs 'Money Owed to Me' (lent). Partial payment recording, settlement tracking, and wallet reflection. |
| 14 | **Recurring Transactions** | ✅ Complete | Daily, weekly, monthly, and yearly recurring rules. Auto-generates transactions on due dates without duplicate generation. |
| 15 | **Financial Calendar** | ✅ Complete | Monthly interactive calendar with income and expense indicator dots. Tap any date to view and record transactions. |
| 16 | **Financial Analytics & Insights** | ✅ Complete | Category distribution, 6-month trend tables, savings rates, top spending categories, and month-over-month comparisons. |
| 17 | **Local Cash Flow Forecasting** | ✅ Complete | Mathematical projection of month-end balance based on daily average burn rate and days remaining in the month. |
| 18 | **Multi-Currency Support** | ✅ Complete | Base currency selection (BDT default, USD, EUR, GBP, INR) with offline exchange rate conversions. |
| 19 | **Local Notifications** | ✅ Complete | 100% offline reminders for evening hisab logging (configurable time) and budget warning triggers. |
| 20 | **Security & App Lock** | ✅ Complete | Optional PIN/Password protection with fingerprint/Face unlock, inactivity timeout, and secure credential storage. |
| 21 | **Encrypted Backup & Restore** | ✅ Complete | Password-protected AES encrypted backup files (`.pfenc`), standard JSON exports, and safety snapshots before restore. |
| 22 | **CSV & PDF Export** | ✅ Complete | Export complete transaction ledger to CSV and print/share formatted financial summary reports as PDF. |
| 23 | **Theme System** | ✅ Complete | Emerald Green primary fintech palette with Dark Navy secondary, supporting Light Mode, Dark Mode, and System Default. |

---

## 🏗️ Architecture & Technology Stack

```
PocketFlow/
├── assets/                  # App icon, adaptive icon, splash screen images
├── src/
│   ├── app/                 # Expo Router file-based navigation
│   │   ├── (tabs)/          # Bottom navigation tabs (Home, Transactions, Add, Analytics, Planning)
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── transactions.tsx
│   │   │   ├── add.tsx
│   │   │   ├── analytics.tsx
│   │   │   └── planning.tsx
│   │   ├── _layout.tsx      # Root Stack layout with database & security initialization
│   │   ├── accounts-manager.tsx
│   │   ├── budgets-manager.tsx
│   │   ├── calendar.tsx
│   │   ├── daily-cash-tracker.tsx
│   │   ├── debts-manager.tsx
│   │   ├── money-diary.tsx
│   │   ├── onboarding.tsx
│   │   ├── recurring-manager.tsx
│   │   ├── savings-manager.tsx
│   │   └── settings.tsx
│   ├── components/          # Reusable UI design system components
│   │   ├── AccountSelector.tsx
│   │   ├── AmountInput.tsx
│   │   ├── BalanceCard.tsx
│   │   ├── CategorySelector.tsx
│   │   ├── DateFilterTabs.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Header.tsx
│   │   ├── LockScreenModal.tsx
│   │   ├── QuickActions.tsx
│   │   ├── SimpleChart.tsx
│   │   └── TransactionCard.tsx
│   ├── database/            # SQLite Data Access Layer
│   │   ├── db.ts            # Expo SQLite database instance & transactions
│   │   ├── schema.ts        # Normalized DDL table statements & indexes
│   │   ├── seed.ts          # Default categories, accounts, and currencies
│   │   └── repositories/    # Isolated repositories (Account, Transaction, DailyBalance, etc.)
│   ├── hooks/               # Custom React hooks (useThemeColors, useTranslation)
│   ├── localization/        # English and Bangla dictionaries and translation helpers
│   ├── services/            # Security, Backup (AES/JSON/CSV/PDF), and Notification services
│   ├── store/               # Zustand persistent global state
│   ├── theme/               # Emerald fintech color palette and typography
│   ├── types/               # TypeScript data models and interfaces
│   └── utils/               # Precision minor-unit money math, date helpers, and crypto
├── __tests__/               # Automated unit & integration tests
├── app.json                 # Expo production app metadata
├── eas.json                 # EAS build profiles for Android APK and Google Play AAB
└── package.json
```

---

## ⚖️ Financial Calculation Rules

PocketFlow strictly adheres to 15 golden financial rules:

1. **Income:** Increases the designated account balance by the exact amount.
2. **Expense:** Decreases the designated account balance by the exact amount.
3. **Internal Transfers:** Deducts `(amount + fee)` from the source account and credits `amount` to the destination account. Net wealth change is strictly `-fee` (or `0` if fee is `0`).
4. **Transfer Exclusion:** Internal transfers are **never** counted towards total income or total expense.
5. **No Double-Counting in Savings:** Savings goal deposits originate from existing liquid accounts, preventing inflated net worth calculations.
6. **Planned Expenses:** Remain non-affecting commitments until explicitly converted to actual expenses.
7. **Expected Income:** Does not increase liquid balances until marked as received.
8. **Partial Debt Repayments:** Directly reduce the liability or receivable principal balance while updating liquid cash accounts.
9. **Transaction Edits:** Automatically reverse the prior transaction impact before applying the updated amount and account effect.
10. **Transaction Deletion:** Restores previous balances with full integrity.
11. **Daily Equation:** `Morning Opening Balance + Income - Expense = Calculated Closing Balance`.
12. **Carry-Forward Rule:** Confirmed actual closing balance of day `N` automatically seeds morning opening balance of day `N+1`.
13. **Reconciliation Auditing:** Any difference between physical cash count and calculated balance is logged in `balance_adjustments` with a mandatory reason.
14. **Precision Representation:** Minor units (`paisa`) eliminate floating-point representation drift.
15. **Calendar Consistency:** All date boundaries are calculated consistently in local time.

---

## 🧪 Automated Test Suite

PocketFlow includes automated Jest test suites covering financial arithmetic, crypto backup security, translation keys, and financial calculation rules:

```bash
# Run all tests
npm test
```

### Verified Test Results:
```text
PASS __tests__/crypto-backup.test.ts
PASS __tests__/security-localization.test.ts
PASS __tests__/money.test.ts
PASS __tests__/financial-rules.test.ts

Test Suites: 4 passed, 4 total
Tests:       20 passed, 20 total
Snapshots:   0 total
Time:        5.111 s
Ran all test suites.
```

---

## 🚀 Development & Local Run

### Prerequisites
- Node.js (v20+ recommended)
- Android Studio / Expo Go app on your physical Android phone

### Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Verify TypeScript typing
npx tsc --noEmit

# 3. Start Expo local development server
npm start
```

Press `a` in the terminal to launch in an Android Emulator, or scan the QR code using the **Expo Go** application on your physical Android smartphone.

---

## 📦 Building Android APK (Direct Installation)

To generate a standalone APK that can be installed on any physical Android device without Expo Go:

### Option A: Using EAS Build (Cloud / Automated)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Build the preview APK:
   ```bash
   eas build -p android --profile preview
   ```
4. Once completed, download the `.apk` file from the provided link and copy it to your phone.

### Option B: Local Android Build (Requires Android SDK & JDK)

```bash
# Prebuild native Android project
npx expo prebuild --platform android

# Compile release APK locally
cd android
./gradlew assembleRelease
```
The output APK is generated at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 📲 How to Install the APK on a Physical Android Phone

1. **Transfer the APK:** Send the generated `.apk` file to your phone via USB cable, Google Drive, WhatsApp, or Bluetooth.
2. **Enable Unknown Sources:** If prompted, enable **"Install unknown apps"** in Android Settings for your file manager or browser.
3. **Install:** Tap the `.apk` file and tap **"Install"**.
4. **Open PocketFlow:** Launch PocketFlow directly from your app drawer. No internet connection or login is needed!

---

## 🛍️ Google Play Store Publishing Checklist

To publish PocketFlow to Google Play:

1. **Application ID:** Confirmed as `com.pocketflow.finance` in `app.json`.
2. **Version Code & Name:** `version: "1.0.0"`, `versionCode: 1`.
3. **Android App Bundle (AAB):**
   ```bash
   eas build -p android --profile production
   ```
   This generates an optimized `.aab` file ready for the Google Play Console.
4. **App Icons & Graphics:**
   - App Icon: 512x512 PNG with adaptive background (`#0D3B2E`)
   - Feature Graphic: 1024x500 PNG
   - Screenshots: At least 4 screenshots (Dashboard, Daily Cash Tracker, Analytics, Planning)
5. **Data Safety Form:**
   - Under Data Collection: Select **"No data is collected or shared"** (PocketFlow is 100% offline).
   - Under Security Practices: Select **"Data is stored locally on device"**.
6. **Privacy Policy:** Include a standard offline application privacy policy stating that no personal or financial data is ever collected, transmitted, or sold.

---

## 📄 License

PocketFlow is developed for personal and commercial usage. All rights reserved.

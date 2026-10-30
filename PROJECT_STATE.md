# 📊 PocketFlow (পকেটফ্লো) — Project Handover & State Documentation
**Last Updated:** October 30, 2026  
**Developer & Architect:** Md Rocky Islam  
**Repository Location:** `D:\Antigravity\Daily-hisab`  
**Current Version:** `v1.0.1` (Production Build Complete)

---

## 🎯 1. Project Summary & Core Architecture

PocketFlow is a production-grade, 100% offline-first personal finance management mobile application built with **React Native**, **Expo SDK 58**, **TypeScript**, **Expo Router**, and **SQLite**.

### Key Architectural Principles:
1. **Zero Cloud & Zero Registration:** No user accounts, passwords, external servers, or telemetries. All data remains in the user's phone.
2. **SQLite Database with WAL Mode:** Fast, acid-compliant local storage with foreign keys enabled (`src/database/index.ts`).
3. **Integer Minor-Unit Arithmetic:** All currency amounts are converted to paisa (integer minor units) before any calculation or database write (`src/utils/money.ts`), eliminating floating-point rounding errors.
4. **Independent Device Operation:** Multiple family members can install the standalone APK on their respective phones with isolated databases.
5. **Bilingual Localization:** Seamless runtime switching between Bangla (বাংলা) and English (`src/localization/`).

---

## 🛠️ 2. Technology Stack & Key Dependencies

| Component | Library / Tool | Purpose |
|---|---|---|
| **Framework** | Expo SDK 58 (React Native 0.76+) | Core mobile framework |
| **Language** | TypeScript (Strict mode enabled) | Type safety |
| **Routing** | Expo Router v4 (File-based) | Native tabs & stack navigation |
| **Local DB** | Expo SQLite (Next API) | Relational database & indexes |
| **State** | Zustand | App-wide lightweight state management |
| **Security** | Expo SecureStore + Crypto | PIN/Password encryption & key storage |
| **Biometrics** | Expo LocalAuthentication | Fingerprint / Face ID unlock |
| **Storage & Export** | Expo FileSystem + Expo Sharing | JSON, CSV, PDF, and Encrypted Backups |
| **Reminders** | Expo Notifications | Offline bill & evening hisab reminders |
| **Build System** | EAS CLI + Android Studio (Gradle) | Cloud & local APK compilation |

---

## 📱 3. Implemented Features & File Map

### A. Core Screens (`src/app/`)
- `(tabs)/index.tsx`: **Financial Dashboard** — Total Balance, Cash/Bank/Wallet breakdown, Today's & Monthly Income/Expense cards, Income vs Expense charts, and recent activity.
- `(tabs)/transactions.tsx`: **Transactions Screen** — Advanced date, category, and account filtering, search, and full transaction history.
- `(tabs)/add.tsx`: **Quick Transaction Entry** — Fast Income, Expense, and Transfer recording with quick amounts (+৳50, +৳100, etc.) and built-in interactive calculator.
- `(tabs)/analytics.tsx`: **Analytics & Insights** — Category distribution, 6-month trends, savings rate, and month-end cash flow projections.
- `(tabs)/planning.tsx`: **Financial Planning** — Monthly Budgets with progress bars, Savings Goals, and Debts/Lending (দেনা/পাওনা).
- `daily-cash-tracker.tsx`: **Daily Cash Tracker** — Morning opening balance, money in/out, actual cash counting, shortage/surplus calculation.
- `daily-diary.tsx`: **Daily Money Diary** — Chronological audit timeline of every day's cash movements.
- `accounts.tsx`: **Account Management** — Cash in Hand, Bank Accounts, bKash, Nagad, Rocket, internal transfers.
- `calendar.tsx`: **Financial Calendar** — Interactive monthly calendar with income/expense indicator dots.
- `settings.tsx`: **Settings & Security** — Language switcher, Dark/Light theme, PIN/Biometric lock, encrypted backups, CSV/PDF export, Danger Zone reset.
- `onboarding.tsx`: **Onboarding Screen** — Welcome guide explaining offline-first nature with developer attribution badge.

### B. Recent Additions & Fixes Completed Today:
1. **Interactive In-line Calculator** (`src/components/AmountInput.tsx`):
   - Toggle button on transaction amount field.
   - Operations: `+`, `-`, `×`, `÷`, `(`, `)`, Clear (`C`), Backspace (`⌫`), and `=` evaluation.
   - Live calculation preview and 1-tap insert into amount field.
2. **Developer Attribution ("Developed by Md Rocky Islam")**:
   - Added to Settings footer (`src/app/settings.tsx`).
   - Added to Onboarding screen (`src/app/onboarding.tsx`).
   - Added to English (`src/localization/en.ts`) & Bangla (`src/localization/bn.ts`).
   - Added to project `README.md`.
3. **TypeScript & IDE Fix**:
   - Added `"jsx": "react-jsx"` to `tsconfig.json` compilerOptions to eliminate `Cannot use JSX unless the '--jsx' flag is provided` in editors.
   - Created `expo-env.d.ts` reference file.

---

## 🚀 4. Build & Release Artifacts

- **EAS Project:** `@mdrockyislam/pocketflow` (ID: `1c43ddf4-8ce9-4f3d-bd3a-749ecc5d1e9a`)
- **Latest Production APK:** `PocketFlow-v1.0.1.apk` (117 MB)
  - **Local Location:** `D:\Antigravity\Daily-hisab\PocketFlow-v1.0.1.apk`
  - **Cloud Download Link:** [Download PocketFlow v1.0.1 APK](https://expo.dev/artifacts/eas/FVSP0a5QnOy4O2gL_EAs4OUUWsJoEvnoxgQnX1vquxQ.apk)
  - **Build ID:** `2e8889d5-7030-46bb-9a1e-0ce0a4243223`

---

## 💻 5. Local Environment Configuration

- **Android SDK Path:** `C:\Users\Rocky\AppData\Local\Android\Sdk`
- **Android Studio Path:** `C:\Program Files\Android\Android Studio`
- **Java Home Path:** `C:\Program Files\Android\Android Studio\jbr`
- **ADB Executable:** `C:\Users\Rocky\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- **Android Emulator AVD:** `Medium_Phone_API_37.0` (Android 17)
- Environment variables `ANDROID_HOME` and `JAVA_HOME` are permanently configured in Windows User Environment Variables.

---

## 🧪 6. Testing & Quality Verification

All automated tests and type checks pass with zero errors:
- **Unit Tests:** `npm test` runs 4 test suites and 20 tests (100% passing):
  - `__tests__/money.test.ts` (Minor-unit math, formatting, currency conversion)
  - `__tests__/financial-rules.test.ts` (Closing balance formula, internal transfer integrity)
  - `__tests__/crypto-backup.test.ts` (AES encryption/decryption, checksum validation)
  - `__tests__/security-localization.test.ts` (PIN hashing, translation completeness)
- **TypeScript:** `npx tsc --noEmit` passes with 0 errors.

---

## 🔄 7. How to Resume Work Next Day (Quick Commands)

Whenever you open this project again, use these commands:

### 1. Start the Development Server (for live testing on emulator):
```bash
npx expo start
```
*Press `a` to load on Android Emulator or scan QR with Expo Go / Dev Build.*

### 2. Run All Tests:
```bash
npm test
```

### 3. Verify TypeScript Types:
```bash
npx tsc --noEmit
```

### 4. Build a New APK via Cloud (EAS):
```bash
npx eas-cli build -p android --profile preview
```

### 5. Install APK Directly to Connected Phone or Emulator:
```bash
C:\Users\Rocky\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r PocketFlow-v1.0.1.apk
```

---

## 📌 8. Future Roadmap / Next Day Wishlist

When resuming next time, here are recommended features to explore:
1. **Receipt / Invoice Photo Attachments:** Using `expo-image-picker` to take photos of paper receipts and save them locally.
2. **Custom Transfer Fees:** Automatically deducting bKash/Nagad Cash-Out fees (1.49% / 1.85%) during account transfers.
3. **Google Play Store Publishing:** Generating the production `.aab` (Android App Bundle) via `npx eas-cli build -p android --profile production`.
4. **App Shortcuts & Widgets:** Home screen quick buttons to add expenses in 1 tap.


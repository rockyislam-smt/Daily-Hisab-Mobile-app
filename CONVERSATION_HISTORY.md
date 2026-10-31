# 📜 PocketFlow — Complete Conversation & Project Chronology
**Project Name:** PocketFlow (পকেটফ্লো) — Offline Personal Finance Management  
**Lead Developer & Architect:** Md Rocky Islam  
**Workspace:** `D:\Antigravity\Daily-hisab`  
**Current Version:** `v1.0.1`  
**Last Updated:** October 31, 2026  

---

## 📖 Introduction & Purpose
This document preserves the entire conversational trajectory, business requirements, architectural decisions, technical problem solutions, bug fixes, and development milestones of **PocketFlow**. 

If you or another developer / AI assistant open this repository in the future, reading this single document gives 100% full context to seamlessly resume development from this exact point without losing any previous context.

---

## 🗓️ Complete Chronological Milestones

### Phase 1: Inception & Core Vision
- **User Request:** Design, architect, develop, and deliver a production-ready personal finance mobile application named **PocketFlow** ready for Android APK installation and future Google Play Store publishing.
- **Strict Product Constraints:**
  - 100% Offline-First. No mandatory internet, no user registration, no login, no remote database.
  - Local SQLite database with WAL mode and foreign key integrity.
  - Minor-unit (paisa) arithmetic across all operations to prevent floating-point rounding errors.
  - Independent phone operation: family members can install separately with isolated databases.
  - Default BDT currency with support for foreign currencies (USD, EUR, GBP, INR).
  - Bilingual support: runtime switching between Bengali (বাংলা) and English.
- **Delivered Architecture:**
  - Framework: React Native with Expo SDK 58, Expo Router v4, TypeScript.
  - SQLite database initialized at `src/database/db.ts` with schema in `src/database/schema.ts` and 11 dedicated repository classes in `src/database/repositories/`.
  - Global state management via Zustand (`src/store/useAppStore.ts`).
  - 11 complete screens: Dashboard, Transactions, Add Entry, Analytics, Planning, Daily Cash Tracker, Daily Money Diary, Accounts Manager, Calendar, Settings, and Onboarding.

---

### Phase 2: Android Studio & Windows Environment Setup
- **User Request:** "amar local macin a ki vabe ai full app ta run kore dekbo? amar andrid studio install ache pc te"
- **Actions Taken:**
  - Auto-discovered user's local installation paths:
    - Android SDK: `C:\Users\Rocky\AppData\Local\Android\Sdk`
    - Android Studio: `C:\Program Files\Android\Android Studio`
    - Java JDK (JBR): `C:\Program Files\Android\Android Studio\jbr`
    - ADB tool: `C:\Users\Rocky\AppData\Local\Android\Sdk\platform-tools\adb.exe`
  - Permanently set environment variables `ANDROID_HOME`, `JAVA_HOME`, and updated user PATH in Windows.
  - Started the Android Virtual Device: `Medium_Phone_API_37.0` (`emulator-5554`).

---

### Phase 3: Production Build (EAS Cloud) & Live Emulator Test
- **User Request:** "okk ami chai tumi amake apk file dao jeta ami amar phone install kore dekte parbo"
- **Actions Taken:**
  - Connected user's Expo account: `@mdrockyislam/pocketflow` (ID: `1c43ddf4-8ce9-4f3d-bd3a-749ecc5d1e9a`).
  - Configured `eas.json` with `preview` build profile (`buildType: "apk"`).
  - Executed EAS cloud build: Build ID `0e5eb193-9bd9-4de1-bddb-12c669eb9dd2`.
  - Downloaded `PocketFlow-v1.0.0.apk` (117 MB).
  - Installed onto live Android emulator via `adb install` and verified with live screen capture.

---

### Phase 4: In-line Calculator & Developer Attribution
- **User Request:** "ami calculator add korte chai -- also ami chai app develop by Md Rocky Islam ai ta likha thakuk production relise ar pore -- and ki vabe rebuild korbo say tao bolo"
- **Actions Taken:**
  1. **Fintech Calculator:** Upgraded `src/components/AmountInput.tsx` with a toggleable in-line calculator supporting `+`, `-`, `×`, `÷`, parentheses, clear `C`, backspace `⌫`, live real-time math evaluation preview, and `=` 1-tap insert.
  2. **Developer Attribution:** Added `"Developed by Md Rocky Islam"` to Settings footer (`src/app/settings.tsx`), Onboarding banner (`src/app/onboarding.tsx`), localization dictionaries (`en.ts` and `bn.ts`), and `README.md`.
  3. **Rebuild v1.0.1:** Executed cloud build via EAS CLI (Build ID: `2e8889d5-7030-46bb-9a1e-0ce0a4243223`) and downloaded `PocketFlow-v1.0.1.apk`.
  4. Direct Cloud Download URL: `https://expo.dev/artifacts/eas/FVSP0a5QnOy4O2gL_EAs4OUUWsJoEvnoxgQnX1vquxQ.apk`.

---

### Phase 5: TypeScript & Editor JSX Error Fix
- **User Request:** "Explain what this problem is and help me fix it: Cannot use JSX unless the '--jsx' flag is provided. @[src/app/settings.tsx:L209]"
- **Diagnosis:** The editor's TypeScript language server failed to resolve `extends: "expo/tsconfig.base"` synchronously when opening `.tsx` files.
- **Solution:** Explicitly declared `"jsx": "react-jsx"` under `compilerOptions` in `tsconfig.json` and generated `expo-env.d.ts` reference file. All TypeScript editor warnings cleared permanently.

---

### Phase 6: GitHub Remote Push & Multi-Account Permission Resolution
- **User Request:**
  ```bash
  git branch -M main
  git remote add origin https://github.com/rockyislam-smt/Daily-Hisab-Mobile-app.git
  git push -u origin main
  # akhn amar git hub a ai code gula push kore dao
  ```
- **Issue Encountered:** GitHub returned `403 Forbidden` (`Permission to rockyislam-smt/Daily-Hisab-Mobile-app.git denied to mdrockyislam-dev`). The user's Windows Credential Manager had cached credentials for their old GitHub account (`mdrockyislam-dev`).
- **Safety Fix:** Added `*.apk` and `*.aab` to `.gitignore` and removed the 117MB binary APK from git history via soft reset to prevent GitHub's 100MB file limit rejection.
- **Provided Options:**
  - Option 1 (Recommended): Add `mdrockyislam-dev` as a collaborator in repository settings.
  - Option 2: Run `cmdkey /delete:LegacyGeneric:target=git:https://github.com` to prompt fresh login as `rockyislam-smt`.
  - Option 3: Push using a Personal Access Token (PAT).

---

### Phase 7: Apple / iOS Compatibility & Google Play Store Consultation
- **User Request:** "ai same app apple ar jonno ki vabe build korbo???"
- **Guidance Delivered:**
  - Explained that React Native & Expo run identical code on iOS.
  - Explained that EAS Cloud builds on macOS servers, meaning a physical Mac is NOT required for building.
  - Documented 3 paths: Expo Go (Free, immediate QR scan on iPhone), iOS Simulator Build (Free on EAS), and Apple Developer Program ($99/yr) for TestFlight / App Store.
  - Configured `eas.json` with `"ios": { "simulator": true }`.
- **User Request:** "google play store a ki vabe amar build kora apta publice korbo aitar jonno ki kono tk lage naki??"
- **Guidance Delivered:**
  - One-time \$25 Google Play Console lifetime registration fee.
  - `.aab` production bundle creation command: `npx eas-cli build -p android --profile production`.
  - Data Safety declarations ("No data collected").
  - 14-day Closed Testing requirement for new Personal Developer accounts.

---

### Phase 8: Form Input Auto-Reset Fix
- **User Request:** "amar code a akta probem hocche seta holo akbar kono kichu input dile say input ar value gula theke jacche -- amm ta to how ar kotha na --- aita too amn hote hobe input add howar songe songe value gula muche jabe -- asa kori bujte perecho"
- **Diagnosis:** Bottom tabs in React Navigation remain mounted in memory. When saving or switching tabs, `amountStr`, `title`, `notes`, etc. were never cleared in state.
- **Solution:**
  - Added `resetForm()` in `src/app/(tabs)/add.tsx`.
  - Integrated `useFocusEffect` to ensure clean inputs on tab opening.
  - Added automatic form clearing in all modal handlers (`AmountInput.tsx`, `savings-manager.tsx`, `debts-manager.tsx`, `accounts-manager.tsx`, and `settings.tsx`).

---

### Phase 9: Advanced Debt & Lending with Audible Alarm Reminders
- **User Request:** "ami aro kichu feture chai jemon -- amar kache ke koto tk pai, ami kar kache koto tk pai, ami kobe take tk debo tar remainder, se amake kobe tk dibe tar remainder , ai rokm ar o ja ja ache tumi tomar moto kore add kore dao -- remainder ta alaram type hobe -- user expericen jeno valo hoi"
- **Delivered Features in `debts-manager.tsx`:**
  1. **Top Net Balance Cards:**
     - 🟢 **Total to Receive (আমি মোট পাবো):** Aggregates all unpaid money lent to others.
     - 🔴 **Total to Pay (আমি মোট দেব):** Aggregates all unpaid borrowed money.
     - 🔵 **Net Debt Balance (নেট বাকি):** Real-time net position (receivable minus payable).
     - ⚠️ **Overdue Banner:** Prominently alerts user if any loans have passed their due date.
  2. **Audible Alarm Reminder System (`NotificationService`):**
     - Configured Android High-Priority notification channel `debt_alarms` with max importance, sound, and vibration (`[0, 500, 250, 500]`).
     - Schedules automated alarm at **09:00 AM on the due date** with personalized bilingual messages.
     - One-tap bell icon (🔔) toggle on each card to enable/disable alarms with instant feedback.
  3. **Direct Contact Shortcuts:**
     - 📞 **One-Tap Call:** Opens native phone dialer directly from the card.
     - ✉️ **One-Tap SMS Tagada:** Generates polite, pre-formatted Bengali/English collection or repayment reminder SMS text and opens messaging app.
  4. **Due Date Presets:**
     - Quick buttons for `+৭ দিন`, `+১৫ দিন`, `+১ মাস`, `+২ মাস` in the entry form.
  5. **Repayment History Ledger:**
     - Dedicated modal displaying chronological installment history with dates, accounts, and partial amounts.
  6. **Automated Testing:**
     - Added Rule 8b unit test in `__tests__/financial-rules.test.ts`. 21/21 tests passing.

---

## 📂 Key File Locations

| File Path | Description |
|---|---|
| `src/app/(tabs)/index.tsx` | Main Financial Dashboard with cards, charts, filters |
| `src/app/(tabs)/add.tsx` | Quick Transaction Entry with auto-reset & calculator |
| `src/app/debts-manager.tsx` | Debt & Lending Manager with Net Balance, Alarms, Call/SMS |
| `src/components/AmountInput.tsx` | Amount input field with interactive fintech calculator |
| `src/database/repositories/debt.repository.ts` | Debt SQL operations, wallet reflections, and net summary |
| `src/services/notification.service.ts` | Offline notifications, daily reminders, and high-priority alarms |
| `src/localization/bn.ts` & `en.ts` | Bengali & English full translation dictionaries |
| `PROJECT_STATE.md` | Architectural handover state & quick commands |
| `PocketFlow-v1.0.1.apk` | Downloaded standalone production APK (117 MB) |

---

## ⚡ Quick Commands for Resuming

```bash
# 1. Start live development server
npx expo start

# 2. Run test suite
npm test

# 3. Verify TypeScript compilation
npx tsc --noEmit

# 4. Build a new Android APK via EAS Cloud
npx eas-cli build -p android --profile preview

# 5. Build iOS Simulator build (Free)
npx eas-cli build -p ios --profile preview

# 6. Generate Google Play Store AAB
npx eas-cli build -p android --profile production
```

---

*This document is permanently preserved in the Git repository root. You can pick up right from here anytime!*

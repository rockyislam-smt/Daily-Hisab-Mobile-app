export const SCHEMA_STATEMENTS = [
  // Accounts
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    opening_balance INTEGER NOT NULL DEFAULT 0,
    current_balance INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BDT',
    description TEXT,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Categories
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_bn TEXT,
    type TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Subcategories
  `CREATE TABLE IF NOT EXISTS subcategories (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_bn TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );`,

  // Transactions
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    account_id TEXT NOT NULL,
    destination_account_id TEXT,
    category_id TEXT,
    subcategory_id TEXT,
    amount INTEGER NOT NULL,
    fee INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    datetime TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    payment_method TEXT,
    attachment_uri TEXT,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurring_rule_id TEXT,
    related_planned_id TEXT,
    related_debt_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (destination_account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );`,

  // Daily Balances
  `CREATE TABLE IF NOT EXISTS daily_balances (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    opening_balance INTEGER NOT NULL,
    total_income INTEGER NOT NULL DEFAULT 0,
    total_expense INTEGER NOT NULL DEFAULT 0,
    calculated_closing_balance INTEGER NOT NULL,
    actual_closing_balance INTEGER,
    difference INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT,
    reconciliation_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Balance Adjustments
  `CREATE TABLE IF NOT EXISTS balance_adjustments (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    account_id TEXT NOT NULL,
    previous_balance INTEGER NOT NULL,
    adjusted_balance INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );`,

  // Budgets
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    period TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category_id TEXT,
    notify_70 INTEGER NOT NULL DEFAULT 1,
    notify_90 INTEGER NOT NULL DEFAULT 1,
    notify_100 INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );`,

  // Planned Expenses
  `CREATE TABLE IF NOT EXISTS planned_expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    expected_amount INTEGER NOT NULL,
    category_id TEXT,
    account_id TEXT,
    due_date TEXT NOT NULL,
    reminder_date TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    converted_transaction_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );`,

  // Expected Income
  `CREATE TABLE IF NOT EXISTS expected_income (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    expected_amount INTEGER NOT NULL,
    received_amount INTEGER NOT NULL DEFAULT 0,
    category_id TEXT,
    account_id TEXT,
    due_date TEXT NOT NULL,
    source_client TEXT,
    status TEXT NOT NULL DEFAULT 'expected',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );`,

  // Savings Goals
  `CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount INTEGER NOT NULL,
    current_savings INTEGER NOT NULL DEFAULT 0,
    target_date TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Savings Contributions
  `CREATE TABLE IF NOT EXISTS savings_contributions (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    transaction_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );`,

  // Debts (Money I owe / they owe me)
  `CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    person_name TEXT NOT NULL,
    phone_number TEXT,
    initial_amount INTEGER NOT NULL,
    paid_amount INTEGER NOT NULL DEFAULT 0,
    remaining_amount INTEGER NOT NULL,
    due_date TEXT,
    account_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );`,

  // Debt Payments
  `CREATE TABLE IF NOT EXISTS debt_payments (
    id TEXT PRIMARY KEY,
    debt_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    transaction_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );`,

  // Recurring Transactions
  `CREATE TABLE IF NOT EXISTS recurring_transactions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category_id TEXT,
    account_id TEXT NOT NULL,
    destination_account_id TEXT,
    frequency TEXT NOT NULL,
    interval INTEGER NOT NULL DEFAULT 1,
    start_date TEXT NOT NULL,
    end_date TEXT,
    next_occurrence TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_generated TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (destination_account_id) REFERENCES accounts(id)
  );`,

  // App Settings
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,

  // Currency Rates
  `CREATE TABLE IF NOT EXISTS currency_rates (
    currency_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    rate_to_base REAL NOT NULL DEFAULT 1.0,
    updated_at TEXT NOT NULL
  );`,

  // Smart Shopping Lists
  `CREATE TABLE IF NOT EXISTS shopping_lists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    budget_amount INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    account_id TEXT,
    category_id TEXT,
    target_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    transaction_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );`,

  // Shopping List Items
  `CREATE TABLE IF NOT EXISTS shopping_items (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity TEXT,
    estimated_amount INTEGER NOT NULL DEFAULT 0,
    actual_amount INTEGER NOT NULL DEFAULT 0,
    is_purchased INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
  );`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_dest_account ON transactions(destination_account_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`,
  `CREATE INDEX IF NOT EXISTS idx_daily_balances_date ON daily_balances(date);`,
  `CREATE INDEX IF NOT EXISTS idx_planned_due ON planned_expenses(due_date);`,
  `CREATE INDEX IF NOT EXISTS idx_expected_due ON expected_income(due_date);`,
  `CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);`,
  `CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_transactions(next_occurrence);`,
  `CREATE INDEX IF NOT EXISTS idx_shopping_lists_status ON shopping_lists(status);`,
  `CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_items(list_id);`,
];


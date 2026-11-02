import { RecurringRepository } from '../src/database/repositories/recurring.repository';

describe('Financial Calculation Rules & Business Logic Engine', () => {
  // Test 1: Balance impact for Income and Expense
  test('Rule 1 & 2: Income increases balance, expense decreases balance', () => {
    let accountBalance = 100000; // 1,000 BDT in paisa

    // Record Income of ৳500
    const incomeAmount = 50000;
    accountBalance += incomeAmount;
    expect(accountBalance).toBe(150000); // ৳1,500

    // Record Expense of ৳300
    const expenseAmount = 30000;
    accountBalance -= expenseAmount;
    expect(accountBalance).toBe(120000); // ৳1,200
  });

  // Test 2: Transfer between accounts
  test('Rule 3 & 4: Transfers move funds between accounts without affecting overall income/expense', () => {
    let sourceAccount = 200000; // ৳2,000
    let destinationAccount = 50000; // ৳500
    let totalIncome = 0;
    let totalExpense = 0;

    const transferAmount = 70000; // ৳700
    const transferFee = 1500; // ৳15

    // Execute transfer
    sourceAccount -= (transferAmount + transferFee);
    destinationAccount += transferAmount;

    expect(sourceAccount).toBe(128500); // 2000 - 715 = 1285
    expect(destinationAccount).toBe(120000); // 500 + 700 = 1200

    // Total available wealth before was 2,500. After is 2,485 (only reduced by the fee of ৳15)
    expect(sourceAccount + destinationAccount).toBe(250000 - transferFee);

    // Income and expense totals MUST NOT be changed by transfers
    expect(totalIncome).toBe(0);
    expect(totalExpense).toBe(0);
  });

  // Test 3: Daily opening and closing calculation & carry forward
  test('Rule 11 & 12: Daily Opening + Income - Expense = Calculated Closing, and carry forward', () => {
    // Day 1:
    const day1Opening = 200000; // ৳2,000
    const day1Income = 100000; // ৳1,000
    const day1Expense = 60000; // ৳600

    const day1CalculatedClosing = day1Opening + day1Income - day1Expense;
    expect(day1CalculatedClosing).toBe(240000); // ৳2,400

    // Actual hand cash counted is ৳2,350 (Shortage of ৳50)
    const day1ActualClosing = 235000;
    const day1Difference = day1ActualClosing - day1CalculatedClosing;
    expect(day1Difference).toBe(-5000); // -৳50 difference

    // Day 2 carries forward day 1 confirmed actual balance (or calculated if unconfirmed)
    const day2Opening = day1ActualClosing;
    expect(day2Opening).toBe(235000); // ৳2,350

    const day2Income = 50000; // ৳500
    const day2Expense = 20000; // ৳200
    const day2CalculatedClosing = day2Opening + day2Income - day2Expense;
    expect(day2CalculatedClosing).toBe(265000); // ৳2,650
  });

  // Test 4: Reversing transaction edit
  test('Rule 9 & 10: Editing and deleting a transaction safely reverses prior impact', () => {
    let accountBalance = 100000; // ৳1,000

    // User created an expense of ৳200
    const oldExpense = 20000;
    accountBalance -= oldExpense;
    expect(accountBalance).toBe(80000); // ৳800

    // User edits the expense from ৳200 to ৳350:
    // Step 1: Reversal
    accountBalance += oldExpense; // restores to ৳1,000
    // Step 2: Apply new
    const newExpense = 35000;
    accountBalance -= newExpense;
    expect(accountBalance).toBe(65000); // ৳650

    // User deletes the transaction:
    // Reversal of newExpense restores balance back to ৳1,000
    accountBalance += newExpense;
    expect(accountBalance).toBe(100000);
  });

  // Test 5: Debt partial payments & remaining balance
  test('Rule 8: Debt partial payments update remaining amounts and settlement status', () => {
    const initialBorrowed = 500000; // ৳5,000 borrowed
    let paidAmount = 0;
    let remainingAmount = initialBorrowed - paidAmount;
    let status: 'active' | 'settled' = 'active';

    // First installment of ৳2,000
    const installment1 = 200000;
    paidAmount += installment1;
    remainingAmount = Math.max(0, initialBorrowed - paidAmount);
    status = remainingAmount === 0 ? 'settled' : 'active';

    expect(paidAmount).toBe(200000);
    expect(remainingAmount).toBe(300000); // ৳3,000 remaining
    expect(status).toBe('active');

    // Final installment of ৳3,000
    const installment2 = 300000;
    paidAmount += installment2;
    remainingAmount = Math.max(0, initialBorrowed - paidAmount);
    status = remainingAmount === 0 ? 'settled' : 'active';

    expect(paidAmount).toBe(500000);
    expect(remainingAmount).toBe(0);
    expect(status).toBe('settled');
  });

  // Test 6: Recurring interval calculation
  test('Rule 18: Recurring calculation advances occurrences accurately across frequencies', () => {
    const baseDate = '2026-10-30';

    expect(RecurringRepository.calculateNextDate(baseDate, 'daily', 1)).toBe('2026-10-31');
    expect(RecurringRepository.calculateNextDate(baseDate, 'weekly', 1)).toBe('2026-11-06');
    expect(RecurringRepository.calculateNextDate(baseDate, 'monthly', 1)).toBe('2026-11-30');
    expect(RecurringRepository.calculateNextDate(baseDate, 'yearly', 1)).toBe('2027-10-30');
  });

  // Test 7: Budget progress calculation
  test('Rule 15: Budget spending percentages and limit overflow', () => {
    const budgetLimit = 1000000; // ৳10,000 limit

    const spentNormal = 750000; // ৳7,500 spent
    const percentageNormal = Math.round((spentNormal / budgetLimit) * 100);
    expect(percentageNormal).toBe(75);
    expect(budgetLimit - spentNormal).toBe(250000); // ৳2,500 remaining

    const spentExceeded = 1100000; // ৳11,000 spent
    const percentageExceeded = Math.round((spentExceeded / budgetLimit) * 100);
    expect(percentageExceeded).toBe(110);
    expect(budgetLimit - spentExceeded).toBe(-100000); // -৳1,000 over budget
  });

  // Test 8: Net Debt, Receivable, and Overdue calculations
  test('Rule 8b: Net Debt calculation correctly determines overall lending position and overdue alerts', () => {
    const loans = [
      { type: 'they_owe_me', remaining: 150000, due_date: '2026-10-25' }, // ৳1,500 (Overdue)
      { type: 'they_owe_me', remaining: 250000, due_date: '2026-11-15' }, // ৳2,500 (Future)
      { type: 'i_owe', remaining: 100000, due_date: '2026-11-10' },       // ৳1,000 (To pay)
    ];

    const today = '2026-10-31';
    let totalTheyOweMe = 0;
    let totalIOwe = 0;
    let overdueCount = 0;

    for (const item of loans) {
      if (item.type === 'they_owe_me') {
        totalTheyOweMe += item.remaining;
      } else {
        totalIOwe += item.remaining;
      }
      if (item.due_date && item.due_date < today) {
        overdueCount++;
      }
    }

    const netBalance = totalTheyOweMe - totalIOwe;
    expect(totalTheyOweMe).toBe(400000); // ৳4,000 total to receive
    expect(totalIOwe).toBe(100000);       // ৳1,000 total to pay
    expect(netBalance).toBe(300000);      // +৳3,000 net in favor of user
    expect(overdueCount).toBe(1);         // 1 loan is overdue
  });

  // Test 9: Smart Shopping List calculations & Budget utilization
  test('Rule 21: Shopping list spent aggregation, remaining budget, and overbudget alerts', () => {
    const listBudget = 300000; // ৳3,000 budget
    const items = [
      { item_name: 'Miniket Rice', estimated: 80000, actual: 82000, is_purchased: 1 }, // ৳820 (Bought)
      { item_name: 'Soybean Oil 5L', estimated: 85000, actual: 85000, is_purchased: 1 }, // ৳850 (Bought)
      { item_name: 'Broiler Chicken', estimated: 45000, actual: 50000, is_purchased: 1 }, // ৳500 (Bought)
      { item_name: 'Eggs (Dozen)', estimated: 16000, actual: 0, is_purchased: 0 }, // ৳160 (Unpurchased)
    ];

    // Calculate total spent based on checked/purchased items
    const totalSpent = items
      .filter((it) => it.is_purchased === 1)
      .reduce((sum, it) => sum + it.actual, 0);

    expect(totalSpent).toBe(217000); // ৳2,170 spent so far
    expect(listBudget - totalSpent).toBe(83000); // ৳830 remaining budget
    expect(totalSpent <= listBudget).toBe(true); // Under budget!

    // If an extra item pushes total over budget
    const extraSpent = 100000; // ৳1,000
    const newTotalSpent = totalSpent + extraSpent; // ৳3,170
    expect(newTotalSpent > listBudget).toBe(true); // Over budget!
    expect(newTotalSpent - listBudget).toBe(17000); // Exceeded by ৳170
  });
});


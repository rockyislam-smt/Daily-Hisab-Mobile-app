import { toPaisa, fromPaisa } from '../src/utils/money';
import { en } from '../src/localization/en';
import { bn } from '../src/localization/bn';

describe('Shopping List Live Market Price Variance Tests', () => {
  test('converts market item prices accurately to and from Paisa minor units', () => {
    // User scenario: Rice ৳22, Oil ৳90, Actual Oil ৳88
    const riceEstPaisa = toPaisa('22');
    const oilEstPaisa = toPaisa('90');
    const oilActPaisa = toPaisa('88');

    expect(riceEstPaisa).toBe(2200);
    expect(oilEstPaisa).toBe(9000);
    expect(oilActPaisa).toBe(8800);

    expect(fromPaisa(riceEstPaisa)).toBe(22);
    expect(fromPaisa(oilActPaisa)).toBe(88);
  });

  test('calculates item-level market price variance correctly (savings vs extra cost)', () => {
    // 1. Same Price (e.g. Rice: Est ৳22, Act ৳22)
    const riceEst = toPaisa('22');
    const riceAct = toPaisa('22');
    const riceDiff = riceEst - riceAct;
    expect(riceDiff).toBe(0);

    // 2. Savings (e.g. Oil: Est ৳90, Act ৳88 -> Savings ৳2)
    const oilEst = toPaisa('90');
    const oilAct = toPaisa('88');
    const oilSavings = oilEst - oilAct;
    expect(oilSavings).toBe(200); // ৳2.00 savings in paisa
    expect(fromPaisa(oilSavings)).toBe(2);

    // 3. Extra Cost / Price Surge (e.g. Onion: Est ৳50, Act ৳55 -> Extra ৳5)
    const onionEst = toPaisa('50');
    const onionAct = toPaisa('55');
    const onionDiff = onionEst - onionAct;
    expect(onionDiff).toBe(-500); // -৳5.00 extra cost
    expect(fromPaisa(Math.abs(onionDiff))).toBe(5);
  });

  test('calculates net market list savings and over/under budget correctly', () => {
    const items = [
      { name: 'চাল', est: toPaisa('22'), act: toPaisa('22'), purchased: true },
      { name: 'তেল', est: toPaisa('90'), act: toPaisa('88'), purchased: true },
      { name: 'ডিম', est: toPaisa('150'), act: toPaisa('145'), purchased: true }, // ৳5 savings
      { name: 'মশলা', est: toPaisa('60'), act: 0, purchased: false }, // not yet purchased
    ];

    const purchased = items.filter((i) => i.purchased);
    const totalEst = purchased.reduce((sum, i) => sum + i.est, 0);
    const totalAct = purchased.reduce((sum, i) => sum + i.act, 0);
    const netSavings = totalEst - totalAct;

    expect(totalEst).toBe(toPaisa('262')); // 22 + 90 + 150 = 262
    expect(totalAct).toBe(toPaisa('255')); // 22 + 88 + 145 = 255
    expect(netSavings).toBe(toPaisa('7'));  // ৳7 total market savings!
    expect(fromPaisa(netSavings)).toBe(7);

    // Budget: ৳500
    const budget = toPaisa('500');
    const remainingBudget = budget - totalAct;
    expect(fromPaisa(remainingBudget)).toBe(245);
  });

  test('ensures bilingual market variance localization keys are fully synchronized', () => {
    const requiredKeys = [
      'shoppingLists',
      'createShoppingList',
      'confirmMarketPrice',
      'livePriceVariance',
      'estPrice',
      'realPrice',
      'savings',
      'extraCost',
      'samePrice',
      'totalMarketSavings',
      'totalMarketExtraCost',
      'confirmPurchase',
      'keepEstimated',
      'quickAdjust',
      'finishAndAddToExpense',
    ];

    for (const key of requiredKeys) {
      expect((bn as any)[key]).toBeDefined();
      expect((en as any)[key]).toBeDefined();
      expect(typeof (bn as any)[key]).toBe('string');
      expect(typeof (en as any)[key]).toBe('string');
    }
  });
});

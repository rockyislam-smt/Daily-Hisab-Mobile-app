import {
  toPaisa,
  fromPaisa,
  formatCurrency,
  toBengaliNumerals,
  getCurrencySymbol,
} from '../src/utils/money';

describe('Financial Money Arithmetic & Zero-Floating-Point Precision', () => {
  test('converts decimal amounts accurately to integer minor units (paisa)', () => {
    expect(toPaisa(100)).toBe(10000);
    expect(toPaisa('100.50')).toBe(10050);
    expect(toPaisa('0.10')).toBe(10);
    expect(toPaisa('0.20')).toBe(20);
    // Classical IEEE 754 float trap: 0.1 + 0.2 = 0.30000000000000004
    // In paisa: 10 + 20 = 30 paisa
    expect(toPaisa(0.1) + toPaisa(0.2)).toBe(30);
    expect(toPaisa('1,250.75')).toBe(125075);
    expect(toPaisa('0')).toBe(0);
    expect(toPaisa('-50.25')).toBe(-5025);
  });

  test('converts integer paisa to floating display amounts', () => {
    expect(fromPaisa(10050)).toBe(100.5);
    expect(fromPaisa(5000)).toBe(50);
    expect(fromPaisa(0)).toBe(0);
  });

  test('formats currency with symbol in English and Bengali', () => {
    // English BDT
    expect(formatCurrency(500000, 'BDT', 'en')).toBe('৳5,000');
    expect(formatCurrency(5025, 'BDT', 'en', true)).toBe('৳50.25');

    // Bengali numerals
    const bnFormatted = formatCurrency(500000, 'BDT', 'bn');
    expect(bnFormatted).toBe('৳৫,০০০');

    const bnDecimal = formatCurrency(5025, 'BDT', 'bn', true);
    expect(bnDecimal).toBe('৳৫০.২৫');
  });

  test('converts English digits to Bengali digits', () => {
    expect(toBengaliNumerals('0123456789')).toBe('০১২৩৪৫৬৭৮৯');
    expect(toBengaliNumerals('1,500.50')).toBe('১,৫০০.৫০');
  });

  test('resolves correct currency symbols', () => {
    expect(getCurrencySymbol('BDT')).toBe('৳');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(getCurrencySymbol('GBP')).toBe('£');
    expect(getCurrencySymbol('INR')).toBe('₹');
  });
});


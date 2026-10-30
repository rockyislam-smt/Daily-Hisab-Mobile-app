/**
 * Money calculation utilities ensuring 100% precision.
 * All internal values in the database are stored as integers (minor units: paisa / cents).
 * 1 BDT = 100 Paisa.
 */

// Bengali numeral map
const BN_DIGITS: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
  '.': '.',
  ',': ',',
  '-': '-',
};

/**
 * Converts decimal number or string to integer paisa.
 * E.g., 100.50 -> 10050, "50" -> 5000, 0.1 -> 10
 */
export function toPaisa(amount: number | string): number {
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Converts integer paisa to floating decimal representation.
 * E.g., 10050 -> 100.5
 */
export function fromPaisa(paisa: number): number {
  if (!paisa || isNaN(paisa)) return 0;
  return paisa / 100;
}

/**
 * Converts an English number string to Bengali numerals.
 */
export function toBengaliNumerals(str: string): string {
  return str
    .split('')
    .map((char) => BN_DIGITS[char] || char)
    .join('');
}

/**
 * Returns the currency symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string = 'BDT'): string {
  switch (currency.toUpperCase()) {
    case 'BDT':
      return '৳';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    default:
      return currency;
  }
}

/**
 * Formats paisa into a human-readable currency string.
 * Supports English and Bengali localization.
 */
export function formatCurrency(
  paisa: number,
  currency: string = 'BDT',
  language: 'en' | 'bn' = 'en',
  showDecimal: boolean = false
): string {
  const isNegative = paisa < 0;
  const absPaisa = Math.abs(paisa);
  const decimalValue = absPaisa / 100;

  const symbol = getCurrencySymbol(currency);

  let formattedNumber: string;
  if (showDecimal || absPaisa % 100 !== 0) {
    formattedNumber = decimalValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    formattedNumber = decimalValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  if (language === 'bn') {
    formattedNumber = toBengaliNumerals(formattedNumber);
  }

  const sign = isNegative ? '-' : '';
  return `${sign}${symbol}${formattedNumber}`;
}

/**
 * Formats raw amount directly for input display.
 */
export function formatAmountInput(val: string): string {
  // Allow only digits and a single decimal point
  const sanitized = val.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return sanitized;
}

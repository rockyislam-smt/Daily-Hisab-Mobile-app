import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import { DateFilterType } from '../types';

export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getCurrentTimeString(): string {
  return format(new Date(), 'HH:mm:ss');
}

export function getCurrentISOString(): string {
  return new Date().toISOString();
}

export function formatDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthName(monthIndex: number, language: 'en' | 'bn' = 'en'): string {
  if (language === 'bn') {
    return BENGALI_MONTHS[monthIndex] || '';
  }
  return ENGLISH_MONTHS[monthIndex] || '';
}

export function formatDisplayDate(dateStr: string, language: 'en' | 'bn' = 'en'): string {
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    if (language === 'bn') {
      const day = date.getDate().toString();
      const month = BENGALI_MONTHS[date.getMonth()];
      const year = date.getFullYear().toString();
      // import toBengaliNumerals safely
      const bnDay = day.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
      const bnYear = year.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
      return `${bnDay} ${month}, ${bnYear}`;
    }

    return format(date, 'dd MMM, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDisplayTime(timeStr: string, language: 'en' | 'bn' = 'en'): string {
  try {
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? (language === 'bn' ? 'অপরাহ্ন' : 'PM') : (language === 'bn' ? 'পূর্বাহ্ন' : 'AM');
    hours = hours % 12 || 12;
    const hourStr = hours < 10 ? `0${hours}` : `${hours}`;
    if (language === 'bn') {
      const bnTime = `${hourStr}:${minutes}`.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
      return `${bnTime} ${ampm}`;
    }
    return `${hourStr}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

export function getDateRange(
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string,
  language: 'en' | 'bn' = 'en'
): DateRange {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  switch (filter) {
    case 'today':
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: language === 'bn' ? 'আজ' : 'Today',
      };
    case 'yesterday': {
      const yDate = subDays(now, 1);
      const yStr = format(yDate, 'yyyy-MM-dd');
      return {
        startDate: yStr,
        endDate: yStr,
        label: language === 'bn' ? 'গতকাল' : 'Yesterday',
      };
    }
    case 'this_week': {
      const start = startOfWeek(now, { weekStartsOn: 6 }); // Saturday for BD
      const end = endOfWeek(now, { weekStartsOn: 6 });
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        label: language === 'bn' ? 'এই সপ্তাহ' : 'This Week',
      };
    }
    case 'this_month': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        label: language === 'bn' ? 'এই মাস' : 'This Month',
      };
    }
    case 'last_month': {
      const prevMonthDate = subMonths(now, 1);
      const start = startOfMonth(prevMonthDate);
      const end = endOfMonth(prevMonthDate);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        label: language === 'bn' ? 'গত মাস' : 'Last Month',
      };
    }
    case 'this_year': {
      const start = startOfYear(now);
      const end = endOfYear(now);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        label: language === 'bn' ? 'এই বছর' : 'This Year',
      };
    }
    case 'custom':
      return {
        startDate: customStart || todayStr,
        endDate: customEnd || todayStr,
        label: language === 'bn' ? 'কাস্টম রেঞ্জ' : 'Custom Range',
      };
    default:
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: language === 'bn' ? 'আজ' : 'Today',
      };
  }
}


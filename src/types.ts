export type TransactionType = 'income' | 'expense';
export type Currency = 'CNY' | 'HKD' | 'USD' | 'EUR' | 'JPY' | 'GBP';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  rate: number; // Rate relative to base currency (CNY)
  enabled: boolean;
}

export const DEFAULT_CURRENCY_CONFIGS: CurrencyConfig[] = [
  { code: 'CNY', symbol: '¥', rate: 1, enabled: true },
  { code: 'HKD', symbol: 'HK$', rate: 0.92, enabled: true },
  { code: 'USD', symbol: '$', rate: 7.2, enabled: true },
  { code: 'EUR', symbol: '€', rate: 7.8, enabled: true },
  { code: 'JPY', symbol: '¥', rate: 0.048, enabled: true },
  { code: 'GBP', symbol: '£', rate: 9.1, enabled: true },
];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CNY: '¥',
  HKD: 'HK$',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
};

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: string;
  date: string; // ISO string
  note?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
}

export const CATEGORIES: Category[] = [
  // Expenses
  { id: 'food', name: '餐饮', icon: 'Utensils', type: 'expense' },
  { id: 'shopping', name: '购物', icon: 'ShoppingBag', type: 'expense' },
  { id: 'transport', name: '交通', icon: 'Bus', type: 'expense' },
  { id: 'entertainment', name: '娱乐', icon: 'Gamepad2', type: 'expense' },
  { id: 'housing', name: '住房', icon: 'Home', type: 'expense' },
  { id: 'medical', name: '医疗', icon: 'Stethoscope', type: 'expense' },
  { id: 'education', name: '教育', icon: 'GraduationCap', type: 'expense' },
  { id: 'other_exp', name: '其他支出', icon: 'MoreHorizontal', type: 'expense' },
  // Income
  { id: 'salary', name: '工资', icon: 'Wallet', type: 'income' },
  { id: 'bonus', name: '奖金', icon: 'Gift', type: 'income' },
  { id: 'investment', name: '投资', icon: 'TrendingUp', type: 'income' },
  { id: 'part_time', name: '兼职', icon: 'Clock', type: 'income' },
  { id: 'other_inc', name: '其他收入', icon: 'PlusCircle', type: 'income' },
];

export type TransactionType = 'expense' | 'income';
export type ViewMode = 'day' | 'month' | 'year';
export type TabKey = 'history' | 'trends' | 'health' | 'settings';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  note: string;
  date: string;
}

export interface CategoryDef {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  color: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rate: number;
  enabled: boolean;
}

export interface AppSettings {
  reminderEnabled: boolean;
  reminderTime: string;
  reminderMessage: string;
  currencyConfigs: CurrencyConfig[];
  hiddenTrendCategories: string[];
  hiddenPieCategories: string[];
  historyView: ViewMode;
  historyDate: string;
  trendView: ViewMode;
  lastBackupTime: string | null;
  lastReminderDate: string | null;
}

export interface CategoryStat {
  category: string;
  name: string;
  color: string;
  amount: number;
  count: number;
  percent: number;
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
}

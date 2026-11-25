export type TransactionType = 'expense' | 'income';
export type ViewMode = 'day' | 'month' | 'year';
export type TabKey = 'history' | 'trends' | 'health' | 'investment';

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

export type AssetType = 'active_fund' | 'nasdaq' | 'sp500' | 'cash';

export interface AssetSnapshot {
  id: string;
  month: string;
  type: AssetType;
  currency: string;
  amount: number;
  profit: number;
}

export interface AppSettings {
  currencyConfigs: CurrencyConfig[];
  hiddenTrendCategories: string[];
  hiddenPieCategories: string[];
  historyView: ViewMode;
  historyDate: string;
  trendView: ViewMode;
  lastBackupTime: string | null;
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

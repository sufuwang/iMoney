import type { AppSettings, CategoryDef, CurrencyConfig } from './types';

export const STORAGE_KEYS = {
  transactions: 'imoney_transactions',
  settings: 'imoney_settings',
} as const;

export const CATEGORIES: CategoryDef[] = [
  { id: 'food', name: '餐饮', icon: 'food', type: 'expense', color: '#e08b72' },
  { id: 'shopping', name: '购物', icon: 'shopping', type: 'expense', color: '#c887b6' },
  { id: 'transport', name: '交通', icon: 'transport', type: 'expense', color: '#7ba4d0' },
  { id: 'entertainment', name: '娱乐', icon: 'entertainment', type: 'expense', color: '#9d8ed3' },
  { id: 'housing', name: '居住', icon: 'housing', type: 'expense', color: '#7f8dc4' },
  { id: 'medical', name: '医疗', icon: 'medical', type: 'expense', color: '#d88787' },
  { id: 'education', name: '教育', icon: 'education', type: 'expense', color: '#71b8b2' },
  { id: 'communication', name: '通讯', icon: 'communication', type: 'expense', color: '#8bb3dc' },
  { id: 'fitness', name: '运动', icon: 'fitness', type: 'expense', color: '#dfa873' },
  { id: 'travel', name: '旅行', icon: 'travel', type: 'expense', color: '#74bba9' },
  { id: 'family', name: '亲子', icon: 'family', type: 'expense', color: '#d592a4' },
  { id: 'other_expense', name: '其他支出', icon: 'other', type: 'expense', color: '#9ba5b4' },
  { id: 'salary', name: '工资', icon: 'salary', type: 'income', color: '#66b694' },
  { id: 'provident_fund', name: '公积金提取', icon: 'fund', type: 'income', color: '#7ba4d0' },
  { id: 'bonus', name: '奖金', icon: 'bonus', type: 'income', color: '#d4b46f' },
  { id: 'investment', name: '投资', icon: 'investment', type: 'income', color: '#71b8b2' },
  { id: 'rent', name: '收租', icon: 'rent', type: 'income', color: '#8bb3dc' },
  { id: 'refund', name: '退款', icon: 'refund', type: 'income', color: '#9ba5b4' },
  { id: 'interest', name: '利息', icon: 'interest', type: 'income', color: '#d9aa75' },
  { id: 'reimbursement', name: '报销', icon: 'reimbursement', type: 'income', color: '#83aac5' },
  { id: 'second_hand', name: '二手', icon: 'secondhand', type: 'income', color: '#c69b80' },
  { id: 'lottery', name: '中奖', icon: 'lottery', type: 'income', color: '#d592a4' },
  { id: 'part_time', name: '兼职', icon: 'parttime', type: 'income', color: '#a9b975' },
  { id: 'other_income', name: '其他收入', icon: 'other', type: 'income', color: '#74bba9' },
];

export const CATEGORY_MAP: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((item) => [item.id, item]),
);

export const DEFAULT_CURRENCY_CONFIGS: CurrencyConfig[] = [
  { code: 'CNY', symbol: '¥', name: '人民币', rate: 1, enabled: true },
  { code: 'USD', symbol: '$', name: '美元', rate: 7.2, enabled: true },
  { code: 'EUR', symbol: '€', name: '欧元', rate: 7.8, enabled: true },
  { code: 'JPY', symbol: '¥', name: '日元', rate: 0.048, enabled: true },
  { code: 'GBP', symbol: '£', name: '英镑', rate: 9.1, enabled: true },
];

export const CHART_COLORS = [
  '#7ba4d0', '#66b694', '#e08b72', '#9d8ed3', '#71b8b2',
  '#c887b6', '#d4b46f', '#7f8dc4', '#a9b975', '#d88787',
  '#74bba9', '#d592a4',
];

export const VIEW_LABELS = { day: '按日', month: '按月', year: '按年' } as const;

export const DEFAULT_SETTINGS: AppSettings = {
  reminderEnabled: false,
  reminderTime: '20:00',
  reminderMessage: '记得记一笔账哦！',
  currencyConfigs: DEFAULT_CURRENCY_CONFIGS,
  hiddenTrendCategories: [],
  hiddenPieCategories: [],
  historyView: 'month',
  historyDate: new Date().toISOString(),
  trendView: 'month',
  lastBackupTime: null,
  lastReminderDate: null,
};

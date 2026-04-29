export type TransactionType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  note: string;
  date: string;
  currency: string;
}

export type Currency = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'GBP';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  rate: number;
  enabled: boolean;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
};

export const DEFAULT_CURRENCY_CONFIGS: CurrencyConfig[] = [
  { code: 'CNY', symbol: '¥', name: '人民币', rate: 1, enabled: true },
  { code: 'USD', symbol: '$', name: '美元', rate: 7.2, enabled: true },
  { code: 'EUR', symbol: '€', name: '欧元', rate: 7.8, enabled: true },
  { code: 'JPY', symbol: '¥', name: '日元', rate: 0.048, enabled: true },
  { code: 'GBP', symbol: '£', name: '英镑', rate: 9.1, enabled: true },
];

export const CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', icon: 'Utensils', type: 'expense', color: 'bg-orange-500' },
  { id: 'shopping', name: '购物', icon: 'ShoppingBag', type: 'expense', color: 'bg-pink-500' },
  { id: 'transport', name: '交通', icon: 'Bus', type: 'expense', color: 'bg-blue-500' },
  { id: 'entertainment', name: '娱乐', icon: 'Gamepad2', type: 'expense', color: 'bg-purple-500' },
  { id: 'housing', name: '居住', icon: 'Home', type: 'expense', color: 'bg-indigo-500' },
  { id: 'medical', name: '医疗', icon: 'Stethoscope', type: 'expense', color: 'bg-red-500' },
  { id: 'education', name: '教育', icon: 'GraduationCap', type: 'expense', color: 'bg-cyan-500' },
  { id: 'communication', name: '通讯', icon: 'Smartphone', type: 'expense', color: 'bg-blue-400' },
  { id: 'fitness', name: '运动', icon: 'Dumbbell', type: 'expense', color: 'bg-orange-400' },
  { id: 'travel', name: '旅行', icon: 'Plane', type: 'expense', color: 'bg-teal-400' },
  { id: 'family', name: '亲子', icon: 'Baby', type: 'expense', color: 'bg-rose-400' },
  { id: 'other_expense', name: '其他支出', icon: 'MoreHorizontal', type: 'expense', color: 'bg-gray-500' },
  { id: 'salary', name: '工资', icon: 'Wallet', type: 'income', color: 'bg-green-500' },
  { id: 'provident_fund', name: '公积金提取', icon: 'PiggyBank', type: 'income', color: 'bg-blue-600' },
  { id: 'bonus', name: '奖金', icon: 'Gift', type: 'income', color: 'bg-yellow-500' },
  { id: 'investment', name: '投资', icon: 'TrendingUp', type: 'income', color: 'bg-emerald-500' },
  { id: 'rent', name: '收租', icon: 'Building', type: 'income', color: 'bg-sky-500' },
  { id: 'refund', name: '退款', icon: 'Undo', type: 'income', color: 'bg-slate-400' },
  { id: 'interest', name: '利息', icon: 'Coins', type: 'income', color: 'bg-amber-500' },
  { id: 'reimbursement', name: '报销', icon: 'Receipt', type: 'income', color: 'bg-cyan-600' },
  { id: 'second_hand', name: '二手', icon: 'Recycle', type: 'income', color: 'bg-orange-600' },
  { id: 'lottery', name: '中奖', icon: 'Trophy', type: 'income', color: 'bg-red-600' },
  { id: 'part_time', name: '兼职', icon: 'Clock', type: 'income', color: 'bg-lime-500' },
  { id: 'other_income', name: '其他收入', icon: 'PlusCircle', type: 'income', color: 'bg-teal-500' },
];

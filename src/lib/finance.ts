import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import { CATEGORY_MAP } from '../constants';
import type { CategoryStat, CurrencyConfig, Summary, Transaction, TransactionType, ViewMode } from '../types';

dayjs.locale('zh-cn');

const rateOf = (currency: string, configs: CurrencyConfig[]) =>
  configs.find((item) => item.code === currency)?.rate ?? 1;

export const convertToBase = (amount: number, currency: string, configs: CurrencyConfig[]) =>
  amount * rateOf(currency, configs);

/** 日期选择器的统一上限：日/月/年粒度均不可选择未来时间。 */
export const futureDateDisabled = (unit: 'day' | 'month' | 'year') => (current: Dayjs) =>
  current.isAfter(dayjs(), unit);

export const baseAmount = (transaction: Transaction, configs: CurrencyConfig[]) =>
  convertToBase(transaction.amount, transaction.currency, configs);

export const formatMoney = (value: number, digits = 2) =>
  `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const formatAxisMoney = (value: number) =>
  Math.abs(value) >= 10000 ? `${(value / 10000).toFixed(1)}万` : String(Math.round(value));

export function summarize(rows: Transaction[], configs: CurrencyConfig[]): Summary {
  let income = 0;
  let expense = 0;
  rows.forEach((row) => {
    const amount = baseAmount(row, configs);
    if (row.type === 'income') income += amount;
    else expense += amount;
  });
  return {
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? (income - expense) / income : 0,
  };
}

export function inRange(rows: Transaction[], start: Dayjs, end: Dayjs) {
  return rows.filter((row) => {
    const date = dayjs(row.date);
    return !date.isBefore(start, 'day') && !date.isAfter(end, 'day');
  });
}

export function rangeFor(mode: ViewMode, anchor: Dayjs): [Dayjs, Dayjs] {
  if (mode === 'day') return [anchor.startOf('day'), anchor.endOf('day')];
  if (mode === 'month') return [anchor.startOf('month'), anchor.endOf('month')];
  return [anchor.startOf('year'), anchor.endOf('year')];
}

export function defaultTrendRange(mode: ViewMode): [Dayjs, Dayjs] {
  const now = dayjs();
  if (mode === 'day') return [now.startOf('month'), now];
  if (mode === 'month') return [now.startOf('year'), now.endOf('month')];
  return [now.subtract(4, 'year').startOf('year'), now.endOf('year')];
}

export function categoryStats(
  rows: Transaction[],
  configs: CurrencyConfig[],
  type: TransactionType,
): CategoryStat[] {
  const totals = new Map<string, { amount: number; count: number }>();
  rows.filter((row) => row.type === type).forEach((row) => {
    const current = totals.get(row.category) ?? { amount: 0, count: 0 };
    current.amount += baseAmount(row, configs);
    current.count += 1;
    totals.set(row.category, current);
  });
  const sum = [...totals.values()].reduce((acc, item) => acc + item.amount, 0);
  return [...totals.entries()]
    .map(([category, value]) => ({
      category,
      name: CATEGORY_MAP[category]?.name ?? category,
      color: CATEGORY_MAP[category]?.color ?? '#8c8c8c',
      amount: value.amount,
      count: value.count,
      percent: sum > 0 ? value.amount / sum : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function effectiveMode(start: Dayjs, end: Dayjs, mode: ViewMode): ViewMode {
  const days = end.diff(start, 'day');
  if (mode === 'day' && days > 366) return 'month';
  if (mode === 'month' && days > 366 * 6) return 'year';
  return mode;
}

export function createBuckets(start: Dayjs, end: Dayjs, mode: ViewMode) {
  const buckets: { key: string; label: string; start: Dayjs; end: Dayjs }[] = [];
  let cursor = start.startOf(mode === 'day' ? 'day' : mode === 'month' ? 'month' : 'year');
  const limit = end.endOf(mode === 'day' ? 'day' : mode === 'month' ? 'month' : 'year');
  while (!cursor.isAfter(limit) && buckets.length < 400) {
    const bucketEnd = cursor.endOf(mode === 'day' ? 'day' : mode === 'month' ? 'month' : 'year');
    buckets.push({
      key: cursor.format('YYYY-MM-DD'),
      label: mode === 'day'
        ? cursor.format('MM-DD')
        : mode === 'month'
          ? cursor.format('YYYY-MM')
          : String(cursor.year()),
      start: cursor,
      end: bucketEnd,
    });
    cursor = cursor.add(1, mode === 'day' ? 'day' : mode === 'month' ? 'month' : 'year');
  }
  return buckets;
}

export function trendData(
  rows: Transaction[],
  configs: CurrencyConfig[],
  start: Dayjs,
  end: Dayjs,
  mode: ViewMode,
  categoryKeys: string[],
) {
  return createBuckets(start, end, effectiveMode(start, end, mode)).map((bucket) => {
    const point: Record<string, string | number> = { label: bucket.label };
    categoryKeys.forEach((key) => { point[key] = 0; });
    rows.forEach((row) => {
      const date = dayjs(row.date);
      if (date.isBefore(bucket.start) || date.isAfter(bucket.end)) return;
      if (row.type === 'expense' && 'expense' in point) {
        point.expense = Number(point.expense) + baseAmount(row, configs);
      }
      if (row.type === 'income' && 'income' in point) {
        point.income = Number(point.income) + baseAmount(row, configs);
      }
      if (row.category in point) {
        point[row.category] = Number(point[row.category]) + baseAmount(row, configs);
      }
    });
    return point;
  });
}

export function groupByDate(rows: Transaction[], mode: ViewMode) {
  const map = new Map<string, Transaction[]>();
  [...rows]
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
    .forEach((row) => {
      const date = dayjs(row.date);
      const key = mode === 'year' ? date.format('YYYY-MM') : date.format('YYYY-MM-DD');
      const current = map.get(key) ?? [];
      current.push(row);
      map.set(key, current);
    });
  return [...map.entries()].map(([key, items]) => ({
    key,
    label: mode === 'year'
      ? dayjs(key + '-01').format('YYYY年M月')
      : dayjs(key).format('YYYY年M月D日'),
    rows: items,
  }));
}

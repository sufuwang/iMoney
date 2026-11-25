import { ASSET_TYPES, CASH_ASSET_TYPE } from '../constants';
import { convertToBase } from './finance';
import type { AssetSnapshot, AssetType, CurrencyConfig } from '../types';

export interface AssetRow {
  month: string;
  active_fund: number;
  nasdaq: number;
  sp500: number;
  cash: number;
  profitByType: Record<AssetType, number>;
  total: number;
  profit: number;
  investment: number;
  returnRate: number;
  delta: number;
  growth: number;
}

interface MonthValues {
  amount: Record<AssetType, number>;
  profit: Record<AssetType, number>;
}

const emptyTypes = (): Record<AssetType, number> => ({ active_fund: 0, nasdaq: 0, sp500: 0, cash: 0 });
const emptyMonth = (): MonthValues => ({ amount: emptyTypes(), profit: emptyTypes() });

export function assetRows(snapshots: AssetSnapshot[], configs: CurrencyConfig[]): AssetRow[] {
  const byMonth = new Map<string, MonthValues>();
  snapshots.forEach((item) => {
    if (!item || typeof item.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month)) return;
    const values = byMonth.get(item.month) ?? emptyMonth();
    if (item.type in values.amount && Number.isFinite(item.amount) && Number.isFinite(item.profit ?? 0)) {
      const currency = item.currency ?? 'CNY';
      values.amount[item.type] += convertToBase(item.amount, currency, configs);
      values.profit[item.type] += convertToBase(item.profit ?? 0, currency, configs);
    }
    byMonth.set(item.month, values);
  });

  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  return months.map(([month, values], index) => {
    const sumOf = (source: Record<AssetType, number>) =>
      ASSET_TYPES.reduce((sum, item) => sum + source[item.value], 0);
    const total = sumOf(values.amount);
    const cash = values.amount[CASH_ASSET_TYPE];
    const profit = ASSET_TYPES
      .filter((item) => item.value !== CASH_ASSET_TYPE)
      .reduce((sum, item) => sum + values.profit[item.value], 0);
    // 投资本金 = 总资产 - 现金（即非现金资产当前金额）
    const investment = total - cash;
    const previousTotal = index > 0 ? sumOf(months[index - 1][1].amount) : 0;
    return {
      month,
      ...values.amount,
      profitByType: values.profit,
      total,
      profit,
      investment,
      returnRate: investment > 0 ? (profit / investment) * 100 : 0,
      delta: index > 0 ? total - previousTotal : 0,
      growth: index > 0 && previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0,
    };
  });
}

export function parseAssets(raw: string): AssetSnapshot[] {
  const parsed: unknown = JSON.parse(raw);
  const source = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'assets' in parsed
      ? (parsed as { assets: unknown }).assets
      : null;

  // 兼容只含流水记录的旧备份
  if (!Array.isArray(source) || !source.some((item) => item && typeof item === 'object' && 'month' in item)) {
    return [];
  }

  const byKey = new Map<string, AssetSnapshot>();
  const push = (
    month: string,
    type: AssetType,
    amount: unknown,
    id?: string,
    currency?: string,
    profit?: unknown,
  ) => {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return;
    byKey.set(`${month}-${type}`, {
      id: id ?? crypto.randomUUID(),
      month,
      type,
      currency: currency ?? 'CNY',
      amount,
      profit: typeof profit === 'number' && Number.isFinite(profit) ? profit : 0,
    });
  };

  source.forEach((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`第 ${index + 1} 条资产记录格式无效`);
    const row = item as Partial<AssetSnapshot> & { funds?: number; stocks?: number };
    if (typeof row.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)) {
      throw new Error(`第 ${index + 1} 条资产记录月份无效`);
    }
    if (row.type && ASSET_TYPES.some((type) => type.value === row.type)) {
      push(
        row.month,
        row.type,
        row.amount,
        typeof row.id === 'string' ? row.id : undefined,
        typeof row.currency === 'string' ? row.currency : 'CNY',
        row.profit,
      );
      return;
    }
    // 旧版按 基金 / 股票 存储的月度快照
    if (typeof row.funds === 'number' || typeof row.stocks === 'number') {
      push(row.month, 'active_fund', row.funds);
      push(row.month, 'nasdaq', row.stocks);
      return;
    }
    throw new Error(`第 ${index + 1} 条资产记录类别无效`);
  });

  return [...byKey.values()].sort(
    (a, b) => a.month.localeCompare(b.month) || a.type.localeCompare(b.type),
  );
}

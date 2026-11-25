import { ASSET_TYPES, DEFAULT_CURRENCY_CONFIGS, DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants';
import type { AppSettings, AssetSnapshot, AssetType, CurrencyConfig, Transaction, ViewMode } from '../types';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * 旧版本存储的币种配置可能缺少 name / symbol / rate（早期只存了 code、rate、enabled），
 * 这里按 code 与默认配置逐项合并，避免界面上出现 undefined。
 */
function normalizeCurrencies(value: unknown): CurrencyConfig[] {
  const source = Array.isArray(value) ? value : [];
  const result: CurrencyConfig[] = [];

  source.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const config = item as Partial<CurrencyConfig>;
    if (typeof config.code !== 'string' || !config.code) return;
    const fallback = DEFAULT_CURRENCY_CONFIGS.find((entry) => entry.code === config.code);
    result.push({
      code: config.code,
      symbol: typeof config.symbol === 'string' && config.symbol ? config.symbol : fallback?.symbol ?? config.code,
      name: typeof config.name === 'string' && config.name ? config.name : fallback?.name ?? config.code,
      rate: typeof config.rate === 'number' && Number.isFinite(config.rate) && config.rate > 0
        ? config.rate
        : fallback?.rate ?? 1,
      enabled: typeof config.enabled === 'boolean' ? config.enabled : true,
    });
  });

  if (result.length === 0) return DEFAULT_CURRENCY_CONFIGS.map((item) => ({ ...item }));
  DEFAULT_CURRENCY_CONFIGS.forEach((item) => {
    if (!result.some((entry) => entry.code === item.code)) result.push({ ...item });
  });
  return result;
}

function normalizeAssets(value: unknown): AssetSnapshot[] {
  if (!Array.isArray(value)) return [];
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

  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Partial<AssetSnapshot> & { funds?: number; stocks?: number };
    if (typeof row.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)) return;
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
    push(row.month, 'active_fund', row.funds);
    push(row.month, 'nasdaq', row.stocks);
  });

  return [...byKey.values()].sort(
    (a, b) => a.month.localeCompare(b.month) || a.type.localeCompare(b.type),
  );
}

export function loadAssets(fallback: AssetSnapshot[] = []): AssetSnapshot[] {
  const saved = read<unknown>(STORAGE_KEYS.assets);
  return Array.isArray(saved) ? normalizeAssets(saved) : fallback;
}

export function saveAssets(assets: AssetSnapshot[]) {
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(assets));
}

export function loadTransactions(fallback: Transaction[]): Transaction[] {
  const saved = read<unknown>(STORAGE_KEYS.transactions);
  if (!Array.isArray(saved)) return fallback;
  const rows = saved
    .filter((item): item is Transaction => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      ...item,
      currency: typeof item.currency === 'string' && item.currency ? item.currency : 'CNY',
      note: typeof item.note === 'string' ? item.note : '',
    }));
  return rows.length > 0 ? rows : fallback;
}

export function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
}

function readRaw(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadSettings(latestDate?: string): AppSettings {
  const saved = read<Partial<AppSettings>>(STORAGE_KEYS.settings);
  if (saved && typeof saved === 'object') {
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      currencyConfigs: normalizeCurrencies(saved.currencyConfigs),
    };
  }

  // 兼容旧版本分散存储的偏好设置
  const parseArray = <T,>(key: string, fallback: T[]): T[] => {
    try {
      const value = readRaw(key);
      return value ? (JSON.parse(value) as T[]) : fallback;
    } catch {
      return fallback;
    }
  };

  return {
    ...DEFAULT_SETTINGS,
    currencyConfigs: normalizeCurrencies(parseArray('imoney_currency_configs', DEFAULT_SETTINGS.currencyConfigs)),
    hiddenTrendCategories: parseArray('imoney_hidden_trend_categories', []),
    hiddenPieCategories: parseArray('imoney_hidden_pie_categories', []),
    historyView: (readRaw('imoney_history_view') as ViewMode) ?? DEFAULT_SETTINGS.historyView,
    trendView: (readRaw('imoney_trend_view') as ViewMode) ?? DEFAULT_SETTINGS.trendView,
    historyDate: readRaw('imoney_history_date') ?? latestDate ?? DEFAULT_SETTINGS.historyDate,
    lastBackupTime: readRaw('imoney_last_backup_time'),
  };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

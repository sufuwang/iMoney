import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants';
import type { AppSettings, Transaction, ViewMode } from '../types';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadTransactions(fallback: Transaction[]): Transaction[] {
  const saved = read<Transaction[]>(STORAGE_KEYS.transactions);
  return Array.isArray(saved) ? saved : fallback;
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
    return { ...DEFAULT_SETTINGS, ...saved };
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
    currencyConfigs: parseArray('imoney_currency_configs', DEFAULT_SETTINGS.currencyConfigs),
    hiddenTrendCategories: parseArray('imoney_hidden_trend_categories', []),
    hiddenPieCategories: parseArray('imoney_hidden_pie_categories', []),
    reminderEnabled: readRaw('imoney_reminder_enabled') === 'true',
    reminderTime: readRaw('imoney_reminder_time') ?? DEFAULT_SETTINGS.reminderTime,
    reminderMessage: readRaw('imoney_reminder_message') ?? DEFAULT_SETTINGS.reminderMessage,
    historyView: (readRaw('imoney_history_view') as ViewMode) ?? DEFAULT_SETTINGS.historyView,
    trendView: (readRaw('imoney_trend_view') as ViewMode) ?? DEFAULT_SETTINGS.trendView,
    historyDate: readRaw('imoney_history_date') ?? latestDate ?? DEFAULT_SETTINGS.historyDate,
    lastBackupTime: readRaw('imoney_last_backup_time'),
    lastReminderDate: readRaw('imoney_last_reminder_date'),
  };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

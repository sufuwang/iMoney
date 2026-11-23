import { useCallback, useEffect, useState } from 'react';
import seedData from '../data/seed.json';
import { loadSettings, loadTransactions, saveSettings, saveTransactions } from '../lib/storage';
import type { AppSettings, Transaction, TransactionType } from '../types';

const SEED_TRANSACTIONS = seedData as Transaction[];

export function parseTransactions(raw: string): Transaction[] {
  const parsed: unknown = JSON.parse(raw);
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'transactions' in parsed
      ? (parsed as { transactions: unknown }).transactions
      : null;
  if (!Array.isArray(list)) throw new Error('备份文件中没有找到交易记录');

  return list.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`第 ${index + 1} 条记录格式无效`);
    const record = item as Partial<Transaction>;
    if (record.type !== 'expense' && record.type !== 'income') {
      throw new Error(`第 ${index + 1} 条记录类型无效`);
    }
    if (typeof record.amount !== 'number' || !Number.isFinite(record.amount)) {
      throw new Error(`第 ${index + 1} 条记录金额无效`);
    }
    if (typeof record.date !== 'string' || typeof record.category !== 'string') {
      throw new Error(`第 ${index + 1} 条记录日期或分类无效`);
    }
    return {
      id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
      type: record.type as TransactionType,
      amount: record.amount,
      currency: typeof record.currency === 'string' ? record.currency : 'CNY',
      category: record.category,
      note: typeof record.note === 'string' ? record.note : '',
      date: record.date,
    };
  });
}

export function useFinanceStore() {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadTransactions(SEED_TRANSACTIONS),
  );
  const [settings, setSettings] = useState<AppSettings>(() => {
    const latest = transactions.reduce((max, row) => (row.date > max ? row.date : max), '');
    return loadSettings(latest || undefined);
  });

  useEffect(() => saveTransactions(transactions), [transactions]);
  useEffect(() => saveSettings(settings), [settings]);

  const addTransaction = useCallback((input: Omit<Transaction, 'id'>) => {
    setTransactions((rows) => [{ ...input, id: crypto.randomUUID() }, ...rows]);
  }, []);

  const updateTransaction = useCallback((id: string, input: Omit<Transaction, 'id'>) => {
    setTransactions((rows) => rows.map((row) => (row.id === id ? { ...input, id } : row)));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((rows) => rows.filter((row) => row.id !== id));
  }, []);

  const replaceTransactions = useCallback((rows: Transaction[]) => setTransactions(rows), []);
  const clearTransactions = useCallback(() => setTransactions([]), []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  return {
    transactions,
    settings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    replaceTransactions,
    clearTransactions,
    updateSettings,
  };
}

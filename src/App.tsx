import { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import BottomTabBar from './components/BottomTabBar';
import CategoryDetailDrawer from './components/CategoryDetailDrawer';
import TransactionDetailDrawer from './components/TransactionDetailDrawer';
import TransactionModal from './components/TransactionModal';
import { useFinanceStore, parseTransactions } from './hooks/useFinanceStore';
import { formatMoney, inRange, summarize } from './lib/finance';
import { notify, saveTextFile } from './lib/platform';
import type { TabKey, Transaction } from './types';
import HealthView from './views/HealthView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';
import TrendsView from './views/TrendsView';

export default function App() {
  const store = useFinanceStore();
  const { transactions, settings, updateSettings } = store;
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'history' || tab === 'trends' || tab === 'health' || tab === 'settings'
      ? tab
      : 'history';
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [categoryDetail, setCategoryDetail] = useState<{ id: string; rows: Transaction[] } | null>(null);

  const yearRows = useMemo(
    () => inRange(transactions, dayjs().startOf('year'), dayjs().endOf('year')),
    [transactions],
  );
  const yearSummary = useMemo(
    () => summarize(yearRows, settings.currencyConfigs),
    [yearRows, settings.currencyConfigs],
  );
  const sparkline = useMemo(() => {
    const values = Array.from({ length: 6 }, (_, index) => {
      const month = dayjs().startOf('month').subtract(5 - index, 'month');
      const rows = inRange(transactions, month.startOf('month'), month.endOf('month'));
      return summarize(rows, settings.currencyConfigs).expense;
    });
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);
    const points = values.map((value, index) => ({
      x: index * 60,
      y: 34 - ((value - min) / range) * 26,
    }));
    const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
    return { line, area: `${line} L300,40 L0,40 Z` };
  }, [transactions, settings.currencyConfigs]);
  const recentNotes = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((row) => {
      const note = row.note.trim();
      if (note) counts.set(note, (counts.get(note) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([note]) => note);
  }, [transactions]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };

  const handleSubmit = (value: Omit<Transaction, 'id'>) => {
    if (editing) {
      store.updateTransaction(editing.id, value);
      message.success('记录已更新');
    } else {
      store.addTransaction(value);
      message.success('记账成功');
    }
    setModalOpen(false);
  };

  const handleDelete = (transaction: Transaction) => {
    store.deleteTransaction(transaction.id);
    setViewing(null);
    message.success('记录已删除');
  };

  const handleEdit = (transaction: Transaction) => {
    setViewing(null);
    setEditing(transaction);
    setModalOpen(true);
  };

  const handleExport = async () => {
    const fileName = `imoney_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
    try {
      const saved = await saveTextFile(fileName, JSON.stringify(transactions, null, 2));
      if (!saved) return;
      updateSettings({ lastBackupTime: new Date().toISOString() });
      message.success('备份数据已导出');
    } catch {
      message.error('导出失败，请重试');
    }
  };

  const handleImport = (raw: string) => {
    try {
      const rows = parseTransactions(raw);
      store.replaceTransactions(rows);
      message.success(`已导入 ${rows.length} 笔记录`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败，请检查备份文件');
    }
  };

  useEffect(() => {
    const checkBackup = () => {
      if (settings.lastBackupTime && dayjs().diff(dayjs(settings.lastBackupTime), 'hour') >= 12) {
        void handleExport();
      }
    };
    const timer = window.setInterval(checkBackup, 60_000);
    return () => window.clearInterval(timer);
  }, [settings.lastBackupTime, transactions]);

  useEffect(() => {
    if (!settings.reminderEnabled) return;
    const checkReminder = () => {
      const now = dayjs();
      const today = now.format('YYYY-MM-DD');
      if (now.format('HH:mm') === settings.reminderTime && settings.lastReminderDate !== today) {
        void notify('iMoney 记账提醒', settings.reminderMessage);
        updateSettings({ lastReminderDate: today });
      }
    };
    const timer = window.setInterval(checkReminder, 30_000);
    return () => window.clearInterval(timer);
  }, [settings.reminderEnabled, settings.reminderTime, settings.reminderMessage, settings.lastReminderDate, updateSettings]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 6,
          colorBgLayout: '#f2f4f8',
          colorText: '#1a1d29',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        },
      }}
    >
      <div className="app-shell">
        <header className="app-header">
          <div className="hero">
            <div className="hero-glow" />
            <div className="hero-glow hero-glow-2" />
            <div className="hero-balance">
              <span>本年结余</span>
              <div className="hero-amount">{formatMoney(yearSummary.balance)}</div>
            </div>
            <div className="hero-spark">
              <span className="spark-label">近 6 个月支出趋势</span>
              <svg viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                <path d={sparkline.area} fill="url(#sparkFill)" />
                <path d={sparkline.line} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <div className="hero-metrics">
              <div><span>收入</span><b>{formatMoney(yearSummary.income, 0)}</b></div>
              <div><span>支出</span><b>{formatMoney(yearSummary.expense, 0)}</b></div>
              <div><span>储蓄率</span><b>{(yearSummary.savingsRate * 100).toFixed(0)}%</b></div>
            </div>
          </div>
        </header>

        <main className="app-content">
          {activeTab === 'history' && (
            <HistoryView
              transactions={transactions}
              settings={settings}
              onSettings={updateSettings}
              onViewTransaction={setViewing}
              onViewCategory={(id, rows) => setCategoryDetail({ id, rows })}
            />
          )}
          {activeTab === 'trends' && (
            <TrendsView
              transactions={transactions}
              settings={settings}
              onSettings={updateSettings}
              onViewCategory={(id, rows) => setCategoryDetail({ id, rows })}
            />
          )}
          {activeTab === 'health' && (
            <HealthView
              transactions={transactions}
              settings={settings}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              transactionCount={transactions.length}
              onSettings={updateSettings}
              onExport={() => void handleExport()}
              onImport={handleImport}
              onClear={() => { store.clearTransactions(); message.success('所有记录已清空'); }}
              onTestReminder={() => void notify('iMoney 记账提醒', settings.reminderMessage)}
            />
          )}
        </main>

        <BottomTabBar active={activeTab} onChange={setActiveTab} onAdd={openAdd} />
      </div>

      <TransactionModal
        open={modalOpen}
        editing={editing}
        currencies={settings.currencyConfigs}
        recentNotes={recentNotes}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
      <TransactionDetailDrawer
        transaction={viewing}
        currencies={settings.currencyConfigs}
        onClose={() => setViewing(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <CategoryDetailDrawer
        categoryId={categoryDetail?.id ?? null}
        rows={categoryDetail?.rows ?? []}
        currencies={settings.currencyConfigs}
        onClose={() => setCategoryDetail(null)}
        onSelect={(transaction) => { setCategoryDetail(null); setViewing(transaction); }}
      />
    </ConfigProvider>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, message } from 'antd';
import {
  DownOutlined,
  PlusOutlined,
  SettingOutlined,
  UpOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import BottomTabBar from './components/BottomTabBar';
import CategoryDetailDrawer from './components/CategoryDetailDrawer';
import SettingsDrawer from './components/SettingsDrawer';
import TransactionDetailDrawer from './components/TransactionDetailDrawer';
import TransactionModal from './components/TransactionModal';
import { useFinanceStore, parseTransactions } from './hooks/useFinanceStore';
import { assetRows, parseAssets } from './lib/assets';
import { formatMoney, inRange, summarize } from './lib/finance';
import { saveTextFile } from './lib/platform';
import { loadAssets, saveAssets } from './lib/storage';
import type { AssetSnapshot, TabKey, Transaction } from './types';
import HealthView from './views/HealthView';
import HistoryView from './views/HistoryView';
import InvestmentView from './views/InvestmentView';
import TrendsView from './views/TrendsView';

export default function App() {
  const store = useFinanceStore();
  const { transactions, settings, updateSettings } = store;
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'history' || tab === 'trends' || tab === 'health' || tab === 'investment'
      ? tab
      : 'history';
  });
  const [assets, setAssets] = useState<AssetSnapshot[]>(() => loadAssets());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<'transaction' | 'asset'>('transaction');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [categoryDetail, setCategoryDetail] = useState<{ id: string; rows: Transaction[]; title?: string } | null>(null);

  const yearRows = useMemo(
    () => inRange(transactions, dayjs().startOf('year'), dayjs().endOf('year')),
    [transactions],
  );
  const yearSummary = useMemo(
    () => summarize(yearRows, settings.currencyConfigs),
    [yearRows, settings.currencyConfigs],
  );
  const yearReturnRate = useMemo(() => {
    const currentYear = dayjs().format('YYYY');
    const currentYearAssets = assetRows(assets, settings.currencyConfigs)
      .filter((row) => row.month.startsWith(currentYear));
    return currentYearAssets[currentYearAssets.length - 1]?.returnRate ?? 0;
  }, [assets, settings.currencyConfigs]);
  // 常用备注：从历史记录动态统计，优先近三个月高频，其次全量频次与最近使用时间
  const recentNotes = useMemo(() => {
    const recentFrom = dayjs().subtract(90, 'day');
    const stats = new Map<string, { count: number; recent: number; last: number }>();
    transactions.forEach((row) => {
      const note = row.note.trim();
      if (!note) return;
      const date = dayjs(row.date);
      const current = stats.get(note) ?? { count: 0, recent: 0, last: 0 };
      current.count += 1;
      if (!date.isBefore(recentFrom)) current.recent += 1;
      current.last = Math.max(current.last, date.valueOf());
      stats.set(note, current);
    });
    return [...stats.entries()]
      .sort((a, b) => b[1].recent - a[1].recent || b[1].count - a[1].count || b[1].last - a[1].last)
      .slice(0, 6)
      .map(([note]) => note);
  }, [transactions]);

  const openAdd = () => { setEditing(null); setEntryMode('transaction'); setModalOpen(true); };
  const openAsset = () => { setEditing(null); setEntryMode('asset'); setModalOpen(true); };

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
    setEntryMode('transaction');
    setModalOpen(true);
  };

  const handleSaveAssets = (inputs: Omit<AssetSnapshot, 'id'>[]) => {
    setAssets((prev) => {
      const next = [...prev];
      inputs.forEach((input) => {
        const index = next.findIndex((item) => item.month === input.month && item.type === input.type);
        if (index >= 0) next[index] = { ...next[index], ...input };
        else next.push({ ...input, id: crypto.randomUUID() });
      });
      return next.sort((a, b) => a.month.localeCompare(b.month) || a.type.localeCompare(b.type));
    });
    setModalOpen(false);
    message.success(`已保存 ${inputs.length} 类资产`);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((item) => item.id !== id));
    message.success('资产记录已删除');
  };

  const handleExport = async () => {
    const fileName = `imoney_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
    try {
      const saved = await saveTextFile(fileName, JSON.stringify({ transactions, assets }, null, 2));
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
      const importedAssets = parseAssets(raw);
      if (rows.length === 0 && importedAssets.length === 0) throw new Error('备份文件中没有可导入的数据');
      store.replaceTransactions(rows);
      if (importedAssets.length > 0) setAssets(importedAssets);
      message.success(
        `已导入 ${rows.length} 笔记录${importedAssets.length ? `、${importedAssets.length} 个月资产` : ''}`,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败，请检查备份文件');
    }
  };

  useEffect(() => saveAssets(assets), [assets]);

  useEffect(() => {
    const updateBackToTop = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const distanceToBottom = Math.max(0, scrollable - window.scrollY);
      setShowBackToTop(scrollable > 0 && distanceToBottom / scrollable <= 0.6);
    };
    updateBackToTop();
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    window.addEventListener('resize', updateBackToTop);
    return () => {
      window.removeEventListener('scroll', updateBackToTop);
      window.removeEventListener('resize', updateBackToTop);
    };
  }, [activeTab, transactions.length, assets.length]);

  useEffect(() => {
    if (!fabOpen || settingsOpen || modalOpen) return;
    let timer = window.setTimeout(() => setFabOpen(false), 6000);
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setFabOpen(false), 6000);
    };
    window.addEventListener('click', resetTimer, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('click', resetTimer);
    };
  }, [fabOpen, settingsOpen, modalOpen]);

  useEffect(() => {
    const checkBackup = () => {
      if (settings.lastBackupTime && dayjs().diff(dayjs(settings.lastBackupTime), 'hour') >= 12) {
        void handleExport();
      }
    };
    const timer = window.setInterval(checkBackup, 60_000);
    return () => window.clearInterval(timer);
  }, [settings.lastBackupTime, transactions, assets]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 6,
          borderRadiusLG: 6,
          borderRadiusSM: 6,
          borderRadiusXS: 6,
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
            <div className="hero-metrics">
              <div><span>本年收入</span><b>{formatMoney(yearSummary.income, 0)}</b></div>
              <div><span>本年支出</span><b>{formatMoney(yearSummary.expense, 0)}</b></div>
              <div><span>本年储蓄率</span><b>{(yearSummary.savingsRate * 100).toFixed(0)}%</b></div>
              <div>
                <span>本年收益率</span>
                <b>{`${yearReturnRate >= 0 ? '+' : ''}${yearReturnRate.toFixed(2)}%`}</b>
              </div>
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
              onViewExpenseGroup={(title, rows) => setCategoryDetail({ id: 'expense-group', rows, title })}
            />
          )}
          {activeTab === 'investment' && (
            <InvestmentView
              assets={assets}
              configs={settings.currencyConfigs}
              onAddAsset={openAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          )}
        </main>

        <div
          className={`fab-group${fabOpen ? '' : ' is-collapsed'}`}
          role="group"
          aria-label="快捷操作"
        >
          <div className={`fab-actions${fabOpen ? '' : ' is-collapsed'}`}>
            <div className={`fab-optional${showBackToTop ? ' is-visible' : ''}`} aria-hidden={!showBackToTop}>
              <button
                type="button"
                className="fab-btn fab-action"
                aria-label="回到顶部"
                tabIndex={showBackToTop ? 0 : -1}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <VerticalAlignTopOutlined />
              </button>
              <span className="fab-divider fab-action" />
            </div>
            <button
              type="button"
              className="fab-btn fab-action"
              aria-label="记一笔"
              onClick={openAdd}
            >
              <PlusOutlined />
            </button>
            <span className="fab-divider fab-action" />
            <button
              type="button"
              className="fab-btn fab-action"
              aria-label="设置"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingOutlined />
            </button>
            <span className="fab-divider fab-action" />
          </div>
          <button
            type="button"
            className="fab-btn fab-toggle"
            aria-label={fabOpen ? '收起快捷操作' : '展开快捷操作'}
            aria-expanded={fabOpen}
            onClick={() => setFabOpen((prev) => !prev)}
          >
            {fabOpen ? <DownOutlined /> : <UpOutlined />}
          </button>
        </div>

        <BottomTabBar active={activeTab} onChange={setActiveTab} />
      </div>

      <TransactionModal
        open={modalOpen}
        mode={entryMode}
        onModeChange={setEntryMode}
        editing={editing}
        currencies={settings.currencyConfigs}
        recentNotes={recentNotes}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onSaveAssets={handleSaveAssets}
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
        title={categoryDetail?.title}
        onClose={() => setCategoryDetail(null)}
        onSelect={(transaction) => { setCategoryDetail(null); setViewing(transaction); }}
      />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        transactionCount={transactions.length}
        assetCount={assets.length}
        onSettings={updateSettings}
        onExport={() => void handleExport()}
        onImport={handleImport}
        onClear={() => { store.clearTransactions(); message.success('所有记录已清空'); }}
      />
    </ConfigProvider>
  );
}

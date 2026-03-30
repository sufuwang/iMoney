import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  History, 
  BarChart3, 
  Settings as SettingsIcon, 
  X, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ChevronRight,
  Download,
  Upload,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  TrendingUp,
  Edit2,
  Bell,
  LayoutDashboard,
  Folder,
  HardDrive,
  Utensils,
  ShoppingBag,
  Bus,
  Gamepad2,
  Home,
  Stethoscope,
  GraduationCap,
  MoreHorizontal,
  Wallet,
  Gift,
  Clock,
  PlusCircle,
  HelpCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  format, 
  startOfDay, 
  startOfMonth, 
  startOfYear, 
  isSameDay, 
  isSameMonth, 
  isSameYear, 
  parseISO, 
  subDays,
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  eachMonthOfInterval,
  subMonths,
  subYears,
  eachYearOfInterval
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  isPermissionGranted, 
  requestPermission as requestTauriPermission, 
  sendNotification,
  cancel as cancelNotification,
  Schedule
} from '@tauri-apps/plugin-notification';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { cn } from './lib/utils';
import { Transaction, TransactionType, CATEGORIES, Category, Currency, CURRENCY_SYMBOLS, CurrencyConfig, DEFAULT_CURRENCY_CONFIGS } from './types';

// --- Utilities ---

const formatAmount = (amount: number) => {
  const truncated = Math.trunc(amount * 100) / 100;
  return truncated.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

const formatHeaderAmount = (amount: number) => {
  return formatAmount(amount);
};

const CategoryIcon = ({ name, size = 20, className }: { name: string, size?: number, className?: string }) => {
  const icons: Record<string, React.ElementType> = {
    Utensils, ShoppingBag, Bus, Gamepad2, Home, Stethoscope, GraduationCap, 
    MoreHorizontal, Wallet, Gift, TrendingUp, Clock, PlusCircle
  };
  const Icon = icons[name] || HelpCircle;
  return <Icon size={size} className={className} />;
};

const AutoShrinkText = ({ text, className }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const resize = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        if (textWidth > containerWidth && containerWidth > 0) {
          setScale(containerWidth / textWidth);
        } else {
          setScale(1);
        }
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={cn("w-full overflow-hidden flex items-center", className)}>
      <span 
        ref={textRef} 
        className="inline-block whitespace-nowrap origin-left transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        {text}
      </span>
    </div>
  );
};

// --- Components ---

const TabButton = ({ active, icon: Icon, label, onClick }: { active: boolean, icon: React.ElementType, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center py-1 px-4 transition-all active:opacity-50",
      active ? "text-blue-600" : "text-gray-400"
    )}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className={cn("text-[10px] mt-1 font-semibold", active ? "text-blue-600" : "text-gray-400")}>{label}</span>
  </button>
);

const TransactionItem: React.FC<{ 
  transaction: Transaction; 
  onEdit: (transaction: Transaction) => void;
}> = ({ transaction, onEdit }) => {
  const category = CATEGORIES.find(c => c.id === transaction.category) || CATEGORIES[CATEGORIES.length - 1];
  const currencySymbol = CURRENCY_SYMBOLS[transaction.currency || 'CNY'];
  
  return (
    <div 
      onClick={() => onEdit(transaction)}
      className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          transaction.type === 'income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        )}>
          <CategoryIcon name={category.icon} size={18} />
        </div>
        <div>
          <div className="font-medium text-gray-900">{category.name}</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">{format(parseISO(transaction.date), 'MM-dd HH:mm')}</div>
            {transaction.note && (
              <div className="text-xs text-gray-400 truncate max-w-[120px]">
                {transaction.note}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={cn(
          "font-semibold",
          transaction.type === 'income' ? "text-green-600" : "text-red-600"
        )}>
          {transaction.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(transaction.amount)}
        </div>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const isTauri = !!(window as any).__TAURI_INTERNALS__;
  const isFirstMount = useRef(true);
  const [activeTab, setActiveTab] = useState<'history' | 'trends' | 'settings'>('history');
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('imoney_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [newAmount, setNewAmount] = useState('');
  const [newCurrency, setNewCurrency] = useState<Currency>('CNY');
  const [newCategory, setNewCategory] = useState(CATEGORIES.find(c => c.type === 'expense')?.id || '');
  const [newNote, setNewNote] = useState('');
  const [trendView, setTrendView] = useState<'day' | 'month' | 'year'>(() => {
    const saved = localStorage.getItem('imoney_trend_view');
    return (saved as 'day' | 'month' | 'year') || 'day';
  });
  const [historyView, setHistoryView] = useState<'day' | 'month' | 'year'>(() => {
    const saved = localStorage.getItem('imoney_history_view');
    return (saved as 'day' | 'month' | 'year') || 'day';
  });
  const [historyDate, setHistoryDate] = useState(() => {
    const saved = localStorage.getItem('imoney_history_date');
    return saved ? new Date(saved) : new Date();
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('imoney_page_size');
    return saved ? parseInt(saved) : 5;
  });

  useEffect(() => {
    localStorage.setItem('imoney_page_size', pageSize.toString());
  }, [pageSize]);

  const [reminderEnabled, setReminderEnabled] = useState(() => localStorage.getItem('imoney_reminder_enabled') === 'true');
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem('imoney_reminder_time') || '20:00');
  const [reminderMessage, setReminderMessage] = useState(() => localStorage.getItem('imoney_reminder_message') || '记得记一笔账哦！');
  
  // Temporary states for reminder settings (to be saved manually)
  const [tempReminderTime, setTempReminderTime] = useState(reminderTime);
  const [tempReminderMessage, setTempReminderMessage] = useState(reminderMessage);

  const [lastReminderDate, setLastReminderDate] = useState(() => localStorage.getItem('imoney_last_reminder_date') || '');
  const [backupPath, setBackupPath] = useState(() => localStorage.getItem('imoney_backup_path') || '');
  const [lastBackupTime, setLastBackupTime] = useState(() => localStorage.getItem('imoney_last_backup_time') || '');

  const [currencyConfigs, setCurrencyConfigs] = useState<CurrencyConfig[]>(() => {
    const saved = localStorage.getItem('imoney_currency_configs');
    return saved ? JSON.parse(saved) : DEFAULT_CURRENCY_CONFIGS;
  });

  const updateCurrencyConfig = (code: Currency, updates: Partial<CurrencyConfig>) => {
    setCurrencyConfigs(prev => prev.map(c => c.code === code ? { ...c, ...updates } : c));
  };

  useEffect(() => {
    localStorage.setItem('imoney_currency_configs', JSON.stringify(currencyConfigs));
  }, [currencyConfigs]);

  useEffect(() => {
    localStorage.setItem('imoney_trend_view', trendView);
  }, [trendView]);

  useEffect(() => {
    localStorage.setItem('imoney_history_view', historyView);
  }, [historyView]);

  useEffect(() => {
    localStorage.setItem('imoney_history_date', historyDate.toISOString());
  }, [historyDate]);

  useEffect(() => {
    localStorage.setItem('imoney_reminder_enabled', String(reminderEnabled));
  }, [reminderEnabled]);

  useEffect(() => {
    localStorage.setItem('imoney_reminder_time', reminderTime);
  }, [reminderTime]);

  useEffect(() => {
    localStorage.setItem('imoney_reminder_message', reminderMessage);
  }, [reminderMessage]);

  useEffect(() => {
    localStorage.setItem('imoney_last_reminder_date', lastReminderDate);
  }, [lastReminderDate]);

  useEffect(() => {
    localStorage.setItem('imoney_backup_path', backupPath);
  }, [backupPath]);

  useEffect(() => {
    localStorage.setItem('imoney_last_backup_time', lastBackupTime);
  }, [lastBackupTime]);

  const notify = (title: string, message: string, type: 'log' | 'warn' | 'error' = 'log') => {
    if (type === 'error') console.error(`[${title}] ${message}`);
    else if (type === 'warn') console.warn(`[${title}] ${message}`);
    else console.log(`[${title}] ${message}`);
    
    triggerNotification(title, message);
  };

  const selectBackupPath = async () => {
    notify("iMoney", "该功能已更新：请直接点击下方的“立即手动备份”来选择存储位置。", "log");
  };

  // 12-hour scheduled backup
  useEffect(() => {
    const checkScheduledBackup = () => {
      if (!lastBackupTime) return;
      
      const now = new Date();
      const last = new Date(lastBackupTime);
      const diffMs = now.getTime() - last.getTime();
      const twelveHoursMs = 12 * 60 * 60 * 1000;

      if (diffMs >= twelveHoursMs) {
        exportData(true);
      }
    };

    const interval = setInterval(checkScheduledBackup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [lastBackupTime, transactions, backupPath]);

  const triggerNotification = async (title: string, body: string) => {
    // 1. Try Tauri Native Notification
    if (isTauri) {
      try {
        let permission = await isPermissionGranted();
        if (!permission) {
          const result = await requestTauriPermission();
          permission = result === 'granted';
        }
        if (permission) {
          sendNotification({ title, body });
          return;
        }
      } catch (e) {
        console.error("Tauri notification failed", e);
      }
    }

    // Fallback to Web System Notification (for browser preview)
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: '32x32.png' });
          return;
        } catch (e) {
          console.error("Web notification failed", e);
        }
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          try {
            new Notification(title, { body, icon: '32x32.png' });
            return;
          } catch (e) {
            console.error("Web notification failed", e);
          }
        }
      }
    }

    // Fallback to System Alert (as requested: "全部采用系统弹窗")
    window.alert(`${title}: ${body}`);
  };

  const displayToast = (message: string) => {
    triggerNotification("iMoney", message);
  };

  // Reminder Logic
  const scheduleDailyReminder = async () => {
    if (!isTauri) {
      return;
    }

    try {
      // Cancel existing reminders first
      if (typeof cancelNotification === 'function') {
        await cancelNotification([1]);
      }

      if (!reminderEnabled) return;

      const [hours, minutes] = reminderTime.split(':').map(Number);
      
      // Native iOS Local Notification Scheduling using sendNotification with schedule
      if (typeof sendNotification === 'function') {
        sendNotification({
          id: 1,
          title: 'iMoney 记账提醒',
          body: reminderMessage,
          schedule: Schedule.interval({
            hour: hours,
            minute: minutes
          })
        });
        notify("iMoney", `提醒已预约: 每天 ${reminderTime}`);
      } else {
        throw new Error("sendNotification is not a function");
      }
    } catch (e) {
      notify("iMoney", `预约提醒失败: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    scheduleDailyReminder();
  }, [reminderEnabled, reminderTime, reminderMessage]);

  // Preview Mode Reminder Checker (for browser preview)
  useEffect(() => {
    if (isTauri || !reminderEnabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentTimeStr = format(now, 'HH:mm');
      const currentDateStr = format(now, 'yyyy-MM-dd');

      if (currentTimeStr === reminderTime && lastReminderDate !== currentDateStr) {
        triggerNotification("iMoney 记账提醒", reminderMessage);
        setLastReminderDate(currentDateStr);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [reminderEnabled, reminderTime, reminderMessage, lastReminderDate, isTauri]);

  const requestNotificationPermission = async () => {
    if (isTauri) {
      try {
        const permission = await requestTauriPermission();
        if (permission === 'granted') {
          triggerNotification("iMoney", "原生提醒功能已成功开启！");
        } else {
          displayToast("请在 iPhone 系统设置中允许 iMoney 发送通知。");
        }
        return;
      } catch (e) {
        notify("iMoney", "请求通知权限失败", "error");
      }
    } else if ("Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          triggerNotification("iMoney", "网页提醒功能已成功开启！");
        } else {
          displayToast("请在浏览器设置中允许 iMoney 发送通知。");
        }
      } catch (e) {
        notify("iMoney", "请求通知权限失败", "error");
      }
    } else {
      displayToast("您的浏览器不支持系统级通知。");
    }
  };

  const convertToBase = (amount: number, fromCurrency: Currency) => {
    const config = currencyConfigs.find(c => c.code === fromCurrency);
    if (!config) return amount;
    return amount * config.rate;
  };

  useEffect(() => {
    setHistoryPage(1);
  }, [historyDate, historyView]);
  const [hiddenTrendCategories, setHiddenTrendCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('imoney_hidden_trend_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const [hiddenPieCategories, setHiddenPieCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('imoney_hidden_pie_categories');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('imoney_hidden_trend_categories', JSON.stringify(hiddenTrendCategories));
  }, [hiddenTrendCategories]);

  useEffect(() => {
    localStorage.setItem('imoney_hidden_pie_categories', JSON.stringify(hiddenPieCategories));
  }, [hiddenPieCategories]);

  const toggleTrendCategory = (categoryId: string) => {
    setHiddenTrendCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const togglePieCategory = (categoryId: string) => {
    setHiddenPieCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  }, []);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const daysInMonth = useMemo(() => {
    const lastDay = new Date(historyDate.getFullYear(), historyDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }, [historyDate.getFullYear(), historyDate.getMonth()]);

  useEffect(() => {
    localStorage.setItem('imoney_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = () => {
    const amount = parseFloat(newAmount);
    if (!newAmount || isNaN(amount) || amount <= 0) {
      notify("iMoney", "请输入有效的金额", "warn");
      return;
    }
    
    if (editingTransaction) {
      const updatedTransactions = transactions.map(t => 
        t.id === editingTransaction.id 
          ? { ...t, type: newType, amount: amount, currency: newCurrency, category: newCategory, note: newNote }
          : t
      );
      setTransactions(updatedTransactions);
      notify("iMoney", "修改成功", "log");
    } else {
      const transaction: Transaction = {
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2),
        type: newType,
        amount: amount,
        currency: newCurrency,
        category: newCategory,
        date: new Date().toISOString(),
        note: newNote
      };
      setTransactions([transaction, ...transactions]);
      notify("iMoney", "记账成功", "log");
    }

    setIsAdding(false);
    setEditingTransaction(null);
    setNewAmount('');
    setNewNote('');
    setNewCurrency('CNY');
  };

  const startEditing = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setNewType(transaction.type);
    setNewAmount(transaction.amount.toString());
    setNewCurrency(transaction.currency || 'CNY');
    setNewCategory(transaction.category);
    setNewNote(transaction.note || '');
    setIsAdding(true);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const exportData = async (isAuto = false) => {
    try {
      const dataStr = JSON.stringify(transactions, null, 2);
      const fileName = `imoney_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;

      if (isTauri) {
        // 使用用户要求的逻辑
        const targetPath = await saveDialog({
          defaultPath: fileName
        });

        if (!targetPath) return;

        // 处理 iOS 可能返回的 file:// 前缀，确保路径可写
        const cleanPath = targetPath.startsWith('file://') 
          ? decodeURIComponent(targetPath.replace('file://', '')) 
          : targetPath;

        // 执行写入
        await writeTextFile(cleanPath, dataStr);

        // 更新备份状态
        const now = new Date().toISOString();
        setLastBackupTime(now);
        notify("iMoney", "数据导出成功！");
      } else {
        // Web 浏览器降级方案
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        
        const now = new Date().toISOString();
        setLastBackupTime(now);
        notify("iMoney", "数据导出成功！");
      }
    } catch (e) {
      if (!isAuto) notify("iMoney", `导出失败: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  const importData = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    const processImportedData = (data: any) => {
      let transactionsToImport: Transaction[] = [];
      
      // Handle direct array or wrapped object
      if (Array.isArray(data)) {
        transactionsToImport = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.transactions)) {
        transactionsToImport = data.transactions;
      } else {
        throw new Error("无效的备份文件格式：未找到交易记录数组");
      }

      // Basic validation of transaction items
      const isValid = transactionsToImport.every(t => 
        t && typeof t === 'object' && 
        typeof t.id === 'string' && 
        (t.type === 'income' || t.type === 'expense') &&
        typeof t.amount === 'number' &&
        typeof t.category === 'string' &&
        typeof t.date === 'string'
      );

      if (!isValid && transactionsToImport.length > 0) {
        throw new Error("无效的备份文件格式：交易记录数据损坏或不完整");
      }

      setTransactions(transactionsToImport);
      notify("iMoney", "数据导入成功！");
    };

    try {
      if (isTauri) {
        if (typeof openDialog !== 'function' || typeof readTextFile !== 'function') {
          throw new Error("Tauri 插件未就绪");
        }

        const selected = await openDialog({
          multiple: false,
          filters: [{ name: 'JSON', extensions: ['json'] }],
          title: '导入备份数据'
        });

        if (selected && typeof selected === 'string') {
          const content = await readTextFile(selected);
          const imported = JSON.parse(content);
          processImportedData(imported);
        }
      } else if (e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            processImportedData(imported);
          } catch (err) {
            notify("iMoney", `导入失败: ${err instanceof Error ? err.message : String(err)}`, "error");
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      notify("iMoney", `导入失败: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  };

  // --- Stats & Trends ---

  const stats = useMemo(() => {
    const now = new Date();
    const yearTransactions = transactions.filter(t => isSameYear(parseISO(t.date), now));
    const income = yearTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);
    const expense = yearTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);
    return { income, expense, balance: income - expense };
  }, [transactions, currencyConfigs]);

  const chartData = useMemo(() => {
    const now = new Date();
    let interval: { start: Date, end: Date };
    let formatStr: string;
    let step: (date: Date) => Date;
    let eachInterval: (interval: { start: Date, end: Date }) => Date[];

    if (trendView === 'day') {
      interval = { start: subDays(now, 6), end: now };
      formatStr = 'MM-dd';
      eachInterval = eachDayOfInterval;
    } else if (trendView === 'month') {
      interval = { start: subMonths(now, 5), end: now };
      formatStr = 'yyyy-MM';
      eachInterval = eachMonthOfInterval;
    } else {
      interval = { start: subYears(now, 4), end: now };
      formatStr = 'yyyy';
      eachInterval = eachYearOfInterval;
    }

    const dates = eachInterval(interval);
    
    return dates.map(date => {
      const dayTransactions = transactions.filter(t => {
        const tDate = parseISO(t.date);
        if (trendView === 'day') return isSameDay(tDate, date);
        if (trendView === 'month') return isSameMonth(tDate, date);
        return isSameYear(tDate, date);
      });

      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);
      const expense = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);

      const dataPoint: any = {
        name: format(date, formatStr, { locale: zhCN }),
        income,
        expense,
        net: income - expense
      };

      // Add category-specific data
      CATEGORIES.forEach(cat => {
        dataPoint[cat.id] = dayTransactions
          .filter(t => t.category === cat.id)
          .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);
      });

      return dataPoint;
    });
  }, [transactions, trendView, currencyConfigs]);

  const filteredHistory = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      if (historyView === 'day') return isSameDay(tDate, historyDate);
      if (historyView === 'month') return isSameMonth(tDate, historyDate);
      return isSameYear(tDate, historyDate);
    });
  }, [transactions, historyView, historyDate]);

  const groupedHistory = useMemo(() => {
    if (historyView === 'day') return null;

    const groups: Record<string, { category: string, amount: number, type: TransactionType, currency: Currency }> = {};
    
    filteredHistory.forEach(t => {
      const key = `${t.type}-${t.category}`;
      if (!groups[key]) {
        groups[key] = { category: t.category, amount: 0, type: t.type, currency: 'CNY' };
      }
      groups[key].amount += convertToBase(t.amount, t.currency || 'CNY');
    });

    return Object.values(groups).sort((a, b) => b.amount - a.amount);
  }, [filteredHistory, historyView, currencyConfigs]);

  const expensePieData = useMemo(() => {
    const categories = CATEGORIES.filter(c => c.type === 'expense');
    const now = new Date();
    return categories
      .map((cat, idx) => {
        const total = transactions.filter(t => {
          const tDate = parseISO(t.date);
          if (trendView === 'day') return isSameDay(tDate, now);
          if (trendView === 'month') return isSameMonth(tDate, now);
          return isSameYear(tDate, now);
        })
        .filter(t => t.category === cat.id)
        .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);

        return { 
          name: cat.name, 
          value: total, 
          id: cat.id,
          fill: ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#3b82f6', '#10b981', '#06b6d4'][idx % 8]
        };
      })
      .filter(d => d.value > 0 && !hiddenPieCategories.includes(d.id));
  }, [transactions, trendView, hiddenPieCategories, currencyConfigs]);

  const incomePieData = useMemo(() => {
    const categories = CATEGORIES.filter(c => c.type === 'income');
    const now = new Date();
    return categories
      .map((cat, idx) => {
        const total = transactions.filter(t => {
          const tDate = parseISO(t.date);
          if (trendView === 'day') return isSameDay(tDate, now);
          if (trendView === 'month') return isSameMonth(tDate, now);
          return isSameYear(tDate, now);
        })
        .filter(t => t.category === cat.id)
        .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);

        return { 
          name: cat.name, 
          value: total, 
          id: cat.id,
          fill: ['#10b981', '#3b82f6', '#06b6d4', '#14b8a6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'][idx % 8]
        };
      })
      .filter(d => d.value > 0 && !hiddenPieCategories.includes(d.id));
  }, [transactions, trendView, hiddenPieCategories, currencyConfigs]);

  const expensePieTotal = useMemo(() => expensePieData.reduce((acc, d) => acc + d.value, 0), [expensePieData]);
  const incomePieTotal = useMemo(() => incomePieData.reduce((acc, d) => acc + d.value, 0), [incomePieData]);

  const timeRangeLabel = useMemo(() => {
    if (trendView === 'day') return '当天';
    if (trendView === 'month') return '当月';
    return '当年';
  }, [trendView]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.type === 'income' ? incomePieTotal : expensePieTotal;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-2.5 rounded-2xl shadow-xl border-none">
          <div className="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">{timeRangeLabel}</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="text-sm font-bold text-gray-900">{data.name}</span>
          </div>
          <div className="text-sm font-bold text-gray-700">
            ¥{formatAmount(data.value)} ({percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  const topRankings = useMemo(() => {
    const incomes = [...filteredHistory]
      .filter(t => t.type === 'income')
      .sort((a, b) => convertToBase(b.amount, b.currency || 'CNY') - convertToBase(a.amount, a.currency || 'CNY'))
      .slice(0, 5);
    
    const expenses = [...filteredHistory]
      .filter(t => t.type === 'expense')
      .sort((a, b) => convertToBase(b.amount, b.currency || 'CNY') - convertToBase(a.amount, a.currency || 'CNY'))
      .slice(0, 5);
    
    return { incomes, expenses };
  }, [filteredHistory, currencyConfigs]);

  const historyStats = useMemo(() => {
    const income = filteredHistory
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);
    const expense = filteredHistory
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + convertToBase(t.amount, t.currency || 'CNY'), 0);
    return { income, expense, balance: income - expense };
  }, [filteredHistory, currencyConfigs]);

  const expenseCategories = useMemo(() => CATEGORIES.filter(c => c.type === 'expense'), []);
  const incomeCategories = useMemo(() => CATEGORIES.filter(c => c.type === 'income'), []);

  const expenseLegendPayload = useMemo(() => expenseCategories.map((cat, idx) => ({
    value: cat.name,
    id: cat.id,
    type: 'circle' as const,
    color: hiddenTrendCategories.includes(cat.id) ? '#e5e7eb' : ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#3b82f6', '#10b981', '#06b6d4'][idx % 8],
    dataKey: cat.id,
    inactive: hiddenTrendCategories.includes(cat.id)
  })), [expenseCategories, hiddenTrendCategories]);

  const incomeLegendPayload = useMemo(() => incomeCategories.map((cat, idx) => ({
    value: cat.name,
    id: cat.id,
    type: 'circle' as const,
    color: hiddenTrendCategories.includes(cat.id) ? '#e5e7eb' : ['#10b981', '#3b82f6', '#06b6d4', '#14b8a6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'][idx % 8],
    dataKey: cat.id,
    inactive: hiddenTrendCategories.includes(cat.id)
  })), [incomeCategories, hiddenTrendCategories]);

  const expensePieLegendPayload = useMemo(() => expenseCategories.map((cat, idx) => ({
    value: cat.name,
    id: cat.id,
    type: 'circle' as const,
    color: hiddenPieCategories.includes(cat.id) ? '#e5e7eb' : ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#3b82f6', '#10b981', '#06b6d4'][idx % 8],
    dataKey: cat.id,
    inactive: hiddenPieCategories.includes(cat.id)
  })), [expenseCategories, hiddenPieCategories]);

  const incomePieLegendPayload = useMemo(() => incomeCategories.map((cat, idx) => ({
    value: cat.name,
    id: cat.id,
    type: 'circle' as const,
    color: hiddenPieCategories.includes(cat.id) ? '#e5e7eb' : ['#10b981', '#3b82f6', '#06b6d4', '#14b8a6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'][idx % 8],
    dataKey: cat.id,
    inactive: hiddenPieCategories.includes(cat.id)
  })), [incomeCategories, hiddenPieCategories]);

  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2.5 rounded-2xl shadow-xl border-none">
          <div className="text-[10px] text-gray-400 mb-2 font-bold uppercase tracking-wider">{label}</div>
          <div className="space-y-1.5">
            {payload.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.stroke }} />
                  <span className="text-xs font-bold text-gray-600">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">¥{formatAmount(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden font-sans overscroll-none">
      {/* Header */}
      <header className="bg-white px-6 pt-safe pb-6 border-b border-gray-100 shrink-0 z-40">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">iMoney</h1>
            <p className="text-sm text-gray-500 mt-1">{format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">本年净收入</div>
            <div className={cn(
              "text-2xl font-bold whitespace-nowrap",
              stats.balance >= 0 ? "text-green-600" : "text-red-600"
            )}>
              ¥{formatAmount(stats.balance)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-green-50/50 p-3.5 rounded-2xl flex flex-col gap-1 shadow-sm border border-green-100/30 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <ArrowUpCircle className="text-green-600 shrink-0" size={14} />
              <div className="text-[10px] text-green-600/70 font-bold uppercase tracking-wider">本年收入</div>
            </div>
            <AutoShrinkText 
              text={`¥${formatHeaderAmount(stats.income)}`} 
              className="text-sm font-bold text-green-700 leading-tight" 
            />
          </div>
          <div className="bg-red-50/50 p-3.5 rounded-2xl flex flex-col gap-1 shadow-sm border border-red-100/30 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <ArrowDownCircle className="text-red-600 shrink-0" size={14} />
              <div className="text-[10px] text-red-600/70 font-bold uppercase tracking-wider">本年支出</div>
            </div>
            <AutoShrinkText 
              text={`¥${formatHeaderAmount(stats.expense)}`} 
              className="text-sm font-bold text-red-700 leading-tight" 
            />
          </div>
          <div className="bg-blue-50/50 p-3.5 rounded-2xl flex flex-col gap-1 shadow-sm border border-blue-100/30 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="text-blue-600 shrink-0" size={14} />
              <div className="text-[10px] text-blue-600/70 font-bold uppercase tracking-wider">本年储蓄率</div>
            </div>
            <AutoShrinkText 
              text={`${stats.income > 0 ? (Math.trunc(((stats.income - stats.expense) / stats.income) * 100 * 100) / 100).toFixed(2) : "0.00"}%`} 
              className="text-sm font-bold text-blue-700 leading-tight" 
            />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide overscroll-contain">
        {activeTab === 'history' && (
          <div className="space-y-6 pb-32">
            {/* Cascading Date Selector */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-blue-500" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">时间筛选</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* 今日 */}
                  {(!isSameDay(historyDate, new Date()) || historyView !== 'day') ? (
                    <button 
                      onClick={() => {
                        setHistoryDate(new Date());
                        setHistoryView('day');
                      }}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg active:scale-95 transition-all"
                    >
                      今日
                    </button>
                  ) : (
                    <div className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-lg">今日</div>
                  )}
                  {/* 全月 */}
                  {(!isSameMonth(historyDate, new Date()) || historyView !== 'month') ? (
                    <button 
                      onClick={() => {
                        setHistoryDate(new Date());
                        setHistoryView('month');
                      }}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg active:scale-95 transition-all"
                    >
                      全月
                    </button>
                  ) : (
                    <div className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-lg">全月</div>
                  )}
                  {/* 全年 */}
                  {(!isSameYear(historyDate, new Date()) || historyView !== 'year') ? (
                    <button 
                      onClick={() => {
                        setHistoryDate(new Date());
                        setHistoryView('year');
                      }}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg active:scale-95 transition-all"
                    >
                      全年
                    </button>
                  ) : (
                    <div className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-lg">全年</div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Year Select */}
                <div className="relative group">
                  <select 
                    value={historyDate.getFullYear()} 
                    onChange={(e) => {
                      const newDate = new Date(historyDate);
                      newDate.setFullYear(parseInt(e.target.value));
                      setHistoryDate(newDate);
                    }}
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 appearance-none focus:ring-0 focus:outline-none transition-all cursor-pointer"
                  >
                    {years.map(y => <option key={y} value={y}>{y}年</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>

                {/* Month Select */}
                <div className="relative group">
                  <select 
                    value={historyView === 'year' ? 'all' : historyDate.getMonth() + 1} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'all') {
                        setHistoryView('year');
                      } else {
                        const newDate = new Date(historyDate);
                        newDate.setMonth(parseInt(val) - 1);
                        setHistoryDate(newDate);
                        if (historyView === 'year') setHistoryView('month');
                      }
                    }}
                    className={cn(
                      "w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold appearance-none focus:ring-0 focus:outline-none transition-all cursor-pointer",
                      historyView === 'year' ? "text-blue-600 bg-blue-50" : "text-gray-700"
                    )}
                  >
                    <option value="all">全年</option>
                    {months.map(m => <option key={m} value={m}>{m}月</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>

                {/* Day Select */}
                <div className="relative group">
                  <select 
                    disabled={historyView === 'year'}
                    value={historyView === 'month' ? 'all' : historyDate.getDate()} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'all') {
                        setHistoryView('month');
                      } else {
                        const newDate = new Date(historyDate);
                        newDate.setDate(parseInt(val));
                        setHistoryDate(newDate);
                        setHistoryView('day');
                      }
                    }}
                    className={cn(
                      "w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold appearance-none focus:ring-0 focus:outline-none transition-all cursor-pointer disabled:opacity-30",
                      (historyView === 'day' || historyView === 'month') ? "text-blue-600 bg-blue-50" : "text-gray-700"
                    )}
                  >
                    <option value="all">全月</option>
                    {daysInMonth.map(d => <option key={d} value={d}>{d}日</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => {
                    if (historyView === 'day') setHistoryDate(subDays(historyDate, 1));
                    else if (historyView === 'month') setHistoryDate(subMonths(historyDate, 1));
                    else setHistoryDate(subYears(historyDate, 1));
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                  前一{historyView === 'day' ? '天' : historyView === 'month' ? '月' : '年'}
                </button>
                
                <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  {historyView === 'day' ? '按日查看' : historyView === 'month' ? '按月查看' : '按年查看'}
                </div>

                <button 
                  onClick={() => {
                    if (historyView === 'day') setHistoryDate(addDays(historyDate, 1));
                    else if (historyView === 'month') setHistoryDate(addMonths(historyDate, 1));
                    else setHistoryDate(addYears(historyDate, 1));
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors"
                >
                  后一{historyView === 'day' ? '天' : historyView === 'month' ? '月' : '年'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Period Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-2xl flex flex-col gap-1 shadow-sm border border-gray-50 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <ArrowUpCircle className="text-green-600 shrink-0" size={14} />
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">收入</div>
                </div>
                <AutoShrinkText 
                  text={`¥${formatAmount(historyStats.income)}`} 
                  className="text-sm font-bold text-green-600 leading-tight" 
                />
              </div>
              
              <div className="bg-white p-3 rounded-2xl flex flex-col gap-1 shadow-sm border border-gray-50 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <ArrowDownCircle className="text-red-600 shrink-0" size={14} />
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">支出</div>
                </div>
                <AutoShrinkText 
                  text={`¥${formatAmount(historyStats.expense)}`} 
                  className="text-sm font-bold text-red-600 leading-tight" 
                />
              </div>
              
              <div className="bg-white p-3 rounded-2xl flex flex-col gap-1 shadow-sm border border-gray-50 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="text-blue-600 shrink-0" size={14} />
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">结余</div>
                </div>
                <AutoShrinkText 
                  text={`¥${formatAmount(historyStats.balance)}`} 
                  className="text-sm font-bold text-blue-500 leading-tight" 
                />
              </div>
            </div>
            
            {/* Rankings Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Top Expenses */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                      <ArrowDownCircle size={18} />
                    </div>
                    <span className="font-bold text-gray-800">支出排行 <span className="text-[10px] text-gray-400 font-normal ml-1">Top 5</span></span>
                  </div>
                  
                  {topRankings.expenses.length > 0 ? (
                    <div className="space-y-3">
                      {topRankings.expenses.map((t, idx) => {
                        const category = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[CATEGORIES.length - 1];
                        return (
                          <div key={t.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full",
                                idx === 0 ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"
                              )}>
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-medium text-gray-900">{category.name}</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-gray-500">{format(parseISO(t.date), 'MM-dd')}</div>
                                  {t.note && (
                                    <div className="text-xs text-gray-400 truncate max-w-[100px]">
                                      {t.note}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-bold text-red-600">-{CURRENCY_SYMBOLS[t.currency || 'CNY']}{t.amount.toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">暂无支出记录</p>
                  )}
                </div>

                {/* Top Incomes */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                      <ArrowUpCircle size={18} />
                    </div>
                    <span className="font-bold text-gray-800">收入排行 <span className="text-[10px] text-gray-400 font-normal ml-1">Top 5</span></span>
                  </div>
                  
                  {topRankings.incomes.length > 0 ? (
                    <div className="space-y-3">
                      {topRankings.incomes.map((t, idx) => {
                        const category = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[CATEGORIES.length - 1];
                        return (
                          <div key={t.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full",
                                idx === 0 ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                              )}>
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-medium text-gray-900">{category.name}</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-gray-500">{format(parseISO(t.date), 'MM-dd')}</div>
                                  {t.note && (
                                    <div className="text-xs text-gray-400 truncate max-w-[100px]">
                                      {t.note}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-bold text-green-600">+{CURRENCY_SYMBOLS[t.currency || 'CNY']}{t.amount.toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">暂无收入记录</p>
                  )}
                </div>
              </div>
            </div>

            {/* History List Card (Moved to bottom) */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-50">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="text-gray-300" size={32} />
                </div>
                <p className="text-gray-400 text-sm">该时间段内没有记录</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                      <History size={18} />
                    </div>
                    <span className="font-bold text-gray-800">交易列表 <span className="text-[10px] text-gray-400 font-normal ml-1">History</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold">每页</span>
                    <select 
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(parseInt(e.target.value));
                        setHistoryPage(1);
                      }}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 border-none rounded-lg px-2 py-1 appearance-none cursor-pointer focus:ring-0 focus:outline-none"
                    >
                      {[5, 10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </div>
                </div>

                {historyView === 'day' ? (
                  filteredHistory.slice((historyPage - 1) * pageSize, historyPage * pageSize).map(t => (
                    <TransactionItem 
                      key={t.id} 
                      transaction={t} 
                      onEdit={startEditing}
                    />
                  ))
                ) : (
                  groupedHistory?.slice((historyPage - 1) * pageSize, historyPage * pageSize).map(group => {
                    const category = CATEGORIES.find(c => c.id === group.category) || CATEGORIES[CATEGORIES.length - 1];
                    return (
                      <div key={`${group.type}-${group.category}`} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            group.type === 'income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          )}>
                            <CategoryIcon name={category.icon} size={18} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{category.name}</div>
                            <div className="text-xs text-gray-400">
                              {filteredHistory.filter(t => t.category === group.category && t.type === group.type).length} 笔记录
                            </div>
                          </div>
                        </div>
                        <div className={cn(
                          "font-semibold",
                          group.type === 'income' ? "text-green-600" : "text-red-600"
                        )}>
                          {group.type === 'income' ? '+' : '-'}{CURRENCY_SYMBOLS[group.currency]}{formatAmount(group.amount)}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pagination Controls */}
                {Math.ceil((historyView === 'day' ? filteredHistory.length : groupedHistory?.length || 0) / pageSize) > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                    <button 
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => p - 1)}
                      className="text-xs font-medium text-blue-600 disabled:text-gray-300 flex items-center gap-1"
                    >
                      <ChevronLeft size={14} /> 上一页
                    </button>
                    <span className="text-[10px] font-bold text-gray-400">
                      第 {historyPage} / {Math.ceil((historyView === 'day' ? filteredHistory.length : groupedHistory?.length || 0) / pageSize)} 页
                    </span>
                    <button 
                      disabled={historyPage >= Math.ceil((historyView === 'day' ? filteredHistory.length : groupedHistory?.length || 0) / pageSize)}
                      onClick={() => setHistoryPage(p => p + 1)}
                      className="text-xs font-medium text-blue-600 disabled:text-gray-300 flex items-center gap-1"
                    >
                      下一页 <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'trends' && (
          <div className="space-y-6 pb-32">
            <div className="flex justify-end items-center">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['day', 'month', 'year'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setTrendView(v)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md transition-all",
                      trendView === v ? "bg-white shadow-sm text-blue-600 font-bold" : "text-gray-500"
                    )}
                  >
                    {v === 'day' ? '日' : v === 'month' ? '月' : '年'}
                  </button>
                ))}
              </div>
            </div>


            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                    <BarChart3 size={18} />
                  </div>
                  <span className="font-bold text-gray-800">收支趋势对比</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[10px] text-gray-500">收入</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] text-gray-500">支出</span>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#999' }} 
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ stroke: '#f0f0f0', strokeWidth: 1 }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name="收入" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name="支出" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <TrendingUp size={18} className="rotate-180" />
                  </div>
                  <span className="font-bold text-gray-800">支出分类趋势</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#999' }} 
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTrendTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle" 
                        payload={expenseLegendPayload}
                        onClick={(e) => toggleTrendCategory(e.dataKey)}
                        wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                      />
                      {expenseCategories.map((cat, idx) => (
                        <Line 
                          key={cat.id}
                          hide={hiddenTrendCategories.includes(cat.id)}
                          type="monotone" 
                          dataKey={cat.id} 
                          stroke={['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#3b82f6', '#10b981', '#06b6d4'][idx % 8]} 
                          strokeWidth={2.5} 
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          name={cat.name}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <PieChartIcon size={18} />
                  </div>
                  <span className="font-bold text-gray-800">支出分类占比</span>
                </div>
                <div className="h-64">
                  {expensePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensePieData.map(d => ({ ...d, type: 'expense' }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expensePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="circle" 
                          payload={expensePieLegendPayload}
                          onClick={(e) => togglePieCategory(e.dataKey)}
                          wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">暂无支出数据</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                    <TrendingUp size={18} />
                  </div>
                  <span className="font-bold text-gray-800">收入分类趋势</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#999' }} 
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTrendTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle" 
                        payload={incomeLegendPayload}
                        onClick={(e) => toggleTrendCategory(e.dataKey)}
                        wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                      />
                      {incomeCategories.map((cat, idx) => (
                        <Line 
                          key={cat.id}
                          hide={hiddenTrendCategories.includes(cat.id)}
                          type="monotone" 
                          dataKey={cat.id} 
                          stroke={['#10b981', '#3b82f6', '#06b6d4', '#14b8a6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'][idx % 8]} 
                          strokeWidth={2.5} 
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          name={cat.name}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                    <PieChartIcon size={18} />
                  </div>
                  <span className="font-bold text-gray-800">收入分类占比</span>
                </div>
                <div className="h-64">
                  {incomePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomePieData.map(d => ({ ...d, type: 'income' }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {incomePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="circle" 
                          payload={incomePieLegendPayload}
                          onClick={(e) => togglePieCategory(e.dataKey)}
                          wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">暂无收入数据</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 pb-32">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">每日记账提醒</h3>
                  <button 
                    onClick={() => {
                      if (!reminderEnabled && isTauri) {
                        requestNotificationPermission();
                      }
                      setReminderEnabled(!reminderEnabled);
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      reminderEnabled ? "bg-blue-600" : "bg-gray-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      reminderEnabled ? "left-6" : "left-1"
                    )} />
                  </button>
                </div>

                <div className={cn("space-y-4 transition-all", !reminderEnabled && "opacity-50 pointer-events-none")}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">提醒时间</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => triggerNotification("iMoney 测试提醒", tempReminderMessage)}
                        className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md active:scale-95 transition-all"
                      >
                        测试一下
                      </button>
                      <input 
                        type="time" 
                        value={tempReminderTime}
                        onChange={(e) => setTempReminderTime(e.target.value)}
                        className="bg-gray-100 px-4 py-2 rounded-md text-base font-bold text-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs text-gray-500 font-medium">提醒文案</span>
                    <input 
                      type="text" 
                      value={tempReminderMessage}
                      onChange={(e) => setTempReminderMessage(e.target.value)}
                      placeholder="输入提醒内容..."
                      className="w-full bg-gray-100 px-4 py-3 rounded-md text-base font-medium text-gray-900 focus:outline-none"
                    />
                  </div>

                  {(tempReminderTime !== reminderTime || tempReminderMessage !== reminderMessage) && (
                    <button 
                      onClick={() => {
                        setReminderTime(tempReminderTime);
                        setReminderMessage(tempReminderMessage);
                        notify("iMoney", "提醒设置已保存", "log");
                      }}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all"
                    >
                      保存提醒设置
                    </button>
                  )}
                </div>
                
                {!isTauri && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                      <strong>Web 版提示：</strong><br />
                      您当前正在使用 Web 版本。系统级提醒需要保持浏览器标签页开启才能生效。
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">币种与汇率管理</h3>
                    <p className="text-[10px] text-gray-400">管理多币种账单及实时汇率</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {currencyConfigs.map(config => (
                    <div key={config.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center font-bold text-gray-700 text-xs">
                          {config.symbol}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{config.code}</div>
                          <div className="text-[10px] text-gray-400">1 {config.code} = {config.rate} CNY</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {config.code !== 'CNY' && (
                          <div className="flex items-center bg-gray-50 rounded-lg px-2 py-1">
                            <span className="text-[10px] text-gray-400 mr-1">汇率:</span>
                            <input 
                              type="number" 
                              value={config.rate}
                              step="0.01"
                              onChange={(e) => updateCurrencyConfig(config.code, { rate: parseFloat(e.target.value) || 0 })}
                              className="w-12 bg-transparent text-base font-bold text-gray-700 focus:outline-none"
                            />
                          </div>
                        )}
                        <button 
                          onClick={() => config.code !== 'CNY' && updateCurrencyConfig(config.code, { enabled: !config.enabled })}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative",
                            config.enabled ? "bg-blue-600" : "bg-gray-200",
                            config.code === 'CNY' && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                            config.enabled ? "left-6" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                  * 汇率以人民币 (CNY) 为基准。启用后的币种将出现在记账选择列表中。
                  统计数据将根据此处设置的汇率自动换算为人民币。
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3.5 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => exportData()}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <Download size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">导出备份数据</div>
                    {lastBackupTime && (
                      <div className="text-[10px] text-gray-400">
                        最近备份: {format(new Date(lastBackupTime), 'MM-dd HH:mm')}
                        {backupPath && <span className="ml-2">(每12h自动备份)</span>}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              
              {isTauri ? (
                <div 
                  className="p-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => importData()}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                      <Upload size={18} />
                    </div>
                    <span className="font-medium text-gray-700">导入备份数据</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              ) : (
                <label className="p-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                      <Upload size={18} />
                    </div>
                    <span className="font-medium text-gray-700">导入备份数据</span>
                  </div>
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                  <ChevronRight size={18} className="text-gray-300" />
                </label>
              )}

              <div className="p-4 flex items-center justify-between hover:bg-red-50 cursor-pointer transition-colors group" onClick={() => {
                if (window.confirm("确定要清空所有记录吗？此操作不可撤销。")) {
                  setTransactions([]);
                  notify("iMoney", "所有记录已清空！");
                }
              }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                    <Trash2 size={18} />
                  </div>
                  <span className="font-medium text-red-600">清空所有记录</span>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-red-300" />
              </div>
            </div>

            <div className="text-center pt-10">
              <p className="text-[10px] text-gray-300 mt-1">数据仅保存在本地设备</p>
            </div>
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <button 
        onClick={() => {
          setEditingTransaction(null);
          setNewType('expense');
          setNewAmount('');
          setNewCurrency('CNY');
          setNewCategory(CATEGORIES.find(c => c.type === 'expense')?.id || '');
          setNewNote('');
          setIsAdding(true);
        }}
        className="absolute bottom-28 right-6 w-14 h-14 bg-blue-600/90 backdrop-blur-md text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center active:scale-90 transition-all z-10 border border-white/20"
      >
        <Plus size={32} />
      </button>

      {/* Tab Bar */}
      <nav className="bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around items-center px-4 pb-safe pt-2 w-full shrink-0 z-50">
        <TabButton active={activeTab === 'history'} icon={LayoutDashboard} label="概览" onClick={() => setActiveTab('history')} />
        <TabButton active={activeTab === 'trends'} icon={BarChart3} label="趋势" onClick={() => setActiveTab('trends')} />
        <TabButton active={activeTab === 'settings'} icon={SettingsIcon} label="设置" onClick={() => setActiveTab('settings')} />
      </nav>

      {/* Add/Edit Transaction Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute inset-0 bg-white z-50 flex flex-col overscroll-none"
          >
            <header className="px-6 pt-safe pb-4 flex justify-between items-center border-b border-gray-50 bg-white sticky top-0 z-10 shrink-0">
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingTransaction(null);
                }} 
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => {
                    setNewType('expense');
                    setNewCategory(CATEGORIES.find(c => c.type === 'expense')?.id || '');
                  }}
                  className={cn(
                    "px-8 py-2 rounded-md text-sm font-bold transition-all",
                    newType === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-gray-500"
                  )}
                >
                  支出
                </button>
                <button 
                  onClick={() => {
                    setNewType('income');
                    setNewCategory(CATEGORIES.find(c => c.type === 'income')?.id || '');
                  }}
                  className={cn(
                    "px-8 py-2 rounded-md text-sm font-bold transition-all",
                    newType === 'income' ? "bg-white text-green-600 shadow-sm" : "text-gray-500"
                  )}
                >
                  收入
                </button>
              </div>
              <button 
                onClick={addTransaction}
                className="w-10 h-10 flex items-center justify-center text-blue-600 font-bold disabled:opacity-30 bg-blue-50 rounded-full active:scale-90 transition-all"
                disabled={!newAmount}
              >
                <Plus size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide overscroll-contain">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CalendarIcon size={10} className="text-gray-300" />
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                    {format(new Date(), 'yyyy-MM-dd')}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-xl font-bold text-gray-300">{CURRENCY_SYMBOLS[newCurrency]}</span>
                    <input 
                      type="number" 
                      autoFocus
                      placeholder="0"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="text-5xl font-black text-gray-900 focus:outline-none w-full text-center placeholder:text-gray-100 bg-transparent"
                    />
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {[10, 50, 100, 500].map(val => (
                      <button
                        key={val}
                        onClick={() => setNewAmount(prev => (parseFloat(prev || '0') + val).toString())}
                        className="px-3 py-1.5 rounded-lg bg-white text-gray-600 text-[10px] font-bold border border-gray-100 shadow-sm active:scale-95 transition-all"
                      >
                        +{val}
                      </button>
                    ))}
                    <button
                      onClick={() => setNewAmount('')}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-[10px] font-bold border border-red-100/50 shadow-sm active:scale-95 transition-all"
                    >
                      清除
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {currencyConfigs.filter(c => c.enabled).map(config => (
                      <button
                        key={config.code}
                        onClick={() => setNewCurrency(config.code)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                          newCurrency === config.code 
                            ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                            : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
                        )}
                      >
                        {config.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">选择分类</div>
                  <div className="text-[10px] text-blue-500 font-bold">
                    {CATEGORIES.find(c => c.id === newCategory)?.name}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-y-6 gap-x-4">
                  {CATEGORIES.filter(c => c.type === newType).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setNewCategory(cat.id)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-3xl flex items-center justify-center transition-all duration-300",
                        newCategory === cat.id 
                          ? (newType === 'expense' ? "bg-red-500 text-white shadow-xl shadow-red-100 scale-110" : "bg-green-500 text-white shadow-xl shadow-green-100 scale-110")
                          : "bg-gray-50 text-gray-400 group-hover:bg-gray-100"
                      )}>
                        <CategoryIcon name={cat.icon} size={24} />
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold transition-colors",
                        newCategory === cat.id ? "text-gray-900" : "text-gray-400"
                      )}>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider px-2">备注</div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="写点备注吧..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all border border-transparent focus:bg-white"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                    <Edit2 size={16} />
                  </div>
                </div>
              </div>

            </div>

            <footer className="px-6 pt-4 pb-safe border-t border-gray-50 bg-white shrink-0">
              {editingTransaction ? (
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      if (window.confirm("确定要删除这条记录吗？")) {
                        deleteTransaction(editingTransaction.id);
                        setIsAdding(false);
                        setEditingTransaction(null);
                      }
                    }}
                    className="flex items-center justify-center gap-2 text-red-500 font-bold py-3.5 rounded-xl bg-red-50 active:scale-95 transition-all"
                  >
                    <Trash2 size={18} />
                    <span>删除</span>
                  </button>
                  <button 
                    onClick={addTransaction}
                    className="flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-100 active:scale-95 transition-all"
                  >
                    <span>保存修改</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={addTransaction}
                  disabled={!newAmount}
                  className="w-full flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl bg-blue-600 shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30 disabled:shadow-none"
                >
                  <Plus size={20} />
                  <span>完成记账</span>
                </button>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

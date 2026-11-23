import { useMemo } from 'react';
import { Card, Progress, Space, Tag, Typography } from 'antd';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import { categoryStats, formatMoney, inRange, summarize } from '../lib/finance';
import type { AppSettings, Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  settings: AppSettings;
}

interface MonthData {
  key: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export default function HealthView({ transactions, settings }: Props) {
  const configs = settings.currencyConfigs;
  const anchor = dayjs(settings.historyDate);

  const months = useMemo<MonthData[]>(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const month = anchor.startOf('month').subtract(5 - index, 'month');
        const rows = inRange(transactions, month.startOf('month'), month.endOf('month'));
        const summary = summarize(rows, configs);
        return {
          key: month.format('YYYY-MM'),
          label: month.format('M月'),
          income: summary.income,
          expense: summary.expense,
          balance: summary.balance,
          savingsRate: clamp(summary.savingsRate * 100),
        };
      }),
    [transactions, configs, anchor],
  );

  const current = months[months.length - 1];
  const previous = months[months.length - 2];

  const dimensions = useMemo(() => {
    const monthsWithIncome = months.filter((item) => item.income > 0);
    const avgRate = monthsWithIncome.length
      ? monthsWithIncome.reduce((sum, item) => sum + item.savingsRate, 0) / monthsWithIncome.length
      : 0;
    const savingScore = clamp(avgRate);

    const incomeValues = monthsWithIncome.map((item) => item.income);
    const incomeAvg = incomeValues.length
      ? incomeValues.reduce((sum, value) => sum + value, 0) / incomeValues.length
      : 0;
    const incomeVariance = incomeValues.length
      ? incomeValues.reduce((sum, value) => sum + (value - incomeAvg) ** 2, 0) / incomeValues.length
      : 0;
    const incomeScore = incomeAvg > 0 ? clamp(100 - (Math.sqrt(incomeVariance) / incomeAvg) * 100) : 30;

    const currentRows = inRange(
      transactions,
      anchor.startOf('month'),
      anchor.endOf('month'),
    );
    const expenseCats = categoryStats(currentRows, configs, 'expense');
    const maxCategoryPercent = expenseCats[0]?.percent ?? 1;
    const diversityScore = clamp(100 - maxCategoryPercent * 80);

    const activeDays = new Set(
      transactions
        .filter((row) => dayjs(row.date).isAfter(anchor.subtract(30, 'day')))
        .map((row) => dayjs(row.date).format('YYYY-MM-DD')),
    ).size;
    const recordScore = clamp((activeDays / 30) * 100);

    return [
      { label: '储蓄能力', value: Math.round(savingScore), color: '#66b694', hint: '近 6 个月平均储蓄率' },
      { label: '收入稳定', value: Math.round(incomeScore), color: '#7ba4d0', hint: '月收入波动越小越稳定' },
      { label: '支出分散', value: Math.round(diversityScore), color: '#9d8ed3', hint: '支出越集中分数越低' },
      { label: '记账习惯', value: Math.round(recordScore), color: '#e08b72', hint: '近 30 天有记录的天数' },
    ];
  }, [months, transactions, configs, anchor]);

  const score = Math.round(dimensions.reduce((sum, item) => sum + item.value, 0) / dimensions.length);
  const scoreColor = score >= 80 ? '#66b694' : score >= 60 ? '#7ba4d0' : '#e08b72';
  const scoreText = score >= 80 ? '非常健康' : score >= 60 ? '状态良好' : score >= 40 ? '需要关注' : '亟需改善';

  const incomeChange = previous.income > 0
    ? ((current.income - previous.income) / previous.income) * 100
    : 0;
  const expenseChange = previous.expense > 0
    ? ((current.expense - previous.expense) / previous.expense) * 100
    : 0;

  return (
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      <Card size="small">
        <div className="health-score">
          <div className="health-score-ring" style={{ background: `conic-gradient(${scoreColor} ${score * 3.6}deg, #eef0f5 0)` }}>
            <div className="health-score-inner">
              <strong>{score}</strong>
              <span>健康指数</span>
            </div>
          </div>
          <div className="health-score-info">
            <Typography.Title level={5} style={{ margin: 0 }}>{scoreText}</Typography.Title>
            <Typography.Text type="secondary">
              {anchor.format('YYYY年M月')} · 基于近 6 个月数据
            </Typography.Text>
            <div style={{ marginTop: 10 }}>
              <Tag color={current.savingsRate >= 30 ? 'green' : current.savingsRate >= 10 ? 'blue' : 'orange'}>
                储蓄率 {current.savingsRate.toFixed(1)}%
              </Tag>
            </div>
          </div>
        </div>
        <div className="section-divider" />
        <div className="health-dimensions">
          {dimensions.map((item) => (
            <div key={item.label} className="health-dimension">
              <div className="health-dimension-head">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <Progress percent={item.value} strokeColor={item.color} showInfo={false} size="small" />
              <Typography.Text type="secondary" className="health-dimension-hint">{item.hint}</Typography.Text>
            </div>
          ))}
        </div>
      </Card>

      <Card size="small" title="储蓄率趋势" extra={<Typography.Text type="secondary">近 6 个月</Typography.Text>}>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={months} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7ba4d0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7ba4d0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                formatter={(value: number) => [`${Number(value).toFixed(1)}%`, '储蓄率']}
                contentStyle={{ borderRadius: 6, border: '1px solid #eef0f5', fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="savingsRate"
                stroke="#7ba4d0"
                strokeWidth={2}
                fill="url(#savingsGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card size="small" title="月度对比" extra={<Typography.Text type="secondary">{current.label} vs {previous.label}</Typography.Text>}>
        <div className="health-compare">
          <div className="health-compare-item">
            <span>收入</span>
            <strong>{formatMoney(current.income, 0)}</strong>
            <Tag color={incomeChange >= 0 ? 'green' : 'red'} bordered={false}>
              {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}%
            </Tag>
          </div>
          <div className="health-compare-item">
            <span>支出</span>
            <strong>{formatMoney(current.expense, 0)}</strong>
            <Tag color={expenseChange <= 0 ? 'green' : 'red'} bordered={false}>
              {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}%
            </Tag>
          </div>
          <div className="health-compare-item">
            <span>结余</span>
            <strong>{formatMoney(current.balance, 0)}</strong>
            <Tag color={current.balance >= 0 ? 'green' : 'red'} bordered={false}>
              {current.balance >= 0 ? '盈余' : '赤字'}
            </Tag>
          </div>
        </div>
        <div className="section-divider" />
        <div className="health-months">
          {months.map((item) => (
            <div key={item.key} className="health-month">
              <div className="health-month-head">
                <span>{item.label}</span>
                <strong>{item.savingsRate.toFixed(0)}%</strong>
              </div>
              <Progress
                percent={item.savingsRate}
                strokeColor={item.savingsRate >= 30 ? '#66b694' : item.savingsRate >= 10 ? '#7ba4d0' : '#e08b72'}
                showInfo={false}
                size="small"
              />
            </div>
          ))}
        </div>
      </Card>
    </Space>
  );
}

import { useMemo, useState, type CSSProperties } from 'react';
import { Button, Card, Col, DatePicker, Empty, Row, Segmented, Space, Statistic, Typography } from 'antd';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Dayjs } from 'dayjs';
import MetricStrip from '../components/MetricStrip';
import useIsMobile from '../hooks/useIsMobile';
import { CHART_COLORS, VIEW_LABELS } from '../constants';
import {
  categoryStats,
  createBuckets,
  defaultTrendRange,
  effectiveMode,
  formatAxisMoney,
  formatMoney,
  inRange,
  summarize,
  trendData,
} from '../lib/finance';
import type { AppSettings, CategoryStat, Transaction, ViewMode } from '../types';

interface Props {
  transactions: Transaction[];
  settings: AppSettings;
  onSettings: (patch: Partial<AppSettings>) => void;
  onViewCategory: (categoryId: string, rows: Transaction[]) => void;
}

interface TooltipPayload {
  name?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      {payload.map((item, index) => (
        <div key={`${item.name}-${index}`} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <strong>{formatMoney(Number(item.value ?? 0))}</strong>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const total = Number((item.payload?.total as number) ?? 0);
  const value = Number(item.value ?? 0);
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" style={{ background: item.color }} />
        <span>{item.name}</span>
        <strong>{formatMoney(value)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>占比</span>
        <strong>{total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'}%</strong>
      </div>
    </div>
  );
}

export default function TrendsView({ transactions, settings, onSettings, onViewCategory }: Props) {
  const isMobile = useIsMobile();
  const [start, setStart] = useState<Dayjs>(() => defaultTrendRange(settings.trendView)[0]);
  const [end, setEnd] = useState<Dayjs>(() => defaultTrendRange(settings.trendView)[1]);

  const changeMode = (view: ViewMode) => {
    const [nextStart, nextEnd] = defaultTrendRange(view);
    setStart(nextStart);
    setEnd(nextEnd);
    onSettings({ trendView: view });
  };

  const mode = effectiveMode(start, end, settings.trendView);
  const rows = useMemo(() => inRange(transactions, start, end), [transactions, start, end]);
  const summary = useMemo(() => summarize(rows, settings.currencyConfigs), [rows, settings.currencyConfigs]);
  const expenseStats = useMemo(() => categoryStats(rows, settings.currencyConfigs, 'expense'), [rows, settings.currencyConfigs]);
  const incomeStats = useMemo(() => categoryStats(rows, settings.currencyConfigs, 'income'), [rows, settings.currencyConfigs]);

  const flowData = useMemo(
    () => trendData(rows, settings.currencyConfigs, start, end, mode, ['income', 'expense']),
    [rows, settings.currencyConfigs, start, end, mode],
  );

  const renderCategoryChart = (stats: CategoryStat[], type: 'expense' | 'income') => {
    const hidden = settings.hiddenTrendCategories;
    const active = stats.filter((item) => !hidden.includes(item.category));
    const keys = active.map((item) => item.category);
    const data = trendData(rows, settings.currencyConfigs, start, end, mode, keys);
    const colorOf = (category: string) => {
      const index = stats.findIndex((item) => item.category === category);
      return stats[index]?.color || CHART_COLORS[(index < 0 ? 0 : index) % CHART_COLORS.length];
    };
    return (
      <Card
        size="small"
        title={type === 'expense' ? '分类支出动态' : '分类收入动态'}
        extra={
          active.length !== stats.length ? (
            <Button type="link" size="small" onClick={() => onSettings({ hiddenTrendCategories: [] })}>全选</Button>
          ) : undefined
        }
      >
        {stats.length === 0 ? (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            <div className="chart-legend">
              {stats.map((item) => {
                const checked = !hidden.includes(item.category);
                return (
                  <button
                    key={item.category}
                    type="button"
                    className={`chart-legend-item${checked ? ' is-active' : ''}`}
                    style={{ '--legend-color': colorOf(item.category) } as CSSProperties}
                    aria-pressed={checked}
                    onClick={() =>
                      onSettings({
                        hiddenTrendCategories: checked
                          ? [...hidden, item.category]
                          : hidden.filter((category) => category !== item.category),
                      })
                    }
                  >
                    <span className="chart-legend-mark" />
                    <span className="chart-legend-label">{item.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tickFormatter={formatAxisMoney} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<ChartTooltip />} />
                  {active.map((item) => (
                    <Line
                      key={item.category}
                      type="monotone"
                      dataKey={item.category}
                      name={item.name}
                      stroke={colorOf(item.category)}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>
    );
  };

  const renderPie = (stats: CategoryStat[], type: 'expense' | 'income') => {
    const hidden = settings.hiddenPieCategories;
    const active = stats.filter((item) => !hidden.includes(item.category) && item.category);
    const total = active.reduce((acc, item) => acc + item.amount, 0);
    const data = active.map((item) => ({
      name: item.name,
      value: item.amount,
      color: item.color,
      category: item.category,
      total,
    }));
    return (
      <Card size="small" title={type === 'expense' ? '支出构成比例' : '收入来源比例'}>
        {data.length === 0 ? (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Row gutter={12} align="middle">
            <Col xs={24} sm={14}>
              <div className="pie-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="82%"
                      paddingAngle={2}
                      isAnimationActive={false}
                      onClick={(entry) => {
                        const category = (entry as { category?: string }).category;
                        if (category) onViewCategory(category, rows.filter((row) => row.category === category));
                      }}
                    >
                      {data.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col xs={24} sm={10}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {data.map((item) => (
                  <button
                    key={`${item.name}-${item.category}`}
                    type="button"
                    className="pie-legend-item"
                    onClick={() =>
                      onSettings({
                        hiddenPieCategories: hidden.includes(item.category)
                          ? hidden.filter((value) => value !== item.category)
                          : [...hidden, item.category],
                      })
                    }
                  >
                    <span className="chart-tooltip-dot" style={{ background: item.color }} />
                    <span className="pie-legend-name">{item.name}</span>
                    <span>{total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'}%</span>
                  </button>
                ))}
              </Space>
            </Col>
          </Row>
        )}
      </Card>
    );
  };

  const buckets = createBuckets(start, end, mode);
  const periods = Math.max(1, buckets.length);
  const days = Math.max(1, end.diff(start, 'day') + 1);
  const months = Math.max(1, end.diff(start, 'month') + 1);
  const years = Math.max(1, end.diff(start, 'year') + 1);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" styles={{ body: { padding: 12 } }}>
        <Segmented
          block
          value={settings.trendView}
          options={Object.entries(VIEW_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => changeMode(value as ViewMode)}
        />
        {isMobile ? (
          <div className="trend-range-mobile">
            <DatePicker
              picker={settings.trendView === 'day' ? 'date' : settings.trendView}
              format={settings.trendView === 'day' ? 'YYYY-MM-DD' : settings.trendView === 'month' ? 'YYYY-MM' : 'YYYY'}
              value={start}
              allowClear={false}
              placement="bottomLeft"
              onChange={(value) => value && setStart(value)}
            />
            <span className="range-sep">至</span>
            <DatePicker
              picker={settings.trendView === 'day' ? 'date' : settings.trendView}
              format={settings.trendView === 'day' ? 'YYYY-MM-DD' : settings.trendView === 'month' ? 'YYYY-MM' : 'YYYY'}
              value={end}
              allowClear={false}
              placement="bottomLeft"
              onChange={(value) => value && setEnd(value)}
            />
            <Button onClick={() => changeMode(settings.trendView)}>重置</Button>
          </div>
        ) : (
          <div className="trend-range">
            <DatePicker.RangePicker
              picker={settings.trendView === 'day' ? 'date' : settings.trendView}
              format={settings.trendView === 'day' ? 'YYYY-MM-DD' : settings.trendView === 'month' ? 'YYYY-MM' : 'YYYY'}
              value={[start, end]}
              allowClear={false}
              placement="bottomLeft"
              style={{ flex: 1, minWidth: 0 }}
              onChange={(values) => {
                if (values?.[0] && values[1]) {
                  setStart(values[0]);
                  setEnd(values[1]);
                }
              }}
            />
            <Button onClick={() => changeMode(settings.trendView)}>重置</Button>
          </div>
        )}
      </Card>

      <Card size="small" styles={{ body: { padding: '14px 4px' } }}>
        <MetricStrip
          items={[
            { label: '区间收入', value: formatMoney(summary.income), tone: 'income' },
            { label: '区间支出', value: formatMoney(summary.expense), tone: 'expense' },
            { label: '区间结余', value: formatMoney(summary.balance) },
          ]}
        />
      </Card>

      <Card size="small" title="收支走势对比">
        <div className="chart-container chart-container-tall">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flowData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tickFormatter={formatAxisMoney} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="income" name="收入" stroke="#10b981" fill="url(#incomeGradient)" strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey="expense" name="支出" stroke="#f43f5e" fill="url(#expenseGradient)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>{renderCategoryChart(expenseStats, 'expense')}</Col>
        <Col xs={24} lg={12}>{renderCategoryChart(incomeStats, 'income')}</Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>{renderPie(expenseStats, 'expense')}</Col>
        <Col xs={24} lg={12}>{renderPie(incomeStats, 'income')}</Col>
      </Row>

      <Card size="small" title="周期均值分析">
        <Row gutter={[16, 12]}>
          <Col xs={8}><Statistic title="日均结余" value={summary.balance / days} precision={2} prefix="¥" /></Col>
          <Col xs={8}><Statistic title="月均结余" value={summary.balance / months} precision={2} prefix="¥" /></Col>
          <Col xs={8}><Statistic title="年均结余" value={summary.balance / years} precision={2} prefix="¥" /></Col>
        </Row>
        <div className="section-divider" />
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Typography.Title level={5}>支出分类均值 · 每期</Typography.Title>
            {expenseStats.length === 0 ? (
              <Typography.Text type="secondary">暂无数据</Typography.Text>
            ) : (
              <div className="average-grid">
                {expenseStats.slice(0, 8).map((stat) => (
                  <button
                    key={stat.category}
                    type="button"
                    className="average-chip"
                    onClick={() => onViewCategory(stat.category, rows.filter((row) => row.category === stat.category))}
                  >
                    <span className="chip-name">{stat.name}</span>
                    <strong className="chip-value">{formatMoney(stat.amount / periods)}</strong>
                  </button>
                ))}
              </div>
            )}
          </Col>
          <Col xs={24} lg={12}>
            <Typography.Title level={5}>收入分类均值 · 每期</Typography.Title>
            {incomeStats.length === 0 ? (
              <Typography.Text type="secondary">暂无数据</Typography.Text>
            ) : (
              <div className="average-grid">
                {incomeStats.slice(0, 8).map((stat) => (
                  <button
                    key={stat.category}
                    type="button"
                    className="average-chip"
                    onClick={() => onViewCategory(stat.category, rows.filter((row) => row.category === stat.category))}
                  >
                    <span className="chip-name">{stat.name}</span>
                    <strong className="chip-value">{formatMoney(stat.amount / periods)}</strong>
                  </button>
                ))}
              </div>
            )}
          </Col>
        </Row>
      </Card>
    </Space>
  );
}

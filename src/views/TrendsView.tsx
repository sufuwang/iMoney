import { useMemo, useState, type CSSProperties } from 'react';
import { Button, Card, Col, DatePicker, Empty, Row, Segmented, Space } from 'antd';
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
  defaultTrendRange,
  effectiveMode,
  formatAxisMoney,
  formatMoney,
  futureDateDisabled,
  inRange,
  summarize,
  trendData,
} from '../lib/finance';
import type { AppSettings, CategoryStat, Transaction, ViewMode } from '../types';

const INCOME_COLOR = '#10b981';
const EXPENSE_COLOR = '#f43f5e';
const FLOW_LEGEND = [
  { key: 'income', label: '收入', color: INCOME_COLOR },
  { key: 'expense', label: '支出', color: EXPENSE_COLOR },
] as const;

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
  const [hiddenFlowTypes, setHiddenFlowTypes] = useState<string[]>([]);

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
        title={type === 'expense' ? '支出走势' : '收入走势'}
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
    const toggleCategory = (category: string) => {
      onSettings({
        hiddenPieCategories: hidden.includes(category)
          ? hidden.filter((value) => value !== category)
          : [...hidden, category],
      });
    };
    const active = stats.filter((item) => !hidden.includes(item.category) && item.category);
    const total = active.reduce((acc, item) => acc + item.amount, 0);
    const data = active.map((item) => ({
      name: item.name,
      value: item.amount,
      color: item.color,
      category: item.category,
      total,
    }));
    const topCategories = new Set(
      [...data].sort((a, b) => b.value - a.value).slice(0, 3).map((item) => item.category),
    );
    const renderPieLabel = (props: unknown) => {
      const point = props as {
        name?: string | number;
        value?: number;
        midAngle?: number;
        cx?: number;
        cy?: number;
        outerRadius?: number;
        payload?: { category?: string };
      };
      if (!topCategories.size || !topCategories.has(point.payload?.category ?? '') || point.midAngle === undefined) {
        return null;
      }
      const angle = (point.midAngle * Math.PI) / 180;
      const radius = (point.outerRadius ?? 0) + 10;
      const x = (point.cx ?? 0) + Math.cos(angle) * radius;
      const y = (point.cy ?? 0) - Math.sin(angle) * radius;
      const percent = total > 0 ? (((Number(point.value ?? 0) / total) * 100)).toFixed(1) : '0.0';
      return (
        <text
          x={x}
          y={y}
          textAnchor={Math.cos(angle) >= 0 ? 'start' : 'end'}
          dominantBaseline="middle"
          fontSize={10}
          fontWeight={600}
          fill="#4b5563"
        >
          {point.name} {percent}%
        </text>
      );
    };
    const renderPieLabelLine = (props: unknown) => {
      const point = props as {
        name?: string | number;
        midAngle?: number;
        cx?: number;
        cy?: number;
        outerRadius?: number;
        payload?: { category?: string; color?: string };
      };
      if (point.midAngle === undefined || !topCategories.has(point.payload?.category ?? '')) return null;
      const angle = (point.midAngle * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const outer = point.outerRadius ?? 0;
      const startX = (point.cx ?? 0) + cos * (outer + 2);
      const startY = (point.cy ?? 0) - sin * (outer + 2);
      const labelX = (point.cx ?? 0) + cos * (outer + 10);
      const labelY = (point.cy ?? 0) - sin * (outer + 10);
      const elbowX = labelX - Math.sign(cos || 1) * 5;
      const color = point.payload?.color
        ?? data.find((item) => item.name === point.name)?.color
        ?? '#b9bfcc';
      return (
        <polyline
          points={`${startX},${startY} ${elbowX},${startY} ${elbowX},${labelY}`}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.75}
          pointerEvents="none"
        />
      );
    };
    return (
      <Card
        size="small"
        title={type === 'expense' ? '支出构成' : '收入构成'}
        extra={
          stats.some((item) => hidden.includes(item.category)) ? (
            <Button type="link" size="small" onClick={() => onSettings({ hiddenPieCategories: [] })}>全选</Button>
          ) : undefined
        }
      >
        {stats.length === 0 ? (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            {data.length === 0 ? (
              <Empty description="已隐藏全部分类" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
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
                      label={renderPieLabel}
                      labelLine={renderPieLabelLine}
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
            )}
            <div className="category-list">
              {stats.map((item) => {
                const checked = !hidden.includes(item.category);
                return (
                  <div
                    key={item.category}
                    className={`category-row${checked ? '' : ' is-hidden'}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={checked}
                    onClick={() => toggleCategory(item.category)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleCategory(item.category);
                      }
                    }}
                  >
                    <span className="category-dot" style={{ background: item.color }} />
                    <span className="category-row-name">{item.name}</span>
                    <span className="category-row-amount">{formatMoney(item.amount)}</span>
                    <span className="category-row-percent">{(item.percent * 100).toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    );
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }} className="trends-page">
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
              inputReadOnly
              placement="bottomLeft"
              disabledDate={futureDateDisabled(settings.trendView)}
              onChange={(value) => value && setStart(value)}
            />
            <span className="range-sep">至</span>
            <DatePicker
              picker={settings.trendView === 'day' ? 'date' : settings.trendView}
              format={settings.trendView === 'day' ? 'YYYY-MM-DD' : settings.trendView === 'month' ? 'YYYY-MM' : 'YYYY'}
              value={end}
              allowClear={false}
              inputReadOnly
              placement="bottomLeft"
              disabledDate={futureDateDisabled(settings.trendView)}
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
              inputReadOnly
              placement="bottomLeft"
              style={{ flex: 1, minWidth: 0 }}
              disabledDate={futureDateDisabled(settings.trendView)}
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

      <Card
        size="small"
        title="收支走势"
        extra={
          hiddenFlowTypes.length > 0 ? (
            <Button type="link" size="small" onClick={() => setHiddenFlowTypes([])}>全选</Button>
          ) : undefined
        }
      >
        <div className="chart-legend">
          {FLOW_LEGEND.map((item) => {
            const checked = !hiddenFlowTypes.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                className={`chart-legend-item${checked ? ' is-active' : ''}`}
                style={{ '--legend-color': item.color } as CSSProperties}
                aria-pressed={checked}
                onClick={() =>
                  setHiddenFlowTypes((current) =>
                    checked
                      ? [...current, item.key]
                      : current.filter((key) => key !== item.key),
                  )
                }
              >
                <span className="chart-legend-mark" />
                <span className="chart-legend-label">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="chart-container chart-container-tall">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flowData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tickFormatter={formatAxisMoney} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ChartTooltip />} />
              {!hiddenFlowTypes.includes('income') && (
                <Area type="monotone" dataKey="income" name="收入" stroke={INCOME_COLOR} fill="url(#incomeGradient)" strokeWidth={2} isAnimationActive={false} />
              )}
              {!hiddenFlowTypes.includes('expense') && (
                <Area type="monotone" dataKey="expense" name="支出" stroke={EXPENSE_COLOR} fill="url(#expenseGradient)" strokeWidth={2} isAnimationActive={false} />
              )}
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
    </Space>
  );
}

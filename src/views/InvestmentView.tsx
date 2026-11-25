import { useMemo, useState, type CSSProperties } from 'react';
import { Button, Card, Col, Collapse, Empty, Listy, Row, Space, Typography } from 'antd';
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
import dayjs from 'dayjs';
import { AssetAvatar } from '../components/CategoryAvatar';
import MetricStrip from '../components/MetricStrip';
import { ASSET_TYPES, CASH_ASSET_TYPE } from '../constants';
import { assetRows } from '../lib/assets';
import { convertToBase, formatAxisMoney, formatMoney } from '../lib/finance';
import type { AssetSnapshot, CurrencyConfig } from '../types';

const INVESTMENT_TYPES = ASSET_TYPES.filter((item) => item.value !== CASH_ASSET_TYPE);
const CASH_COLOR = ASSET_TYPES.find((item) => item.value === CASH_ASSET_TYPE)?.color ?? '#d4b46f';
const ASSET_TOTAL_COLOR = '#4f46e5';
const returnRateOf = (amount: number, profit: number) => {
  const costBasis = Math.abs(profit) + amount;
  return costBasis > 0 ? (profit / costBasis) * 100 : 0;
};

interface Props {
  assets: AssetSnapshot[];
  configs: CurrencyConfig[];
  onAddAsset: () => void;
  onDeleteAsset: (id: string) => void;
}

interface TooltipItem {
  name?: string;
  value?: number;
  color?: string;
}

function AssetTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) {
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

interface RateLine {
  key: string;
  name: string;
  color: string;
}

function RateTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      {payload.map((item, index) => (
        <div key={`${item.name}-${index}`} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <strong>{Number(item.value ?? 0).toFixed(2)}%</strong>
        </div>
      ))}
    </div>
  );
}

function RateLineChart({ data, lines }: { data: Record<string, string | number>[]; lines: RateLine[] }) {
  return (
    <div className="chart-container chart-container-compact">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tickFormatter={(value) => `${Number(value).toFixed(0)}%`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<RateTooltip />} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleTrendChart({
  data,
  dataKey,
  color,
  gradientId,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
  gradientId: string;
}) {
  return (
    <div className="chart-container chart-container-compact">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tickFormatter={formatAxisMoney} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<AssetTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function InvestmentView({ assets, configs, onAddAsset, onDeleteAsset }: Props) {
  const rows = useMemo(() => assetRows(assets, configs), [assets, configs]);
  const latest = rows[rows.length - 1] ?? null;
  const returnRate = latest?.returnRate ?? 0;
  const [hiddenInvestmentTypes, setHiddenInvestmentTypes] = useState<string[]>([]);
  const [hiddenReturnTypes, setHiddenReturnTypes] = useState<string[]>([]);

  const chartData = rows.map((row) => ({
    label: row.month.slice(2),
    ...Object.fromEntries(INVESTMENT_TYPES.map((type) => [type.label, row[type.value]])),
    ...Object.fromEntries(INVESTMENT_TYPES.map((type) => [
      `${type.label}收益率`,
      returnRateOf(row[type.value], row.profitByType[type.value]),
    ])),
    现金: row.cash,
    资产总额: row.total,
    总收益率: row.returnRate,
  }));
  const activeReturnTypes = INVESTMENT_TYPES.filter((type) => !hiddenReturnTypes.includes(type.value));
  const allocation = latest
    ? ASSET_TYPES.map((type) => ({
        name: type.label,
        value: latest[type.value],
        color: type.color,
      })).filter((item) => item.value > 0)
    : [];
  const allocationWithPercent = [...allocation]
    .sort((a, b) => b.value - a.value)
    .map((item) => ({
      ...item,
      percent: latest && latest.total > 0 ? (item.value / latest.total) * 100 : 0,
    }));

  const details = [...assets].sort(
    (a, b) => b.month.localeCompare(a.month) || a.type.localeCompare(b.type),
  );
  const topAllocationNames = new Set(allocationWithPercent.slice(0, 3).map((item) => item.name));
  const renderAssetPieLabel = (props: unknown) => {
    const point = props as {
      name?: string | number;
      value?: number;
      midAngle?: number;
      cx?: number;
      cy?: number;
      outerRadius?: number;
    };
    if (point.midAngle === undefined || !topAllocationNames.has(String(point.name ?? ''))) return null;
    const angle = (point.midAngle * Math.PI) / 180;
    const radius = (point.outerRadius ?? 0) + 10;
    const x = (point.cx ?? 0) + Math.cos(angle) * radius;
    const y = (point.cy ?? 0) - Math.sin(angle) * radius;
    const total = latest?.total ?? 0;
    const percent = total > 0 ? ((Number(point.value ?? 0) / total) * 100).toFixed(1) : '0.0';
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
  const renderAssetPieLabelLine = (props: unknown) => {
    const point = props as {
      name?: string | number;
      midAngle?: number;
      cx?: number;
      cy?: number;
      outerRadius?: number;
      payload?: { color?: string };
    };
    if (point.midAngle === undefined || !topAllocationNames.has(String(point.name ?? ''))) return null;
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
      ?? allocation.find((item) => item.name === point.name)?.color
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

  const groupedDetails = details.reduce<{ month: string; rows: typeof details; total: number }[]>((groups, row) => {
    let group = groups.find((item) => item.month === row.month);
    if (!group) {
      group = { month: row.month, rows: [], total: 0 };
      groups.push(group);
    }
    group.rows.push(row);
    group.total += convertToBase(row.amount, row.currency, configs);
    return groups;
  }, []);

  const renderAssetItems = (data: typeof details) => (
    <Listy
      items={data}
      rowKey="id"
      rowHoverable={false}
      classNames={{ root: 'txn-list asset-list', item: 'txn-item' }}
      itemRender={(row) => {
        const type = ASSET_TYPES.find((item) => item.value === row.type);
        const amount = convertToBase(row.amount, row.currency, configs);
        const profit = convertToBase(row.profit ?? 0, row.currency, configs);
        const costBasis = Math.abs(profit) + amount;
        const rate = costBasis > 0 ? (profit / costBasis) * 100 : 0;
        const profitText = row.type === CASH_ASSET_TYPE
          ? '不计收益'
          : `收益 ${profit >= 0 ? '+' : '-'}${formatMoney(Math.abs(profit))}${costBasis > 0 ? ` · ${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%` : ''}`;
        const description = `${profitText}${row.currency !== 'CNY' ? ` · ${row.currency} ${row.amount.toLocaleString('zh-CN')}` : ''}`;
        return (
          <div className="listy-row">
            <div className="listy-meta">
              <AssetAvatar type={row.type} size={38} />
              <div className="listy-meta-content">
                <span className="txn-name">{type?.label ?? row.type}</span>
                <span className="listy-meta-description">{description}</span>
              </div>
            </div>
            <strong className="txn-amount">{formatMoney(amount)}</strong>
          </div>
        );
      }}
    />
  );

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" styles={{ body: { padding: '14px 4px' } }}>
        <MetricStrip
          uniformSize
          items={[
            { label: '总资产', value: formatMoney(latest?.total ?? 0) },
            { label: '投资本金', value: formatMoney(latest?.investment ?? 0) },
            {
              label: '资产收益率',
              value: `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%`,
              tone: returnRate >= 0 ? 'income' : 'expense',
            },
          ]}
        />
      </Card>

      <Card size="small" title="资产配置">
        {allocation.length === 0 ? (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="asset-allocation">
            <div className="pie-container asset-pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="45%"
                    outerRadius="65%"
                    paddingAngle={2}
                    label={renderAssetPieLabel}
                    labelLine={renderAssetPieLabelLine}
                    isAnimationActive={false}
                  >
                    {allocation.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="asset-allocation-detail">
              <div className="category-list">
                {allocationWithPercent.map((item) => (
                  <div key={item.name} className="category-row">
                    <span className="category-dot" style={{ background: item.color }} />
                    <span className="category-row-name">{item.name}</span>
                    <span className="category-row-amount">{formatMoney(item.value)}</span>
                    <span className="category-row-percent">{item.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card
        size="small"
        title="资产走势"
        extra={
          <Space size={4} align="center">
            <Typography.Text type="secondary">投资本金 = 主动基金 + 纳指 + 标普</Typography.Text>
            {hiddenInvestmentTypes.length > 0 && (
              <Button type="link" size="small" onClick={() => setHiddenInvestmentTypes([])}>全选</Button>
            )}
          </Space>
        }
      >
        {rows.length === 0 ? (
          <Empty description="还没有资产记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            {INVESTMENT_TYPES.length > 1 && (
              <div className="chart-legend">
                {INVESTMENT_TYPES.map((item) => {
                  const checked = !hiddenInvestmentTypes.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`chart-legend-item${checked ? ' is-active' : ''}`}
                      style={{ '--legend-color': item.color } as CSSProperties}
                      aria-pressed={checked}
                      onClick={() =>
                        setHiddenInvestmentTypes((current) =>
                          checked
                            ? [...current, item.value]
                            : current.filter((value) => value !== item.value),
                        )
                      }
                    >
                      <span className="chart-legend-mark" />
                      <span className="chart-legend-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    {INVESTMENT_TYPES.map((type, index) => (
                      <linearGradient key={type.value} id={`investmentGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={type.color} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={type.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tickFormatter={formatAxisMoney} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<AssetTooltip />} />
                  {INVESTMENT_TYPES.map((type, index) =>
                    hiddenInvestmentTypes.includes(type.value) ? null : (
                      <Area
                        key={type.value}
                        type="monotone"
                        dataKey={type.label}
                        stackId="investment"
                        stroke={type.color}
                        fill={`url(#investmentGradient${index})`}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    ),
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12}>
          <Card
            size="small"
            title="分类收益率走势"
            extra={
              hiddenReturnTypes.length > 0 ? (
                <Button type="link" size="small" onClick={() => setHiddenReturnTypes([])}>全选</Button>
              ) : undefined
            }
          >
            {rows.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                <div className="chart-legend">
                  {INVESTMENT_TYPES.map((type) => {
                    const checked = !hiddenReturnTypes.includes(type.value);
                    return (
                      <button
                        key={type.value}
                        type="button"
                        className={`chart-legend-item${checked ? ' is-active' : ''}`}
                        style={{ '--legend-color': type.color } as CSSProperties}
                        aria-pressed={checked}
                        onClick={() =>
                          setHiddenReturnTypes((current) =>
                            checked
                              ? [...current, type.value]
                              : current.filter((value) => value !== type.value),
                          )
                        }
                      >
                        <span className="chart-legend-mark" />
                        <span className="chart-legend-label">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
                {activeReturnTypes.length === 0 ? (
                  <Empty description="已隐藏全部类别" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <RateLineChart
                    data={chartData}
                    lines={activeReturnTypes.map((type) => ({
                      key: `${type.label}收益率`,
                      name: type.label,
                      color: type.color,
                    }))}
                  />
                )}
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" title="总收益率走势">
            {rows.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <RateLineChart
                data={chartData}
                lines={[{ key: '总收益率', name: '资产总收益率', color: ASSET_TOTAL_COLOR }]}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12}>
          <Card size="small" title="现金走势">
            {rows.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <SimpleTrendChart data={chartData} dataKey="现金" color={CASH_COLOR} gradientId="cashTrendGradient" />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" title="总资产走势" extra={<Typography.Text type="secondary">总资产 = 投资本金 + 现金</Typography.Text>}>
            {rows.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <SimpleTrendChart data={chartData} dataKey="资产总额" color={ASSET_TOTAL_COLOR} gradientId="assetTotalTrendGradient" />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title="资产明细"
        styles={{ body: { padding: '6px 16px 10px' } }}
      >
        {groupedDetails.length > 0 ? (
          <Collapse
            ghost
            className="txn-groups"
            expandIconPlacement="end"
            items={groupedDetails.map((group) => ({
              key: group.month,
              label: (
                <div className="txn-group-head">
                  <div className="txn-group-date">
                    <strong>{dayjs(`${group.month}-01`).format('YYYY年M月')}</strong>
                  </div>
                  <div className="txn-group-meta">
                    <b className="txn-amount">{formatMoney(group.total)}</b>
                  </div>
                </div>
              ),
              children: renderAssetItems(group.rows),
            }))}
          />
        ) : (
          renderAssetItems(details)
        )}
      </Card>
    </Space>
  );
}

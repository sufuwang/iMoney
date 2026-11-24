import { useMemo } from 'react';
import { Button, Card, Empty, List, Popconfirm, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import MetricStrip from '../components/MetricStrip';
import { ASSET_TYPES } from '../constants';
import { assetRows, type AssetRow } from '../lib/assets';
import { convertToBase, formatAxisMoney, formatMoney } from '../lib/finance';
import type { AssetSnapshot, CurrencyConfig } from '../types';

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

export default function InvestmentView({ assets, configs, onAddAsset, onDeleteAsset }: Props) {
  const rows = useMemo(() => assetRows(assets, configs), [assets, configs]);
  const first = rows[0] ?? null;
  const latest = rows[rows.length - 1] ?? null;
  const totalChange = first && latest ? latest.total - first.total : 0;
  const totalGrowth = first && first.total > 0 ? (totalChange / first.total) * 100 : 0;
  const bestMonth = rows.reduce<AssetRow | null>(
    (best, row) => (!best || row.growth > best.growth ? row : best),
    null,
  );

  const chartData = rows.map((row) => ({
    label: row.month.slice(2),
    ...Object.fromEntries(ASSET_TYPES.map((type) => [type.label, row[type.value]])),
  }));
  const allocation = latest
    ? ASSET_TYPES.map((type) => ({
        name: type.label,
        value: latest[type.value],
        color: type.color,
      })).filter((item) => item.value > 0)
    : [];

  const details = [...assets].sort(
    (a, b) => b.month.localeCompare(a.month) || a.type.localeCompare(b.type),
  );

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" styles={{ body: { padding: '14px 4px' } }}>
        <MetricStrip
          items={[
            { label: '最新总资产', value: formatMoney(latest?.total ?? 0) },
            {
              label: '累计变化',
              value: `${totalChange >= 0 ? '+' : '-'}${formatMoney(Math.abs(totalChange))}`,
              tone: totalChange >= 0 ? 'income' : 'expense',
            },
            { label: '累计收益率', value: `${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(1)}%` },
          ]}
        />
        {bestMonth && bestMonth.growth > 0 && (
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11, margin: '10px 16px 0' }}>
            最佳增长月份：{dayjs(`${bestMonth.month}-01`).format('YYYY年M月')}（+{bestMonth.growth.toFixed(1)}%）
          </Typography.Text>
        )}
      </Card>

      <Card size="small" title="资产走势" extra={<Typography.Text type="secondary">主动基金 + 纳指 + 标普</Typography.Text>}>
        {rows.length === 0 ? (
          <Empty description="还没有资产记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  {ASSET_TYPES.map((type, index) => (
                    <linearGradient key={type.value} id={`assetGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={type.color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={type.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis tickFormatter={formatAxisMoney} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<AssetTooltip />} />
                {ASSET_TYPES.map((type, index) => (
                  <Area
                    key={type.value}
                    type="monotone"
                    dataKey={type.label}
                    stackId="asset"
                    stroke={type.color}
                    fill={`url(#assetGradient${index})`}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card size="small" title="最新资产配置" extra={<Typography.Text type="secondary">{latest ? dayjs(`${latest.month}-01`).format('YYYY年M月') : '暂无'}</Typography.Text>}>
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
                    innerRadius="55%"
                    outerRadius="82%"
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {allocation.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="asset-allocation-legend">
              {allocation.map((item) => (
                <div key={item.name} className="asset-allocation-item">
                  <span className="chart-tooltip-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{formatMoney(item.value)}</strong>
                  <small>{latest && latest.total > 0 ? ((item.value / latest.total) * 100).toFixed(1) : '0.0'}%</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card
        size="small"
        title="资产明细"
        extra={<Button type="link" size="small" icon={<PlusOutlined />} onClick={onAddAsset}>记资产</Button>}
      >
        {details.length === 0 ? (
          <Empty description="还没有资产记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            className="asset-list"
            size="small"
            dataSource={details}
            renderItem={(row) => {
              const type = ASSET_TYPES.find((item) => item.value === row.type);
              return (
                <List.Item className="clickable-list-item asset-row">
                  <div className="asset-row-main">
                    <strong>{dayjs(`${row.month}-01`).format('YYYY年M月')} · {type?.label ?? row.type}</strong>
                    <span>同月重复保存会更新该类别记录</span>
                  </div>
                  <div className="asset-row-side">
                    <strong>{formatMoney(convertToBase(row.amount, row.currency, configs))}</strong>
                    {row.currency !== 'CNY' && <small>{row.currency} {row.amount.toLocaleString('zh-CN')}</small>}
                    <Popconfirm
                      title="删除这条资产记录？"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => onDeleteAsset(row.id)}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} aria-label="删除" />
                    </Popconfirm>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </Space>
  );
}

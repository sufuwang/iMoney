import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Empty,
  Input,
  List,
  Row,
  Segmented,
  Space,
  Typography,
} from 'antd';
import { LeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CATEGORY_MAP, VIEW_LABELS } from '../constants';
import {
  baseAmount,
  categoryStats,
  formatMoney,
  groupByDate,
  inRange,
  rangeFor,
  summarize,
} from '../lib/finance';
import type { AppSettings, Transaction, ViewMode } from '../types';
import CategoryAvatar from '../components/CategoryAvatar';
import MetricStrip from '../components/MetricStrip';

interface Props {
  transactions: Transaction[];
  settings: AppSettings;
  onSettings: (patch: Partial<AppSettings>) => void;
  onViewTransaction: (transaction: Transaction) => void;
  onViewCategory: (categoryId: string, rows: Transaction[]) => void;
}

export default function HistoryView({
  transactions,
  settings,
  onSettings,
  onViewTransaction,
  onViewCategory,
}: Props) {
  const [search, setSearch] = useState('');
  const mode = settings.historyView;
  const anchor = dayjs(settings.historyDate);
  const [start, end] = useMemo(() => rangeFor(mode, anchor), [mode, settings.historyDate]);
  const rows = useMemo(() => inRange(transactions, start, end), [transactions, start, end]);
  const summary = useMemo(() => summarize(rows, settings.currencyConfigs), [rows, settings.currencyConfigs]);
  const expenseStats = useMemo(
    () => categoryStats(rows, settings.currencyConfigs, 'expense'),
    [rows, settings.currencyConfigs],
  );
  const incomeStats = useMemo(
    () => categoryStats(rows, settings.currencyConfigs, 'income'),
    [rows, settings.currencyConfigs],
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => {
      const name = CATEGORY_MAP[row.category]?.name ?? row.category;
      return `${row.note} ${name}`.toLowerCase().includes(keyword);
    });
  }, [rows, search]);

  const groups = useMemo(
    () => (mode === 'day' ? [] : groupByDate(filteredRows, mode)),
    [filteredRows, mode],
  );

  const unit: 'day' | 'month' | 'year' = mode === 'day' ? 'day' : mode === 'month' ? 'month' : 'year';
  const shift = (delta: number) => onSettings({ historyDate: anchor.add(delta, unit).toISOString() });

  const renderTransactions = (data: Transaction[]) => (
    <List
      dataSource={data}
      locale={{ emptyText: <Empty description="暂无记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      renderItem={(row) => (
        <List.Item className="txn-item" onClick={() => onViewTransaction(row)}>
          <div className="txn-left">
            <CategoryAvatar categoryId={row.category} size={38} />
            <div className="txn-text">
              <div className="txn-name">{row.note || CATEGORY_MAP[row.category]?.name || row.category}</div>
              <div className="txn-desc">
                {CATEGORY_MAP[row.category]?.name ?? row.category} · {dayjs(row.date).format('MM-DD HH:mm')}
              </div>
            </div>
          </div>
          <strong className={row.type === 'income' ? 'txn-amount income' : 'txn-amount expense'}>
            {row.type === 'income' ? '+' : '-'}{formatMoney(baseAmount(row, settings.currencyConfigs))}
          </strong>
        </List.Item>
      )}
    />
  );

  const renderStructure = (stats: typeof expenseStats, type: 'expense' | 'income') => (
    <Card size="small" title={type === 'expense' ? '支出结构' : '收入构成'}>
      {stats.length === 0 ? (
        <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="stack-bar">
            {stats.slice(0, 6).map((stat) => (
              <span
                key={stat.category}
                style={{ width: `${stat.percent * 100}%`, background: stat.color }}
                title={`${stat.name} ${(stat.percent * 100).toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="category-list">
            {stats.slice(0, 6).map((stat) => (
              <div
                key={stat.category}
                className="category-row"
                onClick={() => onViewCategory(stat.category, rows.filter((row) => row.category === stat.category))}
              >
                <span className="category-dot" style={{ background: stat.color }} />
                <span className="category-row-name">{stat.name}</span>
                <span className="category-row-amount">{formatMoney(stat.amount)}</span>
                <span className="category-row-percent">{(stat.percent * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );

  const renderRanking = (type: 'expense' | 'income') => {
    const ranked = [...rows]
      .filter((row) => row.type === type)
      .sort((a, b) => baseAmount(b, settings.currencyConfigs) - baseAmount(a, settings.currencyConfigs))
      .slice(0, 5);
    return (
      <Card size="small" title={type === 'expense' ? '支出榜单' : '收益榜单'}>
        {ranked.length === 0 ? (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={ranked}
            renderItem={(row, index) => (
              <List.Item className="clickable-list-item" onClick={() => onViewTransaction(row)}>
                <List.Item.Meta
                  avatar={<Avatar style={{ backgroundColor: index < 3 ? '#1677ff' : '#bfbfbf' }}>{index + 1}</Avatar>}
                  title={row.note || CATEGORY_MAP[row.category]?.name || row.category}
                  description={`${CATEGORY_MAP[row.category]?.name ?? row.category} · ${dayjs(row.date).format('MM-DD')}`}
                />
                <Typography.Text strong>{formatMoney(baseAmount(row, settings.currencyConfigs))}</Typography.Text>
              </List.Item>
            )}
          />
        )}
      </Card>
    );
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" styles={{ body: { padding: 12 } }}>
        <Segmented
          block
          value={mode}
          options={Object.entries(VIEW_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) =>
            onSettings({ historyView: value as ViewMode, historyDate: new Date().toISOString() })
          }
        />
        <div className="date-nav">
          <Button icon={<LeftOutlined />} onClick={() => shift(-1)} aria-label="上一周期" />
          <DatePicker
            picker={mode === 'day' ? 'date' : mode === 'month' ? 'month' : 'year'}
            value={anchor}
            allowClear={false}
            format={mode === 'day' ? 'YYYY-MM-DD' : mode === 'month' ? 'YYYY-MM' : 'YYYY'}
            onChange={(value) => value && onSettings({ historyDate: value.toISOString() })}
          />
          <Button icon={<RightOutlined />} onClick={() => shift(1)} aria-label="下一周期" />
          <Button size="small" className="today-btn" onClick={() => onSettings({ historyDate: new Date().toISOString() })}>
            {mode === 'day' ? '今天' : mode === 'month' ? '本月' : '今年'}
          </Button>
        </div>
      </Card>

      <Card size="small" styles={{ body: { padding: '14px 4px' } }}>
        <MetricStrip
          items={[
            { label: '收入', value: formatMoney(summary.income), tone: 'income' },
            { label: '支出', value: formatMoney(summary.expense), tone: 'expense' },
            { label: '结余', value: formatMoney(summary.balance) },
          ]}
        />
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>{renderStructure(expenseStats, 'expense')}</Col>
        <Col xs={24} md={12}>{renderStructure(incomeStats, 'income')}</Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>{renderRanking('expense')}</Col>
        <Col xs={24} md={12}>{renderRanking('income')}</Col>
      </Row>

      <Card size="small" title="流水明细" extra={<Typography.Text type="secondary">{filteredRows.length} 笔</Typography.Text>}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索备注或分类"
          allowClear
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ marginBottom: 8 }}
        />
        {groups.length > 0 ? (
          <Collapse
            ghost
            items={groups.map((group) => ({
              key: group.key,
              label: (
                <Space>
                  <strong>{group.label}</strong>
                  <Typography.Text type="secondary">
                    {formatMoney(summarize(group.rows, settings.currencyConfigs).balance)}
                  </Typography.Text>
                </Space>
              ),
              children: renderTransactions(group.rows),
            }))}
          />
        ) : (
          renderTransactions(filteredRows)
        )}
      </Card>
    </Space>
  );
}

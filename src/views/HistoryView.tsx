import { useMemo } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Empty,
  Listy,
  Row,
  Segmented,
  Space,
  Typography,
} from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CATEGORY_MAP, VIEW_LABELS } from '../constants';
import {
  baseAmount,
  categoryStats,
  formatMoney,
  futureDateDisabled,
  groupByDate,
  inRange,
  rangeFor,
  summarize,
} from '../lib/finance';
import type { AppSettings, Transaction, ViewMode } from '../types';
import CategoryAvatar from '../components/CategoryAvatar';
import MetricStrip from '../components/MetricStrip';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
  const mode = settings.historyView;
  const unit: 'day' | 'month' | 'year' = mode === 'day' ? 'day' : mode === 'month' ? 'month' : 'year';
  const today = dayjs();
  const storedAnchor = dayjs(settings.historyDate);
  const anchor = storedAnchor.isAfter(today, unit) ? today : storedAnchor;
  const [start, end] = useMemo(() => rangeFor(mode, anchor), [mode, anchor]);
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

  const groups = useMemo(
    () => (mode === 'day' ? [] : groupByDate(rows, mode)),
    [rows, mode],
  );

  const shift = (delta: number) => onSettings({ historyDate: anchor.add(delta, unit).toISOString() });

  const renderTransactions = (data: Transaction[]) => {
    if (data.length === 0) {
      return <Empty description="暂无记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
    return (
      <Listy
        items={data}
        rowKey="id"
        classNames={{ root: 'txn-list', item: 'txn-item' }}
        itemRender={(row) => {
          const category = CATEGORY_MAP[row.category];
          return (
            <div className="listy-row" onClick={() => onViewTransaction(row)}>
              <div className="listy-meta">
                <CategoryAvatar categoryId={row.category} size={38} />
                <div className="listy-meta-content">
                  <span className="txn-name">{row.note || category?.name || row.category}</span>
                  <span className="listy-meta-description">
                    {`${category?.name ?? row.category} · ${dayjs(row.date).format('MM-DD')}`}
                  </span>
                </div>
              </div>
              <strong className={row.type === 'income' ? 'txn-amount income' : 'txn-amount expense'}>
                {row.type === 'income' ? '+' : '-'}{formatMoney(baseAmount(row, settings.currencyConfigs))}
              </strong>
            </div>
          );
        }}
      />
    );
  };

  const renderStructure = (stats: typeof expenseStats, type: 'expense' | 'income') => (
    <Card size="small" title={type === 'expense' ? '支出结构' : '收入结构'}>
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
      <Card size="small" title={type === 'expense' ? '支出排行' : '收入排行'}>
        {ranked.length === 0 ? (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Listy
            items={ranked}
            rowKey="id"
            classNames={{ root: 'rank-list', item: 'clickable-list-item' }}
            itemRender={(row, index) => (
              <div className="listy-row" onClick={() => onViewTransaction(row)}>
                <div className="listy-meta">
                  <Avatar style={{ backgroundColor: index < 3 ? '#1677ff' : '#bfbfbf' }}>{index + 1}</Avatar>
                  <div className="listy-meta-content">
                    <span className="txn-name">{row.note || CATEGORY_MAP[row.category]?.name || row.category}</span>
                    <span className="listy-meta-description">
                      {`${CATEGORY_MAP[row.category]?.name ?? row.category} · ${dayjs(row.date).format('MM-DD')}`}
                    </span>
                  </div>
                </div>
                <Typography.Text strong>{formatMoney(baseAmount(row, settings.currencyConfigs))}</Typography.Text>
              </div>
            )}
          />
        )}
      </Card>
    );
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }} className="history-page">
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
            inputReadOnly
            format={mode === 'day' ? 'YYYY-MM-DD' : mode === 'month' ? 'YYYY-MM' : 'YYYY'}
            disabledDate={futureDateDisabled(unit)}
            onChange={(value) => value && onSettings({ historyDate: value.toISOString() })}
          />
          <Button
            icon={<RightOutlined />}
            onClick={() => shift(1)}
            disabled={!anchor.isBefore(today, unit)}
            aria-label="下一周期"
          />
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

      <Card
        size="small"
        title="收支明细"
        extra={<Typography.Text type="secondary">{rows.length} 笔</Typography.Text>}
        styles={{ body: { padding: '6px 16px 10px' } }}
      >
        {groups.length > 0 ? (
          <Collapse
            key={mode}
            ghost
            className="txn-groups"
            expandIconPlacement="end"
            items={groups.map((group) => {
              const groupSummary = summarize(group.rows, settings.currencyConfigs);
              const date = dayjs(group.key);
              return {
                key: group.key,
                label: (
                  <div className="txn-group-head">
                    <div className="txn-group-date">
                      <strong>{mode === 'year' ? date.format('YYYY年M月') : date.format('M月D日')}</strong>
                      {mode !== 'year' && <span>{WEEKDAYS[date.day()]}</span>}
                    </div>
                    <div className="txn-group-meta">
                      <span>{group.rows.length} 笔</span>
                      <b className={groupSummary.balance >= 0 ? 'income' : 'expense'}>
                        {groupSummary.balance < 0 ? '-' : ''}{formatMoney(Math.abs(groupSummary.balance))}
                      </b>
                    </div>
                  </div>
                ),
                children: renderTransactions(group.rows),
              };
            })}
          />
        ) : (
          renderTransactions(rows)
        )}
      </Card>
    </Space>
  );
}

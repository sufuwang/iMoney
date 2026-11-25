import { Drawer, Empty, Listy, Tag, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CATEGORY_MAP } from '../constants';
import useIsMobile from '../hooks/useIsMobile';
import { baseAmount, formatMoney, summarize } from '../lib/finance';
import type { CurrencyConfig, Transaction } from '../types';
import CategoryAvatar from './CategoryAvatar';
import DrawerHead from './DrawerHead';

interface Props {
  label: string | null;
  rows: Transaction[];
  currencies: CurrencyConfig[];
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
}

export default function GroupDetailDrawer({ label, rows, currencies, onClose, onSelect }: Props) {
  const summary = summarize(rows, currencies);
  const isMobile = useIsMobile();

  return (
    <Drawer
      className="app-drawer"
      title={
        <DrawerHead
          icon={<CalendarOutlined />}
          title={label ?? '明细'}
          subtitle={`${rows.length} 笔记录`}
          extra={
            <Tag color={summary.balance >= 0 ? 'green' : 'red'}>
              {formatMoney(Math.abs(summary.balance))}
            </Tag>
          }
        />
      }
      open={Boolean(label)}
      onClose={onClose}
      closable={{ placement: 'end' }}
      placement={isMobile ? 'bottom' : 'right'}
      size={isMobile ? '82vh' : 480}
    >
      {rows.length === 0 ? (
        <Empty description="暂无记录" />
      ) : (
        <Listy
          items={[...rows].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())}
          rowKey="id"
          classNames={{ item: 'clickable-list-item' }}
          itemRender={(row) => (
            <div className="listy-row" onClick={() => onSelect(row)}>
              <div className="listy-meta">
                <CategoryAvatar categoryId={row.category} size={34} />
                <div className="listy-meta-content">
                  <span className="txn-name">{row.note || CATEGORY_MAP[row.category]?.name || row.category}</span>
                  <span className="listy-meta-description">{dayjs(row.date).format('YYYY-MM-DD')}</span>
                </div>
              </div>
              <Typography.Text strong style={{ color: row.type === 'income' ? 'var(--income)' : undefined }}>
                {row.type === 'income' ? '+' : '-'}{formatMoney(baseAmount(row, currencies))}
              </Typography.Text>
            </div>
          )}
        />
      )}
    </Drawer>
  );
}

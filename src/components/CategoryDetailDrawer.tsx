import { Drawer, Empty, List, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { CATEGORY_MAP } from '../constants';
import useIsMobile from '../hooks/useIsMobile';
import { baseAmount, formatMoney, summarize } from '../lib/finance';
import type { CurrencyConfig, Transaction } from '../types';
import CategoryAvatar from './CategoryAvatar';

interface Props {
  categoryId: string | null;
  rows: Transaction[];
  currencies: CurrencyConfig[];
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
}

export default function CategoryDetailDrawer({ categoryId, rows, currencies, onClose, onSelect }: Props) {
  const category = categoryId ? CATEGORY_MAP[categoryId] : undefined;
  const summary = summarize(rows, currencies);
  const isMobile = useIsMobile();

  return (
    <Drawer
      title={
        <span className="drawer-title">
          {categoryId && <CategoryAvatar categoryId={categoryId} size={28} />}
          {category?.name ?? '分类'}明细
          <Tag color={summary.balance >= 0 ? 'green' : 'red'}>
            {formatMoney(Math.abs(summary.balance))}
          </Tag>
        </span>
      }
      open={Boolean(categoryId)}
      onClose={onClose}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '82vh' : undefined}
      width={isMobile ? undefined : 480}
    >
      {rows.length === 0 ? (
        <Empty description="暂无记录" />
      ) : (
        <List
          dataSource={[...rows].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())}
          renderItem={(row) => (
            <List.Item className="clickable-list-item" onClick={() => onSelect(row)}>
              <List.Item.Meta
                avatar={<CategoryAvatar categoryId={row.category} size={34} />}
                title={row.note || CATEGORY_MAP[row.category]?.name || row.category}
                description={dayjs(row.date).format('YYYY-MM-DD')}
              />
              <Typography.Text strong style={{ color: row.type === 'income' ? 'var(--income)' : undefined }}>
                {row.type === 'income' ? '+' : '-'}{formatMoney(baseAmount(row, currencies))}
              </Typography.Text>
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}

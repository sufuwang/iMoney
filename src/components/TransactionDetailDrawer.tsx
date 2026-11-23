import { Button, Descriptions, Drawer, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CATEGORY_MAP } from '../constants';
import useIsMobile from '../hooks/useIsMobile';
import { baseAmount, formatMoney } from '../lib/finance';
import type { CurrencyConfig, Transaction } from '../types';
import CategoryAvatar from './CategoryAvatar';

interface Props {
  transaction: Transaction | null;
  currencies: CurrencyConfig[];
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export default function TransactionDetailDrawer({
  transaction,
  currencies,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  const category = transaction ? CATEGORY_MAP[transaction.category] : undefined;
  const isMobile = useIsMobile();

  return (
    <Drawer
      title="记录详情"
      open={Boolean(transaction)}
      onClose={onClose}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '78vh' : undefined}
      width={isMobile ? undefined : 420}
      footer={
        transaction && (
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(transaction)}>删除</Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(transaction)}>编辑</Button>
          </Space>
        )
      }
    >
      {transaction && (
        <>
          <div className="detail-hero">
            <CategoryAvatar categoryId={transaction.category} size={56} />
            <Typography.Title level={2} style={{ margin: '12px 0 0', color: transaction.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
              {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount)}
            </Typography.Title>
            <Typography.Text type="secondary">
              折合人民币 {formatMoney(baseAmount(transaction, currencies))}
            </Typography.Text>
          </div>
          <Descriptions column={1} bordered size="small" style={{ marginTop: 24 }}>
            <Descriptions.Item label="类型">{transaction.type === 'income' ? '收入' : '支出'}</Descriptions.Item>
            <Descriptions.Item label="分类">{category?.name ?? transaction.category}</Descriptions.Item>
            <Descriptions.Item label="日期">{dayjs(transaction.date).format('YYYY-MM-DD')}</Descriptions.Item>
            <Descriptions.Item label="币种">{transaction.currency}</Descriptions.Item>
            <Descriptions.Item label="备注">{transaction.note || '—'}</Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Drawer>
  );
}

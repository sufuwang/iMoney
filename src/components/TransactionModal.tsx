import { useEffect, type CSSProperties } from 'react';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Segmented,
  Select,
} from 'antd';
import dayjs from 'dayjs';
import { CATEGORIES } from '../constants';
import useIsMobile from '../hooks/useIsMobile';
import type { CurrencyConfig, Transaction, TransactionType } from '../types';
import { categoryIcon } from './CategoryAvatar';

interface FormValues {
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  date: dayjs.Dayjs;
  note: string;
}

interface Props {
  open: boolean;
  editing: Transaction | null;
  currencies: CurrencyConfig[];
  recentNotes: string[];
  onCancel: () => void;
  onSubmit: (value: Omit<Transaction, 'id'>) => void;
}

export default function TransactionModal({
  open,
  editing,
  currencies,
  recentNotes,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const isMobile = useIsMobile();
  const currentType = Form.useWatch('type', form) ?? 'expense';
  const categories = CATEGORIES.filter((item) => item.type === currentType);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      type: editing?.type ?? 'expense',
      amount: editing?.amount ?? 0,
      currency: editing?.currency ?? 'CNY',
      category: editing?.category ?? 'food',
      date: dayjs(editing?.date ?? new Date()),
      note: editing?.note ?? '',
    });
  }, [open, editing, form]);

  const handleTypeChange = (type: TransactionType) => {
    const first = CATEGORIES.find((item) => item.type === type);
    form.setFieldsValue({ type, category: first?.id ?? '' });
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      type: values.type,
      amount: values.amount,
      currency: values.currency,
      category: values.category,
      note: values.note ?? '',
      date: values.date.format('YYYY-MM-DD'),
    });
  };

  return (
    <Drawer
      title={editing ? '编辑记录' : '记一笔'}
      open={open}
      onClose={onCancel}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '80vh' : undefined}
      width={isMobile ? undefined : 520}
      destroyOnHidden
      className="entry-drawer"
      footer={
        <div className="drawer-footer">
          <Button block size="large" onClick={onCancel}>取消</Button>
          <Button block type="primary" size="large" onClick={() => void handleOk()}>
            {editing ? '保存修改' : '完成记账'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'expense' }} requiredMark={false}>
        <Form.Item name="type" label="类型">
          <Segmented
            block
            options={[
              { label: '支出', value: 'expense' },
              { label: '收入', value: 'income' },
            ]}
            onChange={(value) => handleTypeChange(value as TransactionType)}
          />
        </Form.Item>

        <Form.Item
          name="amount"
          label="金额"
          rules={[{ required: true, message: '请输入金额' }, { type: 'number', min: 0.01, message: '金额需大于 0' }]}
        >
          <InputNumber
            prefix="¥"
            min={0.01}
            precision={2}
            step={0.01}
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <div className="form-row">
          <Form.Item name="currency" label="币种" rules={[{ required: true }]}>
            <Select
              style={{ width: '100%' }}
              options={currencies.filter((item) => item.enabled).map((item) => ({
                label: `${item.symbol ?? ''} ${item.name ?? item.code}`.trim(),
                value: item.code,
              }))}
            />
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" allowClear={false} />
          </Form.Item>
        </div>

        <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
          <Radio.Group className="category-radio" optionType="button">
            {categories.map((item) => {
              const Icon = categoryIcon(item.id);
              return (
                <Radio.Button
                  key={item.id}
                  value={item.id}
                  style={{ '--category-color': item.color } as CSSProperties}
                >
                  <span className="category-option">
                    <span className="category-tile">
                      <Icon />
                    </span>
                    <span className="category-name">{item.name}</span>
                  </span>
                </Radio.Button>
              );
            })}
          </Radio.Group>
        </Form.Item>

        <Form.Item name="note" label="备注">
          <Input.TextArea rows={2} maxLength={200} showCount placeholder="写点什么，方便以后回忆…" />
        </Form.Item>

        {recentNotes.length > 0 && (
          <Form.Item label="常用备注" colon={false}>
            <div className="note-grid">
              {recentNotes.slice(0, 4).map((note) => (
                <button
                  key={note}
                  type="button"
                  className="note-chip"
                  title={note}
                  onClick={() => form.setFieldsValue({ note })}
                >
                  <span className="note-chip-dot" />
                  <span className="note-chip-text">{note}</span>
                </button>
              ))}
            </div>
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}

import { useEffect, useState, type CSSProperties } from 'react';
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
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  EditOutlined,
  GoldOutlined,
  PayCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ASSET_TYPES, CATEGORIES } from '../constants';
import useIsMobile from '../hooks/useIsMobile';
import type { AssetSnapshot, AssetType, CurrencyConfig, Transaction, TransactionType } from '../types';
import { assetTypeIcon, categoryIcon } from './CategoryAvatar';
import DrawerHead from './DrawerHead';

interface FormValues {
  type: TransactionType;
  amount: number | null;
  currency: string;
  category: string;
  date: dayjs.Dayjs;
  note: string;
}

interface AssetFormValues {
  month: dayjs.Dayjs;
  type: AssetType;
  currency: string;
  amount: number;
}

type EntryMode = 'transaction' | 'asset';

interface Props {
  open: boolean;
  mode: EntryMode;
  onModeChange: (mode: EntryMode) => void;
  editing: Transaction | null;
  currencies: CurrencyConfig[];
  recentNotes: string[];
  onCancel: () => void;
  onSubmit: (value: Omit<Transaction, 'id'>) => void;
  onSaveAsset: (value: Omit<AssetSnapshot, 'id'>) => void;
}

export default function TransactionModal({
  open,
  mode,
  onModeChange,
  editing,
  currencies,
  recentNotes,
  onCancel,
  onSubmit,
  onSaveAsset,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [assetForm] = Form.useForm<AssetFormValues>();
  const isMobile = useIsMobile();
  const [entryType, setEntryType] = useState<TransactionType>('expense');
  const categories = CATEGORIES.filter((item) => item.type === entryType);
  const txnCurrency = Form.useWatch('currency', form) ?? 'CNY';
  const txnSymbol = currencies.find((item) => item.code === txnCurrency)?.symbol ?? '¥';
  const assetCurrency = Form.useWatch('currency', assetForm) ?? 'CNY';
  const assetSymbol = currencies.find((item) => item.code === assetCurrency)?.symbol ?? '¥';
  const currencyOptions = currencies
    .filter((item) => item.enabled)
    .map((item) => ({
      label: `${item.symbol ?? ''} ${item.name ?? item.code}`.trim(),
      value: item.code,
    }));

  useEffect(() => {
    if (!open) return;
    const type = editing?.type ?? 'expense';
    setEntryType(type);
    form.setFieldsValue({
      type,
      amount: editing?.amount ?? null,
      currency: editing?.currency ?? 'CNY',
      category: editing?.category ?? 'food',
      date: dayjs(editing?.date ?? new Date()),
      note: editing?.note ?? '',
    });
  }, [open, editing, form]);

  useEffect(() => {
    if (!open || mode !== 'asset') return;
    assetForm.setFieldsValue({
      month: dayjs().startOf('month'),
      type: 'active_fund',
      currency: 'CNY',
      amount: null,
    });
  }, [open, mode, assetForm]);

  const handleTypeSwitch = (value: string) => {
    if (value === 'asset') {
      onModeChange('asset');
      return;
    }
    const type = value as TransactionType;
    onModeChange('transaction');
    setEntryType(type);
    const first = CATEGORIES.find((item) => item.type === type);
    form.setFieldsValue({ type, category: first?.id ?? '' });
  };

  const handleOk = async () => {
    if (mode === 'asset') {
      const values = await assetForm.validateFields();
      onSaveAsset({
        month: values.month.format('YYYY-MM'),
        type: values.type,
        currency: values.currency,
        amount: values.amount,
      });
      assetForm.setFieldsValue({ amount: null });
      return;
    }
    const values = await form.validateFields();
    onSubmit({
      type: entryType,
      amount: values.amount as number,
      currency: values.currency,
      category: values.category,
      note: values.note ?? '',
      date: values.date.format('YYYY-MM-DD'),
    });
  };

  const isAsset = mode === 'asset';
  const HeaderIcon = isAsset ? GoldOutlined : editing ? EditOutlined : PlusCircleOutlined;
  const title = isAsset ? '记资产' : editing ? '编辑记录' : '记一笔';
  const subtitle = isAsset
    ? '记录每月资产快照'
    : editing
      ? '修改这笔记录的金额与分类'
      : '记录一笔支出或收入';

  return (
    <Drawer
      open={open}
      onClose={onCancel}
      closable={{ placement: 'end' }}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '84vh' : undefined}
      width={isMobile ? undefined : 520}
      destroyOnHidden
      className="app-drawer entry-drawer"
      title={<DrawerHead icon={<HeaderIcon />} title={title} subtitle={subtitle} />}
      footer={
        <div className="drawer-footer">
          <Button block size="large" onClick={onCancel}>取消</Button>
          <Button block type="primary" size="large" onClick={() => void handleOk()}>
            {isAsset ? '保存资产' : editing ? '保存修改' : '完成记账'}
          </Button>
        </div>
      }
    >
      <div className="entry-body">
        <div className="entry-tabs">
          <Segmented
            block
            className="entry-mode"
            value={isAsset ? 'asset' : entryType}
            options={[
              { label: '支出', value: 'expense' },
              { label: '收入', value: 'income' },
              { label: '资产', value: 'asset' },
            ]}
            onChange={(value) => handleTypeSwitch(String(value))}
          />
        </div>

        <div hidden={isAsset}>
          <Form form={form} layout="vertical" initialValues={{ type: 'expense' }} requiredMark={false}>
            <section className="entry-card">
              <div className="entry-card-head">
                <span className="entry-card-icon tone-indigo">
                  <PayCircleOutlined />
                </span>
                <span className="entry-card-titles">
                  <strong>金额</strong>
                  <span>{entryType === 'income' ? '这笔收入有多少' : '这笔支出花了多少'}</span>
                </span>
                <Form.Item name="currency" noStyle rules={[{ required: true }]}>
                  <Select
                    className="entry-currency-select"
                    popupMatchSelectWidth={false}
                    variant="borderless"
                    options={currencyOptions}
                  />
                </Form.Item>
              </div>
              <Form.Item
                className="entry-amount-item"
                name="amount"
                rules={[{ required: true, message: '请输入金额' }, { type: 'number', min: 0.01, message: '金额需大于 0' }]}
              >
                <InputNumber
                  className="amount-input"
                  prefix={txnSymbol}
                  min={0.01}
                  precision={2}
                  step={0.01}
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
            </section>

            <section className="entry-card">
              <div className="entry-card-head">
                <span className="entry-card-icon tone-amber">
                  <AppstoreOutlined />
                </span>
                <span className="entry-card-titles">
                  <strong>分类</strong>
                  <span>选择最贴近的类别，统计更准确</span>
                </span>
              </div>
              <Form.Item
                className="entry-plain-item"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
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
            </section>

            <section className="entry-card">
              <div className="entry-card-head">
                <span className="entry-card-icon tone-slate">
                  <CalendarOutlined />
                </span>
                <span className="entry-card-titles">
                  <strong>时间与备注</strong>
                  <span>备注可选填，方便日后查找</span>
                </span>
              </div>
              <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" allowClear={false} inputReadOnly />
              </Form.Item>
              <Form.Item name="note" label="备注">
                <Input.TextArea rows={2} maxLength={200} showCount placeholder="写点什么，方便以后回忆…" />
              </Form.Item>
              {recentNotes.length > 0 && (
                <div className="entry-suggest">
                  <span className="entry-mini-label">常用备注</span>
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
                </div>
              )}
            </section>
          </Form>
        </div>

        <div hidden={!isAsset}>
          <Form form={assetForm} layout="vertical" requiredMark={false}>
            <section className="entry-card">
              <div className="entry-card-head">
                <span className="entry-card-icon tone-indigo">
                  <PayCircleOutlined />
                </span>
                <span className="entry-card-titles">
                  <strong>金额</strong>
                  <span>填写本月该类别的资产总额</span>
                </span>
                <Form.Item name="currency" noStyle rules={[{ required: true }]}>
                  <Select
                    className="entry-currency-select"
                    popupMatchSelectWidth={false}
                    variant="borderless"
                    options={currencyOptions}
                  />
                </Form.Item>
              </div>
              <Form.Item
                className="entry-amount-item"
                name="amount"
                rules={[{ required: true, message: '请输入金额' }, { type: 'number', min: 0.01, message: '金额需大于 0' }]}
              >
                <InputNumber
                  className="amount-input"
                  prefix={assetSymbol}
                  min={0.01}
                  precision={2}
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
            </section>

            <section className="entry-card">
              <div className="entry-card-head">
                <span className="entry-card-icon tone-amber">
                  <AppstoreOutlined />
                </span>
                <span className="entry-card-titles">
                  <strong>资产类别</strong>
                  <span>现金、基金、股票等分别记录</span>
                </span>
              </div>
              <Form.Item
                className="entry-plain-item"
                name="type"
                rules={[{ required: true, message: '请选择资产类别' }]}
              >
                <Radio.Group className="category-radio asset-type-radio" optionType="button">
                  {ASSET_TYPES.map((item) => {
                    const Icon = assetTypeIcon(item.value);
                    return (
                      <Radio.Button
                        key={item.value}
                        value={item.value}
                        style={{ '--category-color': item.color } as CSSProperties}
                      >
                        <span className="category-option">
                          <span className="category-tile"><Icon /></span>
                          <span className="category-name">{item.label}</span>
                        </span>
                      </Radio.Button>
                    );
                  })}
                </Radio.Group>
              </Form.Item>
            </section>

            <section className="entry-card">
              <div className="entry-card-head">
                <span className="entry-card-icon tone-slate">
                  <CalendarOutlined />
                </span>
                <span className="entry-card-titles">
                  <strong>快照月份</strong>
                  <span>按自然月保存，便于观察资产变化</span>
                </span>
              </div>
              <Form.Item name="month" label="月份" rules={[{ required: true, message: '请选择月份' }]}>
                <DatePicker
                  picker="month"
                  format="YYYY-MM"
                  allowClear={false}
                  inputReadOnly
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Typography.Text type="secondary" className="entry-tip">
                同一月份、同一类别重复保存会更新原有记录。
              </Typography.Text>
            </section>
          </Form>
        </div>
      </div>
    </Drawer>
  );
}

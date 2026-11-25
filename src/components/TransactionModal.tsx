import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
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
  RiseOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ASSET_TYPES, CASH_ASSET_TYPE, CATEGORIES } from '../constants';
import useIsMobile from '../hooks/useIsMobile';
import { convertToBase, formatMoney, futureDateDisabled } from '../lib/finance';
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

interface AssetFieldValues {
  amount: number | null;
  profit: number | null;
}

interface AssetFormValues {
  month: dayjs.Dayjs;
  currency: string;
  assets: Record<AssetType, AssetFieldValues>;
}

const INVESTMENT_TYPES = ASSET_TYPES.filter((item) => item.value !== CASH_ASSET_TYPE);

const emptyAssetFields = (): AssetFormValues['assets'] =>
  Object.fromEntries(
    ASSET_TYPES.map((item) => [item.value, { amount: null, profit: null }]),
  ) as AssetFormValues['assets'];

const amountRules = (label: string) => [
  { required: true, message: `请填写${label}金额` },
  {
    validator: (_: unknown, value: number | null) =>
      value === null || value === undefined || value > 0
        ? Promise.resolve()
        : Promise.reject(new Error(`${label}金额需大于 0`)),
  },
];

const profitRules = (label: string) => [
  { required: true, message: `请填写${label}累计收益` },
];

type EntryMode = 'transaction' | 'asset';

interface Props {
  open: boolean;
  mode: EntryMode;
  onModeChange: (mode: EntryMode) => void;
  editing: Transaction | null;
  currencies: CurrencyConfig[];
  recentNotes: { expense: string[]; income: string[] };
  onCancel: () => void;
  onSubmit: (value: Omit<Transaction, 'id'>) => void;
  onSaveAssets: (values: Omit<AssetSnapshot, 'id'>[]) => void;
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
  onSaveAssets,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [assetForm] = Form.useForm<AssetFormValues>();
  const isMobile = useIsMobile();
  const [entryType, setEntryType] = useState<TransactionType>('expense');
  const currentNotes = recentNotes[entryType];
  const categories = CATEGORIES.filter((item) => item.type === entryType);
  const txnCurrency = Form.useWatch('currency', form) ?? 'CNY';
  const txnSymbol = currencies.find((item) => item.code === txnCurrency)?.symbol ?? '¥';
  const assetCurrency = Form.useWatch('currency', assetForm) ?? 'CNY';
  const assetSymbol = currencies.find((item) => item.code === assetCurrency)?.symbol ?? '¥';
  const watchedAssets = Form.useWatch('assets', assetForm);
  const clearValidationErrors = useCallback(() => {
    form.setFields([
      { name: 'amount', errors: [] },
      { name: 'currency', errors: [] },
      { name: 'category', errors: [] },
      { name: 'date', errors: [] },
      { name: 'note', errors: [] },
    ]);
    assetForm.setFields([
      { name: 'month', errors: [] },
      { name: 'currency', errors: [] },
      { name: 'assets', errors: [] },
      ...ASSET_TYPES.flatMap((item) => [
        { name: ['assets', item.value, 'amount'], errors: [] },
        ...(item.value === CASH_ASSET_TYPE
          ? []
          : [{ name: ['assets', item.value, 'profit'], errors: [] }]),
      ]),
    ] as Parameters<typeof assetForm.setFields>[0]);
  }, [form, assetForm]);
  const assetSummary = useMemo(() => {
    const read = (type: AssetType, key: keyof AssetFieldValues) =>
      Number(watchedAssets?.[type]?.[key] ?? 0);
    const total = INVESTMENT_TYPES.reduce(
      (sum, item) => sum + convertToBase(read(item.value, 'amount'), assetCurrency, currencies), 0,
    );
    const profit = INVESTMENT_TYPES.reduce(
      (sum, item) => sum + convertToBase(read(item.value, 'profit'), assetCurrency, currencies), 0,
    );
    const investment = total;
    const costBasis = investment + profit;
    const cash = convertToBase(read(CASH_ASSET_TYPE, 'amount'), assetCurrency, currencies);
    return {
      total,
      cash,
      profit,
      investment,
      assetTotal: investment + cash,
      returnRate: costBasis > 0 ? (profit / costBasis) * 100 : 0,
    };
  }, [watchedAssets, assetCurrency, currencies]);
  const currencyOptions = currencies
    .filter((item) => item.enabled)
    .map((item) => ({
      label: `${item.symbol ?? ''} ${item.name ?? item.code}`.trim(),
      value: item.code,
    }));

  useEffect(() => {
    if (!open) return;
    clearValidationErrors();
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
  }, [open, editing, form, clearValidationErrors]);

  useEffect(() => {
    if (!open || mode !== 'asset') return;
    assetForm.resetFields();
    assetForm.setFieldsValue({
      month: dayjs().startOf('month'),
      currency: 'CNY',
      assets: emptyAssetFields(),
    });
  }, [open, mode, assetForm]);

  const handleTypeSwitch = (value: string) => {
    clearValidationErrors();
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
    try {
      if (mode === 'asset') {
        const values = await assetForm.validateFields();
        const rows = ASSET_TYPES.flatMap((item) => {
          const field = values.assets[item.value];
          const amount = Number(field?.amount ?? 0);
          const profit = item.value === CASH_ASSET_TYPE ? 0 : Number(field?.profit ?? 0);
          if (amount <= 0) return [];
          return [{
            month: values.month.format('YYYY-MM'),
            type: item.value,
            currency: values.currency,
            amount,
            profit,
          }];
        });
        onSaveAssets(rows);
        assetForm.setFieldsValue({ assets: emptyAssetFields() });
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
    } catch {
      // 校验失败仅通过输入框红框提示
    }
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
      size={isMobile ? '84vh' : 520}
      destroyOnHidden
      className="app-drawer entry-drawer"
      title={<DrawerHead icon={<HeaderIcon />} title={title} subtitle={subtitle} />}
      footer={
        <div className="drawer-footer">
          <Button block onClick={onCancel}>取消</Button>
          <Button block type="primary" onClick={() => void handleOk()}>
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
                name="amount"
                label="当前金额"
                rules={[
                  { required: true, message: '请输入金额' },
                  {
                    validator: (_, value: number | null) =>
                      value === null || value === undefined || value > 0
                        ? Promise.resolve()
                        : Promise.reject(new Error('金额需大于 0')),
                  },
                ]}
              >
                <InputNumber
                  className="asset-entry-input entry-amount-input"
                  prefix={txnSymbol}
                  min={0}
                  precision={2}
                  inputMode="decimal"
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
                  <span>备注必填，方便日后查找</span>
                </span>
              </div>
              <Form.Item
                name="date"
                label="日期"
                rules={[
                  { required: true, message: '请选择日期' },
                  {
                    validator: (_, value: dayjs.Dayjs | null) =>
                      !value || !value.isAfter(dayjs(), 'day')
                        ? Promise.resolve()
                        : Promise.reject(new Error('日期不能晚于今天')),
                  },
                ]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  allowClear={false}
                  inputReadOnly
                  disabledDate={futureDateDisabled('day')}
                />
              </Form.Item>
              <Form.Item
                name="note"
                label="备注"
                rules={[
                  { required: true, message: '请输入备注' },
                  {
                    validator: (_, value: string | undefined) =>
                      value?.trim() ? Promise.resolve() : Promise.reject(new Error('请输入备注')),
                  },
                ]}
              >
                <Input.TextArea rows={2} maxLength={200} showCount placeholder="写点什么，方便以后回忆…" />
              </Form.Item>
              {currentNotes.length > 0 && (
                <div className="entry-suggest">
                  <span className="entry-mini-label">常用备注</span>
                  <div className="note-grid">
                    {currentNotes.map((note) => (
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
                  <strong>投资金额与收益</strong>
                  <span>左侧填当前金额，右侧填累计收益；收益为累计盈亏，亏损填负数</span>
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
              {INVESTMENT_TYPES.map((item) => {
                const Icon = assetTypeIcon(item.value);
                return (
                  <div key={item.value} className="asset-entry-row">
                    <span className="asset-entry-label" style={{ '--category-color': item.color } as CSSProperties}>
                      <span className="asset-entry-icon"><Icon /></span>
                      {item.label}
                    </span>
                    <Form.Item
                      name={['assets', item.value, 'amount']}
                      rules={amountRules(item.label)}
                    >
                      <InputNumber
                        className="asset-entry-input"
                        prefix={assetSymbol}
                        min={0}
                        precision={2}
                        inputMode="decimal"
                        style={{ width: '100%' }}
                        placeholder="当前金额"
                      />
                    </Form.Item>
                    <Form.Item
                      name={['assets', item.value, 'profit']}
                      rules={profitRules(item.label)}
                    >
                      <InputNumber
                        className="asset-entry-input"
                        prefix={assetSymbol}
                        precision={2}
                        inputMode="decimal"
                        style={{ width: '100%' }}
                        placeholder="累计收益"
                      />
                    </Form.Item>
                  </div>
                );
              })}
            </section>

            <section className="entry-card">
              <div className="entry-card-head">
                <span className="entry-card-icon tone-amber">
                  <WalletOutlined />
                </span>
                <span className="entry-card-titles">
                  <strong>现金</strong>
                  <span>填写银行卡、交易软件等账户中的可用余额合计</span>
                </span>
              </div>
              <Form.Item
                name={['assets', CASH_ASSET_TYPE, 'amount']}
                label="当前金额"
                rules={amountRules('现金')}
              >
                <InputNumber
                  className="asset-entry-input"
                  prefix={assetSymbol}
                  min={0}
                  precision={2}
                  inputMode="decimal"
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
            </section>

            <section className="entry-card asset-summary-card">
              <div className="entry-card-head">
                <span className="entry-card-icon tone-amber">
                  <RiseOutlined />
                </span>
                <span className="entry-card-titles">
                  <strong>自动计算</strong>
                  <span>资产总额 = 投资本金 + 现金</span>
                </span>
              </div>
              <div className="asset-summary-grid">
                <div className="asset-summary-cell">
                  <span>资产总额</span>
                  <strong>{formatMoney(assetSummary.assetTotal)}</strong>
                </div>
                <div className="asset-summary-cell">
                  <span>投资本金</span>
                  <strong>{formatMoney(assetSummary.investment)}</strong>
                </div>
                <div className="asset-summary-cell">
                  <span>资产收益率</span>
                  <strong className={assetSummary.returnRate >= 0 ? 'income' : 'expense'}>
                    {`${assetSummary.returnRate >= 0 ? '+' : ''}${assetSummary.returnRate.toFixed(2)}%`}
                  </strong>
                </div>
              </div>
              <Typography.Text type="secondary" className="entry-tip">
                {assetCurrency === 'CNY' ? '按人民币汇总' : '按所选币种折算人民币汇总'}：投资本金 {formatMoney(assetSummary.investment)}，累计收益 {formatMoney(assetSummary.profit)}，现金 {formatMoney(assetSummary.cash)}。现金计入资产总额，不参与收益计算；留空或填 0 的类别不会保存。
              </Typography.Text>
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
              <Form.Item
                name="month"
                label="月份"
                rules={[
                  { required: true, message: '请选择月份' },
                  {
                    validator: (_, value: dayjs.Dayjs | null) =>
                      !value || !value.isAfter(dayjs(), 'month')
                        ? Promise.resolve()
                        : Promise.reject(new Error('月份不能晚于本月')),
                  },
                ]}
              >
                <DatePicker
                  picker="month"
                  format="YYYY-MM"
                  allowClear={false}
                  inputReadOnly
                  style={{ width: '100%' }}
                  disabledDate={futureDateDisabled('month')}
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

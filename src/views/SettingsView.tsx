import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography,
  Upload,
} from 'antd';
import {
  BellOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useIsMobile from '../hooks/useIsMobile';
import type { AppSettings, CurrencyConfig } from '../types';

interface Props {
  settings: AppSettings;
  transactionCount: number;
  onSettings: (patch: Partial<AppSettings>) => void;
  onExport: () => void;
  onImport: (raw: string) => void;
  onClear: () => void;
  onTestReminder: () => void;
}

export default function SettingsView({
  settings,
  transactionCount,
  onSettings,
  onExport,
  onImport,
  onClear,
  onTestReminder,
}: Props) {
  const [tempTime, setTempTime] = useState(settings.reminderTime);
  const [tempMessage, setTempMessage] = useState(settings.reminderMessage);
  const isMobile = useIsMobile();

  useEffect(() => {
    setTempTime(settings.reminderTime);
    setTempMessage(settings.reminderMessage);
  }, [settings.reminderTime, settings.reminderMessage]);

  const dirty = tempTime !== settings.reminderTime || tempMessage !== settings.reminderMessage;
  const [hour, minute] = tempTime.split(':').map(Number);
  const timeValue = dayjs().hour(hour || 20).minute(minute || 0);

  const updateCurrency = (code: string, patch: Partial<CurrencyConfig>) => {
    onSettings({
      currencyConfigs: settings.currencyConfigs.map((item) =>
        item.code === code ? { ...item, ...patch } : item,
      ),
    });
  };

  const rateInput = (row: CurrencyConfig, size?: 'small' | 'middle') => (
    <InputNumber
      size={size}
      min={0.0001}
      step={0.01}
      precision={4}
      value={row.rate}
      disabled={row.code === 'CNY'}
      onChange={(next) => next && updateCurrency(row.code, { rate: next })}
      style={{ width: isMobile ? 120 : 140 }}
    />
  );

  const enabledSwitch = (row: CurrencyConfig, small?: boolean) => (
    <Switch
      size={small ? 'small' : undefined}
      checked={row.enabled}
      disabled={row.code === 'CNY'}
      onChange={(checked) => updateCurrency(row.code, { enabled: checked })}
    />
  );

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title={<span><BellOutlined /> 记账提醒</span>} styles={{ body: { padding: 12 } }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div className="setting-row">
            <Switch
              checked={settings.reminderEnabled}
              onChange={(checked) => onSettings({ reminderEnabled: checked })}
            />
            <span>每日定时提醒</span>
            <Tag color="blue">浏览器通知</Tag>
          </div>
          <Space wrap>
            <TimePicker
              value={timeValue}
              format="HH:mm"
              onChange={(value) => setTempTime(value ? value.format('HH:mm') : settings.reminderTime)}
            />
            <Button onClick={onTestReminder}>测试一下</Button>
          </Space>
          <Input.TextArea
            rows={2}
            maxLength={100}
            showCount
            value={tempMessage}
            onChange={(event) => setTempMessage(event.target.value)}
            placeholder="提醒文案"
          />
          {dirty && (
            <Button
              type="primary"
              block
              onClick={() => onSettings({ reminderTime: tempTime, reminderMessage: tempMessage })}
            >
              保存提醒设置
            </Button>
          )}
          <Typography.Text type="secondary">
            需保持页面打开，且允许浏览器通知权限。
          </Typography.Text>
        </Space>
      </Card>

      <Card size="small" title="多币种汇率" extra={<Typography.Text type="secondary">基准 CNY</Typography.Text>} styles={{ body: { padding: 12 } }}>
        {isMobile ? (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {settings.currencyConfigs.map((row) => (
              <div key={row.code} className="currency-row">
                <div>
                  <strong>{row.name}</strong>
                  <Typography.Text type="secondary"> {row.code} · {row.symbol}</Typography.Text>
                </div>
                <Space size={8}>
                  {rateInput(row, 'small')}
                  {enabledSwitch(row, true)}
                </Space>
              </div>
            ))}
          </Space>
        ) : (
          <Table
            rowKey="code"
            size="small"
            pagination={false}
            dataSource={settings.currencyConfigs}
            columns={[
              { title: '货币', dataIndex: 'name', key: 'name', render: (value: string, row) => `${value} (${row.code})` },
              { title: '符号', dataIndex: 'symbol', key: 'symbol', width: 80 },
              { title: '汇率（折合 CNY）', dataIndex: 'rate', key: 'rate', width: 180, render: (_: number, row) => rateInput(row) },
              { title: '启用', key: 'enabled', width: 90, render: (_: unknown, row) => enabledSwitch(row, true) },
            ]}
          />
        )}
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          所有统计金额均按汇率折算为人民币后计算。
        </Typography.Text>
      </Card>

      <Card size="small" title="数据管理" extra={<Typography.Text type="secondary">{transactionCount} 笔记录</Typography.Text>} styles={{ body: { padding: 12 } }}>
        <div className="data-actions">
          <Button icon={<DownloadOutlined />} onClick={onExport}>导出备份</Button>
          <Upload
            accept=".json,application/json"
            showUploadList={false}
            beforeUpload={(file) => {
              const reader = new FileReader();
              reader.onload = () => onImport(String(reader.result ?? ''));
              reader.readAsText(file);
              return Upload.LIST_IGNORE;
            }}
          >
            <Button icon={<UploadOutlined />}>导入备份</Button>
          </Upload>
          <Popconfirm
            title="清空所有记录？"
            description="此操作不可恢复，建议先导出备份。"
            okText="确认清空"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={onClear}
          >
            <Button danger icon={<DeleteOutlined />}>清空记录</Button>
          </Popconfirm>
        </div>
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          {settings.lastBackupTime
            ? `最近备份：${dayjs(settings.lastBackupTime).format('MM-DD HH:mm')}`
            : '尚未进行过备份'}
        </Typography.Text>
      </Card>
    </Space>
  );
}

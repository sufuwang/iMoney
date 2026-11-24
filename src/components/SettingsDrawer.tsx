import { Drawer, InputNumber, Popconfirm, Switch, Upload } from 'antd';
import {
  DatabaseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SettingOutlined,
  SwapOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useIsMobile from '../hooks/useIsMobile';
import DrawerHead from './DrawerHead';
import type { AppSettings, CurrencyConfig } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  transactionCount: number;
  assetCount: number;
  onSettings: (patch: Partial<AppSettings>) => void;
  onExport: () => void;
  onImport: (raw: string) => void;
  onClear: () => void;
}

export default function SettingsDrawer({
  open,
  onClose,
  settings,
  transactionCount,
  assetCount,
  onSettings,
  onExport,
  onImport,
  onClear,
}: Props) {
  const isMobile = useIsMobile();
  const enabledCount = settings.currencyConfigs.filter((item) => item.enabled).length;

  const updateCurrency = (code: string, patch: Partial<CurrencyConfig>) => {
    onSettings({
      currencyConfigs: settings.currencyConfigs.map((item) =>
        item.code === code ? { ...item, ...patch } : item,
      ),
    });
  };

  const rateInput = (row: CurrencyConfig) => (
    <InputNumber
      min={0.0001}
      step={0.01}
      precision={4}
      value={row.rate}
      disabled={row.code === 'CNY'}
      onChange={(next) => next && updateCurrency(row.code, { rate: next })}
      style={{ width: '100%' }}
      inputMode="decimal"
      controls={false}
    />
  );

  const enabledSwitch = (row: CurrencyConfig) => (
    <Switch
      size="small"
      checked={row.enabled}
      disabled={row.code === 'CNY'}
      onChange={(checked) => updateCurrency(row.code, { enabled: checked })}
    />
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      closable={{ placement: 'end' }}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '84vh' : undefined}
      width={isMobile ? undefined : 440}
      className="app-drawer settings-drawer"
      title={<DrawerHead icon={<SettingOutlined />} title="更多设置" subtitle="汇率与本地数据管理" />}
      styles={{ body: { padding: 0 } }}
    >
      <div className="settings-body">
        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-card-icon">
              <SwapOutlined />
            </span>
            <span className="settings-card-titles">
              <strong>多币种汇率</strong>
              <span>基准 CNY · 统计金额按汇率折算</span>
            </span>
            <span className="settings-badge">{enabledCount} 种启用</span>
          </div>

          <div className="currency-list">
            <div className="currency-head">
              <span />
              <span>货币</span>
              <span>兑 CNY</span>
              <span>启用</span>
            </div>
            {settings.currencyConfigs.map((row) => (
              <div
                key={row.code}
                className={[
                  'currency-row',
                  row.code === 'CNY' ? 'is-base' : '',
                  row.enabled ? '' : 'is-off',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="currency-badge">{row.symbol}</span>
                <span className="currency-meta">
                  <strong>
                    {row.name}
                    <small className="currency-code">{row.code}</small>
                  </strong>
                  <small>{row.code === 'CNY' ? '人民币基准' : `1 ${row.code} 折算价`}</small>
                </span>
                {row.code === 'CNY' ? (
                  <span className="currency-rate-static">1.0000</span>
                ) : (
                  rateInput(row)
                )}
                {enabledSwitch(row)}
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-card-icon">
              <DatabaseOutlined />
            </span>
            <span className="settings-card-titles">
              <strong>数据管理</strong>
              <span>数据保存在本机浏览器，备份为 JSON 文件</span>
            </span>
          </div>

          <div className="settings-stats">
            <div className="settings-stat">
              <strong>{transactionCount}</strong>
              <span>笔记账记录</span>
            </div>
            <div className="settings-stat">
              <strong>{assetCount}</strong>
              <span>个月资产快照</span>
            </div>
          </div>

          <div className="settings-actions">
            <button type="button" className="settings-action" onClick={onExport}>
              <span className="settings-action-icon tone-blue">
                <DownloadOutlined />
              </span>
              <span className="settings-action-text">
                <strong>导出备份</strong>
                <small>JSON 文件</small>
              </span>
            </button>

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
              <button type="button" className="settings-action">
                <span className="settings-action-icon tone-green">
                  <UploadOutlined />
                </span>
                <span className="settings-action-text">
                  <strong>导入备份</strong>
                  <small>覆盖现有数据</small>
                </span>
              </button>
            </Upload>

            <Popconfirm
              title="清空所有记账记录？"
              description="此操作不可恢复，资产记录会保留，建议先导出备份。"
              okText="确认清空"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={onClear}
            >
              <button type="button" className="settings-action is-danger">
                <span className="settings-action-icon tone-red">
                  <DeleteOutlined />
                </span>
                <span className="settings-action-text">
                  <strong>清空记录</strong>
                  <small>不可恢复</small>
                </span>
              </button>
            </Popconfirm>
          </div>

          <div className={`settings-status ${settings.lastBackupTime ? 'is-ok' : ''}`}>
            <span className="settings-status-dot" />
            {settings.lastBackupTime
              ? `最近备份于 ${dayjs(settings.lastBackupTime).format('MM-DD HH:mm')}`
              : '尚未备份，建议立即导出一次'}
          </div>
        </section>

        <p className="settings-footnote">iMoney · 数据仅存储于本机</p>
      </div>
    </Drawer>
  );
}

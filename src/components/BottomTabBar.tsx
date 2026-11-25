import type { ReactNode } from 'react';
import {
  BarChartOutlined,
  FundOutlined,
  HeartOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { TabKey } from '../types';

const ITEMS: { key: TabKey; label: string; title: string; icon: ReactNode }[] = [
  { key: 'history', label: '账本', title: '收支账本', icon: <UnorderedListOutlined /> },
  { key: 'trends', label: '分析', title: '统计分析', icon: <BarChartOutlined /> },
  { key: 'health', label: '健康', title: '财务健康', icon: <HeartOutlined /> },
  { key: 'investment', label: '资产', title: '资产管理', icon: <FundOutlined /> },
];

interface Props {
  active: TabKey;
  onChange: (key: TabKey) => void;
}

export default function BottomTabBar({ active, onChange }: Props) {
  const renderItem = (item: (typeof ITEMS)[number]) => (
    <button
      key={item.key}
      type="button"
      className={`tabbar-item${active === item.key ? ' is-active' : ''}`}
      title={item.title}
      aria-label={item.title}
      onClick={() => onChange(item.key)}
    >
      <span className="tabbar-icon">{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );

  return (
    <nav className="bottom-tabbar">
      <div className="tabbar-inner">
        {ITEMS.map(renderItem)}
      </div>
    </nav>
  );
}

import type { ReactNode } from 'react';
import {
  BarChartOutlined,
  FundOutlined,
  HeartOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { TabKey } from '../types';

const ITEMS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'history', label: '明细', icon: <UnorderedListOutlined /> },
  { key: 'trends', label: '统计', icon: <BarChartOutlined /> },
  { key: 'health', label: '健康', icon: <HeartOutlined /> },
  { key: 'investment', label: '投资', icon: <FundOutlined /> },
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

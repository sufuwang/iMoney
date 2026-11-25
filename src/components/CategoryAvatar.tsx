import type { ComponentType, CSSProperties } from 'react';
import { Avatar } from 'antd';
import {
  AuditOutlined,
  BankOutlined,
  BookOutlined,
  CarOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  DollarOutlined,
  FundOutlined,
  GiftOutlined,
  HeartOutlined,
  HomeOutlined,
  LineChartOutlined,
  MedicineBoxOutlined,
  MobileOutlined,
  MoneyCollectOutlined,
  MoreOutlined,
  PlusCircleOutlined,
  RestOutlined,
  RiseOutlined,
  RollbackOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  VideoCameraOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ASSET_TYPES, CATEGORY_MAP } from '../constants';
import type { AssetType } from '../types';

type IconComponent = ComponentType<{ style?: CSSProperties }>;

const ICONS: Record<string, IconComponent> = {
  food: RestOutlined,
  shopping: ShoppingOutlined,
  transport: CarOutlined,
  entertainment: VideoCameraOutlined,
  housing: HomeOutlined,
  medical: MedicineBoxOutlined,
  education: BookOutlined,
  communication: MobileOutlined,
  fitness: HeartOutlined,
  travel: CompassOutlined,
  family: TeamOutlined,
  other: MoreOutlined,
  salary: WalletOutlined,
  fund: FundOutlined,
  bonus: GiftOutlined,
  investment: RiseOutlined,
  rent: BankOutlined,
  refund: RollbackOutlined,
  interest: MoneyCollectOutlined,
  reimbursement: AuditOutlined,
  secondhand: ThunderboltOutlined,
  lottery: TrophyOutlined,
  parttime: ClockCircleOutlined,
  otherincome: PlusCircleOutlined,
  asset_fund: FundOutlined,
  asset_nasdaq: RiseOutlined,
  asset_sp500: LineChartOutlined,
  asset_cash: WalletOutlined,
};

const LEGACY_ICONS: Record<string, IconComponent> = {
  Dollar: DollarOutlined,
};

export function iconByName(name: string): IconComponent {
  return ICONS[name] ?? LEGACY_ICONS[name] ?? MoreOutlined;
}

export function categoryIcon(categoryId: string): IconComponent {
  return iconByName(CATEGORY_MAP[categoryId]?.icon ?? '');
}

export function assetTypeIcon(type: AssetType): IconComponent {
  return iconByName(ASSET_TYPES.find((item) => item.value === type)?.icon ?? '');
}

interface Props {
  categoryId: string;
  size?: number;
}

export default function CategoryAvatar({ categoryId, size = 36 }: Props) {
  const category = CATEGORY_MAP[categoryId];
  const Icon = categoryIcon(categoryId);
  return (
    <Avatar
      shape="circle"
      size={size}
      icon={<Icon />}
      style={{
        backgroundColor: `${category?.color ?? '#8c8c8c'}1F`,
        color: category?.color ?? '#8c8c8c',
        flexShrink: 0,
      }}
    />
  );
}

export function AssetAvatar({ type, size = 38 }: { type: AssetType; size?: number }) {
  const asset = ASSET_TYPES.find((item) => item.value === type);
  const Icon = assetTypeIcon(type);
  return (
    <Avatar
      shape="circle"
      size={size}
      icon={<Icon />}
      style={{
        backgroundColor: `${asset?.color ?? '#8c8c8c'}1F`,
        color: asset?.color ?? '#8c8c8c',
        flexShrink: 0,
      }}
    />
  );
}

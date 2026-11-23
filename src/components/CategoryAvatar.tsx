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
import { CATEGORY_MAP } from '../constants';

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
};

const LEGACY_ICONS: Record<string, IconComponent> = {
  Dollar: DollarOutlined,
};

export function categoryIcon(categoryId: string): IconComponent {
  const icon = CATEGORY_MAP[categoryId]?.icon ?? '';
  return ICONS[icon] ?? LEGACY_ICONS[icon] ?? MoreOutlined;
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

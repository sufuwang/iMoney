import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
}

export default function DrawerHead({ icon, title, subtitle, extra }: Props) {
  return (
    <div className="drawer-head">
      <span className="drawer-head-icon">{icon}</span>
      <span className="drawer-head-text">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
      {extra ? <span className="drawer-head-extra">{extra}</span> : null}
    </div>
  );
}

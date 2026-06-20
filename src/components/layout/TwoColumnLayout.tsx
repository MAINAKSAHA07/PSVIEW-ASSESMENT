import type { ReactNode } from 'react';

interface TwoColumnLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function TwoColumnLayout({ left, right }: TwoColumnLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-57px)] flex-col lg:flex-row">
      <div className="flex min-h-0 flex-[3] flex-col border-b border-surface-border lg:border-b-0 lg:border-r">
        {left}
      </div>
      <div className="flex min-h-0 flex-[2] flex-col">{right}</div>
    </div>
  );
}

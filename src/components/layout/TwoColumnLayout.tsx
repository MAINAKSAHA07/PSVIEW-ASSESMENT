import type { ReactNode } from 'react';

interface TwoColumnLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function TwoColumnLayout({ left, right }: TwoColumnLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-57px)]">
      <div className="flex min-h-0 w-[60%] flex-col border-r border-line bg-app">
        {left}
      </div>
      <div className="flex min-h-0 w-[40%] flex-col overflow-hidden bg-app-reasoning">
        {right}
      </div>
    </div>
  );
}

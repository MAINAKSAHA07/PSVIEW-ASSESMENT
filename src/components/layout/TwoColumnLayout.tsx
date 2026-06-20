import type { ReactNode } from 'react';

interface TwoColumnLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function TwoColumnLayout({ left, right }: TwoColumnLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="flex min-h-[55vh] w-full flex-col bg-app lg:min-h-0 lg:h-full lg:w-[60%] lg:border-r lg:border-line">
        {left}
      </div>
      <div className="flex min-h-[45vh] w-full flex-col overflow-hidden bg-app-reasoning lg:min-h-0 lg:h-full lg:w-[40%]">
        {right}
      </div>
    </div>
  );
}

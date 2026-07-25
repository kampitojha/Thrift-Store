'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type TabsContextType = {
  value: string;
  onChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextType>({ value: '', onChange: () => {} });

export function Tabs({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex gap-1 rounded-xl bg-ink-100 p-1', className)} role="tablist">
      {children}
    </div>
  );
}

export function Tab({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onChange(value)}
      className={cn(
        'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition',
        active
          ? 'bg-white text-ink-900 shadow-soft'
          : 'text-ink-500 hover:text-ink-800',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className={cn('pt-4', className)} role="tabpanel">{children}</div>;
}
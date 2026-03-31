"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

type TabsContextType = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextType | null>(null);

export function Tabs({
  defaultValue,
  className,
  children
}: {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex", className)}>{children}</div>;
}

export function TabsTrigger({
  value,
  className,
  children
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  const active = ctx?.value === value;

  return (
    <button
      onClick={() => ctx?.setValue(value)}
      className={cn(
        "text-sm",
        active ? "bg-white shadow-sm" : "text-slate-500",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={className}>{children}</div>;
}

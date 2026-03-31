"use client";

import * as React from "react";

type SelectContextType = {
  value: string;
  onValueChange: (value: string) => void;
};

const SelectContext = React.createContext<SelectContextType | null>(null);

export function Select({
  value,
  onValueChange,
  children
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`flex h-10 items-center rounded-md border px-3 ${className}`}>{children}</div>;
}

export function SelectValue() {
  const ctx = React.useContext(SelectContext);
  return <span>{ctx?.value}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);
  return (
    <select
      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
      value={ctx?.value}
      onChange={(e) => ctx?.onValueChange(e.target.value)}
    >
      {children}
    </select>
  );
}

export function SelectItem({
  value,
  children
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <option value={value}>{children}</option>;
}

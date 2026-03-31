"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type DialogContextType = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const DialogContext = React.createContext<DialogContextType | null>(null);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used inside <Dialog />");
  return ctx;
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
}: {
  children: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
}) {
  const { setOpen } = useDialog();

  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      setOpen(true);
    },
  });
}

export function DialogContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useDialog();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      <div className="absolute inset-0 flex items-end justify-center md:items-center">
        <div
          className={`relative h-[100dvh] w-full overflow-y-auto bg-white shadow-2xl md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-[32px] ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            Cerrar
          </button>

          <div className="min-h-full p-4 pt-14 md:p-8 md:pt-8">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mb-6">{children}</div>;
}

export function DialogTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={`text-2xl font-bold text-slate-900 ${className}`}>{children}</h2>;
}
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Lock, Unlock, ChevronDown, ChevronUp } from "lucide-react";

type Board = "chivos" | "luzu";
export type Totals = { ars: number; usd: number };

const fmtArs = (v: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v || 0);
const fmtUsd = (v: number) =>
  `US$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(v || 0)}`;

// ─── Hook: años cerrados (se guardan en la pestaña "Cierres" de la Sheet) ────
export function useCierres(board: Board) {
  const [closed, setClosed] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cierres?board=${board}`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setClosed(data.map((r) => Number(r.year)).filter((y) => y > 0));
      }
    } catch {
      // si falla, la app sigue funcionando sin cierres
    } finally {
      setLoaded(true);
    }
  }, [board]);

  useEffect(() => {
    load();
  }, [load]);

  const closeYear = useCallback(
    async (year: number): Promise<boolean> => {
      try {
        const res = await fetch("/api/cierres", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board, year }),
        });
        const data = await res.json();
        if (!res.ok || data?.error) return false;
        setClosed((prev) => (prev.includes(year) ? prev : [...prev, year]));
        return true;
      } catch {
        return false;
      }
    },
    [board]
  );

  const reopenYear = useCallback(
    async (year: number): Promise<boolean> => {
      try {
        const res = await fetch("/api/cierres", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board, year }),
        });
        const data = await res.json();
        if (!res.ok || data?.error) return false;
        setClosed((prev) => prev.filter((y) => y !== year));
        return true;
      } catch {
        return false;
      }
    },
    [board]
  );

  return { closed, loaded, closeYear, reopenYear };
}

// ─── Modal de confirmación simple ────────────────────────────────────────────
function Confirm({
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 380, borderRadius: 24, background: "#18181b", border: "1px solid rgba(255,255,255,0.12)", padding: 22 }}
      >
        <p style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{title}</p>
        <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>{children}</div>
        <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ borderRadius: 14, padding: "10px 16px", fontSize: 14, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.08)" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{ borderRadius: 14, padding: "10px 16px", fontSize: 14, fontWeight: 700, color: "#000", background: "#10b981", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel "Ganado en el año" + botón de cierre (va debajo del gráfico anual) ─
export function YearClosePanel({
  openYear,
  earned,
  scheduledNextYear,
  pendingCount,
  canClose,
  onClose,
  onError,
}: {
  openYear: number;
  earned: Totals;
  scheduledNextYear: Totals;
  pendingCount: number;
  canClose: boolean;
  onClose: () => Promise<boolean>;
  onError: (msg: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasNext = scheduledNextYear.ars > 0 || scheduledNextYear.usd > 0;

  const doClose = async () => {
    setBusy(true);
    const ok = await onClose();
    setBusy(false);
    setConfirming(false);
    if (!ok) onError("No pude cerrar el año. Revisá la conexión e intentá de nuevo.");
  };

  return (
    <div style={{ borderRadius: 24, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", padding: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(110,231,183,0.7)" }}>
        Ganado en {openYear}
      </p>
      <p style={{ marginTop: 4, fontSize: 30, fontWeight: 700, color: "#34d399" }}>{fmtArs(earned.ars)}</p>
      {earned.usd > 0 && <p style={{ marginTop: 2, fontSize: 18, fontWeight: 600, color: "#38bdf8" }}>{fmtUsd(earned.usd)}</p>}
      <p style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Cobrado con fecha de cobro en {openYear}</p>

      {hasNext && (
        <p style={{ marginTop: 10, fontSize: 12, color: "#c4b5fd" }}>
          Ya agendado para {openYear + 1}: {fmtArs(scheduledNextYear.ars)}
          {scheduledNextYear.usd > 0 ? ` + ${fmtUsd(scheduledNextYear.usd)}` : ""}
        </p>
      )}

      <button
        onClick={() => setConfirming(true)}
        disabled={!canClose}
        style={{
          marginTop: 14,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 14,
          padding: "11px 14px",
          fontSize: 14,
          fontWeight: 700,
          color: canClose ? "#000" : "rgba(255,255,255,0.3)",
          background: canClose ? "#10b981" : "rgba(255,255,255,0.06)",
          cursor: canClose ? "pointer" : "not-allowed",
        }}
      >
        <Lock style={{ width: 16, height: 16 }} />
        {canClose ? `Cerrar año ${openYear}` : `Cerrar año ${openYear} (disponible en diciembre)`}
      </button>

      {confirming && (
        <Confirm
          title={`Cerrar año ${openYear}`}
          confirmLabel="Cerrar año"
          busy={busy}
          onConfirm={doClose}
          onCancel={() => setConfirming(false)}
        >
          <p>
            El {openYear} pasa al Historial y se empieza a contar el {openYear + 1}. Después podés reabrirlo desde el Historial si te equivocás.
          </p>
          {pendingCount > 0 && (
            <p style={{ marginTop: 8, color: "#fdba74" }}>
              Ojo: todavía tenés {pendingCount} {pendingCount === 1 ? "cobro pendiente" : "cobros pendientes"} en {openYear}.
            </p>
          )}
        </Confirm>
      )}
    </div>
  );
}

// ─── Historial: un desplegable por año cerrado ───────────────────────────────
export function YearHistory({
  years,
  lastClosedYear,
  summaryFor,
  renderYear,
  onReopen,
  onError,
}: {
  years: number[]; // ya ordenados de más nuevo a más viejo
  lastClosedYear: number | null;
  summaryFor: (year: number) => { earned: Totals; count: number };
  renderYear: (year: number) => React.ReactNode;
  onReopen: (year: number) => Promise<boolean>;
  onError: (msg: string) => void;
}) {
  const [openYears, setOpenYears] = useState<Record<number, boolean>>({});
  const [reopening, setReopening] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  if (!years.length) {
    return (
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", padding: "8px 4px" }}>
        Todavía no cerraste ningún año. Cuando lo hagas, va a aparecer acá con todo su calendario.
      </p>
    );
  }

  const doReopen = async () => {
    if (reopening === null) return;
    setBusy(true);
    const ok = await onReopen(reopening);
    setBusy(false);
    setReopening(null);
    if (!ok) onError("No pude reabrir el año. Intentá de nuevo.");
  };

  return (
    <div className="space-y-3">
      {years.map((year) => {
        const { earned, count } = summaryFor(year);
        const isOpen = !!openYears[year];
        return (
          <div key={year} style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <div className="text-left">
                <p style={{ fontSize: 20, fontWeight: 700, color: "white" }}>{year}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{count} {count === 1 ? "registro" : "registros"}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#34d399" }}>{fmtArs(earned.ars)}</p>
                  {earned.usd > 0 && <p style={{ fontSize: 12, fontWeight: 600, color: "#38bdf8" }}>{fmtUsd(earned.usd)}</p>}
                </div>
                {isOpen ? <ChevronUp style={{ width: 16, height: 16, color: "rgba(255,255,255,0.4)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "rgba(255,255,255,0.4)" }} />}
              </div>
            </button>
            {isOpen && (
              <div className="px-3 pb-4">
                {renderYear(year)}
                {year === lastClosedYear && (
                  <button
                    onClick={() => setReopening(year)}
                    style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)" }}
                  >
                    <Unlock style={{ width: 13, height: 13 }} /> Reabrir {year}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {reopening !== null && (
        <Confirm
          title={`Reabrir año ${reopening}`}
          confirmLabel="Reabrir"
          busy={busy}
          onConfirm={doReopen}
          onCancel={() => setReopening(null)}
        >
          <p>El {reopening} vuelve a ser el año en curso y el {reopening + 1} pasa a contarse como agendado.</p>
        </Confirm>
      )}
    </div>
  );
}

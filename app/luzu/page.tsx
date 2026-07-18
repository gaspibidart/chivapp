"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Moneda = "$" | "USD";
type Programa = "AQN" | "NDN";

type Valor = { monto: number; moneda: Moneda };

type LuzuEvent = {
  id: number;
  evento: string;
  cantidad: number;
  fechas: string[];
  valores: Valor[];
  programa: Programa;
  facturaEnviada: boolean;
  facturaFecha: string;
  cobrado: boolean;
};

type RawLuzuRow = {
  id: string | number;
  evento?: string;
  cantidad?: string | number;
  fechas?: unknown;
  valores?: unknown;
  programa?: string;
  facturaEnviada?: boolean | string;
  facturaFecha?: string;
  cobrado?: boolean | string;
};

type FormValor = { monto: string; moneda: Moneda };

type FormState = {
  evento: string;
  cantidad: number;
  fechas: string[];
  valores: FormValor[];
  programa: Programa;
  facturaEnviada: boolean;
  facturaFecha: string;
  cobrado: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const normalizeDateInput = (value: string): string => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const formatDateAR = (value: string): string => {
  if (!value) return "-";
  const normalized = String(value).slice(0, 10);
  const date = new Date(normalized + "T00:00:00");
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
};

const parseMonth = (dateString: string): number => {
  if (!dateString) return -1;
  const d = new Date(dateString + "T00:00:00");
  if (isNaN(d.getTime())) return -1;
  return d.getMonth();
};

const parseMoneyInput = (value: string | number): number => {
  const cleaned = String(value ?? "").replace(/[^\d]/g, "");
  return cleaned ? Number(cleaned) : 0;
};

const currencyARS = (value: number): string =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);

const currencyUSD = (value: number): string =>
  `US$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value || 0)}`;

function emptyFormState(): FormState {
  return {
    evento: "",
    cantidad: 1,
    fechas: [""],
    valores: [{ monto: "", moneda: "$" }],
    programa: "AQN",
    facturaEnviada: false,
    facturaFecha: "",
    cobrado: false,
  };
}

// Ajusta la cantidad de campos fecha/valor según la cantidad elegida,
// preservando lo ya cargado.
function resizeForCantidad(form: FormState, cantidad: number): FormState {
  const safeCantidad = Math.max(1, cantidad);
  const fechas = [...form.fechas];
  const valores = [...form.valores];

  while (fechas.length < safeCantidad) fechas.push("");
  while (valores.length < safeCantidad) valores.push({ monto: "", moneda: "$" });

  fechas.length = safeCantidad;
  valores.length = safeCantidad;

  return { ...form, cantidad: safeCantidad, fechas, valores };
}

function normalizeEvents(raw: RawLuzuRow[]): LuzuEvent[] {
  return raw
    .filter((item) => item && item.id !== undefined && item.id !== "")
    .map((item) => {
      const fechas = (() => {
        try {
          const rawFechas = item.fechas;
          if (typeof rawFechas === "string" && rawFechas.trim()) return JSON.parse(rawFechas) as string[];
          if (Array.isArray(rawFechas)) return rawFechas as string[];
        } catch {
          // ignorar, se cae al array vacío de abajo
        }
        return [] as string[];
      })();

      const valores = (() => {
        try {
          const rawValores = item.valores;
          if (typeof rawValores === "string" && rawValores.trim()) return JSON.parse(rawValores) as Valor[];
          if (Array.isArray(rawValores)) return rawValores as Valor[];
        } catch {
          // ignorar, se cae al array vacío de abajo
        }
        return [] as Valor[];
      })();

      return {
        id: Number(item.id),
        evento: item.evento || "",
        cantidad: Number(item.cantidad) || fechas.length || 1,
        fechas: fechas.map((f) => normalizeDateInput(String(f))),
        valores: valores.map((v) => ({
          monto: Number(v?.monto) || 0,
          moneda: v?.moneda === "USD" ? ("USD" as const) : ("$" as const),
        })),
        programa: item.programa === "NDN" ? ("NDN" as const) : ("AQN" as const),
        facturaEnviada:
          String(item.facturaEnviada).toLowerCase() === "true" || item.facturaEnviada === true,
        facturaFecha: normalizeDateInput(item.facturaFecha || ""),
        cobrado: String(item.cobrado).toLowerCase() === "true" || item.cobrado === true,
      };
    });
}

// La fecha más próxima (o más reciente si ya pasaron todas) de un evento.
function nearestFecha(event: LuzuEvent): string {
  if (!event.fechas.length) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sorted = [...event.fechas].filter(Boolean).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  if (!sorted.length) return "";
  const upcoming = sorted.find((f) => new Date(f).getTime() >= today.getTime());
  return upcoming || sorted[sorted.length - 1];
}

// ─── Hook de datos ────────────────────────────────────────────────────────────

function useLuzuEvents() {
  const [events, setEvents] = useState<LuzuEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/luzu", { cache: "no-store" });
      const data = await res.json();
      setEvents(normalizeEvents(Array.isArray(data) ? data : []));
    } catch (error) {
      console.error("Error cargando eventos de Luzu:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persistEvent = useCallback((event: LuzuEvent) => {
    fetch("/api/luzu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch((error) => console.error("Error sincronizando evento:", error));
  }, []);

  const saveEvent = useCallback(
    async (form: FormState, editingId: number | null): Promise<boolean> => {
      setIsSaving(true);
      try {
        const payload = {
          id: editingId || Date.now(),
          evento: form.evento,
          cantidad: form.cantidad,
          fechas: form.fechas.map((f) => normalizeDateInput(f)),
          valores: form.valores.map((v) => ({
            monto: parseMoneyInput(v.monto),
            moneda: v.moneda,
          })),
          programa: form.programa,
          facturaEnviada: form.facturaEnviada,
          facturaFecha: form.facturaEnviada ? normalizeDateInput(form.facturaFecha) : "",
          cobrado: form.cobrado,
        };

        const res = await fetch("/api/luzu", {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) return false;
        await load();
        return true;
      } catch (error) {
        console.error("Error guardando evento de Luzu:", error);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [load]
  );

  const toggleCobrado = useCallback(
    (id: number) => {
      setEvents((prev) => {
        const updated = prev.map((e) => (e.id === id ? { ...e, cobrado: !e.cobrado } : e));
        const event = updated.find((e) => e.id === id);
        if (event) persistEvent(event);
        return updated;
      });
    },
    [persistEvent]
  );

  const toggleFactura = useCallback(
    (id: number) => {
      setEvents((prev) => {
        const updated = prev.map((e) =>
          e.id === id
            ? { ...e, facturaEnviada: !e.facturaEnviada, facturaFecha: !e.facturaEnviada ? e.facturaFecha : "" }
            : e
        );
        const event = updated.find((e) => e.id === id);
        if (event) persistEvent(event);
        return updated;
      });
    },
    [persistEvent]
  );

  const setFacturaFecha = useCallback(
    (id: number, fecha: string) => {
      setEvents((prev) => {
        const updated = prev.map((e) =>
          e.id === id ? { ...e, facturaFecha: fecha, facturaEnviada: true } : e
        );
        const event = updated.find((e) => e.id === id);
        if (event) persistEvent(event);
        return updated;
      });
    },
    [persistEvent]
  );

  const deleteEvent = useCallback(async (id: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/luzu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return false;
      setEvents((prev) => prev.filter((e) => e.id !== id));
      return true;
    } catch (error) {
      console.error("Error borrando evento de Luzu:", error);
      return false;
    }
  }, []);

  return { events, loading, isSaving, saveEvent, toggleCobrado, toggleFactura, setFacturaFecha, deleteEvent };
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function ProgramaBadge({ programa }: { programa: Programa }) {
  return (
    <Badge
      className={`rounded-full border-0 px-2.5 py-1 text-white ${
        programa === "AQN" ? "bg-sky-500" : "bg-fuchsia-500"
      }`}
    >
      {programa}
    </Badge>
  );
}

function SummaryCard({
  label,
  ars,
  usd,
  accent,
}: {
  label: string;
  ars: number;
  usd: number;
  accent: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent}`}>{currencyARS(ars)}</p>
      {usd > 0 && <p className="mt-0.5 text-xs font-semibold text-emerald-400">{currencyUSD(usd)}</p>}
    </div>
  );
}

function EventCard({
  event,
  onEdit,
  onToggleCobrado,
  onToggleFactura,
  onSetFacturaFecha,
  finalized = false,
}: {
  event: LuzuEvent;
  onEdit: (e: LuzuEvent) => void;
  onToggleCobrado: (id: number) => void;
  onToggleFactura: (id: number) => void;
  onSetFacturaFecha: (id: number, fecha: string) => void;
  finalized?: boolean;
}) {
  const totalArs = event.valores.filter((v) => v.moneda === "$").reduce((a, v) => a + v.monto, 0);
  const totalUsd = event.valores.filter((v) => v.moneda === "USD").reduce((a, v) => a + v.monto, 0);

  return (
    <Card
      className={`rounded-[20px] border ${
        finalized ? "border-rose-500/15 bg-rose-500/[0.04]" : "border-white/10 bg-white/5"
      }`}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={`truncate text-sm font-semibold ${finalized ? "text-white/80" : "text-white"}`}>
                {event.evento}
              </p>
              <ProgramaBadge programa={event.programa} />
            </div>
            <p className={`mt-1 text-xs ${finalized ? "text-white/30" : "text-white/40"}`}>
              {event.fechas.filter(Boolean).map((f) => formatDateAR(f)).join(" · ") || "Sin fecha"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-white/30">Total</p>
              <p className={`text-sm font-bold ${finalized ? "text-emerald-400/70" : "text-emerald-400"}`}>
                {currencyARS(totalArs)}
              </p>
              {totalUsd > 0 && <p className="text-xs font-semibold text-sky-400/80">{currencyUSD(totalUsd)}</p>}
            </div>
            <button
              onClick={() => onEdit(event)}
              className={`rounded-xl border p-2 ${
                finalized
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-200/80 hover:bg-rose-500/20"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {finalized ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Detalle individual cuando hay más de una fecha/valor */}
        {event.fechas.length > 1 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {event.fechas.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] text-white/30">{formatDateAR(f)}</p>
                <p className="text-xs font-semibold text-white/70">
                  {event.valores[i]?.moneda === "USD"
                    ? currencyUSD(event.valores[i]?.monto || 0)
                    : currencyARS(event.valores[i]?.monto || 0)}
                </p>
              </div>
            ))}
          </div>
        )}

        {!finalized && (
          <>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-xs text-white/50">Factura</span>
                <Switch checked={event.facturaEnviada} onCheckedChange={() => onToggleFactura(event.id)} />
              </div>
              <div className="flex flex-1 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-xs text-white/50">Cobrado</span>
                <Switch checked={event.cobrado} onCheckedChange={() => onToggleCobrado(event.id)} />
              </div>
            </div>

            {event.facturaEnviada && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="shrink-0 text-xs text-white/50">Fecha de envío</span>
                <input
                  type="date"
                  value={event.facturaFecha}
                  onChange={(e) => onSetFacturaFecha(event.id, e.target.value)}
                  className="h-7 rounded-lg border border-white/10 bg-[#0a0a0f] px-2 text-[13px] text-white/80 outline-none"
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

type Occurrence = {
  id: string;
  evento: string;
  fecha: string;
  monto: number;
  moneda: Moneda;
  programa: Programa;
  cobrado: boolean;
};

function flattenOccurrences(events: LuzuEvent[]): Occurrence[] {
  const result: Occurrence[] = [];
  events.forEach((ev) => {
    ev.fechas.forEach((fecha, i) => {
      if (!fecha) return;
      const valor = ev.valores[i];
      result.push({
        id: `${ev.id}-${i}`,
        evento: ev.evento,
        fecha,
        monto: valor?.monto || 0,
        moneda: valor?.moneda || "$",
        programa: ev.programa,
        cobrado: ev.cobrado,
      });
    });
  });
  return result;
}

function LuzuCalendarTab({ events }: { events: LuzuEvent[] }) {
  const occurrences = useMemo(() => flattenOccurrences(events), [events]);
  const today = new Date();
  const currentMonth = today.getMonth();

  const [expanded, setExpanded] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    monthNames.forEach((_, i) => { init[i] = i >= currentMonth; });
    return init;
  });

  return (
    <div className="space-y-2">
      {monthNames.map((month, index) => {
        const items = occurrences
          .filter((o) => parseMonth(o.fecha) === index)
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        const totalArs = items.filter((i) => i.moneda === "$").reduce((a, i) => a + i.monto, 0);
        const totalUsd = items.filter((i) => i.moneda === "USD").reduce((a, i) => a + i.monto, 0);
        const isPast = index < currentMonth;
        const isOpen = expanded[index];

        return (
          <div
            key={month}
            style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: isPast ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)" }}
          >
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [index]: !prev[index] }))}
              className="flex w-full items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 15, fontWeight: isPast ? 400 : 600, color: isPast ? "rgba(255,255,255,0.35)" : "white" }}>
                  {month}
                </span>
                {items.length > 0 && (
                  <span style={{ fontSize: 11, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", borderRadius: 999, padding: "2px 8px" }}>
                    {items.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span style={{ fontSize: 14, fontWeight: 600, color: totalArs > 0 ? "#34d399" : "rgba(255,255,255,0.2)" }}>
                    {totalArs > 0 ? currencyARS(totalArs) : "—"}
                  </span>
                  {totalUsd > 0 && <p style={{ fontSize: 11, color: "#38bdf8" }}>{currencyUSD(totalUsd)}</p>}
                </div>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="space-y-2 px-4 pb-4">
                {items.length ? (
                  items.map((item) => (
                    <div key={item.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: "12px 14px" }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p style={{ fontWeight: 600, color: "white", fontSize: 14 }}>{item.evento}</p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{formatDateAR(item.fecha)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p style={{ fontSize: 15, fontWeight: 700, color: item.moneda === "USD" ? "#38bdf8" : "#34d399" }}>
                            {item.moneda === "USD" ? currencyUSD(item.monto) : currencyARS(item.monto)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <ProgramaBadge programa={item.programa} />
                        {item.cobrado && <span className="text-[11px] font-semibold text-rose-400/70">Cobrado</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", paddingBottom: 4 }}>Sin eventos.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LuzuPage() {
  const { events, loading, isSaving, saveEvent, toggleCobrado, toggleFactura, setFacturaFecha, deleteEvent } =
    useLuzuEvents();

  const [activeTab, setActiveTab] = useState<"resumen" | "calendario">("resumen");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyFormState());
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCobrados, setShowCobrados] = useState(false);

  const openNewEvent = () => {
    setForm(emptyFormState());
    setEditingId(null);
    setOpen(true);
  };

  const openEditEvent = (event: LuzuEvent) => {
    setEditingId(event.id);
    setForm({
      evento: event.evento,
      cantidad: event.cantidad || 1,
      fechas: event.fechas.length ? event.fechas : [""],
      valores: event.valores.length
        ? event.valores.map((v) => ({ monto: String(v.monto || ""), moneda: v.moneda }))
        : [{ monto: "", moneda: "$" }],
      programa: event.programa,
      facturaEnviada: event.facturaEnviada,
      facturaFecha: event.facturaFecha,
      cobrado: event.cobrado,
    });
    setOpen(true);
  };

  const handleCantidadChange = (delta: number) => {
    setForm((prev) => resizeForCantidad(prev, prev.cantidad + delta));
  };

  const handleSave = async () => {
    if (!form.evento.trim()) return;
    const ok = await saveEvent(form, editingId);
    if (ok) {
      setForm(emptyFormState());
      setEditingId(null);
      setOpen(false);
    } else {
      setErrorMsg("No pude guardar el evento en Google Sheets.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (confirmDelete === null) return;
    const ok = await deleteEvent(confirmDelete);
    setConfirmDelete(null);
    if (!ok) setErrorMsg("No pude borrar el evento en Google Sheets.");
  };

  // ─── Totales ──────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const acc = {
      gral: { ars: 0, usd: 0 },
      aqn: { ars: 0, usd: 0 },
      ndn: { ars: 0, usd: 0 },
      aCobrarAqn: { ars: 0, usd: 0 },
      aCobrarNdn: { ars: 0, usd: 0 },
    };

    for (const ev of events) {
      for (const v of ev.valores) {
        const monto = v.monto || 0;
        const key = v.moneda === "USD" ? "usd" : "ars";

        acc.gral[key] += monto;
        if (ev.programa === "AQN") acc.aqn[key] += monto;
        if (ev.programa === "NDN") acc.ndn[key] += monto;

        if (!ev.cobrado) {
          if (ev.programa === "AQN") acc.aCobrarAqn[key] += monto;
          if (ev.programa === "NDN") acc.aCobrarNdn[key] += monto;
        }
      }
    }

    return acc;
  }, [events]);

  const pendientes = useMemo(() => {
    return [...events]
      .filter((e) => !e.cobrado)
      .sort((a, b) => new Date(nearestFecha(a) || 0).getTime() - new Date(nearestFecha(b) || 0).getTime());
  }, [events]);

  const cobrados = useMemo(() => {
    return [...events]
      .filter((e) => e.cobrado)
      .sort((a, b) => new Date(nearestFecha(b) || 0).getTime() - new Date(nearestFecha(a) || 0).getTime());
  }, [events]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <p className="text-sm text-white/50">Cargando eventos de Luzu…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`html, body { background: #0a0a0f !important; }`}</style>
      <div className="min-h-screen overflow-x-hidden bg-[#0a0a0f] p-2 text-white md:p-4">
        <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between md:p-6"
          >
            <div>
              <Link href="/" className="mb-1 inline-block text-xs text-white/30 hover:text-white/60">
                ← Volver
              </Link>
              <p className="text-sm font-semibold tracking-wide text-sky-400">LUZU</p>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">TRANSMISIONES</h1>
              <p className="mt-1 text-sm text-white/40">AQN / NDN — control de cobros</p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger>
                <Button
                  onClick={openNewEvent}
                  className="rounded-2xl bg-sky-500 px-5 py-6 text-sm font-medium text-white shadow-lg hover:bg-sky-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar evento
                </Button>
              </DialogTrigger>

              <DialogContent className="!max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar evento" : "Nuevo evento"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Evento</label>
                    <Input
                      value={form.evento}
                      onChange={(e) => setForm({ ...form, evento: e.target.value })}
                      placeholder="Ej: Streaming especial verano"
                      className="rounded-2xl border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Cantidad</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleCantidadChange(-1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-lg font-bold text-slate-900">{form.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => handleCantidadChange(1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: form.cantidad }).map((_, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto]"
                      >
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Fecha {form.cantidad > 1 ? `#${i + 1}` : ""}
                          </label>
                          <Input
                            type="date"
                            value={form.fechas[i] || ""}
                            onChange={(e) => {
                              const fechas = [...form.fechas];
                              fechas[i] = e.target.value;
                              setForm({ ...form, fechas });
                            }}
                            className="rounded-xl border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Valor {form.cantidad > 1 ? `#${i + 1}` : ""}
                          </label>
                          <Input
                            inputMode="numeric"
                            value={form.valores[i]?.monto || ""}
                            onChange={(e) => {
                              const valores = [...form.valores];
                              valores[i] = { ...valores[i], monto: e.target.value };
                              setForm({ ...form, valores });
                            }}
                            placeholder="0"
                            className="rounded-xl border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Moneda</label>
                          <select
                            value={form.valores[i]?.moneda || "$"}
                            onChange={(e) => {
                              const valores = [...form.valores];
                              valores[i] = { ...valores[i], moneda: e.target.value as Moneda };
                              setForm({ ...form, valores });
                            }}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                          >
                            <option value="$">$ (ARS)</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-500">Programa</label>
                    <div className="flex gap-2">
                      {(["AQN", "NDN"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, programa: p })}
                          className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            form.programa === p
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-700">Factura enviada</span>
                      <Switch
                        checked={form.facturaEnviada}
                        onCheckedChange={(checked) => {
                          const isChecked = Boolean(checked);
                          setForm({
                            ...form,
                            facturaEnviada: isChecked,
                            facturaFecha: isChecked ? form.facturaFecha : "",
                          });
                        }}
                      />
                    </div>
                    {form.facturaEnviada && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500">Fecha de envío</p>
                        <Input
                          type="date"
                          value={form.facturaFecha}
                          onChange={(e) => setForm({ ...form, facturaFecha: e.target.value })}
                          className="rounded-2xl border-slate-200 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-sm text-slate-700">Cobrado</span>
                    <Switch
                      checked={form.cobrado}
                      onCheckedChange={(checked) => setForm({ ...form, cobrado: Boolean(checked) })}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          setConfirmDelete(editingId);
                        }}
                        className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Borrar
                      </button>
                    )}
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !form.evento.trim()}
                      className="ml-auto rounded-2xl bg-sky-500 px-6 py-6 text-sm font-medium text-white hover:bg-sky-400"
                    >
                      {isSaving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear evento"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Error toast */}
          {errorMsg && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
              {errorMsg}{" "}
              <button onClick={() => setErrorMsg(null)} className="ml-2 underline">
                cerrar
              </button>
            </div>
          )}

          {/* Confirmación de borrado */}
          {confirmDelete !== null && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6">
                <p className="text-sm font-semibold text-slate-900">¿Borrar este evento?</p>
                <p className="mt-1 text-sm text-slate-500">Esta acción no se puede deshacer.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resumen (KPIs) */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <SummaryCard label="Total gral" ars={totals.gral.ars} usd={totals.gral.usd} accent="text-white" />
            <SummaryCard label="Total AQN" ars={totals.aqn.ars} usd={totals.aqn.usd} accent="text-sky-400" />
            <SummaryCard label="Total NDN" ars={totals.ndn.ars} usd={totals.ndn.usd} accent="text-fuchsia-400" />
            <SummaryCard label="A cobrar AQN" ars={totals.aCobrarAqn.ars} usd={totals.aCobrarAqn.usd} accent="text-amber-400" />
            <SummaryCard label="A cobrar NDN" ars={totals.aCobrarNdn.ars} usd={totals.aCobrarNdn.usd} accent="text-amber-400" />
          </div>

          {/* Tabs */}
          <div className="flex w-full gap-1 rounded-2xl p-1 md:w-fit" style={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.15)" }}>
            {(["resumen", "calendario"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all md:flex-none md:px-5"
                style={
                  activeTab === tab
                    ? { background: "#0ea5e9", color: "#000", fontWeight: 700 }
                    : { background: "transparent", color: "rgba(255,255,255,0.65)" }
                }
              >
                {tab === "resumen" ? "Resumen" : "Calendario"}
              </button>
            ))}
          </div>

          {activeTab === "resumen" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {pendientes.length ? (
                  pendientes.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      onEdit={openEditEvent}
                      onToggleCobrado={toggleCobrado}
                      onToggleFactura={toggleFactura}
                      onSetFacturaFecha={setFacturaFecha}
                    />
                  ))
                ) : (
                  <p className="text-sm text-white/30">No hay eventos pendientes de cobro.</p>
                )}
              </div>

              {/* Cobrados — colapsable, en rojo */}
              <div className="pt-2">
                <button onClick={() => setShowCobrados((v) => !v)} className="mb-3 flex w-full items-center gap-3">
                  <div className="h-px flex-1 bg-rose-500/20" />
                  <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-rose-400/70">
                    Cobrados
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-400/80">
                      {cobrados.length}
                    </span>
                    {showCobrados ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </p>
                  <div className="h-px flex-1 bg-rose-500/20" />
                </button>

                {showCobrados && (
                  <div className="space-y-3">
                    {cobrados.length ? (
                      cobrados.map((ev) => (
                        <EventCard
                          key={ev.id}
                          event={ev}
                          onEdit={openEditEvent}
                          onToggleCobrado={toggleCobrado}
                          onToggleFactura={toggleFactura}
                          onSetFacturaFecha={setFacturaFecha}
                          finalized
                        />
                      ))
                    ) : (
                      <p className="text-sm text-white/20">Todavía no hay eventos cobrados.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "calendario" && <LuzuCalendarTab events={events} />}
        </div>
      </div>
    </>
  );
}

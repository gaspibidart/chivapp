"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Download,
  FileCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ContenidoItem = {
  checked: boolean;
  qty: number;
};

type ContenidoState = Record<string, ContenidoItem>;

type Campaign = {
  id: number;
  marca: string;
  campana: string;
  contenidoItems: ContenidoState;
  contenido: string;
  publicacion: string;
  pagoA: number;
  cobro: string;
  fee: number;
  tipoCobro: "cash" | "transferencia";
  yoCash: number;
  vpCash: number;
  ivaVane: number;
  yoMasIva: number;
  facturaEnviada: boolean;
  cobrado: boolean;
};

// Tipo que representa exactamente lo que devuelve la API (antes de normalizar)
type RawCampaignRow = {
  id: string | number;
  marca?: string;
  campana?: string;
  contenido?: string;
  publicacion?: string;
  pagoA?: string | number;
  cobro?: string;
  fee?: string | number;
  tipoCobro?: string;
  yoCash?: string | number;
  vpCash?: string | number;
  ivaVane?: string | number;
  yoMasIva?: string | number;
  facturaEnviada?: boolean | string;
  cobrado?: boolean | string;
};

type FormState = {
  id: number | null;
  marca: string;
  campana: string;
  contenidoItems: ContenidoState;
  publicacion: string;
  pagoA: number;
  fee: string;
  tipoCobro: "cash" | "transferencia";
  facturaEnviada: boolean;
  cobrado: boolean;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONTENT_OPTIONS = [
  { key: "reel", label: "Reel", plural: "Reels" },
  { key: "story", label: "Story", plural: "Stories" },
  { key: "collab", label: "Collab", plural: "Collabs" },
  { key: "presencia", label: "Presencia", plural: "Presencias" },
  { key: "carrousel", label: "Carrousel", plural: "Carrousels" },
  { key: "tiktok", label: "TikTok", plural: "TikToks" },
] as const;

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const emptyForm: FormState = {
  id: null,
  marca: "",
  campana: "",
  contenidoItems: createContenidoState(),
  publicacion: "",
  pagoA: 30,
  fee: "",
  tipoCobro: "cash",
  facturaEnviada: false,
  cobrado: false,
};

// ─── Helpers puros ────────────────────────────────────────────────────────────

function buildContenido(seleccion: ContenidoState): string {
  const parts = CONTENT_OPTIONS.filter(
    (option) => seleccion?.[option.key]?.checked
  ).map((option) => {
    const qty = Math.max(1, Number(seleccion?.[option.key]?.qty || 1));
    return `${qty} ${qty === 1 ? option.label : option.plural}`;
  });
  return parts.length ? parts.join(" + ") : "-";
}

function createContenidoState(
  selectedKeys: Partial<Record<string, Partial<ContenidoItem>>> = {}
): ContenidoState {
  return CONTENT_OPTIONS.reduce((acc, option) => {
    const current = selectedKeys[option.key] || {};
    acc[option.key] = {
      checked: Boolean(current.checked),
      qty: current.qty || 1,
    };
    return acc;
  }, {} as ContenidoState);
}

// FIX: parseMonth devolvía NaN para fechas vacías/inválidas.
// Ahora devuelve -1 en esos casos para que los filtros no se rompan.
function parseMonth(dateString: string): number {
  if (!dateString) return -1;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return -1;
  return d.getMonth();
}

const parseMoneyInput = (value: string | number): number => {
  const cleaned = String(value ?? "").replace(/[^\d]/g, "");
  return cleaned ? Number(cleaned) : 0;
};

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

const currency = (value: number): string =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);

const amountValue = (item: Campaign): number =>
  item.tipoCobro === "transferencia" ? item.yoMasIva : item.yoCash;

// FIX: normalización extraída a función reutilizable para evitar duplicación
// entre loadCampaigns y refreshCampaigns.
function normalizeCampaigns(data: RawCampaignRow[]): Campaign[] {
  return data.map((item) => ({
    id: Number(item.id),
    marca: item.marca || "",
    campana: item.campana || "-",
    // FIX: se intenta parsear contenidoItems desde la API si viene como string JSON.
    // Si no viene o falla, se crea un estado vacío.
    contenidoItems: (() => {
      try {
        if (typeof item === "object" && "contenidoItems" in item) {
          const raw = (item as { contenidoItems?: unknown }).contenidoItems;
          if (typeof raw === "string") return createContenidoState(JSON.parse(raw));
          if (typeof raw === "object" && raw !== null) return createContenidoState(raw as Record<string, Partial<ContenidoItem>>);
        }
      } catch {
        // si falla el parse, usamos estado vacío
      }
      return createContenidoState();
    })(),
    contenido: item.contenido || "-",
    publicacion: normalizeDateInput(item.publicacion || ""),
    pagoA: Number(item.pagoA || 0),
    cobro: normalizeDateInput(item.cobro || ""),
    fee: Number(item.fee || 0),
    tipoCobro:
      item.tipoCobro === "transferencia" ? "transferencia" : "cash",
    yoCash: Number(item.yoCash || 0),
    vpCash: Number(item.vpCash || 0),
    ivaVane: Number(item.ivaVane || 0),
    yoMasIva: Number(item.yoMasIva || 0),
    facturaEnviada:
      String(item.facturaEnviada).toLowerCase() === "true" ||
      item.facturaEnviada === true,
    cobrado:
      String(item.cobrado).toLowerCase() === "true" ||
      item.cobrado === true,
  }));
}

// ─── Hook: useCampaigns ───────────────────────────────────────────────────────
// Toda la lógica de estado y llamadas a la API vive acá, separada del JSX.

function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? normalizeCampaigns(data) : []);
    } catch (err) {
      console.error("Error cargando campañas:", err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Persiste un cambio de campaña via PUT (usa action=update en Apps Script)
  const persistCampaign = useCallback(async (campaign: Campaign): Promise<boolean> => {
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaign),
        cache: "no-store",
      });
      const result = await res.json();
      if (!res.ok || !result?.success) throw new Error(result?.error || "Error al guardar");
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, []);

  const toggleFactura = useCallback((id: number) => {
    setCampaigns((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, facturaEnviada: !c.facturaEnviada } : c
      );
      const campaign = updated.find((c) => c.id === id);
      if (campaign) persistCampaign(campaign);
      return updated;
    });
  }, [persistCampaign]);

  const toggleCobrado = useCallback((id: number) => {
    setCampaigns((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, cobrado: !c.cobrado } : c
      );
      const campaign = updated.find((c) => c.id === id);
      if (campaign) persistCampaign(campaign);
      return updated;
    });
  }, [persistCampaign]);

  // FIX: delete usa DELETE semántico en vez de GET con query params.
  const deleteCampaign = useCallback(async (id: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/campaigns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        cache: "no-store",
      });
      const result = await res.json();
      if (!res.ok || !result?.success) throw new Error(result?.error || "Error al borrar");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, []);

  // FIX: saveCampaign usa PUT para editar y POST para crear.
  // Ya no hay riesgo de perder datos si el POST falla después de un DELETE.
  const saveCampaign = useCallback(async (form: FormState, editingId: number | null): Promise<boolean> => {
    if (isSaving) return false;
    setIsSaving(true);

    const publicationDate = new Date(form.publicacion);
    const cobroDate = new Date(publicationDate);
    cobroDate.setDate(cobroDate.getDate() + Number(form.pagoA || 0));

    const fee = parseMoneyInput(form.fee);
    const esTransferencia = form.tipoCobro === "transferencia";

    let yoCash = 0;
    let vpCash = 0;
    if (esTransferencia) {
      vpCash = Math.round(fee * 0.2 * 1.21);
      yoCash = fee - vpCash;
    } else {
      yoCash = Math.round(fee * 0.8);
      vpCash = fee - yoCash;
    }

    const payload = {
      id: editingId || Date.now(),
      marca: form.marca,
      campana: form.campana || "-",
      contenidoItems: form.contenidoItems,
      contenido: buildContenido(form.contenidoItems) || "-",
      publicacion: normalizeDateInput(form.publicacion),
      pagoA: Number(form.pagoA || 0),
      cobro: cobroDate.toISOString().slice(0, 10),
      fee,
      tipoCobro: form.tipoCobro,
      yoCash,
      vpCash,
      ivaVane: 0,
      yoMasIva: 0,
      facturaEnviada: form.facturaEnviada,
      cobrado: form.cobrado,
    };

    try {
      if (editingId) {
        // Editar: PUT → action=update en Apps Script
        const ok = await persistCampaign(payload as Campaign);
        if (!ok) throw new Error("Error al guardar");
      } else {
        // Crear: POST → action=create en Apps Script
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok || !result?.success) throw new Error(result?.error || "Error al guardar");
      }
      await load();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, load, persistCampaign]);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(campaigns, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chivapp-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [campaigns]);

  const importData = useCallback(async (event: React.ChangeEvent<HTMLInputElement>): Promise<boolean> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return false;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Formato inválido");
      setCampaigns(parsed);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    campaigns,
    loading,
    isSaving,
    toggleFactura,
    toggleCobrado,
    deleteCampaign,
    saveCampaign,
    exportData,
    importData,
  };
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function StatusBadge({ item }: { item: Campaign }) {
  if (item.cobrado)
    return (
      <Badge className="rounded-full border-0 bg-emerald-500 px-3 py-1 text-white hover:bg-emerald-500">
        Cobrado
      </Badge>
    );
  if (item.facturaEnviada)
    return (
      <Badge className="rounded-full border-0 bg-sky-500 px-3 py-1 text-white hover:bg-sky-500">
        Factura enviada
      </Badge>
    );
  return (
    <Badge className="rounded-full border-0 bg-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-200">
      Pendiente
    </Badge>
  );
}

function KPI({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/60 bg-white/85 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-3 text-emerald-700 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentSelector({
  value,
  onChange,
}: {
  value: ContenidoState;
  onChange: (next: ContenidoState) => void;
}) {
  const updateItem = (key: string, patch: Partial<ContenidoItem>) => {
    onChange({ ...value, [key]: { ...value[key], ...patch } });
  };

  return (
    <div className="min-w-0 space-y-3 md:col-span-2">
      <p className="text-sm font-medium text-slate-500">Contenido</p>
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {CONTENT_OPTIONS.map((option) => {
          const current = value[option.key];
          return (
            <div
              key={option.key}
              className="flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={current.checked}
                  onCheckedChange={(checked) =>
                    updateItem(option.key, { checked: Boolean(checked) })
                  }
                />
                <span className="min-w-0 text-sm font-medium text-slate-800">
                  {option.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-xl border-slate-200 p-0"
                  disabled={!current.checked || current.qty <= 1}
                  onClick={() =>
                    updateItem(option.key, { qty: Math.max(1, current.qty - 1) })
                  }
                >
                  -
                </Button>
                <div className="flex h-9 min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800">
                  {current.qty}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-xl border-slate-200 p-0"
                  disabled={!current.checked}
                  onClick={() =>
                    updateItem(option.key, { qty: current.qty + 1 })
                  }
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-3 text-sm text-slate-700">
        <span className="font-semibold">Resumen:</span> {buildContenido(value)}
      </div>
    </div>
  );
}

// ─── Componente: ConfirmDialog ────────────────────────────────────────────────
// FIX: reemplaza window.confirm con un Dialog de shadcn/ui.

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm rounded-3xl border border-white/60 bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg text-slate-900">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">{description}</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="rounded-2xl border-slate-200"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
          >
            Borrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente: ErrorToast ───────────────────────────────────────────────────
// FIX: reemplaza window.alert con un mensaje inline no-bloqueante.

function ErrorToast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-red-600 px-5 py-3 text-sm text-white shadow-lg">
      {message}
      <button onClick={onClose} className="ml-3 font-bold opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Page() {
  const {
    campaigns,
    loading,
    isSaving,
    toggleFactura,
    toggleCobrado,
    deleteCampaign,
    saveCampaign,
    exportData,
    importData,
  } = useCampaigns();

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado para el diálogo de confirmación de borrado
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  // Estado para errores inline (reemplaza window.alert)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ─── FIX: preview memoizado, no se recalcula en cada render ──────────────
  const { previewYo, previewVp } = useMemo(() => {
    const fee = parseMoneyInput(form.fee || 0);
    const esTransferencia = form.tipoCobro === "transferencia";
    let yo = 0;
    let vp = 0;
    if (esTransferencia) {
      vp = Math.round(fee * 0.2 * 1.21);
      yo = fee - vp;
    } else {
      yo = Math.round(fee * 0.8);
      vp = fee - yo;
    }
    return { previewYo: yo, previewVp: vp };
  }, [form.fee, form.tipoCobro]);

  // ─── Filtros ──────────────────────────────────────────────────────────────

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const textOk = [c.marca, c.campana, c.contenido]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const monthOk =
        monthFilter === "all"
          ? true
          : String(parseMonth(c.cobro)) === monthFilter;

      const statusOk =
        statusFilter === "all"
          ? true
          : statusFilter === "cobrado"
          ? c.cobrado
          : statusFilter === "facturado"
          ? c.facturaEnviada && !c.cobrado
          : !c.facturaEnviada && !c.cobrado;

      return textOk && monthOk && statusOk;
    });
  }, [campaigns, search, monthFilter, statusFilter]);

  const upcomingCampaigns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...filteredCampaigns]
      .filter((c) => !c.cobrado)
      .sort((a, b) => {
        const todayTime = today.getTime();
        return (
          Math.abs(new Date(a.cobro).getTime() - todayTime) -
          Math.abs(new Date(b.cobro).getTime() - todayTime)
        );
      });
  }, [filteredCampaigns]);

  const paidCampaigns = useMemo(() => {
    return [...filteredCampaigns]
      .filter((c) => c.cobrado)
      .sort((a, b) => new Date(a.cobro).getTime() - new Date(b.cobro).getTime());
  }, [filteredCampaigns]);

  const monthlyData = useMemo(() => {
    return monthNames.map((month, index) => {
      const items = campaigns.filter((c) => parseMonth(c.cobro) === index);
      const total = items.reduce((acc, item) => acc + amountValue(item), 0);
      return { month: month.slice(0, 3), total, items };
    });
  }, [campaigns]);

  const totals = useMemo(() => {
    const totalGeneral = campaigns.reduce((acc, c) => acc + c.fee, 0);
    const totalYo = campaigns.reduce((acc, c) => acc + amountValue(c), 0);
    const totalPendiente = campaigns
      .filter((c) => !c.cobrado)
      .reduce((acc, c) => acc + amountValue(c), 0);
    const facturas = campaigns.filter((c) => c.facturaEnviada).length;
    return { totalGeneral, totalYo, totalPendiente, facturas };
  }, [campaigns]);

  const nextPending = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...campaigns]
      .filter((c) => !c.cobrado && !!c.cobro)
      .filter((c) => new Date(c.cobro).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.cobro).getTime() - new Date(b.cobro).getTime())[0];
  }, [campaigns]);

  // ─── Handlers del formulario ──────────────────────────────────────────────

  const openNewCampaign = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEditCampaign = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setForm({
      id: campaign.id,
      marca: campaign.marca,
      campana: campaign.campana === "-" ? "" : campaign.campana,
      contenidoItems: campaign.contenidoItems || createContenidoState(),
      publicacion: normalizeDateInput(campaign.publicacion),
      pagoA: campaign.pagoA,
      fee: String(campaign.fee),
      tipoCobro: campaign.tipoCobro || "cash",
      facturaEnviada: campaign.facturaEnviada,
      cobrado: campaign.cobrado,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.marca || !form.publicacion || !form.fee) return;
    const ok = await saveCampaign(form, editingId);
    if (ok) {
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
    } else {
      setErrorMsg("No pude guardar los cambios en Google Sheets.");
    }
  };

  const handleDeleteRequest = (id: number) => {
    setConfirmDelete(id);
  };

  const handleDeleteConfirm = async () => {
    if (confirmDelete === null) return;
    const ok = await deleteCampaign(confirmDelete);
    setConfirmDelete(null);
    if (!ok) setErrorMsg("No pude borrar la campaña en Google Sheets.");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ok = await importData(e);
    if (!ok) setErrorMsg("No pude importar ese archivo JSON.");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_35%,#eef2ff_100%)]">
        <p className="text-sm text-slate-500">Cargando campañas…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_35%,#eef2ff_100%)] p-4 text-slate-900 md:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex min-w-0 flex-col gap-4 rounded-[32px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:p-7"
        >
          <div>
            <p className="text-sm font-semibold tracking-wide text-emerald-600">ChivAPP</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              CONTROL DE CAMPAÑAS
            </h1>
            <p className="mt-1 text-sm text-slate-500">Toda la datita organizada</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {/* FIX: DialogTrigger con asChild evita button dentro de button */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openNewCampaign}
                  className="rounded-2xl bg-slate-900 px-5 py-6 text-sm font-medium text-white shadow-lg hover:bg-slate-800"
                >
                  <Plus className="mr-2 h-4 w-4" /> Nueva campaña
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border border-white/60 bg-white/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl text-slate-900">
                    {editingId ? "Editar campaña" : "Agregar campaña"}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid w-full min-w-0 grid-cols-1 gap-4 overflow-x-hidden py-2 md:grid-cols-2">
                  <Input
                    placeholder="Marca"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    className="rounded-2xl border-slate-200"
                  />
                  <Input
                    placeholder="Campaña"
                    value={form.campana}
                    onChange={(e) => setForm({ ...form, campana: e.target.value })}
                    className="rounded-2xl border-slate-200"
                  />

                  <ContentSelector
                    value={form.contenidoItems}
                    onChange={(contenidoItems) => setForm({ ...form, contenidoItems })}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500">Fecha de publicación</p>
                    <Input
                      type="date"
                      value={form.publicacion}
                      onChange={(e) => setForm({ ...form, publicacion: e.target.value })}
                      className="rounded-2xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500">Pago a (días)</p>
                    <Input
                      type="number"
                      value={form.pagoA}
                      onChange={(e) =>
                        setForm({ ...form, pagoA: Number(e.target.value || 0) })
                      }
                      className="rounded-2xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-medium text-slate-500">Fee</p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="5000000"
                      value={form.fee}
                      onChange={(e) =>
                        setForm({ ...form, fee: e.target.value.replace(/[^\d]/g, "") })
                      }
                      className="rounded-2xl border-slate-200"
                      autoComplete="off"
                    />
                  </div>

                  {/* Vista previa memoizada */}
                  <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4 text-sm md:col-span-2">
                    <p className="font-semibold text-slate-900">Vista previa</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div>
                        <span className="text-slate-500">YO:</span>{" "}
                        <span className="font-bold text-slate-900">{currency(previewYo)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">VP:</span>{" "}
                        <span className="font-bold text-slate-900">{currency(previewVp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500">Tipo de cobro</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={() => setForm({ ...form, tipoCobro: "cash" })}
                        className={`rounded-2xl border px-4 py-2 transition ${
                          form.tipoCobro === "cash"
                            ? "!border-slate-900 !bg-slate-900 !text-white hover:!bg-slate-900"
                            : "!border-slate-200 !bg-white !text-slate-900 hover:!bg-slate-50"
                        }`}
                      >
                        Cash
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setForm({ ...form, tipoCobro: "transferencia" })}
                        className={`rounded-2xl border px-4 py-2 transition ${
                          form.tipoCobro === "transferencia"
                            ? "!border-slate-900 !bg-slate-900 !text-white hover:!bg-slate-900"
                            : "!border-slate-200 !bg-white !text-slate-900 hover:!bg-slate-50"
                        }`}
                      >
                        Transferencia
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-sm text-slate-700">Factura enviada</span>
                    <Switch
                      checked={form.facturaEnviada}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, facturaEnviada: Boolean(checked) })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <span className="text-sm text-slate-700">Cobrado</span>
                    <Switch
                      checked={form.cobrado}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, cobrado: Boolean(checked) })
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                    className="rounded-2xl border-slate-200 px-6"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-2xl bg-slate-900 px-6 text-white hover:bg-slate-800"
                  >
                    {isSaving
                      ? "Guardando..."
                      : editingId
                      ? "Guardar cambios"
                      : "Guardar campaña"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPI title="Total General" value={currency(totals.totalGeneral)} hint="Campañas sin comisión" icon={CircleDollarSign} />
          <KPI title="Mi Total" value={currency(totals.totalYo)} hint="La del bolsillo" icon={Wallet} />
          <KPI title="Pendiente" value={currency(totals.totalPendiente)} hint="Campañas aún no cobradas" icon={CalendarDays} />
          <KPI title="Facturas enviadas" value={String(totals.facturas)} hint="Cantidad de campañas facturadas" icon={FileCheck} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-white/60 bg-white/80 p-1 shadow-sm backdrop-blur md:w-fit">
            <TabsTrigger value="dashboard" className="rounded-xl px-3 py-2 md:px-5">Dashboard</TabsTrigger>
            <TabsTrigger value="campanas" className="rounded-xl px-3 py-2 md:px-5">Campañas</TabsTrigger>
            <TabsTrigger value="calendario" className="rounded-xl px-3 py-2 md:px-5">Calendario</TabsTrigger>
          </TabsList>

          {/* Tab: Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Card className="rounded-[30px] border border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                    Ingresos por mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] md:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} />
                        <YAxis
                          tickFormatter={(v) => `${Math.round(v / 1000000)}M`}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip formatter={(value) => currency(Number(value))} />
                        <Bar dataKey="total" radius={[14, 14, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[30px] border border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">Próximo cobro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {nextPending ? (
                    <>
                      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
                        <p className="text-sm text-slate-500">Marca</p>
                        <p className="text-xl font-bold text-slate-900">{nextPending.marca}</p>
                        <p className="mt-3 text-sm text-slate-500">Fecha de cobro</p>
                        <p className="font-semibold text-slate-900">{formatDateAR(nextPending.cobro)}</p>
                        <p className="mt-3 text-sm text-slate-500">Monto</p>
                        <p className="font-semibold text-slate-900">{currency(amountValue(nextPending))}</p>
                        <p className="mt-3 text-sm text-slate-500">Contenido</p>
                        <p className="font-medium text-slate-800">{nextPending.contenido}</p>
                      </div>
                      <div><StatusBadge item={nextPending} /></div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No hay campañas pendientes.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Campañas */}
          <TabsContent value="campanas" className="space-y-6">
            <Card className="rounded-[30px] border border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por marca, campaña o contenido"
                      className="h-12 rounded-2xl border-slate-200 bg-white pl-11"
                    />
                  </div>

                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 md:w-[200px]"
                  >
                    <option value="all">Todos los meses</option>
                    {monthNames.map((month, index) => (
                      <option key={month} value={String(index)}>{month}</option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 md:w-[180px]"
                  >
                    <option value="all">Todos</option>
                    <option value="cobrado">Cobrado</option>
                    <option value="facturado">Factura enviada</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {upcomingCampaigns.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden rounded-[24px] border border-white/60 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur"
                  >
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{item.marca}</p>
                          <p className="text-sm text-slate-500">{item.campana}</p>
                        </div>
                        <StatusBadge item={item} />
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                        <div className="font-bold text-slate-900">
                          <span className="font-bold text-slate-900">YO:</span>{" "}
                          {currency(item.yoCash)}
                        </div>
                        <div className="font-bold text-slate-900">
                          <span className="font-bold text-slate-900">VP:</span>{" "}
                          {currency(item.vpCash)}
                        </div>
                        <div>
                          <span className="text-slate-500">Fee:</span> {currency(item.fee)}
                        </div>
                        <div>
                          <span className="text-slate-500">Pago a:</span> {item.pagoA} días
                        </div>
                        <div>
                          <span className="text-slate-500">Cobro:</span>{" "}
                          {formatDateAR(item.cobro)}
                        </div>
                        <div>
                          <span className="text-slate-500">Publicación:</span>{" "}
                          {formatDateAR(item.publicacion)}
                        </div>
                        <div>
                          <span className="text-slate-500">Cobro por:</span>{" "}
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              item.tipoCobro === "transferencia"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.tipoCobro === "transferencia" ? "Transferencia" : "Cash"}
                          </span>
                        </div>
                        <div className="md:col-span-3">
                          <span className="text-slate-500">Contenido:</span> {item.contenido}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3">
                          <span className="text-sm text-slate-700">Factura enviada</span>
                          <Switch
                            checked={item.facturaEnviada}
                            onCheckedChange={() => toggleFactura(item.id)}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3">
                          <span className="text-sm text-slate-700">Cobrado</span>
                          <Switch
                            checked={item.cobrado}
                            onCheckedChange={() => toggleCobrado(item.id)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl border-slate-200 bg-white"
                          onClick={() => openEditCampaign(item)}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-slate-200 bg-white"
                          onClick={() => handleDeleteRequest(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="pt-2">
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Cobradas
                  </p>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="space-y-3">
                  {paidCampaigns.length ? (
                    paidCampaigns.map((item) => (
                      <Card
                        key={item.id}
                        className="rounded-[20px] border border-slate-200 bg-slate-50/70 shadow-none"
                      >
                        <CardContent className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.marca}
                            </p>
                            <p className="truncate text-xs text-slate-500">{item.contenido}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">YO</p>
                              <p className="text-sm font-bold text-slate-900">
                                {currency(item.yoCash)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-slate-200 bg-white"
                              onClick={() => openEditCampaign(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Todavía no hay campañas cobradas.</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Calendario */}
          <TabsContent value="calendario" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {monthNames.map((month, index) => {
                const items = campaigns.filter((c) => parseMonth(c.cobro) === index);
                const total = items.reduce((acc, item) => acc + amountValue(item), 0);
                return (
                  <motion.div
                    key={month}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="h-full rounded-[30px] border border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-lg text-slate-900">{month}</CardTitle>
                          <Badge className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:bg-white">
                            {currency(total)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {items.length ? (
                          items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">{item.marca}</p>
                                  <p className="text-sm text-slate-500">
                                    {formatDateAR(item.cobro)}
                                  </p>
                                </div>
                                <StatusBadge item={item} />
                              </div>
                              <p className="mt-3 text-sm text-slate-500">{item.contenido}</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {currency(amountValue(item))}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Sin campañas cargadas.</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Respaldo */}
        <Card className="rounded-[30px] border border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Respaldo</h3>
              <p className="text-sm text-slate-500">
                Guardá o recuperá una copia manual de tus campañas.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImport}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-slate-200 bg-white/80"
              >
                <Upload className="mr-2 h-4 w-4" /> Importar
              </Button>
              <Button
                variant="outline"
                onClick={exportData}
                className="rounded-2xl border-slate-200 bg-white/80"
              >
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FIX: Diálogo de confirmación de borrado (reemplaza window.confirm) */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Borrar campaña"
        description="¿Querés borrar esta campaña? Esta acción no se puede deshacer."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* FIX: Toast de error inline (reemplaza window.alert) */}
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />
    </div>
  );
}
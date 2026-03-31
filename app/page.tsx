"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
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
  Wallet
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

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

const CONTENT_OPTIONS = [
  { key: "reel", label: "Reel", plural: "Reels" },
  { key: "story", label: "Story", plural: "Stories" },
  { key: "collab", label: "Collab", plural: "Collabs" },
  { key: "presencia", label: "Presencia", plural: "Presencias" },
  { key: "carrousel", label: "Carrousel", plural: "Carrousels" },
  { key: "tiktok", label: "TikTok", plural: "TikToks" }
] as const;

const buildContenido = (seleccion: ContenidoState) => {
  const parts = CONTENT_OPTIONS.filter(
    (option) => seleccion?.[option.key]?.checked
  ).map((option) => {
    const qty = Math.max(1, Number(seleccion?.[option.key]?.qty || 1));
    return `${qty} ${qty === 1 ? option.label : option.plural}`;
  });
  return parts.length ? parts.join(" + ") : "-";
};

const createContenidoState = (
  selectedKeys: Partial<Record<string, Partial<ContenidoItem>>> = {}
): ContenidoState => {
  return CONTENT_OPTIONS.reduce((acc, option) => {
    const current = selectedKeys[option.key] || {};
    acc[option.key] = {
      checked: Boolean(current.checked),
      qty: current.qty || 1
    };
    return acc;
  }, {} as ContenidoState);
};

const initialCampaigns: Campaign[] = [
  {
    id: 1,
    marca: "VICHY",
    campana: "-",
    contenidoItems: createContenidoState({
      reel: { checked: true, qty: 2 },
      tiktok: { checked: true, qty: 2 },
      story: { checked: true, qty: 1 }
    }),
    contenido: "2 Reels + 2 TikToks + 1 Story",
    publicacion: "2025-12-29",
    pagoA: 60,
    cobro: "2026-02-27",
    fee: 6000000,
    tipoCobro: "cash",
    yoCash: 4548000,
    vpCash: 1452000,
    ivaVane: 0,
    yoMasIva: 0,
    facturaEnviada: true,
    cobrado: true
  },
  {
    id: 2,
    marca: "OSDE",
    campana: "FLUX",
    contenidoItems: createContenidoState({
      reel: { checked: true, qty: 1 },
      collab: { checked: true, qty: 1 }
    }),
    contenido: "1 Reel + 1 Collab",
    publicacion: "2026-01-31",
    pagoA: 45,
    cobro: "2026-03-17",
    fee: 1750000,
    tipoCobro: "transferencia",
    yoCash: 1400000,
    vpCash: 350000,
    ivaVane: 423500,
    yoMasIva: 1326500,
    facturaEnviada: true,
    cobrado: true
  },
  {
    id: 3,
    marca: "APEROL",
    campana: "Verano",
    contenidoItems: createContenidoState({
      reel: { checked: true, qty: 1 },
      story: { checked: true, qty: 2 }
    }),
    contenido: "1 Reel + 2 Stories",
    publicacion: "2026-02-10",
    pagoA: 30,
    cobro: "2026-03-28",
    fee: 4000000,
    tipoCobro: "cash",
    yoCash: 3200000,
    vpCash: 800000,
    ivaVane: 0,
    yoMasIva: 0,
    facturaEnviada: false,
    cobrado: false
  }
];

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

const currency = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value || 0);

const parseMonth = (dateString: string) => new Date(dateString).getMonth();

const statusBadge = (item: Campaign) => {
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
};

const amountValue = (item: Campaign) =>
  item.tipoCobro === "transferencia" ? item.yoMasIva : item.yoCash;

function KPI({
  title,
  value,
  icon: Icon,
  hint
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
  onChange
}: {
  value: ContenidoState;
  onChange: (next: ContenidoState) => void;
}) {
  const updateItem = (key: string, patch: Partial<ContenidoItem>) => {
    onChange({
      ...value,
      [key]: {
        ...value[key],
        ...patch
      }
    });
  };

  return (
    <div className="space-y-3 md:col-span-2">
      <p className="text-sm font-medium text-slate-500">Contenido</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {CONTENT_OPTIONS.map((option) => {
          const current = value[option.key];
          return (
            <div
              key={option.key}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={current.checked}
                  onCheckedChange={(checked) =>
                    updateItem(option.key, { checked: Boolean(checked) })
                  }
                />
                <span className="text-sm font-medium text-slate-800">
                  {option.label}
                </span>
              </div>
              <Input
                type="number"
                min={1}
                value={current.qty}
                onChange={(e) =>
                  updateItem(option.key, {
                    qty: Math.max(1, Number(e.target.value || 1))
                  })
                }
                className="w-20 rounded-xl border-slate-200"
                disabled={!current.checked}
              />
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

const STORAGE_KEY = "chivapp-data-v1";

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
  cobrado: false
};

export default function Page() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    if (typeof window === "undefined") return initialCampaigns;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialCampaigns;
    } catch {
      return initialCampaigns;
    }
  });

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const textOk = [c.marca, c.campana, c.contenido]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const monthOk =
        monthFilter === "all" ? true : String(parseMonth(c.cobro)) === monthFilter;

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
    return [...campaigns]
      .filter((c) => !c.cobrado)
      .sort((a, b) => new Date(a.cobro).getTime() - new Date(b.cobro).getTime())[0];
  }, [campaigns]);

  const toggleFactura = (id: number) =>
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, facturaEnviada: !c.facturaEnviada } : c
      )
    );

  const toggleCobrado = (id: number) =>
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, cobrado: !c.cobrado } : c))
    );

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
      publicacion: campaign.publicacion,
      pagoA: campaign.pagoA,
      fee: String(campaign.fee),
      tipoCobro: campaign.tipoCobro || "cash",
      facturaEnviada: campaign.facturaEnviada,
      cobrado: campaign.cobrado
    });
    setOpen(true);
  };

  const deleteCampaign = (campaignId: number) => {
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("¿Querés borrar esta campaña?");
    if (!confirmed) return;
    setCampaigns((prev) => prev.filter((item) => item.id !== campaignId));
  };

  const saveCampaign = () => {
    if (!form.marca || !form.publicacion || !form.fee) return;

    const publicationDate = new Date(form.publicacion);
    const cobroDate = new Date(publicationDate);
    cobroDate.setDate(cobroDate.getDate() + Number(form.pagoA || 0));

    const fee = Number(form.fee);
    const yoCash = Math.round(fee * 0.758);
    const vpCash = fee - yoCash;
    const esTransferencia = form.tipoCobro === "transferencia";
    const ivaVane = esTransferencia ? Math.round(vpCash * 1.21) : 0;
    const yoMasIva = esTransferencia ? Math.round(yoCash * 0.9475) : 0;
    const contenido = buildContenido(form.contenidoItems);

    const payload: Campaign = {
      id: editingId || Date.now(),
      marca: form.marca,
      campana: form.campana || "-",
      contenidoItems: form.contenidoItems,
      contenido,
      publicacion: form.publicacion,
      pagoA: Number(form.pagoA || 0),
      cobro: cobroDate.toISOString().slice(0, 10),
      fee,
      tipoCobro: form.tipoCobro,
      yoCash,
      vpCash,
      ivaVane,
      yoMasIva,
      facturaEnviada: form.facturaEnviada,
      cobrado: form.cobrado
    };

    if (editingId) {
      setCampaigns((prev) =>
        prev.map((item) => (item.id === editingId ? payload : item))
      );
    } else {
      setCampaigns((prev) => [payload, ...prev]);
    }

    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  };

  const exportData = () => {
    if (typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(campaigns, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chivapp-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Formato inválido");
      setCampaigns(parsed);
    } catch {
      if (typeof window !== "undefined") {
        window.alert("No pude importar ese archivo JSON.");
      }
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_35%,#eef2ff_100%)] p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-4 rounded-[32px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:p-7"
        >
          <div>
            <p className="text-sm font-semibold tracking-wide text-emerald-600">
              ChivAPP
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              CONTROL DE CAMPAÑAS
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Toda la datita organizada
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={importData}
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

            <Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger>
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

    <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
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
          onChange={(e) => setForm({ ...form, pagoA: Number(e.target.value || 0) })}
          className="rounded-2xl border-slate-200"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <p className="text-sm font-medium text-slate-500">Fee</p>
        <Input
          type="number"
          placeholder="6000000"
          value={form.fee}
          onChange={(e) => setForm({ ...form, fee: e.target.value })}
          className="rounded-2xl border-slate-200"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Tipo de cobro</p>
        <Select
  value={form.tipoCobro}
  onValueChange={(tipoCobro) =>
    setForm({ ...form, tipoCobro: tipoCobro as "cash" | "transferencia" })
  }
>
          <SelectTrigger className="rounded-2xl border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="transferencia">Transferencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <span className="text-sm text-slate-700">Factura enviada</span>
        <Switch
          checked={form.facturaEnviada}
          onCheckedChange={(checked) =>
            setForm({
              ...form,
              facturaEnviada: Boolean(checked),
            })
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
        onClick={saveCampaign}
        className="rounded-2xl bg-slate-900 px-6 text-white hover:bg-slate-800"
      >
        {editingId ? "Guardar cambios" : "Guardar campaña"}
      </Button>
    </div>
  </DialogContent>
</Dialog>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPI
            title="Total General"
            value={currency(totals.totalGeneral)}
            hint="Campañas sin comisión"
            icon={CircleDollarSign}
          />
          <KPI
            title="Mi Total"
            value={currency(totals.totalYo)}
            hint="La del bolsillo"
            icon={Wallet}
          />
          <KPI
            title="Pendiente"
            value={currency(totals.totalPendiente)}
            hint="Campañas aún no cobradas"
            icon={CalendarDays}
          />
          <KPI
            title="Facturas enviadas"
            value={String(totals.facturas)}
            hint="Cantidad de campañas facturadas"
            icon={FileCheck}
          />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-white/60 bg-white/80 p-1 shadow-sm backdrop-blur md:w-fit">
            <TabsTrigger value="dashboard" className="rounded-xl px-3 py-2 md:px-5">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="campanas" className="rounded-xl px-3 py-2 md:px-5">
              Campañas
            </TabsTrigger>
            <TabsTrigger value="calendario" className="rounded-xl px-3 py-2 md:px-5">
              Calendario
            </TabsTrigger>
          </TabsList>

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
                        <p className="font-semibold text-slate-900">
                          {new Date(nextPending.cobro).toLocaleDateString("es-AR")}
                        </p>
                        <p className="mt-3 text-sm text-slate-500">Monto</p>
                        <p className="font-semibold text-slate-900">
                          {currency(amountValue(nextPending))}
                        </p>
                        <p className="mt-3 text-sm text-slate-500">Contenido</p>
                        <p className="font-medium text-slate-800">{nextPending.contenido}</p>
                      </div>
                      <div>{statusBadge(nextPending)}</div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No hay campañas pendientes.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campanas" className="space-y-6">
            <Card className="rounded-[30px] border border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por marca, campaña o contenido"
                      className="rounded-2xl border-slate-200 bg-white pl-10"
                    />
                  </div>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-full rounded-2xl border-slate-200 bg-white md:w-[180px]">
                     <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los meses</SelectItem>
                      {monthNames.map((month, index) => (
                        <SelectItem key={month} value={String(index)}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full rounded-2xl border-slate-200 bg-white md:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="cobrado">Cobrado</SelectItem>
                      <SelectItem value="facturado">Factura enviada</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              {filteredCampaigns.map((item) => (
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
                      {statusBadge(item)}
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
  <div className="font-bold text-slate-900">
    <span className="font-bold text-slate-900">YO:</span> {currency(amountValue(item))}
  </div>
  <div>
    <span className="text-slate-500">
      {item.tipoCobro === "transferencia" ? "VP + IVA:" : "VP Cash:"}
    </span>{" "}
    {currency(item.tipoCobro === "transferencia" ? item.ivaVane : item.vpCash)}
  </div>
  <div>
    <span className="text-slate-500">Fee:</span> {currency(item.fee)}
  </div>
  <div>
    <span className="text-slate-500">Pago a:</span> {item.pagoA} días
  </div>
  <div>
    <span className="text-slate-500">Cobro:</span> {new Date(item.cobro).toLocaleDateString("es-AR")}
  </div>
  <div>
    <span className="text-slate-500">Publicación:</span> {new Date(item.publicacion).toLocaleDateString("es-AR")}
  </div>
  <div>
    <span className="text-slate-500">Cobro por:</span> {item.tipoCobro === "transferencia" ? "Transferencia" : "Cash"}
  </div>
  <div className="md:col-span-3">
    <span className="text-slate-500">Contenido:</span> {item.contenido}
  </div>
</div>

                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-700">Factura</span>
                        <Switch
                          checked={item.facturaEnviada}
                          onCheckedChange={() => toggleFactura(item.id)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
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
                        onClick={() => deleteCampaign(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calendario" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {monthNames.map((month, index) => {
                const items = campaigns.filter((c) => parseMonth(c.cobro) === index);
                const total = items.reduce((acc, item) => acc + amountValue(item), 0);
                return (
                  <motion.div key={month} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
                            <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">{item.marca}</p>
                                  <p className="text-sm text-slate-500">
                                    {new Date(item.cobro).toLocaleDateString("es-AR")}
                                  </p>
                                </div>
                                {statusBadge(item)}
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
      </div>
    </div>
  );
}
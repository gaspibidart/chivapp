import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwPBc-M2HY6XmvGapLHlt2e7auSxq-Sjc7HmAdTq1NHiMnX8AwLj_he4rk5zezeuBt9mw/exec";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type CampaignBody = {
  id?: string | number;
  marca?: string;
  campana?: string;
  contenido?: string;
  contenidoItems?: unknown;
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
  facturaFecha?: string;
  cobrado?: boolean | string;
  pagadoVane?: boolean | string;
};

// ─── Helper: construye URL de Apps Script para crear/editar ──────────────────

function buildCampaignUrl(action: "create" | "update", body: CampaignBody): string {
  // FIX: contenidoItems no se estaba mandando a Apps Script, por eso el popup
  // de edición aparecía siempre vacío (todo destildado en 1). Se manda como
  // JSON string y se guarda tal cual en una columna de la Sheet.
  const contenidoItemsJson = (() => {
    try {
      return JSON.stringify(body.contenidoItems ?? {});
    } catch {
      return "{}";
    }
  })();

  return (
    `${APPS_SCRIPT_URL}?action=${action}` +
    `&id=${encodeURIComponent(String(body.id ?? ""))}` +
    `&marca=${encodeURIComponent(String(body.marca ?? ""))}` +
    `&campana=${encodeURIComponent(String(body.campana ?? ""))}` +
    `&contenido=${encodeURIComponent(String(body.contenido ?? ""))}` +
    `&contenidoItems=${encodeURIComponent(contenidoItemsJson)}` +
    `&publicacion=${encodeURIComponent(String(body.publicacion ?? ""))}` +
    `&pagoA=${encodeURIComponent(String(body.pagoA ?? ""))}` +
    `&cobro=${encodeURIComponent(String(body.cobro ?? ""))}` +
    `&fee=${encodeURIComponent(String(body.fee ?? ""))}` +
    `&tipoCobro=${encodeURIComponent(String(body.tipoCobro ?? ""))}` +
    `&yoCash=${encodeURIComponent(String(body.yoCash ?? ""))}` +
    `&vpCash=${encodeURIComponent(String(body.vpCash ?? ""))}` +
    `&ivaVane=${encodeURIComponent(String(body.ivaVane ?? ""))}` +
    `&yoMasIva=${encodeURIComponent(String(body.yoMasIva ?? ""))}` +
    `&facturaEnviada=${encodeURIComponent(String(body.facturaEnviada ?? false))}` +
    `&facturaFecha=${encodeURIComponent(String(body.facturaFecha ?? ""))}` +
    `&cobrado=${encodeURIComponent(String(body.cobrado ?? false))}` +
    `&pagadoVane=${encodeURIComponent(String(body.pagadoVane ?? false))}`
  );
}

// ─── GET: listar campañas ─────────────────────────────────────────────────────

export async function GET() {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET campaigns error:", error);
    return NextResponse.json(
      { error: "No pude leer campañas desde Google Sheets" },
      { status: 500 }
    );
  }
}

// ─── POST: crear campaña ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: CampaignBody = await req.json();
    const createUrl = buildCampaignUrl("create", body);

    const response = await fetch(createUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST campaigns error:", error);
    return NextResponse.json(
      { error: "No pude guardar la campaña en Google Sheets" },
      { status: 500 }
    );
  }
}

// ─── PUT: editar campaña (sin borrar primero) ─────────────────────────────────
// Esto reemplaza el patrón inseguro de DELETE + POST que usaba el frontend.
// Si tu Apps Script no soporta action=update todavía, podés cambiarlo a
// action=create y va a sobreescribir la fila con el mismo id.

export async function PUT(req: NextRequest) {
  try {
    const body: CampaignBody = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Falta el id de la campaña a editar" },
        { status: 400 }
      );
    }

    const updateUrl = buildCampaignUrl("update", body);

    const response = await fetch(updateUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT campaigns error:", error);
    return NextResponse.json(
      { error: "No pude editar la campaña en Google Sheets" },
      { status: 500 }
    );
  }
}

// ─── DELETE: borrar campaña ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Falta el id de la campaña a borrar" },
        { status: 400 }
      );
    }

    const deleteUrl = `${APPS_SCRIPT_URL}?action=delete&id=${encodeURIComponent(String(body.id))}`;

    const response = await fetch(deleteUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("DELETE campaigns error:", error);
    return NextResponse.json(
      { error: "No pude borrar la campaña en Google Sheets" },
      { status: 500 }
    );
  }
}

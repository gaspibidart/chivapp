import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwPBc-M2HY6XmvGapLHlt2e7auSxq-Sjc7HmAdTq1NHiMnX8AwLj_he4rk5zezeuBt9mw/exec";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type LuzuBody = {
  id?: string | number;
  evento?: string;
  cantidad?: string | number;
  fechas?: unknown;
  valores?: unknown;
  programa?: string;
  facturaEnviada?: boolean | string;
  facturaFecha?: string;
  cobrado?: boolean | string;
};

// ─── Helper: construye URL de Apps Script para crear/editar ──────────────────

function buildLuzuUrl(action: "create" | "update", body: LuzuBody): string {
  const fechasJson = (() => {
    try {
      return JSON.stringify(body.fechas ?? []);
    } catch {
      return "[]";
    }
  })();

  const valoresJson = (() => {
    try {
      return JSON.stringify(body.valores ?? []);
    } catch {
      return "[]";
    }
  })();

  return (
    `${APPS_SCRIPT_URL}?action=${action}` +
    `&board=luzu` +
    `&id=${encodeURIComponent(String(body.id ?? ""))}` +
    `&evento=${encodeURIComponent(String(body.evento ?? ""))}` +
    `&cantidad=${encodeURIComponent(String(body.cantidad ?? 1))}` +
    `&fechas=${encodeURIComponent(fechasJson)}` +
    `&valores=${encodeURIComponent(valoresJson)}` +
    `&programa=${encodeURIComponent(String(body.programa ?? ""))}` +
    `&facturaEnviada=${encodeURIComponent(String(body.facturaEnviada ?? false))}` +
    `&facturaFecha=${encodeURIComponent(String(body.facturaFecha ?? ""))}` +
    `&cobrado=${encodeURIComponent(String(body.cobrado ?? false))}`
  );
}

// ─── GET: listar eventos de Luzu ──────────────────────────────────────────────

export async function GET() {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?board=luzu`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET luzu error:", error);
    return NextResponse.json(
      { error: "No pude leer eventos de Luzu desde Google Sheets" },
      { status: 500 }
    );
  }
}

// ─── POST: crear evento ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: LuzuBody = await req.json();
    const createUrl = buildLuzuUrl("create", body);

    const response = await fetch(createUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST luzu error:", error);
    return NextResponse.json(
      { error: "No pude guardar el evento en Google Sheets" },
      { status: 500 }
    );
  }
}

// ─── PUT: editar evento ─────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const body: LuzuBody = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Falta el id del evento a editar" },
        { status: 400 }
      );
    }

    const updateUrl = buildLuzuUrl("update", body);

    const response = await fetch(updateUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT luzu error:", error);
    return NextResponse.json(
      { error: "No pude editar el evento en Google Sheets" },
      { status: 500 }
    );
  }
}

// ─── DELETE: borrar evento ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Falta el id del evento a borrar" },
        { status: 400 }
      );
    }

    const deleteUrl = `${APPS_SCRIPT_URL}?action=delete&id=${encodeURIComponent(String(body.id))}&board=luzu`;

    const response = await fetch(deleteUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("DELETE luzu error:", error);
    return NextResponse.json(
      { error: "No pude borrar el evento en Google Sheets" },
      { status: 500 }
    );
  }
}

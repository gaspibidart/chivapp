import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwPBc-M2HY6XmvGapLHlt2e7auSxq-Sjc7HmAdTq1NHiMnX8AwLj_he4rk5zezeuBt9mw/exec";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (action === "delete" && id) {
      const deleteUrl = `${APPS_SCRIPT_URL}?action=delete&id=${encodeURIComponent(id)}`;

      const response = await fetch(deleteUrl, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();
      return NextResponse.json(data);
    }

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const createUrl =
      `${APPS_SCRIPT_URL}?action=create` +
      `&id=${encodeURIComponent(String(body.id ?? ""))}` +
      `&marca=${encodeURIComponent(String(body.marca ?? ""))}` +
      `&campana=${encodeURIComponent(String(body.campana ?? ""))}` +
      `&contenido=${encodeURIComponent(String(body.contenido ?? ""))}` +
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
      `&cobrado=${encodeURIComponent(String(body.cobrado ?? false))}`;

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

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
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
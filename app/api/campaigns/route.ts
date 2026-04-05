import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwPBc-M2HY6XmvGapLHlt2e7auSxq-Sjc7HmAdTq1NHiMnX8AwLj_he4rk5zezeuBt9mw/exec";

async function postToAppsScript(body: unknown) {
  // 1) pedir la redirección real
  const redirectResponse = await fetch(APPS_SCRIPT_URL, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
  });

  const redirectUrl = redirectResponse.headers.get("location");

  if (!redirectUrl) {
    throw new Error("No pude obtener la URL final de Apps Script");
  }

  // 2) hacer el POST real a la URL final
  const response = await fetch(redirectUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Respuesta inválida de Apps Script: ${text}`);
  }
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await postToAppsScript(body);
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

    const data = await postToAppsScript({
      action: "delete",
      id: body.id,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("DELETE campaigns error:", error);
    return NextResponse.json(
      { error: "No pude borrar la campaña en Google Sheets" },
      { status: 500 }
    );
  }
}
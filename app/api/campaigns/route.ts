import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw05iSn3YzkF4X_G3W8zo-vkjzjL000ColpKoWmsgh8OgJ96M0J8Zop9hQxnPcGJkwjbA/exec";

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

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(body),
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
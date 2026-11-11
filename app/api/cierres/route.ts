import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwPBc-M2HY6XmvGapLHlt2e7auSxq-Sjc7HmAdTq1NHiMnX8AwLj_he4rk5zezeuBt9mw/exec";

type Body = { board?: string; year?: number | string };

const validBoard = (b: unknown): b is "chivos" | "luzu" => b === "chivos" || b === "luzu";

// GET /api/cierres?board=chivos → [{ board, year, fechaCierre }, ...]
export async function GET(req: NextRequest) {
  try {
    const board = req.nextUrl.searchParams.get("board");
    const response = await fetch(`${APPS_SCRIPT_URL}?board=cierres`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    return NextResponse.json(board ? rows.filter((r) => String(r.board) === board) : rows);
  } catch (error) {
    console.error("GET cierres error:", error);
    return NextResponse.json({ error: "No pude leer los cierres de año" }, { status: 500 });
  }
}

// POST { board, year } → cierra el año
export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const year = Number(body.year);
    if (!validBoard(body.board) || !year) {
      return NextResponse.json({ error: "Faltan board o year" }, { status: 400 });
    }
    const fechaCierre = new Date().toISOString().slice(0, 10);
    const url =
      `${APPS_SCRIPT_URL}?action=create&board=cierres` +
      `&cierreBoard=${encodeURIComponent(body.board)}` +
      `&year=${year}` +
      `&fechaCierre=${encodeURIComponent(fechaCierre)}`;
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("POST cierres error:", error);
    return NextResponse.json({ error: "No pude guardar el cierre de año" }, { status: 500 });
  }
}

// DELETE { board, year } → reabre el año
export async function DELETE(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const year = Number(body.year);
    if (!validBoard(body.board) || !year) {
      return NextResponse.json({ error: "Faltan board o year" }, { status: 400 });
    }
    const url =
      `${APPS_SCRIPT_URL}?action=delete&board=cierres` +
      `&id=${encodeURIComponent(`${body.board}-${year}`)}`;
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("DELETE cierres error:", error);
    return NextResponse.json({ error: "No pude reabrir el año" }, { status: 500 });
  }
}

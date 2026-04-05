import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwPBc-M2HY6XmvGapLHlt2e7auSxq-Sjc7HmAdTq1NHiMnX8AwLj_he4rk5zezeuBt9mw/exec";

const APPS_SCRIPT_POST_URL =
  "https://script.googleusercontent.com/macros/echo?user_content_key=AWDtjMXkEoc-byM_i4vjw9APLQpKo9fNseM9sCMqVhos5rC1RxTf9pMI_tW2fh7KtCbr84qSxnRKQjd8qtwByVWpiWPimuEnTZNIvf2F820du7se3VKW1rMhH-sydEyvH-Lry5DnDp1lBExR9leqXKF6UuJUQ3U18hBYxOZLxxgjmI3YyFxS7zoPL3AtqA3mWvtI5QEEUXZ3DAg-Yyo-NCSrVhQkTVFKC-vB_ydJDLtgux4I-dUpS8muZSQ58p8XLgZU3fu_hZv7vUxJ-9ctUpDB1nfNXAymTA&lib=MLwR_M0ABVexssjGY4wX-Gx7TmTV2uI6Z";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (action === "delete" && id) {
      const deleteUrl = `${APPS_SCRIPT_URL}?action=delete&id=${id}`;

      const response = await fetch(deleteUrl, {
        method: "GET",
        cache: "no-store",
      });

      const text = await response.text();

      try {
        return NextResponse.json(JSON.parse(text));
      } catch {
        return NextResponse.json({
          success: text === "true" || text === "ok" || !!text,
        });
      }
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

    const response = await fetch(APPS_SCRIPT_POST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({
        success: text === "true" || text === "ok" || !!text,
      });
    }
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
    const deleteUrl = `${APPS_SCRIPT_URL}?action=delete&id=${body.id}`;

    const response = await fetch(deleteUrl, {
      method: "GET",
      cache: "no-store",
    });

    const text = await response.text();

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({
        success: text === "true" || text === "ok" || !!text,
      });
    }
  } catch (error) {
    console.error("DELETE campaigns error:", error);
    return NextResponse.json(
      { error: "No pude borrar la campaña en Google Sheets" },
      { status: 500 }
    );
  }
}
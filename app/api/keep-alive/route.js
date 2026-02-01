import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // OJO: revisa nota abajo

export async function GET() {
  try {
    // Query mínima para "tocar" la DB (cuenta como actividad en Supabase)
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      message: "DB keep-alive ok",
      ts: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "DB keep-alive failed" },
      { status: 500 }
    );
  }
}

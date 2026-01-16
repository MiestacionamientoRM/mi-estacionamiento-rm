import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../lib/prisma";

function cleanPepper(raw) {
  return raw?.trim().replace(/^"(.*)"$/, "$1");
}

export async function POST(req) {
  try {
    const body = await req.json();

    const plazaId = Number(body.plazaId ?? 1);
    const plate = String(body.plate ?? "").trim() || null;
    const level = body.level != null && body.level !== "" ? Number(body.level) : null;
    const color = body.color != null ? String(body.color) : null;

    if (!Number.isFinite(plazaId)) {
      return NextResponse.json({ error: "plazaId inválido" }, { status: 400 });
    }

    const pepper = cleanPepper(process.env.TOKEN_PEPPER);
    if (!pepper) {
      return NextResponse.json({ error: "Falta TOKEN_PEPPER" }, { status: 500 });
    }

    // 1) Crear ticket
    const ticket = await prisma.ticket.create({
      data: {
        plazaId,
        plate,
        level,
        color,
        entryTime: new Date(),
      },
    });

    // 2) Token plano + hash
    const plainToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(plainToken + pepper)
      .digest("hex");

    // 3) Expira en 24h
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.ticketToken.create({
      data: { ticketId: ticket.id, tokenHash, expiresAt },
    });

    // 4) URL QR (usa tu dominio actual)
    const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://mi-estacionamiento-rm.vercel.app";

    const qrUrl = `${baseUrl}/ticket/${plainToken}`;

    return NextResponse.json({
      ok: true,
      ticketId: ticket.id,
      qrUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

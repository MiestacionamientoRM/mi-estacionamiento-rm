import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/adminAuth"; // o tu helper actual

export async function POST(req) {
  try {
    // 1) auth
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // 2) body
    const body = await req.json();
    const ticketId = Number(body.ticketId);
    const exitGate = body.exitGate ? String(body.exitGate).trim() : "Salida Admin";

    if (!Number.isFinite(ticketId)) {
      return NextResponse.json({ ok: false, error: "ticketId inválido" }, { status: 400 });
    }

    // 3) buscar ticket
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ ok: false, error: "Ticket no existe" }, { status: 404 });

    // 4) si ya está cerrado, responder sin romper
    if (ticket.exitTime) {
      return NextResponse.json({
        ok: true,
        alreadyClosed: true,
        ticketId: ticket.id,
        exitTime: ticket.exitTime,
        finalAmount: ticket.finalAmount ?? 0,
        status: ticket.status ?? "CLOSED",
      });
    }

    // 5) cerrar (mínimo: set exitTime, exitGate, status)
    const now = new Date();
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        exitTime: now,
        exitGate,
        status: "CLOSED",
      },
    });

    // 6) revocar tokens para que el QR muera
    await prisma.ticketToken.updateMany({
      where: { ticketId, revokedAt: null },
      data: { revokedAt: now },
    });

    return NextResponse.json({
      ok: true,
      ticketId: updated.id,
      exitTime: updated.exitTime,
      status: updated.status,
      exitGate: updated.exitGate,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

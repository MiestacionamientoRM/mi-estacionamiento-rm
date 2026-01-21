import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/adminAuth";

function minutesDiff(from, to) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

function calcFinalMxN({ entryTime, now, tariff }) {
  const mins = minutesDiff(new Date(entryTime), now);

  const tolerance = tariff?.toleranceMin ?? 0;
  const firstHourPrice = tariff?.firstHourPrice ?? 0;
  const fractionMin = tariff?.fractionMin ?? 15;
  const fractionPrice = tariff?.fractionPrice ?? 0;
  const dailyCap = tariff?.dailyCap ?? null;

  if (mins <= tolerance) return { mins, chargeableMins: 0, total: 0 };

  const chargeable = mins - tolerance;
  let total = 0;

  // primera hora
  if (chargeable > 0) total += firstHourPrice;

  // fracciones después de 60 min
  if (chargeable > 60) {
    const extra = chargeable - 60;
    const fractions = Math.ceil(extra / fractionMin);
    total += fractions * fractionPrice;
  }

  if (dailyCap != null) total = Math.min(total, dailyCap);

  return { mins, chargeableMins: chargeable, total };
}

export async function POST(req) {
  // 🔒 solo admin
  const guard = requireAdmin(req);
  if (guard) return guard;

  try {
    const body = await req.json();
    const ticketId = Number(body.ticketId);
    const exitGate = body.exitGate != null ? String(body.exitGate).trim() : null;

    if (!Number.isFinite(ticketId)) {
      return NextResponse.json({ error: "ticketId inválido" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { plaza: { include: { tariffConfig: true } } },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket no existe" }, { status: 404 });
    }

    // Si ya estaba cerrado, opcionalmente backfill de exitGate
    if (ticket.exitTime) {
      if (exitGate && !ticket.exitGate) {
        const updatedClosed = await prisma.ticket.update({
          where: { id: ticketId },
          data: { exitGate },
        });

        return NextResponse.json({
          ok: true,
          alreadyClosed: true,
          updatedExitGate: true,
          ticketId: updatedClosed.id,
          exitTime: updatedClosed.exitTime,
          finalAmount: updatedClosed.finalAmount ?? null,
          exitGate: updatedClosed.exitGate ?? null,
        });
      }

      return NextResponse.json({
        ok: true,
        alreadyClosed: true,
        ticketId: ticket.id,
        exitTime: ticket.exitTime,
        finalAmount: ticket.finalAmount ?? null,
        exitGate: ticket.exitGate ?? null,
      });
    }

    const now = new Date();
    const tariff = ticket.plaza?.tariffConfig;

    const { mins, chargeableMins, total } = calcFinalMxN({
      entryTime: ticket.entryTime,
      now,
      tariff,
    });

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        exitTime: now,
        exitGate,
        totalMins: mins,
        chargeableMins,
        finalAmount: total,
        status: "CLOSED",
      },
    });

    // Revoca tokens del ticket (QR deja de servir)
    await prisma.ticketToken.updateMany({
      where: { ticketId: updated.id, revokedAt: null },
      data: { revokedAt: now },
    });

    return NextResponse.json({
      ok: true,
      ticketId: updated.id,
      mins,
      chargeableMins,
      finalAmount: total,
      currency: tariff?.currency ?? "MXN",
      exitTime: now.toISOString(),
      exitGate: updated.exitGate ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

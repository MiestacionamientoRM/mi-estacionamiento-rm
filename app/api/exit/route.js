import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

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

  if (chargeable > 0) total += firstHourPrice;

  if (chargeable > 60) {
    const extra = chargeable - 60;
    const fractions = Math.ceil(extra / fractionMin);
    total += fractions * fractionPrice;
  }

  if (dailyCap != null) total = Math.min(total, dailyCap);

  return { mins, chargeableMins: chargeable, total };
}

export async function POST(req) {
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

    const tariff = ticket.plaza?.tariffConfig;

    // ✅ Si ya está cerrado: devolvemos histórico completo
    // (y si mandan exitGate y no existe, lo “backfill”)
    if (ticket.exitTime) {
      let t = ticket;

      if (exitGate && !ticket.exitGate) {
        t = await prisma.ticket.update({
          where: { id: ticketId },
          data: { exitGate },
          include: { plaza: { include: { tariffConfig: true } } },
        });
      }

      return NextResponse.json({
        ok: true,
        alreadyClosed: true,
        ticket: {
          id: t.id,
          status: t.status ?? "CLOSED",
          plazaId: t.plazaId,
          plate: t.plate,
          level: t.level,
          color: t.color,
          entryGate: t.entryGate ?? null,
          exitGate: t.exitGate ?? null,
          entryTime: t.entryTime?.toISOString?.() ?? t.entryTime,
          exitTime: t.exitTime?.toISOString?.() ?? t.exitTime,
          totalMins: t.totalMins ?? null,
          chargeableMins: t.chargeableMins ?? null,
          finalAmount: t.finalAmount ?? null,
          currency: t.plaza?.tariffConfig?.currency ?? "MXN",
        },
      });
    }

    // ✅ Cerrar ticket (primera vez)
    const now = new Date();

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
      include: { plaza: { include: { tariffConfig: true } } },
    });

    // ✅ Revocar tokens ligados (QR ya no sirve)
    await prisma.ticketToken.updateMany({
      where: { ticketId: updated.id, revokedAt: null },
      data: { revokedAt: now },
    });

    return NextResponse.json({
      ok: true,
      ticket: {
        id: updated.id,
        status: updated.status ?? "CLOSED",
        plazaId: updated.plazaId,
        plate: updated.plate,
        level: updated.level,
        color: updated.color,
        entryGate: updated.entryGate ?? null,
        exitGate: updated.exitGate ?? null,
        entryTime: updated.entryTime?.toISOString?.() ?? updated.entryTime,
        exitTime: updated.exitTime?.toISOString?.() ?? updated.exitTime,
        totalMins: updated.totalMins ?? mins,
        chargeableMins: updated.chargeableMins ?? chargeableMins,
        finalAmount: updated.finalAmount ?? total,
        currency: updated.plaza?.tariffConfig?.currency ?? "MXN",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

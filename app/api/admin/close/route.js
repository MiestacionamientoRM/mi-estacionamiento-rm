import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";

function minutesDiff(from, to) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

function calcBreakdown({ entryTime, now, tariff }) {
  const mins = minutesDiff(new Date(entryTime), now);

  const toleranceMin = tariff?.toleranceMin ?? 0;
  const firstHourPrice = tariff?.firstHourPrice ?? 0;
  const fractionMin = tariff?.fractionMin ?? 15;
  const fractionPrice = tariff?.fractionPrice ?? 0;
  const dailyCap = tariff?.dailyCap ?? null;
  const currency = tariff?.currency ?? "MXN";

  // Dentro de tolerancia
  if (mins <= toleranceMin) {
    return {
      mins,
      chargeableMins: 0,
      total: 0,
      currency,
      reason: "TOLERANCE",
      parts: {
        toleranceMin,
        firstHourApplied: false,
        extraMins: 0,
        fractions: 0,
        fractionMin,
        fractionPrice,
        dailyCap,
        capped: false,
      },
    };
  }

  const chargeableMins = mins - toleranceMin;

  // Se cobra 1ra hora si hay minutos cobrables
  let total = firstHourPrice;
  let extraMins = 0;
  let fractions = 0;

  if (chargeableMins > 60) {
    extraMins = chargeableMins - 60;
    fractions = Math.ceil(extraMins / fractionMin);
    total += fractions * fractionPrice;
  }

  let capped = false;
  if (dailyCap != null && total > dailyCap) {
    total = dailyCap;
    capped = true;
  }

  return {
    mins,
    chargeableMins,
    total,
    currency,
    reason: total === 0 ? "TOLERANCE" : "CHARGED",
    parts: {
      toleranceMin,
      firstHourApplied: true,
      firstHourPrice,
      extraMins,
      fractions,
      fractionMin,
      fractionPrice,
      dailyCap,
      capped,
    },
  };
}

export async function POST(req) {
  try {
    // ✅ Admin auth simple por cookie (igual que en dashboard)
    const isAdmin = cookies().get("admin")?.value === "true";
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const now = new Date();

    // ✅ Si ya está cerrado, regresamos breakdown con sus valores guardados
    if (ticket.exitTime) {
      const breakdown = calcBreakdown({
        entryTime: ticket.entryTime,
        now: new Date(ticket.exitTime),
        tariff,
      });

      return NextResponse.json({
        ok: true,
        alreadyClosed: true,
        ticketId: ticket.id,
        status: ticket.status ?? "CLOSED",
        entryTime: ticket.entryTime,
        exitTime: ticket.exitTime,
        entryGate: ticket.entryGate ?? null,
        exitGate: ticket.exitGate ?? null,
        totalMins: ticket.totalMins ?? breakdown.mins,
        chargeableMins: ticket.chargeableMins ?? breakdown.chargeableMins,
        finalAmount: ticket.finalAmount ?? breakdown.total,
        breakdown,
      });
    }

    // ✅ Calcular
    const breakdown = calcBreakdown({ entryTime: ticket.entryTime, now, tariff });

    // ✅ Guardar cierre
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        exitTime: now,
        exitGate,
        totalMins: breakdown.mins,
        chargeableMins: breakdown.chargeableMins,
        finalAmount: breakdown.total,
        status: "CLOSED",
      },
    });

    // ✅ Revocar tokens (QR ya no sirve)
    await prisma.ticketToken.updateMany({
      where: { ticketId: updated.id, revokedAt: null },
      data: { revokedAt: now },
    });

    return NextResponse.json({
      ok: true,
      alreadyClosed: false,
      ticketId: updated.id,
      status: updated.status ?? "CLOSED",
      entryTime: updated.entryTime,
      exitTime: updated.exitTime,
      entryGate: updated.entryGate ?? null,
      exitGate: updated.exitGate ?? null,
      totalMins: updated.totalMins ?? breakdown.mins,
      chargeableMins: updated.chargeableMins ?? breakdown.chargeableMins,
      finalAmount: updated.finalAmount ?? breakdown.total,
      breakdown,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

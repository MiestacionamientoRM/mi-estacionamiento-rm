import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/adminAuth";

function getRangeDates(range) {
  const now = new Date();
  const start = new Date(now);

  switch (String(range || "all").toLowerCase()) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };

    case "7d":
      start.setDate(start.getDate() - 7);
      return { from: start, to: now };

    case "30d":
      start.setDate(start.getDate() - 30);
      return { from: start, to: now };

    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };

    case "year":
      start.setMonth(0, 1); // Jan 1
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };

    default:
      return { from: null, to: null }; // "all"
  }
}

export async function GET(req) {
  // 🔒 Protección admin
  const auth = requireAdmin();
  if (auth) return auth;

  // ✅ leer range desde querystring
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "all";

  // ✅ calcular fechas
  const { from, to } = getRangeDates(range);

  // ✅ PASO 5: filtro reutilizable para tickets CERRADOS + rango
  const whereClosed = {
    status: "CLOSED",
    ...(from && to ? { exitTime: { gte: from, lt: to } } : {}),
    ...(from && !to ? { exitTime: { gte: from } } : {}),
  };

  // ✅ Tickets activos (no dependen del rango)
  const openCount = await prisma.ticket.count({
    where: { status: "OPEN" },
  });

  // ✅ PASO 6: usar whereClosed en TODAS las métricas de cerrados
  const closedCount = await prisma.ticket.count({
    where: whereClosed,
  });

  const revenueAgg = await prisma.ticket.aggregate({
    where: whereClosed,
    _sum: { finalAmount: true },
  });

  const avgTimeAgg = await prisma.ticket.aggregate({
    where: whereClosed,
    _avg: { totalMins: true },
  });

  const chargedCount = await prisma.ticket.count({
    where: {
      ...whereClosed,
      chargeableMins: { gt: 0 },
    },
  });

  const toleranceCount = await prisma.ticket.count({
    where: {
      ...whereClosed,
      chargeableMins: 0,
    },
  });

  return NextResponse.json({
    ok: true,
    range,
    tickets: {
      open: openCount,
      closed: closedCount,
    },
    revenue: {
      total: revenueAgg._sum.finalAmount ?? 0,
      currency: "MXN",
    },
    averages: {
      avgMinutes: Math.round(avgTimeAgg._avg.totalMins ?? 0),
    },
    breakdown: {
      charged: chargedCount,
      tolerance: toleranceCount,
    },
  });
}


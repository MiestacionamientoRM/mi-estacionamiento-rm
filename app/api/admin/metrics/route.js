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
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };

    default:
      return { from: null, to: null }; // all
  }
}

export async function GET(req) {
  // 🔒 Protección admin
  const auth = requireAdmin();
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "all";
  const { from, to } = getRangeDates(range);

  // ✅ Abiertos (siempre por exitTime null)
  const openCount = await prisma.ticket.count({
    where: { exitTime: null },
  });

  // ✅ Cerrados (base)
  const closedBase = { exitTime: { not: null } };

  // ✅ Cerrados filtrados por rango (por exitTime)
  const closedWhere = {
    ...closedBase,
    ...(from && to ? { exitTime: { gte: from, lt: to } } : {}),
    ...(from && !to ? { exitTime: { gte: from } } : {}),
  };

  const closedCount = await prisma.ticket.count({ where: closedWhere });

  // 💰 Ingresos totales (solo cerrados en rango)
  const revenueAgg = await prisma.ticket.aggregate({
    where: closedWhere,
    _sum: { finalAmount: true },
  });

  // ⏱️ Tiempo promedio (solo cerrados en rango)
  const avgTimeAgg = await prisma.ticket.aggregate({
    where: closedWhere,
    _avg: { totalMins: true },
  });

  // 🎟️ Cobro vs tolerancia (solo cerrados en rango)
  const chargedCount = await prisma.ticket.count({
    where: {
      ...closedWhere,
      chargeableMins: { gt: 0 },
    },
  });

  const toleranceCount = await prisma.ticket.count({
    where: {
      ...closedWhere,
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


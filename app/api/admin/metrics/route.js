import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/adminAuth";

export async function GET() {
  // 🔒 Protección admin
  const auth = requireAdmin();
  if (auth) return auth;

  // 📊 Tickets por estado
  const openCount = await prisma.ticket.count({
    where: { status: "OPEN" },
  });

  const closedCount = await prisma.ticket.count({
    where: { status: "CLOSED" },
  });

  // 💰 Ingresos totales
  const revenueAgg = await prisma.ticket.aggregate({
    where: { status: "CLOSED" },
    _sum: { finalAmount: true },
  });

  // ⏱️ Tiempo promedio (solo cerrados)
  const avgTimeAgg = await prisma.ticket.aggregate({
    where: { status: "CLOSED" },
    _avg: { totalMins: true },
  });

  // 🎟️ Tickets con cobro vs tolerancia
  const chargedCount = await prisma.ticket.count({
    where: {
      status: "CLOSED",
      chargeableMins: { gt: 0 },
    },
  });

  const toleranceCount = await prisma.ticket.count({
    where: {
      status: "CLOSED",
      chargeableMins: 0,
    },
  });

  return NextResponse.json({
    ok: true,
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

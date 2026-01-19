import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const openTickets = await prisma.ticket.findMany({
      where: { exitTime: null },
      orderBy: { entryTime: "desc" },
      take: 50,
    });

    const closedTickets = await prisma.ticket.findMany({
      where: { exitTime: { not: null } },
      orderBy: { exitTime: "desc" },
      take: 50,
    });

    return NextResponse.json({ ok: true, openTickets, closedTickets });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

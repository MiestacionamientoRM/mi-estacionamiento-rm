import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import CloseTicketButton from "./CloseTicketButton";
import { prisma } from "../../../lib/prisma";

// ✅ Debug (luego lo quitamos)
const BUILD_MARK = "DASHBOARD_MARK_2026-01-22_01";

function MetricCard({ title, value, icon }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 12,
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 14, color: "#555" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

// ✅ Helpers (solo una vez)
const fmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const fmtMoney = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

function fmtDuration(mins) {
  if (mins == null) return "—";
  const m = Math.round(Number(mins));
  if (!Number.isFinite(m)) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

function fmtAvgMinutesToHM(mins) {
  if (mins == null) return "—";
  const m = Math.round(Number(mins));
  if (!Number.isFinite(m)) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r} min`;
  if (r === 0) return `${h} h`;
  return `${h} h ${r} min`;
}

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
      return { from: null, to: null }; // "all"
  }
}

async function getMetrics(range) {
  const url = new URL(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/metrics`
  );
  if (range && range !== "all") url.searchParams.set("range", range);

  const res = await fetch(url.toString(), { cache: "no-store" });
  return res.json();
}

export default async function AdminDashboard({ searchParams }) {
  const isAdmin = cookies().get("admin")?.value === "true";
  if (!isAdmin) redirect("/admin/login");

  // ✅ 1) Rango arriba
  const range = searchParams?.range ?? "all";
  const { from, to } = getRangeDates(range);

  // ✅ 2) Métricas con rango (si tu endpoint /metrics lo soporta)
  const metrics = await getMetrics(range);

  // ✅ 3) Tickets abiertos
  const openTickets = await prisma.ticket.findMany({
    where: { exitTime: null },
    orderBy: { id: "desc" },
    take: 50,
  });

  // ✅ 4) Tickets cerrados filtrados por rango (por exitTime)
  const closedWhere = {
    exitTime: { not: null },
    ...(from && to ? { exitTime: { gte: from, lt: to } } : {}),
    ...(from && !to ? { exitTime: { gte: from } } : {}),
  };

  const closedTickets = await prisma.ticket.findMany({
    where: closedWhere,
    orderBy: { exitTime: "desc" },
    take: 50,
  });

  return (
    <main style={{ padding: 20 }}>
      <h1>Panel Admin</h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <MetricCard title="Tickets activos" value={metrics?.tickets?.open ?? "—"} icon="🎫" />
        <MetricCard title="Tickets cerrados" value={metrics?.tickets?.closed ?? "—"} icon="✅" />
        <MetricCard title="Ingresos" value={fmtMoney.format(metrics?.revenue?.total ?? 0)} icon="💰" />
        <MetricCard title="Tiempo promedio" value={fmtAvgMinutesToHM(metrics?.averages?.avgMinutes)} icon="⏱" />
      </section>

      <div style={{ marginBottom: 10 }}>
        <b>Rango:</b> {range}
      </div>

      <p style={{ color: "#666" }}>Build: {BUILD_MARK}</p>
      <p style={{ color: "#666" }}>
        openTickets: {openTickets.length} | closedTickets: {closedTickets.length}
      </p>

      <LogoutButton />

      <h2>Tickets activos</h2>
      {openTickets.length ? (
        <ul>
          {openTickets.map((t) => (
            <li key={t.id}>
              Ticket #{t.id} — Placa: {t.plate ?? "—"} — Nivel: {t.level ?? "—"} — {t.color ?? "—"}
              <CloseTicketButton ticketId={t.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay tickets activos.</p>
      )}

      <h2 style={{ marginTop: 30 }}>Tickets cerrados</h2>
      {closedTickets.length ? (
        <ul>
          {closedTickets.map((t) => (
            <li key={t.id} style={{ marginBottom: 10 }}>
              <b>Ticket #{t.id}</b>
              {" — "}
              Total pagado: <b>{fmtMoney.format(t.finalAmount ?? 0)}</b>
              {" — "}
              Entrada: {t.entryTime ? fmt.format(new Date(t.entryTime)) : "—"}
              {" — "}
              Salida: {t.exitTime ? fmt.format(new Date(t.exitTime)) : "—"}
              {t.exitGate ? ` — Salida: ${t.exitGate}` : ""}

              <div style={{ color: "#555", marginTop: 2 }}>
                Status: {t.status ?? "—"} ·{" "}
                Tiempo total: {fmtDuration(t.totalMins)} ·{" "}
                Cobrable: {fmtMoney.format(t.finalAmount ?? 0)}
                {t.plate ? ` · Placa: ${t.plate}` : ""}
                {t.level != null ? ` · Nivel: ${t.level}` : ""}
                {t.color ? ` · Color: ${t.color}` : ""}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay tickets cerrados.</p>
      )}
    </main>
  );
}

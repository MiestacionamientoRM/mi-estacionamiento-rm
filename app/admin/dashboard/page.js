import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import CloseTicketButton from "./CloseTicketButton";
import { prisma } from "../../../lib/prisma";

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


async function getMetrics() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/metrics`, {
    cache: "no-store",
  });
  return res.json();
}

const fmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});


export default async function AdminDashboard() {
  const isAdmin = cookies().get("admin")?.value === "true";
  if (!isAdmin) redirect("/admin/login");
  const metrics = await getMetrics();


  // ✅ Abiertos: NO tienen exitTime
  const openTickets = await prisma.ticket.findMany({
    where: { exitTime: null },
    orderBy: { id: "desc" },
    take: 50,
  });

  // ✅ Cerrados: SÍ tienen exitTime
  const closedTickets = await prisma.ticket.findMany({
    where: { exitTime: { not: null } },
    orderBy: { exitTime: "desc" },
    take: 50,
  });

  const BUILD_MARK = "DASHBOARD_MARK_2026-01-20_01";

  const metrics = await getMetrics();

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
          <MetricCard title="Tickets activos" value={metrics.tickets.open} icon="🎫" />
          <MetricCard title="Tickets cerrados" value={metrics.tickets.closed} icon="✅" />
          <MetricCard
            title="Ingresos"
            value={`$${metrics.revenue.total} ${metrics.revenue.currency}`}
            icon="💰"
          />
          <MetricCard
            title="Tiempo promedio"
            value={`${Math.round(metrics.averages.avgMinutes / 60)} h`}
            icon="⏱"
          />
        </section>


            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12, marginTop: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Métricas</h2>

        <p style={{ margin: 0 }}>
          <b>Tickets:</b> Abiertos {metrics?.tickets?.open ?? "—"} | Cerrados {metrics?.tickets?.closed ?? "—"}
        </p>

        <p style={{ margin: 0 }}>
          <b>Ingresos:</b> ${metrics?.revenue?.total ?? 0} {metrics?.revenue?.currency ?? "MXN"}
        </p>

        <p style={{ margin: 0 }}>
          <b>Promedio:</b> {metrics?.averages?.avgMinutes ?? "—"} min
        </p>

        <p style={{ margin: 0 }}>
          <b>Breakdown:</b> Pagaron {metrics?.breakdown?.charged ?? "—"} | Tolerancia {metrics?.breakdown?.tolerance ?? "—"}
        </p>
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
            <li key={t.id}>
              Ticket #{t.id} — Total: ${t.finalAmount ?? 0} — Salida:{" "}
              {t.exitTime ? fmt.format(new Date(t.exitTime)) : "—"}
              {t.exitGate ? ` — Salida: ${t.exitGate}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay tickets cerrados.</p>
      )}
    </main>
  );
}

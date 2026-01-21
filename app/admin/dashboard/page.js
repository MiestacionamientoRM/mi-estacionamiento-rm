import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { prisma } from "../../../lib/prisma";


const fmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminDashboard() {
  const isAdmin = cookies().get("admin")?.value === "true";
  if (!isAdmin) redirect("/admin/login");

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


  return (
    <main style={{ padding: 20 }}>
      <h1>Panel Admin</h1>

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
              Ticket #{t.id} — Placa: {t.plate ?? "—"} — Nivel: {t.level ?? "—"} —{" "}
              {t.color ?? "—"} — Entrada: {fmt.format(new Date(t.entryTime))}
              {t.entryGate ? ` — Acceso: ${t.entryGate}` : ""}
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

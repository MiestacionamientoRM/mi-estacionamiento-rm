import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { prisma } from "@/lib/prisma";

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

  return (
    <main style={{ padding: 20 }}>
      <h1>Panel Admin</h1>

      <LogoutButton />

      <h2>Tickets activos</h2>
      {openTickets.length ? (
        <ul>
          {openTickets.map((t) => (
            <li key={t.id}>
              Ticket #{t.id} — Placa: {t.plate ?? "—"} — Nivel: {t.level ?? "—"} —{" "}
              {t.color ?? "—"} — Entrada:{" "}
              {new Date(t.entryTime).toLocaleString("es-MX")}
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
              {t.exitTime ? new Date(t.exitTime).toLocaleString("es-MX") : "—"}
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay tickets cerrados.</p>
      )}
    </main>
  );
}

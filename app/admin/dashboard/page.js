import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getTickets() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/tickets`, {
    cache: "no-store",
  });
  return res.json();
}

export default async function AdminDashboard() {
  const isAdmin = cookies().get("admin")?.value === "true";
  if (!isAdmin) redirect("/admin/login");

  const data = await getTickets();

  return (
    <main style={{ padding: 20 }}>
      <h1>Panel Admin</h1>

      <form action="/api/admin/logout" method="post" style={{ marginBottom: 12 }}>
        <button type="submit">Cerrar sesión</button>
      </form>

      <h2>Tickets activos</h2>
      {data?.openTickets?.length ? (
        <ul>
          {data.openTickets.map((t) => (
            <li key={t.id}>
              Ticket #{t.id} — Placa: {t.plate ?? "—"} — Nivel: {t.level ?? "—"} — {t.color ?? "—"}
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay tickets activos.</p>
      )}

      <h2 style={{ marginTop: 30 }}>Tickets cerrados</h2>
      {data?.closedTickets?.length ? (
        <ul>
          {data.closedTickets.map((t) => (
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

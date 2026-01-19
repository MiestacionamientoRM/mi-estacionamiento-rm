import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function AdminDashboard() {
  const isAdmin = cookies().get("admin");

  if (!isAdmin) {
    redirect("/admin/login");
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Panel Admin</h1>
      <p>Bienvenido 👋</p>

      <p>Tickets activos y cerrados irán aquí.</p>
    </main>
  );
}

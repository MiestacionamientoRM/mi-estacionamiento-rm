"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CloseTicketButton({ ticketId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function closeTicket() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, exitGate: "Salida Admin" }),
      });

      // intenta leer JSON si existe (para ver el error real)
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        // si no es JSON, lo ignoramos
      }

      if (!res.ok) {
        setErr(payload?.error || "Error al cerrar");
        return;
      }

      router.refresh();
    } catch (e) {
      setErr("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span style={{ marginLeft: 10 }}>
      <button onClick={closeTicket} disabled={loading}>
        {loading ? "Cerrando..." : "Cerrar ticket"}
      </button>
      {err ? <span style={{ color: "red", marginLeft: 8 }}>{err}</span> : null}
    </span>
  );
}

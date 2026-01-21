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
      const res = await fetch("/api/admin/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, exitGate: "Salida Admin" }),
      });

      if (!res.ok) {
        const text = await res.text();
        setErr(text || "Error al cerrar");
        return;
      }

      // refresca dashboard para que el ticket pase a "cerrados"
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

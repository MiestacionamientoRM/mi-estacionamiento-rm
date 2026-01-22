"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CloseTicketButton({ ticketId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  function formatBreakdown(b) {
    if (!b) return "";
    const p = b.parts || {};
    const base = `mins=${b.mins}, cobrable=${b.chargeableMins}, tolerancia=${p.toleranceMin ?? 0}`;
    const frac =
      (p.fractions ?? 0) > 0
        ? `, fracciones=${p.fractions} (${p.fractionMin}min)`
        : "";
    const cap = p.capped ? ", cap aplicado" : "";
    return `${base}${frac}${cap} → total=$${b.total} ${b.currency ?? "MXN"}`;
  }

  async function closeTicket() {
    setLoading(true);
    setErr("");
    setOkMsg("");

    try {
      const res = await fetch("/api/admin/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, exitGate: "Salida Admin" }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(data?.error || "Error al cerrar");
        return;
      }

      const msg = data?.alreadyClosed
        ? `✅ Ya estaba cerrado. ${formatBreakdown(data.breakdown)}`
        : `✅ Ticket cerrado. ${formatBreakdown(data.breakdown)}`;

      setOkMsg(msg);

      // refresca dashboard para moverlo a "cerrados"
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

      {okMsg ? (
        <span style={{ color: "green", marginLeft: 8 }}>{okMsg}</span>
      ) : null}

      {err ? <span style={{ color: "red", marginLeft: 8 }}>{err}</span> : null}
    </span>
  );
}

import crypto from "crypto";
import { prisma } from "../../../lib/prisma";

function maskPlate(plate) {
  if (!plate) return "—";
  const clean = String(plate).trim();
  if (clean.length <= 4) return "***" + clean;
  return "***" + clean.slice(-4);
}

function minutesDiff(from, to) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

function calcEstimateMxN({ entryTime, tariff }) {
  const now = new Date();
  const mins = minutesDiff(new Date(entryTime), now);

  const tolerance = tariff?.toleranceMin ?? 0;
  const firstHourPrice = tariff?.firstHourPrice ?? 0;
  const fractionMin = tariff?.fractionMin ?? 15;
  const fractionPrice = tariff?.fractionPrice ?? 0;
  const dailyCap = tariff?.dailyCap ?? null;

  // Dentro de tolerancia: $0
  if (mins <= tolerance) return { mins, chargeableMins: 0, estimate: 0 };

  const chargeable = mins - tolerance;

  let total = 0;

  // 1ra hora (si hay minutos cobrables)
  if (chargeable > 0) total += firstHourPrice;

  // Después de 60 min cobrables: fracciones
  if (chargeable > 60) {
    const extra = chargeable - 60;
    const fractions = Math.ceil(extra / fractionMin);
    total += fractions * fractionPrice;
  }

  // Tope diario si existe
  if (dailyCap != null) total = Math.min(total, dailyCap);

  return { mins, chargeableMins: chargeable, estimate: total };
}
function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function formatEntryTime(date) {
  return new Date(date).toLocaleString("es-MX", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TicketPage({ params }) {
  const plainToken = params.token;

  const pepper = process.env.TOKEN_PEPPER;
  if (!pepper) {
    return (
      <main>
        <h1>Error de configuración</h1>
        <p>Falta TOKEN_PEPPER en el .env</p>
      </main>
    );
  }

  // Hash = sha256(token + pepper)
  const tokenHash = crypto
    .createHash("sha256")
    .update(String(plainToken) + pepper)
    .digest("hex");

  // Buscar token válido en BD
  const record = await prisma.ticketToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      ticket: {
        include: {
          plaza: { include: { tariffConfig: true } },
        },
      },
    },
  });

  if (!record) {
    return (
      <main>
        <h1>QR inválido o expirado</h1>
        <p>Este QR ya no es válido. Pide uno nuevo en la plaza.</p>
      </main>
    );
  }

  const ticket = record.ticket;
  const plaza = ticket.plaza;
  const tariff = plaza.tariffConfig;

  const { mins, chargeableMins, estimate } = calcEstimateMxN({
    entryTime: ticket.entryTime,
    tariff,
  });

  return (
    <main style={{ maxWidth: 560 }}>
      <h1>Tu estacionamiento</h1>

      <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 14 }}>
        <p><b>Plaza:</b> {plaza.name}</p>
        <p><b>Placa:</b> {maskPlate(ticket.plate)}</p>
        <p><b>Ubicación:</b> Nivel {ticket.level ?? "—"} — {ticket.color ?? "—"}</p>
        <p><b>Hora de entrada:</b> {formatEntryTime(ticket.entryTime)}</p>
        <p><b>Tiempo transcurrido:</b> {formatDuration(mins)}</p>
        <p><b>Tiempo cobrable:</b> {formatDuration(chargeableMins)}</p>

        <p style={{ fontSize: 22, marginTop: 8 }}>
          <b>Estimado:</b> ${estimate} {tariff?.currency ?? "MXN"}
        </p>
      </div>

      <p style={{ marginTop: 12, color: "#666" }}>
        *Estimado basado en tolerancia y tarifa configurada.
      </p>
    </main>
  );
}

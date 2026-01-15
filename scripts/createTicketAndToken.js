import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const pepperRaw = process.env.TOKEN_PEPPER;
  const pepper = pepperRaw?.trim().replace(/^"(.*)"$/, "$1");

  if (!pepper) {
    throw new Error("TOKEN_PEPPER no está definido");
  }

  // 1️⃣ Crear ticket dinámico
  const ticket = await prisma.ticket.create({
    data: {
      plazaId: 1,                // Plaza piloto
      plate: "ABC1234",          // Simulado
      level: 2,
      color: "Rojo",
      entryTime: new Date(),     // ⬅️ AHORA
    },
  });

  // 2️⃣ Generar token plano
  const plainToken = crypto.randomBytes(32).toString("hex");

  // 3️⃣ Hash del token
  const tokenHash = crypto
    .createHash("sha256")
    .update(plainToken + pepper)
    .digest("hex");

  // 4️⃣ Expiración 24h
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // 5️⃣ Guardar token ligado al ticket
  await prisma.ticketToken.create({
    data: {
      ticketId: ticket.id,
      tokenHash,
      expiresAt,
    },
  });

  // 6️⃣ URL final
  const qrUrl = `https://mi-estacionamiento-rm.vercel.app/ticket/${plainToken}`;

  console.log("✅ Ticket dinámico creado");
  console.log("🎫 Ticket ID:", ticket.id);
  console.log("🔗 URL QR:");
  console.log(qrUrl);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());

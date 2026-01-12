import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  // 👇 Ticket que ya creaste
  const ticketId = 1;

  // 1️⃣ Generar token plano (esto irá en el QR)
  const plainToken = crypto.randomBytes(32).toString("hex");

  // 2️⃣ Hashear token + pepper (seguridad)
  const pepper = process.env.TOKEN_PEPPER;
  if (!pepper) {
    throw new Error("TOKEN_PEPPER no está definido en el .env");
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(plainToken + pepper)
    .digest("hex");

  // 3️⃣ Expiración: 24 horas
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // 4️⃣ Guardar en base de datos
  await prisma.ticketToken.create({
    data: {
      ticketId,
      tokenHash,
      expiresAt,
    },
  });

  // 5️⃣ URL que irá en el QR
  const qrUrl = `http://localhost:3000/ticket/${plainToken}`;

  console.log("✅ Token creado correctamente");
  console.log("🔗 URL para el QR:");
  console.log(qrUrl);
}

main()
  .catch((e) => {
    console.error("❌ Error al crear el token:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

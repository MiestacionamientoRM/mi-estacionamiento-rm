import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function parseArgs(argv) {
  // node scripts/createTicketAndToken.js --plaza=1 --plate=XYZ9876 --level=3 --color=Azul
  const args = {};
  for (const raw of argv.slice(2)) {
    const cleaned = raw.startsWith("--") ? raw.slice(2) : raw;
    const [k, v] = cleaned.split("=");
    if (k) args[k] = v ?? "";
  }
  return args;
}

async function main() {
  // ✅ Lee pepper (y limpia comillas/espacios)
  const pepperRaw = process.env.TOKEN_PEPPER;
  const pepper = pepperRaw?.trim().replace(/^"(.*)"$/, "$1");
  if (!pepper) throw new Error("TOKEN_PEPPER no está definido");

  // ✅ Params (defaults)
  const args = parseArgs(process.argv);
  const plazaId = Number(args.plaza ?? 1);
  const plate = String(args.plate ?? "ABC1234");
  const level = args.level != null && args.level !== "" ? Number(args.level) : 2;
  const color = String(args.color ?? "Rojo");

  if (!Number.isFinite(plazaId)) throw new Error("plaza debe ser número");
  if (!Number.isFinite(level)) throw new Error("level debe ser número");

  // 1️⃣ Crear ticket dinámico
  const ticket = await prisma.ticket.create({
    data: {
      plazaId,
      plate,
      level,
      color,
      entryTime: new Date(),
    },
  });

  // 2️⃣ Generar token plano (esto va en el QR)
  const plainToken = crypto.randomBytes(32).toString("hex");

  // 3️⃣ Hash del token (guardado en DB)
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

  // 6️⃣ URL final (producción)
  const qrUrl = `https://mi-estacionamiento-rm.vercel.app/ticket/${plainToken}`;

  console.log("✅ Ticket dinámico creado");
  console.log("🎫 Ticket ID:", ticket.id);
  console.log("🏬 Plaza ID:", plazaId);
  console.log("🔗 URL QR:");
  console.log(qrUrl);
}

main()
  .catch((e) => console.error("❌ Error:", e))
  .finally(async () => prisma.$disconnect());

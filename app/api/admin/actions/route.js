import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function cleanEnv(raw) {
  return raw?.trim().replace(/^"(.*)"$/, "$1"); // quita comillas si las hubiera
}

export async function POST(req) {
  const { password } = await req.json();

  const adminPassword = cleanEnv(process.env.ADMIN_PASSWORD);

  if (!adminPassword) {
    console.log("❌ ADMIN_PASSWORD missing");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  if (String(password ?? "") !== adminPassword) {
    console.log("❌ Wrong password");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  cookies().set("admin", "true", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production", // en local false, en Vercel true
    path: "/admin", // importante: solo aplica al admin
    maxAge: 60 * 60 * 8, // 8 horas
  });

  console.log("✅ Admin logged in");

  return NextResponse.json({ ok: true });
}

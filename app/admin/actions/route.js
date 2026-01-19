import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { password } = await req.json();

  if (!process.env.ADMIN_PASSWORD) {
    console.log("❌ ADMIN_PASSWORD missing");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    console.log("❌ Wrong password");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  cookies().set("admin", "true", {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
  });

  console.log("✅ Admin logged in");

  return NextResponse.json({ ok: true });
}

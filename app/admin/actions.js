import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req) {
    console.log("ADMIN_PASSWORD exists?", Boolean(process.env.ADMIN_PASSWORD));
  console.log("ADMIN_PASSWORD length:", process.env.ADMIN_PASSWORD?.length);
  
  const { password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  cookies().set("admin", "true", {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}

import { cookies } from "next/headers";

export function requireAdmin() {
  const isAdmin = cookies().get("admin")?.value === "true";
  return isAdmin;
}

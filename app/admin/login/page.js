"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function doLogin(e) {
    e?.preventDefault?.();
    setError(null);

    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/admin/dashboard";
    } else {
      setError("Contraseña incorrecta");
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Admin Login</h1>

      {/* Usamos form para poder aplicar autoComplete y Enter */}
      <form onSubmit={doLogin} autoComplete="off">
        {/* Campos “trampa” ocultos para que Chrome autofill se vaya aquí */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          style={{ display: "none" }}
        />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          style={{ display: "none" }}
        />

        {/* Campo real */}
        <input
          type="password"
          name="admin_pin"
          id="admin_pin"
          autoComplete="new-password"
          placeholder="Contraseña admin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 12 }}
        />

        <button style={{ marginTop: 12, width: "100%" }} type="submit">
          Entrar
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}

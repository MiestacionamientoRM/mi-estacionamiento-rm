"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function doLogin() {
    setError(null);

    const res = await fetch("/admin/actions", {
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

      <div>
        <input
          type="password"
          placeholder="Contraseña admin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 12 }}
        />

        <button
          type="button"
          onClick={doLogin}
          style={{ marginTop: 12, width: "100%" }}
        >
          Entrar
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}

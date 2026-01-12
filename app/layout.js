export const metadata = {
  title: "Mi Estacionamiento RM",
  description: "Web App del usuario",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui", margin: 0, padding: 16 }}>
        {children}
      </body>
    </html>
  );
}

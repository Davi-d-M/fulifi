import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starlinknet.WIFI | Fast & Secure Hotspot",
  description: "Starlinknet.WIFI & Starlinknet.WIFI 5G Hotspot Billing System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{
        margin: 0,
        padding: 0,
        height: '100%',
        backgroundColor: '#0a0c10', // Uniformly dark background
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </body>
    </html>
  );
}

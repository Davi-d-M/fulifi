import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starlinknet.WIFI WiFi",
  description: "Starlinknet.WIFI WiFi Hotspot Billing System",
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
        backgroundColor: '#f3f4f6', // Light gray background
        color: '#111827',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </body>
    </html>
  );
}

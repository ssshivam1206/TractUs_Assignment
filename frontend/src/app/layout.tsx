import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TractUs Contract Operations Console",
  description: "Frontend shell for the TractUs contract workflow assignment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-transparent text-slate-950">{children}</body>
    </html>
  );
}

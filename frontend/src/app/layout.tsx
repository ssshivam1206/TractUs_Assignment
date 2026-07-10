import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TractUs Contract Operations Console',
  description: 'Operations dashboard for organisation-scoped contract intake, workflow, and audit history.',
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

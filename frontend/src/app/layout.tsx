import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartDialer Telemetry & Control Dashboard',
  description: 'Production-Grade Distributed SmartDialer Dashboard with 100% WCAG 2.1 AAA Accessibility and Real-time Telemetry',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}

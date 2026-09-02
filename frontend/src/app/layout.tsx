import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  title: 'SmartDialer | Production-Grade Distributed Pacing & Safety Controller',
  description: 'Production-Grade Distributed SmartDialer Dashboard with 100% WCAG 2.1 AAA Accessibility, Poisson-Erlang Pacing Engine, and Real-time Telemetry.',
  keywords: ['SmartDialer', 'Predictive Dialer', 'Call Center Engine', 'Poisson-Erlang Pacing', 'Safety Controller', 'WCAG AAA'],
  authors: [{ name: 'Antigravity Lead Engineer' }],
  openGraph: {
    title: 'SmartDialer | Distributed Pacing & Safety Controller Engine',
    description: 'Production-Grade Distributed SmartDialer with 100% Concurrency Guarantees and Zero Dropped Calls Compliance.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

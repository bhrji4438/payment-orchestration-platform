import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Payment Orchestration Portal',
  description: 'Enterprise Multi-Gateway Payment Orchestrator Developer and Merchant Hub',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

import './globals.css';
import React from 'react';
import { BRAND } from '@shared/constants/brand.constants';

export const metadata = {
  title: BRAND.NAME,
  description: BRAND.PORTAL_DESCRIPTION,
};

import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500 selection:text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

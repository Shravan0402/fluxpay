// src/app/layout.tsx
'use client'; // This must be a client component because wagmi hooks are client-side

import './globals.css';
import { Inter } from 'next/font/google';
import { mainnet, goerli, polygon } from 'wagmi/chains'; // Example chains
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../../wagmi.config';

const queryClient = new QueryClient();


const inter = Inter({ subsets: ['latin'] });


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
      <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}

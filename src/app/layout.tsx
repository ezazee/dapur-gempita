import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Dapur Gempita',
    description: 'Aplikasi Manajemen Stok & Evaluasi Dapur Gempita',
    icons: {
        icon: '/favicon_io/favicon.ico',
        apple: '/favicon_io/apple-touch-icon.png',
    },
    robots: {
        index: false,
        follow: false,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers>
                    {children}
                    <Toaster />
                    <Sonner />
                </Providers>
            </body>
        </html>
    );
}

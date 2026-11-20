import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Mechanical Workshop', description: 'Heavy-vehicle workshop management and Systems Theory simulation.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

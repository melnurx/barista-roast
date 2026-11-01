import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'Barista Roast — Your coffee. Freshly judged.',
 description: 'Order something outrageous. Watch it come to life. Change your mind mid-pour. Get freshly roasted.',
 icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }

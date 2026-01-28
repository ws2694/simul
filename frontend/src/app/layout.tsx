import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  title: 'Simul',
  description: 'Reduce meeting time waste through AI-powered cognitive state capture',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

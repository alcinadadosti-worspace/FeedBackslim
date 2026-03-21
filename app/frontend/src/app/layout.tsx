import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ouvidoria - Plataforma de Feedback',
  description: 'Avalie gestores, dê feedback e contribua para um ambiente de trabalho melhor.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors">
        <ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#171717',
              color: '#fff',
              border: '3px solid #171717',
              fontWeight: '600',
            },
            success: {
              style: {
                background: '#98d4a0',
                color: '#171717',
              },
            },
            error: {
              style: {
                background: '#f87171',
                color: '#171717',
              },
            },
          }}
        />
        {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface PublicLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
}

export function PublicLayout({ children, showBackButton = true }: PublicLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  const homeHref = isAuthenticated ? (user?.role === 'RH_ADMIN' ? '/admin' : '/dashboard') : '/';

  const handleAdminAccess = () => {
    if (isAuthenticated) {
      logout();
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b-3 border-neutral-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={homeHref} className="flex items-center gap-2 group">
            {showBackButton && (
              <ArrowLeft className="w-5 h-5 text-neutral-600 group-hover:text-primary-500 transition-colors" />
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 border-2 border-neutral-900 flex items-center justify-center font-black text-white text-sm">
                O
              </div>
              <span className="font-black text-xl text-neutral-900">Ouvidoria</span>
            </div>
          </Link>

          {isAuthenticated && user?.role === 'RH_ADMIN' ? (
            <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
              Painel RH/Admin
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAdminAccess}
              className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Acesso RH/Admin
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-neutral-900 bg-white px-6 py-4 mt-auto">
        <div className="max-w-6xl mx-auto text-center text-sm text-neutral-500">
          <p>Ouvidoria - Plataforma de Feedback Empresarial</p>
          <p className="mt-1">Suas respostas sao anonimas e confidenciais.</p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Search } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
    router.push('/login?switch=1');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-800 border-b-3 border-neutral-900 dark:border-neutral-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={homeHref} className="flex items-center gap-2 group">
            {showBackButton && (
              <ArrowLeft className="w-5 h-5 text-neutral-600 group-hover:text-primary-500 transition-colors" />
            )}
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Ouvidoria" width={40} height={40} className="object-contain" />
              <span className="font-black text-xl text-neutral-900 dark:text-neutral-100">Ouvidoria</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/feedbacks"
              className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Feedbacks</span>
            </Link>
            <Link
              href="/consultar-denuncia"
              className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Consultar denúncia</span>
            </Link>

          <ThemeToggle />
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
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-800 px-6 py-4 mt-auto">
        <div className="max-w-6xl mx-auto text-center text-sm text-neutral-500">
          <p>Ouvidoria - Plataforma de Feedback Empresarial</p>
          <p className="mt-1">Suas respostas sao anonimas e confidenciais.</p>
        </div>
      </footer>
    </div>
  );
}

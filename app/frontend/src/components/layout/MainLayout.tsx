'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/auth';
import { LoadingPage } from '@/components/ui/Loading';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <LoadingPage />;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-neutral-800 border-b-3 border-neutral-900 dark:border-neutral-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display font-bold text-lg text-neutral-900 dark:text-neutral-100">Ouvidoria</span>
      </div>

      <main className="md:ml-64 min-h-screen p-4 pt-20 md:pt-8 md:p-8">
        {children}
      </main>
    </div>
  );
}

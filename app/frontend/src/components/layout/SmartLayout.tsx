'use client';

import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { MainLayout } from './MainLayout';
import { PublicLayout } from './PublicLayout';

interface SmartLayoutProps {
  children: ReactNode;
}

export function SmartLayout({ children }: SmartLayoutProps) {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return <PublicLayout showBackButton={true}>{children}</PublicLayout>;
  }

  if (isAuthenticated) {
    return <MainLayout>{children}</MainLayout>;
  }

  return <PublicLayout showBackButton={true}>{children}</PublicLayout>;
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  Star,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  BarChart3,
  Trophy,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Avatar } from '@/components/ui/Avatar';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isColaborador = user?.role === 'COLABORADOR';
  const isGestor = user?.role === 'GESTOR';
  const isAdmin = user?.role === 'RH_ADMIN';

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      name: 'Gestores',
      href: '/gestores',
      icon: Users,
      show: true,
    },
    {
      name: 'Ranking',
      href: '/ranking',
      icon: Trophy,
      show: true,
    },
    {
      name: 'Feedbacks',
      href: '/feedbacks',
      icon: MessageSquare,
      show: true,
    },
    {
      name: 'Avaliar',
      href: '/avaliar',
      icon: Star,
      show: isColaborador,
    },
    {
      name: 'Ouvidoria',
      href: '/ouvidoria',
      icon: AlertTriangle,
      show: isColaborador,
    },
    {
      name: 'Minhas Avaliações',
      href: '/dashboard/gestor',
      icon: BarChart3,
      show: isGestor,
    },
    {
      name: 'Painel Admin',
      href: '/admin',
      icon: Settings,
      show: isAdmin,
    },
    {
      name: 'Denúncias',
      href: '/admin/denuncias',
      icon: AlertTriangle,
      show: isAdmin,
    },
    {
      name: 'Meu Perfil',
      href: '/perfil',
      icon: User,
      show: true,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r-3 border-neutral-900 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b-3 border-neutral-900">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Ouvidoria" width={48} height={48} className="object-contain" />
          <span className="font-display font-bold text-xl">Ouvidoria</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navigation
            .filter((item) => item.show)
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 font-semibold transition-colors border-l-4',
                      isActive
                        ? 'text-neutral-900 bg-primary-50 border-primary-500'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border-transparent'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t-3 border-neutral-900">
        <div className="flex items-center gap-3 mb-4">
          <Avatar src={user?.gestor?.foto || user?.avatar} alt={user?.nome} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-900 truncate">{user?.nome}</p>
            <p className="text-xs text-neutral-500 uppercase">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2 text-neutral-600 hover:text-red-500 hover:bg-red-50 transition-colors font-semibold"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, AlertTriangle, Users, Shield, MessageSquare, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-800 border-b-3 border-neutral-900 dark:border-neutral-100 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ouvidoria" width={36} height={36} className="object-contain sm:w-12 sm:h-12" />
            <span className="font-black text-lg sm:text-2xl text-neutral-900 dark:text-neutral-100">Ouvidoria</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link
              href="/login?switch=1"
              className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors whitespace-nowrap"
            >
              RH/Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 dark:text-neutral-100 mb-3 sm:mb-4">
              Sua voz importa!
            </h1>
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
              Compartilhe sua experiencia de forma anonima e ajude a construir um ambiente de trabalho melhor para todos.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {/* Feedback Card */}
            <Link href="/avaliar" className="group">
              <div className="bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 p-5 sm:p-8 shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 dark:bg-primary-900/30 border-3 border-neutral-900 dark:border-neutral-100 flex items-center justify-center shrink-0">
                    <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100">Feedbacks</h2>
                </div>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mb-3 sm:mb-4">
                  Avalie seus gestores de forma anonima. Compartilhe elogios, sugestoes ou criticas construtivas.
                </p>
                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold group-hover:gap-3 transition-all text-sm sm:text-base">
                  <span>Avaliar gestor ou colaborador</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* Ouvidoria Card */}
            <Link href="/ouvidoria" className="group">
              <div className="bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 p-5 sm:p-8 shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 border-3 border-neutral-900 dark:border-neutral-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100">Ouvidoria</h2>
                </div>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mb-3 sm:mb-4">
                  Relate situacoes serias de forma confidencial. Suas denuncias serao tratadas pelo RH com sigilo.
                </p>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold group-hover:gap-3 transition-all text-sm sm:text-base">
                  <span>Fazer denuncia</span>
                  <span>→</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Secondary Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Link href="/gestores" className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 text-center">Ver Gestores</span>
            </Link>
            <Link href="/ranking" className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 text-center">Ranking</span>
            </Link>
            <Link href="/feedbacks" className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 text-center">Feedbacks</span>
            </Link>
            <Link href="/consultar-denuncia" className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-100 dark:bg-orange-900/30 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 text-center">Consultar</span>
            </Link>
          </div>

          {/* Trust Badge */}
          <div className="mt-8 sm:mt-12 flex justify-center">
            <div className="flex items-center gap-2 sm:gap-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-xs sm:text-sm text-green-700 dark:text-green-400 font-medium">
                100% Anonimo - Suas respostas nao sao rastreadas
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-800 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto text-center text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          <p className="font-medium">Ouvidoria - Plataforma de Feedback Empresarial</p>
          <p className="mt-1">Construindo um ambiente de trabalho melhor, uma voz de cada vez.</p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Star, AlertTriangle, Users, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-3 border-neutral-900 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 border-3 border-neutral-900 flex items-center justify-center font-black text-white text-lg">
              O
            </div>
            <span className="font-black text-2xl text-neutral-900">Ouvidoria</span>
          </div>

          <Link
            href="/login"
            className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            Acesso RH/Admin
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-neutral-900 mb-4">
              Sua voz importa!
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Compartilhe sua experiencia de forma anonima e ajude a construir um ambiente de trabalho melhor para todos.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Feedback Card */}
            <Link href="/avaliar" className="group">
              <div className="bg-white border-3 border-neutral-900 p-8 shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-primary-100 border-3 border-neutral-900 flex items-center justify-center">
                    <Star className="w-8 h-8 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900">Feedbacks</h2>
                </div>
                <p className="text-neutral-600 mb-4">
                  Avalie seus gestores de forma anonima. Compartilhe elogios, sugestoes ou criticas construtivas.
                </p>
                <div className="flex items-center gap-2 text-primary-600 font-bold group-hover:gap-3 transition-all">
                  <span>Avaliar gestor</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* Ouvidoria Card */}
            <Link href="/ouvidoria" className="group">
              <div className="bg-white border-3 border-neutral-900 p-8 shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-1 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-red-100 border-3 border-neutral-900 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900">Ouvidoria</h2>
                </div>
                <p className="text-neutral-600 mb-4">
                  Relate situacoes serias de forma confidencial. Suas denuncias serao tratadas pelo RH com sigilo.
                </p>
                <div className="flex items-center gap-2 text-red-600 font-bold group-hover:gap-3 transition-all">
                  <span>Fazer denuncia</span>
                  <span>→</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Secondary Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/gestores"
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Ver gestores</span>
            </Link>
            <Link
              href="/ranking"
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Star className="w-4 h-4" />
              <span>Ranking</span>
            </Link>
          </div>

          {/* Trust Badge */}
          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-3 bg-green-50 border-2 border-green-200 px-6 py-3 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">
                100% Anonimo - Suas respostas nao sao rastreadas
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-neutral-900 bg-white px-6 py-6">
        <div className="max-w-4xl mx-auto text-center text-sm text-neutral-500">
          <p className="font-medium">Ouvidoria - Plataforma de Feedback Empresarial</p>
          <p className="mt-1">Construindo um ambiente de trabalho melhor, uma voz de cada vez.</p>
        </div>
      </footer>
    </div>
  );
}

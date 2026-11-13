'use client';

import { useEffect, useRef, useState } from 'react';
import { Film, Image as ImageIcon, Download, Loader2, Eye } from 'lucide-react';
import type { ProvaDenuncia } from '@/lib/api';
import { formatarTamanho } from '@/lib/provas';

const AUTO_CARREGAR_IMAGEM_ATE = 5 * 1024 * 1024;

// Mostra uma prova (foto ou vídeo) no painel do RH. O arquivo é baixado com o login do admin
// e exibido a partir da memória do navegador; vídeos e fotos grandes só carregam ao clicar.
export function ProvaView({ prova, baixar }: { prova: ProvaDenuncia; baixar: (anexoId: string) => Promise<Blob> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [semPrevia, setSemPrevia] = useState(false);
  const montadoRef = useRef(true);

  // Fotos HEIC (iPhone) não abrem no navegador: só para baixar
  const temPrevia = prova.categoria === 'VIDEO' || (prova.categoria === 'IMAGEM' && !/heic|heif/.test(prova.mimeType));
  const Icone = prova.categoria === 'VIDEO' ? Film : ImageIcon;

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const carregar = async (): Promise<string | null> => {
    if (url) return url;
    setCarregando(true);
    setFalhou(false);
    try {
      const blob = await baixar(prova.id);
      // Se a tela foi fechada enquanto baixava, não guarda o arquivo na memória
      if (!montadoRef.current) return null;
      const novaUrl = URL.createObjectURL(new Blob([blob], { type: prova.mimeType }));
      setUrl(novaUrl);
      return novaUrl;
    } catch {
      if (montadoRef.current) setFalhou(true);
      return null;
    } finally {
      if (montadoRef.current) setCarregando(false);
    }
  };

  useEffect(() => {
    if (temPrevia && prova.categoria === 'IMAGEM' && prova.tamanho <= AUTO_CARREGAR_IMAGEM_ATE) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const baixarArquivo = async () => {
    const link = url || (await carregar());
    if (!link) return;
    const a = document.createElement('a');
    a.href = link;
    a.download = prova.nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const mostrarPrevia = !!url && temPrevia && !semPrevia;
  const botao =
    'inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold border-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-600 disabled:opacity-50';

  return (
    <div className="p-2 border-2 border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 min-w-0">
      {mostrarPrevia && prova.categoria === 'IMAGEM' && (
        <a href={url!} target="_blank" rel="noopener noreferrer" className="block mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url!} alt={prova.nome} className="max-h-56 max-w-full w-auto border border-neutral-300" onError={() => setSemPrevia(true)} />
        </a>
      )}
      {mostrarPrevia && prova.categoria === 'VIDEO' && (
        <video src={url!} controls playsInline className="max-h-64 w-full bg-black mb-2" onError={() => setSemPrevia(true)} />
      )}

      <div className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-200 min-w-0">
        <Icone className="w-4 h-4 shrink-0" />
        <span className="truncate font-semibold" title={prova.nome}>{prova.nome}</span>
        <span className="shrink-0 text-neutral-500 dark:text-neutral-400">{formatarTamanho(prova.tamanho)}</span>
      </div>

      {semPrevia && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Este formato não abre no navegador. Use &quot;Baixar&quot;.</p>
      )}
      {falhou && <p className="text-xs text-red-600 mt-1">Não foi possível carregar o arquivo. Tente novamente.</p>}

      <div className="flex flex-wrap gap-2 mt-2">
        {temPrevia && !url && (
          <button type="button" onClick={carregar} disabled={carregando} className={botao}>
            {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            {carregando ? 'Carregando...' : 'Ver'}
          </button>
        )}
        <button type="button" onClick={baixarArquivo} disabled={carregando} className={botao}>
          <Download className="w-3.5 h-3.5" />
          Baixar
        </button>
      </div>
    </div>
  );
}

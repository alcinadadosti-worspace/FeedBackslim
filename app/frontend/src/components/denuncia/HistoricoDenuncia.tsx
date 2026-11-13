'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, RefreshCw } from 'lucide-react';
import type { ItemHistoricoDenuncia } from '@/lib/api';

// Linha do tempo da denúncia: comentários do RH e mudanças de status, do mais antigo
// ao mais recente. O denunciante vê "RH"; o painel mostra quem escreveu.
export function HistoricoDenuncia({
  itens,
  comentarioAntigo,
  mostrarAutor = false,
  vazio = 'Nenhuma atualização ainda.',
}: {
  itens: ItemHistoricoDenuncia[];
  /** Comentário único da época antes do histórico existir */
  comentarioAntigo?: string | null;
  mostrarAutor?: boolean;
  vazio?: string;
}) {
  if (!itens.length && !comentarioAntigo) {
    return (
      <p className="p-4 text-sm text-center text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
        {vazio}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {comentarioAntigo && (
        <li className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
          <p className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Comentário do RH
          </p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">{comentarioAntigo}</p>
        </li>
      )}
      {itens.map((item) => {
        const quando = format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const autor = mostrarAutor && item.autorNome ? ` · ${item.autorNome}` : '';
        if (item.tipo === 'STATUS') {
          return (
            <li key={item.id} className="flex items-start gap-2 px-3 py-2 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
              <RefreshCw className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                {item.texto}
                <span className="text-neutral-400 dark:text-neutral-500"> · {quando}{autor}</span>
              </span>
            </li>
          );
        }
        return (
          <li key={item.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
            <p className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Comentário do RH
              <span className="font-normal normal-case text-neutral-500 dark:text-neutral-400">· {quando}{autor}</span>
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">{item.texto}</p>
          </li>
        );
      })}
    </ol>
  );
}

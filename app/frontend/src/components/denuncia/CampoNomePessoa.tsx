'use client';

import { useId, useMemo, useState } from 'react';
import clsx from 'clsx';

// Campo "Nome" da pessoa denunciada, com sugestões de pessoas cadastradas (gestores e
// colaboradores) a partir das primeiras letras. A sugestão só ajuda a preencher: qualquer
// nome pode ser digitado, mesmo que não esteja na lista.

export type SugestaoPessoa = {
  nome: string;
  tipo: 'Gestor' | 'Colaborador';
  cargo?: string | null;
  setor?: string | null;
};

const MAX_SUGESTOES = 8;
const MIN_LETRAS = 2;

export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Pessoas cujo nome tem palavras começando com o que foi digitado ("mi car" acha "Michaell ... Carvalho") */
export function filtrarSugestoes(pessoas: SugestaoPessoa[], digitado: string): SugestaoPessoa[] {
  const busca = normalizarBusca(digitado);
  if (busca.replace(/\s/g, '').length < MIN_LETRAS) return [];
  const termos = busca.split(/\s+/).filter(Boolean);

  return pessoas
    .map((p) => {
      const palavras = normalizarBusca(p.nome).split(/\s+/);
      if (!termos.every((t) => palavras.some((w) => w.startsWith(t)))) return null;
      // Quem começa pelo que foi digitado aparece primeiro
      return { p, prioridade: palavras[0].startsWith(termos[0]) ? 0 : 1 };
    })
    .filter((x): x is { p: SugestaoPessoa; prioridade: number } => !!x)
    .sort((a, b) => a.prioridade - b.prioridade || a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
    .slice(0, MAX_SUGESTOES)
    .map((x) => x.p);
}

type Props = {
  name: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  pessoas: SugestaoPessoa[];
  onChange: (nome: string) => void;
  onEscolher: (pessoa: SugestaoPessoa) => void;
};

export function CampoNomePessoa({ name, value, disabled, placeholder, pessoas, onChange, onEscolher }: Props) {
  const idCampo = useId();
  const idLista = useId();
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);

  const sugestoes = useMemo(() => (disabled ? [] : filtrarSugestoes(pessoas, value)), [pessoas, value, disabled]);
  // Não mostra a lista quando o nome digitado já é exatamente o de uma sugestão
  const jaEscolhido = sugestoes.length === 1 && normalizarBusca(sugestoes[0].nome) === normalizarBusca(value);
  const mostrar = aberto && sugestoes.length > 0 && !jaEscolhido;

  const escolher = (pessoa: SugestaoPessoa) => {
    onEscolher(pessoa);
    setAberto(false);
    setAtivo(-1);
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mostrar) {
      if (e.key === 'ArrowDown' && sugestoes.length) {
        setAberto(true);
        setAtivo(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      setAtivo((i) => (i + 1) % sugestoes.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setAtivo((i) => (i <= 0 ? sugestoes.length - 1 : i - 1));
      e.preventDefault();
    } else if (e.key === 'Enter' && ativo >= 0) {
      escolher(sugestoes[ativo]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setAberto(false);
      setAtivo(-1);
    }
  };

  return (
    <div className="w-full">
      <label htmlFor={idCampo} className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 uppercase tracking-wide">
        Nome
      </label>
      <div className="relative">
        <input
          id={idCampo}
          name={name}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mostrar}
          aria-controls={idLista}
          aria-activedescendant={mostrar && ativo >= 0 ? `${idLista}-${ativo}` : undefined}
          autoComplete="off"
          maxLength={120}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setAberto(true);
            setAtivo(-1);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          onKeyDown={aoTeclar}
          className={clsx(
            'w-full px-4 py-3 border-3 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100',
            'placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
            'focus:ring-offset-2 transition-all disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed'
          )}
        />
        {mostrar && (
          <ul
            id={idLista}
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 shadow-brutal"
          >
            {sugestoes.map((p, i) => (
              <li
                key={`${p.tipo}-${p.nome}`}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === ativo}
                // Impede que o campo perca o foco antes do clique (inclusive no celular)
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(p)}
                onMouseEnter={() => setAtivo(i)}
                className={clsx(
                  'px-4 py-2.5 cursor-pointer border-b border-neutral-200 dark:border-neutral-700 last:border-b-0',
                  i === ativo ? 'bg-primary-100 dark:bg-neutral-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'
                )}
              >
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.nome}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {[p.tipo, p.cargo, p.setor].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!disabled && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Digite as primeiras letras para ver sugestões. Se a pessoa não aparecer, escreva o nome mesmo assim.
        </p>
      )}
    </div>
  );
}

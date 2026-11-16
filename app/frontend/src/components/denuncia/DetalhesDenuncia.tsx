'use client';

import { ReactNode } from 'react';
import { Building2, Calendar, Mail, MapPin, Phone, User, Users } from 'lucide-react';
import { CATEGORIA_OUTRO, PessoaDenunciada, rotulos } from '@/lib/denuncia';

// Detalhes de uma denúncia no painel do RH. Mostra os campos do formulário atual e também
// os do formulário anterior (denúncias antigas).

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-1">{titulo}</p>
      {children}
    </div>
  );
}

function Texto({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 p-3 whitespace-pre-wrap break-words">
      {children}
    </p>
  );
}

function Item({ titulo, valor }: { titulo: string; valor: string }) {
  if (!valor) return null;
  return (
    <div className="p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">{titulo}</p>
      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{valor}</p>
    </div>
  );
}

function LinhaIdentificacao({ icone, rotulo, valor }: { icone: ReactNode; rotulo: string; valor?: string | null }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 min-w-0">
      {icone}
      <span className="min-w-0 break-words">
        {rotulo}: <strong>{valor || '—'}</strong>
      </span>
    </div>
  );
}

export function DetalhesDenuncia({ denuncia }: { denuncia: any }) {
  const pessoas: PessoaDenunciada[] = Array.isArray(denuncia.denunciados) ? denuncia.denunciados : [];
  const temas: string[] = Array.isArray(denuncia.temas) ? denuncia.temas : [];

  return (
    <>
      {!denuncia.anonima && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 space-y-1">
          <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-2">Identificação do denunciante</p>
          <LinhaIdentificacao icone={<User className="w-4 h-4 text-blue-600 shrink-0" />} rotulo="Nome" valor={denuncia.nomeIdentificado} />
          <LinhaIdentificacao icone={<Building2 className="w-4 h-4 text-blue-600 shrink-0" />} rotulo="Setor" valor={denuncia.setorIdentificado} />
          {(denuncia.emailIdentificado || denuncia.telefoneIdentificado) && (
            <>
              <LinhaIdentificacao icone={<Mail className="w-4 h-4 text-blue-600 shrink-0" />} rotulo="E-mail" valor={denuncia.emailIdentificado} />
              <LinhaIdentificacao icone={<Phone className="w-4 h-4 text-blue-600 shrink-0" />} rotulo="Telefone" valor={denuncia.telefoneIdentificado} />
            </>
          )}
        </div>
      )}

      {pessoas.length > 0 && (
        <Bloco titulo={pessoas.length === 1 ? 'Pessoa envolvida' : `Pessoas envolvidas (${pessoas.length})`}>
          <ul className="space-y-1.5">
            {pessoas.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-sm"
              >
                <Users className="w-4 h-4 mt-0.5 shrink-0 text-neutral-500" />
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 break-words">
                    {!p.naoSabeNome && p.nome ? p.nome : <span className="italic text-neutral-500 dark:text-neutral-400">Nome não informado</span>}
                  </p>
                  {(p.cargo || p.setor) && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 break-words">
                      {[p.cargo && `Cargo: ${p.cargo}`, p.setor && `Setor: ${p.setor}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {temas.length > 0 && (
        <Bloco titulo="Categorias">
          <div className="flex flex-wrap gap-1.5">
            {temas.map((tema) => (
              <span
                key={tema}
                className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-xs text-neutral-700 dark:text-neutral-300"
              >
                {tema === CATEGORIA_OUTRO && denuncia.temaOutro ? `Outro: ${denuncia.temaOutro}` : tema}
              </span>
            ))}
          </div>
        </Bloco>
      )}

      {(denuncia.local || denuncia.dataFatos) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-sm min-w-0">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-neutral-500" />
            <span className="min-w-0 break-words text-neutral-700 dark:text-neutral-200">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 block">Local</span>
              {denuncia.local || '—'}
            </span>
          </div>
          <div className="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-sm min-w-0">
            <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-neutral-500" />
            <span className="min-w-0 break-words text-neutral-700 dark:text-neutral-200">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 block">Data ou período</span>
              {denuncia.dataFatos || '—'}
            </span>
          </div>
        </div>
      )}

      <Bloco titulo="Descrição">
        <Texto>{denuncia.descricao}</Texto>
      </Bloco>

      {denuncia.descricaoComplementar && (
        <Bloco titulo="Descrição complementar">
          <Texto>{denuncia.descricaoComplementar}</Texto>
        </Bloco>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Item titulo="Tipo de manifestação" valor={rotulos.tipoManifestacao(denuncia.tipoManifestacao)} />
        <Item titulo="Frequência" valor={rotulos.frequencia(denuncia.frequencia)} />
        <Item titulo="Impacto" valor={rotulos.impacto(denuncia.impacto)} />
        <Item titulo="Há testemunhas?" valor={rotulos.simNaoNaoSei(denuncia.testemunhas)} />
        <Item titulo="Ainda está acontecendo?" valor={rotulos.simNaoNaoSei(denuncia.condutaContinua)} />
        <Item titulo="Outros envolvidos" valor={rotulos.envolvidosAntigo(denuncia.envolvidos)} />
        <Item titulo="Já foi comunicada?" valor={rotulos.comunicada(denuncia.comunicada)} />
        <Item titulo="Deseja retorno?" valor={rotulos.retorno(denuncia.desejaRetorno)} />
      </div>

      {denuncia.testemunhasDetalhes && (
        <Bloco titulo="Testemunhas">
          <Texto>{denuncia.testemunhasDetalhes}</Texto>
        </Bloco>
      )}

      {denuncia.providenciaTomada && (
        <Bloco titulo="Providência tomada">
          <Texto>{denuncia.providenciaTomada}</Texto>
        </Bloco>
      )}
    </>
  );
}

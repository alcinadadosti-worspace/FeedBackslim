// Comparação de nomes digitados à mão (pessoas citadas na denúncia) com nomes cadastrados.
// Usada para que um admin citado numa denúncia não receba o aviso no Slack nem veja a
// denúncia no painel.

const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

export function palavrasDoNome(nome: string | null | undefined): string[] {
  return (nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    // Letras repetidas contam uma vez: "Michaell" = "Michael", "Anna" = "Ana"
    .map((p) => p.replace(/(.)\1+/g, '$1'))
    .filter((p) => p.length >= 2 && !PARTICULAS.has(p));
}

// Quantas letras é preciso trocar, incluir ou apagar para uma palavra virar a outra
function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2; // só interessa saber se é 0, 1 ou "mais"
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length];
}

// Aceita uma letra de diferença em palavras de 4 letras ou mais, para pegar grafias comuns:
// "Michael" x "Michaell", "Luis" x "Luiz", "Carvalo" x "Carvalho"
function palavraCorresponde(digitada: string, doNome: string): boolean {
  if (digitada === doNome) return true;
  return Math.min(digitada.length, doNome.length) >= 4 && distancia(digitada, doNome) <= 1;
}

/**
 * true se o nome digitado pode ser o desta pessoa: cada palavra digitada aparece no nome
 * completo (sem diferenciar acentos e maiúsculas, tolerando uma letra de diferença).
 * Ex.: "joao silva" e "João" correspondem a "João Carlos da Silva".
 * Na dúvida, prefere considerar que é a pessoa: é mais seguro esconder a denúncia de um admin
 * a mais do que mostrar ao próprio denunciado.
 */
export function nomeCorresponde(digitado: string | null | undefined, nomeCompleto: string | null | undefined): boolean {
  const digitadas = palavrasDoNome(digitado);
  const completo = palavrasDoNome(nomeCompleto);
  return digitadas.length > 0 && completo.length > 0 && digitadas.every((p) => completo.some((c) => palavraCorresponde(p, c)));
}

export function algumNomeCorresponde(digitados: (string | null | undefined)[] | undefined, nomeCompleto: string | null | undefined) {
  return (digitados || []).some((n) => nomeCorresponde(n, nomeCompleto));
}

/** Pessoas citadas numa denúncia nova (campos livres) */
export interface PessoaDenunciada {
  nome: string | null;
  naoSabeNome: boolean;
  cargo: string | null;
  setor: string | null;
}

export function nomesDosDenunciados(denuncia: { denunciados?: PessoaDenunciada[] | null }): string[] {
  return (Array.isArray(denuncia.denunciados) ? denuncia.denunciados : [])
    .map((p) => (p && !p.naoSabeNome ? p.nome : null))
    .filter((n): n is string => !!n);
}

/** Ex.: "João Silva (Gerente, Vendas); Nome não informado (Caixa)" */
export function resumoDosDenunciados(pessoas: PessoaDenunciada[]): string {
  return pessoas
    .map((p) => {
      const nome = !p.naoSabeNome && p.nome ? p.nome : 'Nome não informado';
      const detalhes = [p.cargo, p.setor].filter(Boolean).join(', ');
      return detalhes ? `${nome} (${detalhes})` : nome;
    })
    .join('; ');
}

/**
 * Destinatários do aviso de denúncia, sem a pessoa denunciada:
 * pelo Slack ID (denúncias antigas, escolhidas numa lista) ou pelo nome digitado (denúncias novas).
 */
export function destinatariosSemDenunciados(
  destinatarios: { slackId: string; nome?: string | null }[],
  denunciado: { slackId?: string | null; nomes?: string[] }
): string[] {
  return Array.from(
    new Set(
      destinatarios
        .filter((d) => !(denunciado.slackId && d.slackId === denunciado.slackId))
        .filter((d) => !(d.nome && algumNomeCorresponde(denunciado.nomes, d.nome)))
        .map((d) => d.slackId)
    )
  );
}

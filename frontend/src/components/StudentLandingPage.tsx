import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  Award,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  Lock,
  MapPin,
  Maximize2,
  MessageSquareText,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { APP_VERSION } from '../config/version';
import {
  calcularNivelMsep,
  formatarDataPrevistaBr,
  obterAdiamentoDataFuturaAtivo,
  obterNomesAvaliadoresBanca,
  recalcularConsolidadaExistente,
} from '../services/bancaMultiAvaliador';
import type {
  AvaliacaoGrupo,
  NivelMSEP,
  NotaIndividualIntegrante,
  RegistroHistoricoPendencia,
  ResultadoFinalTipo,
  RubricaItemAvaliacao,
  SessaoBancaAoVivo,
} from '../types';

interface StudentLandingPageProps {
  bancas: AvaliacaoGrupo[];
  mapaSessoesBanca: Record<string, SessaoBancaAoVivo>;
  carregando: boolean;
  usuarioAutenticado: boolean;
  onIrParaProfessor: () => void;
}

interface ItemMsepAluno {
  codigo: string;
  pilar: number;
  titulo: string;
  peso_max: number;
  nota: number;
  nivel: NivelMSEP;
  individual: boolean;
  detalheExtra?: string;
}

const PILARES_META: Record<number, { titulo: string; subtitulo: string; pesoMax: number }> = {
  1: { titulo: 'Pilar 1 — Documentação TCC', subtitulo: 'Monografia, requisitos, modelagem e planejamento', pesoMax: 30 },
  2: { titulo: 'Pilar 2 — Sistema Funcional', subtitulo: 'Backend, frontend, banco de dados e deploy online', pesoMax: 40 },
  3: { titulo: 'Pilar 3 — Apresentação & Defesa', subtitulo: 'Arguição individual, postura, tempo e slides', pesoMax: 15 },
  4: { titulo: 'Pilar 4 — Processo & Participação', subtitulo: 'Entregas de sprints/relatórios e participação em aula', pesoMax: 15 },
};

function parseDataIso(dataBr: string): string {
  if (!dataBr) return '9999-99-99';
  if (dataBr.includes('/')) {
    const p = dataBr.split('/');
    if (p.length === 3) {
      return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
  }
  return dataBr;
}

function parseHorarioPeso(horario: string): number {
  const h = (horario || '').toLowerCase();
  if (h.includes('primeiro')) return 1;
  if (h.includes('segundo')) return 2;
  if (h.includes('terceiro')) return 3;
  if (h.includes('quarto')) return 4;
  return 99;
}

function compararOrdemApresentacao(a: AvaliacaoGrupo, b: AvaliacaoGrupo): number {
  const compTurma = a.turma.localeCompare(b.turma);
  if (compTurma !== 0) return compTurma;
  const ordDiff = (a.ordem_apresentacao || 999) - (b.ordem_apresentacao || 999);
  if (ordDiff !== 0) return ordDiff;
  const dataA = a.data_banca_iso || parseDataIso(a.data_banca);
  const dataB = b.data_banca_iso || parseDataIso(b.data_banca);
  const compData = dataA.localeCompare(dataB);
  if (compData !== 0) return compData;
  return parseHorarioPeso(a.horario) - parseHorarioPeso(b.horario);
}

function resolverDadosBancaRealizada(
  banca: AvaliacaoGrupo,
  sessao?: SessaoBancaAoVivo,
) {
  const realizada = sessao?.status === 'concluida' || Boolean(banca.banca_realizada);
  const emAndamento = sessao?.status === 'em_andamento';
  const consolidada = sessao?.banca_consolidada
    ? recalcularConsolidadaExistente(
        sessao.banca_consolidada,
        banca,
        sessao.status_liberacao_final ?? null,
      )
    : undefined;

  const p1 = consolidada?.media_p1 ?? banca.p1_total;
  const p2 = consolidada?.media_p2 ?? banca.p2_total;
  const p3 = consolidada?.media_p3 ?? banca.p3_grupo_base;
  const mediaP4Backend =
    banca.integrantes_notas.length > 0
      ? banca.integrantes_notas.reduce((acc, i) => acc + i.p4_nota, 0) /
        banca.integrantes_notas.length
      : 0;
  const p4 = consolidada?.media_p4 ?? mediaP4Backend;
  const mediaFinal =
    consolidada?.media_final ??
    sessao?.media_final_consolidada ??
    banca.media_nota_final_grupo;

  const integrantes: NotaIndividualIntegrante[] =
    consolidada?.integrantes_medias && consolidada.integrantes_medias.length > 0
      ? consolidada.integrantes_medias
      : banca.integrantes_notas;

  const rubricas: RubricaItemAvaliacao[] =
    consolidada?.rubricas_medias && consolidada.rubricas_medias.length > 0
      ? consolidada.rubricas_medias
      : banca.rubricas || [];

  const statusLiberacao: ResultadoFinalTipo =
    sessao?.status_liberacao_final ??
    consolidada?.status_liberacao_final ??
    banca.status_liberacao_nota;

  const pendenciasTexto =
    sessao?.pendencias_descricao !== undefined && sessao.pendencias_descricao.trim() !== ''
      ? sessao.pendencias_descricao.trim()
      : (banca.itens_insuficientes_grupo || []).join('\n');

  const pendenciasCumpridas = Boolean(sessao?.pendencias_cumpridas);
  const possuiPendencias = Boolean(
    realizada &&
      (sessao?.possui_pendencias ||
        pendenciasTexto.length > 0 ||
        statusLiberacao === 'Nota Retida (Pendências)' ||
        statusLiberacao === 'Nova Chance (Data Futura)'),
  );

  // Considerações escritas exclusivamente pelos professores avaliadores durante/após a banca
  const pareceresBrutos =
    consolidada?.pareceres_professores && consolidada.pareceres_professores.length > 0
      ? consolidada.pareceres_professores
      : Object.values(consolidada?.avaliacoes_individuais || {}).map((av) => ({
          professor_nome: av.professor_nome,
          parecer: av.parecer_tecnico,
          atualizado_em: av.atualizado_em,
        }));
  const consideracoesProfessores = pareceresBrutos.filter(
    (p) => Boolean(p.parecer && p.parecer.trim().length > 0),
  );

  const revisaoPosBanca = sessao?.revisao_pos_banca || banca.revisao_pos_banca || null;
  const adiamentoAtivo = obterAdiamentoDataFuturaAtivo(banca, sessao);
  const historicoPendencias: RegistroHistoricoPendencia[] =
    sessao?.historico_pendencias && sessao.historico_pendencias.length > 0
      ? sessao.historico_pendencias
      : banca.historico_pendencias || [];
  const nomesAvaliadores = obterNomesAvaliadoresBanca(sessao, consolidada, banca);

  return {
    realizada,
    emAndamento,
    adiamentoAtivo,
    p1,
    p2,
    p3,
    p4,
    mediaFinal,
    integrantes,
    rubricas,
    statusLiberacao,
    pendenciasTexto,
    pendenciasCumpridas,
    pendenciasCumpridasEm: sessao?.pendencias_cumpridas_em || null,
    possuiPendencias,
    consideracoesProfessores,
    revisaoPosBanca,
    historicoPendencias,
    nomesAvaliadores,
  };
}

/**
 * Monta a lista completa dos itens MSEP (Pilares 1 a 4) para um integrante específico,
 * combinando as rubricas coletivas do grupo com as parciais individuais (3.1, 4.1 e 4.2).
 */
function montarCriteriosMsepDoAluno(
  rubricasGrupo: RubricaItemAvaliacao[],
  aluno: NotaIndividualIntegrante,
): ItemMsepAluno[] {
  const mapa = new Map<string, ItemMsepAluno>();

  rubricasGrupo.forEach((r) => {
    const cod = r.codigo;
    const isIndividual = cod === '3.1' || cod === '4.1' || cod === '4.2';
    mapa.set(cod, {
      codigo: cod,
      pilar: r.pilar,
      titulo: r.titulo,
      peso_max: r.peso_max,
      nota: r.nota,
      nivel: r.nivel || calcularNivelMsep(r.nota, r.peso_max),
      individual: isIndividual,
    });
  });

  // Sobrescreve os itens individuais com os valores exatos do integrante
  const item31Base = mapa.get('3.1');
  mapa.set('3.1', {
    codigo: '3.1',
    pilar: 3,
    titulo: item31Base?.titulo || 'Domínio Técnico & Arguição Individual',
    peso_max: item31Base?.peso_max || 6,
    nota: aluno.nota_3_1_arguicao,
    nivel: aluno.nivel_3_1 || calcularNivelMsep(aluno.nota_3_1_arguicao, item31Base?.peso_max || 6),
    individual: true,
  });

  const item41Base = mapa.get('4.1');
  const detalhe41 =
    aluno.total_relatorios > 0
      ? `${aluno.relatorios_entregues}/${aluno.total_relatorios} relatórios entregues`
      : undefined;
  mapa.set('4.1', {
    codigo: '4.1',
    pilar: 4,
    titulo: item41Base?.titulo || 'Entregas Parciais / Sprints & Relatórios',
    peso_max: item41Base?.peso_max || 8,
    nota: aluno.nota_4_1_sprints,
    nivel: aluno.nivel_4_1 || calcularNivelMsep(aluno.nota_4_1_sprints, item41Base?.peso_max || 8),
    individual: true,
    detalheExtra: detalhe41,
  });

  const item42Base = mapa.get('4.2');
  const detalhe42 =
    aluno.total_aulas_turma > 0
      ? `${aluno.aulas_participadas}/${aluno.total_aulas_turma} aulas participadas`
      : undefined;
  mapa.set('4.2', {
    codigo: '4.2',
    pilar: 4,
    titulo: item42Base?.titulo || 'Participação Ativa & Frequência nas Aulas',
    peso_max: item42Base?.peso_max || 7,
    nota: aluno.nota_4_2_participacao,
    nivel: aluno.nivel_4_2 || calcularNivelMsep(aluno.nota_4_2_participacao, item42Base?.peso_max || 7),
    individual: true,
    detalheExtra: detalhe42,
  });

  return Array.from(mapa.values()).sort((a, b) => {
    if (a.pilar !== b.pilar) return a.pilar - b.pilar;
    return a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
  });
}

function obterEstilosNivelMsep(nivel: NivelMSEP) {
  switch (nivel) {
    case 'Avançado':
      return {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        bar: 'bg-emerald-500',
      };
    case 'Pleno':
      return {
        badge: 'border-sky-200 bg-sky-50 text-sky-800',
        bar: 'bg-sky-500',
      };
    case 'Insuficiente':
      return {
        badge: 'border-red-200 bg-red-50 text-red-800',
        bar: 'bg-red-500',
      };
    default:
      return {
        badge: 'border-slate-200 bg-slate-100 text-slate-600',
        bar: 'bg-slate-400',
      };
  }
}

export function StudentLandingPage({
  bancas,
  mapaSessoesBanca,
  carregando,
  usuarioAutenticado,
  onIrParaProfessor,
}: StudentLandingPageProps) {
  const [turmaSelecionada, setTurmaSelecionada] = useState<'Todas' | 'I2DEV-A' | 'I2DEV-B'>('Todas');
  const [situacaoFiltro, setSituacaoFiltro] = useState<'todas' | 'realizadas' | 'proximas' | 'pendencias'>('todas');
  const [busca, setBusca] = useState('');

  // Modais exclusivos da página do aluno
  const [bancaExpandidaId, setBancaExpandidaId] = useState<string | null>(null);
  const [msepModalState, setMsepModalState] = useState<{
    bancaId: string;
    alunoNome: string;
  } | null>(null);
  const [arquivosModalBancaId, setArquivosModalBancaId] = useState<string | null>(null);

  // Fechar modais com tecla Escape (prioridade para o modal mais acima)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (msepModalState) {
        setMsepModalState(null);
      } else if (arquivosModalBancaId) {
        setArquivosModalBancaId(null);
      } else if (bancaExpandidaId) {
        setBancaExpandidaId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [msepModalState, arquivosModalBancaId, bancaExpandidaId]);

  // Travar scroll do fundo quando houver algum modal aberto
  useEffect(() => {
    const algumModalAberto = Boolean(bancaExpandidaId || msepModalState || arquivosModalBancaId);
    if (!algumModalAberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [bancaExpandidaId, msepModalState, arquivosModalBancaId]);

  const bancasOrdenadas = useMemo(() => {
    return [...bancas].sort(compararOrdemApresentacao);
  }, [bancas]);

  const mapaBancasPorId = useMemo(() => {
    const mapa: Record<string, AvaliacaoGrupo> = {};
    bancasOrdenadas.forEach((b) => {
      mapa[b.id] = b;
    });
    return mapa;
  }, [bancasOrdenadas]);

  const resumoStats = useMemo(() => {
    let realizadas = 0;
    let entregues = 0;
    let aoVivo = 0;
    let proximas = 0;

    bancasOrdenadas.forEach((b) => {
      const info = resolverDadosBancaRealizada(b, mapaSessoesBanca[b.id]);
      if (b.entregue_na_pasta) entregues += 1;
      if (info.realizada) {
        realizadas += 1;
      } else {
        proximas += 1;
        if (info.emAndamento) aoVivo += 1;
      }
    });

    return {
      total: bancasOrdenadas.length,
      realizadas,
      entregues,
      proximas,
      aoVivo,
    };
  }, [bancasOrdenadas, mapaSessoesBanca]);

  const bancasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return bancasOrdenadas.filter((b) => {
      if (turmaSelecionada !== 'Todas' && b.turma !== turmaSelecionada) return false;

      const info = resolverDadosBancaRealizada(b, mapaSessoesBanca[b.id]);
      if (situacaoFiltro === 'realizadas' && !info.realizada) return false;
      if (situacaoFiltro === 'proximas' && info.realizada) return false;
      if (
        situacaoFiltro === 'pendencias' &&
        !info.adiamentoAtivo &&
        (!info.realizada || (!info.possuiPendencias && info.statusLiberacao === 'Aprovado'))
      ) {
        return false;
      }

      if (q) {
        const alvo = `${b.turma} ${b.grupo} ${b.projeto} ${b.tema} ${b.integrantes.join(' ')}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [bancasOrdenadas, mapaSessoesBanca, turmaSelecionada, situacaoFiltro, busca]);

  const gruposPorTurma = useMemo(() => {
    const turmas: ('I2DEV-A' | 'I2DEV-B')[] =
      turmaSelecionada === 'Todas' ? ['I2DEV-A', 'I2DEV-B'] : [turmaSelecionada];
    return turmas
      .map((t) => ({
        turma: t,
        itens: bancasFiltradas.filter((b) => b.turma === t),
      }))
      .filter((sec) => sec.itens.length > 0);
  }, [bancasFiltradas, turmaSelecionada]);

  // Dados ativos para os modais
  const bancaExpandida = bancaExpandidaId ? mapaBancasPorId[bancaExpandidaId] : null;
  const infoExpandida = bancaExpandida
    ? resolverDadosBancaRealizada(bancaExpandida, mapaSessoesBanca[bancaExpandida.id])
    : null;
  const sessaoExpandida = bancaExpandida ? mapaSessoesBanca[bancaExpandida.id] : undefined;

  const bancaMsep = msepModalState ? mapaBancasPorId[msepModalState.bancaId] : null;
  const infoMsep = bancaMsep
    ? resolverDadosBancaRealizada(bancaMsep, mapaSessoesBanca[bancaMsep.id])
    : null;
  const alunoMsepSelecionado =
    infoMsep && msepModalState
      ? infoMsep.integrantes.find((i) => i.nome === msepModalState.alunoNome) ||
        infoMsep.integrantes[0] ||
        null
      : null;

  const bancaArquivos = arquivosModalBancaId ? mapaBancasPorId[arquivosModalBancaId] : null;

  const abrirModalMsep = (banca: AvaliacaoGrupo, alunoNome?: string) => {
    const info = resolverDadosBancaRealizada(banca, mapaSessoesBanca[banca.id]);
    const primeiroNome = alunoNome || info.integrantes[0]?.nome || banca.integrantes[0] || '';
    if (!primeiroNome) return;
    setMsepModalState({ bancaId: banca.id, alunoNome: primeiroNome });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navegação Superior Única (Fixa, altura 64px, alto contraste) */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/92 text-white backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-red-600 ring-1 ring-white/15">
              <img src="/senai_icon.png" alt="SENAI Ourinhos" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-extrabold tracking-tight sm:text-base">
                  Portal das Bancas TCC — SENAI Ourinhos
                </span>
                <span className="hidden rounded-md border border-red-500/40 bg-red-600/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-300 sm:inline-block">
                  PSOF3 v{APP_VERSION}
                </span>
              </div>
              <p className="hidden truncate text-[11px] text-slate-400 sm:block">
                Técnico em Desenvolvimento de Sistemas • I2DEV-A &amp; I2DEV-B
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {resumoStats.aoVivo > 0 && (
              <span className="hidden items-center gap-1.5 rounded-full border border-red-500/40 bg-red-600/20 px-3 py-1 text-xs font-bold text-red-200 md:inline-flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                {resumoStats.aoVivo} Banca Ao Vivo
              </span>
            )}
            <button
              type="button"
              onClick={onIrParaProfessor}
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition duration-200 hover:bg-red-500 active:scale-[0.98]"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{usuarioAutenticado ? 'Painel do Professor' : 'Área do Professor'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Institucional Escuro de Alto Impacto (Moderno Institucional SENAI) */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950 text-white">
        {/* Linha de acento SENAI no topo + grade técnica sutil */}
        <div className="h-1 w-full bg-red-600" />
        <div className="student-hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-red-600/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-600/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300">
                <GraduationCap className="h-3.5 w-3.5" />
                Portal Oficial dos Alunos • PSOF3 — SENAI Ourinhos
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Acompanhe sua Banca e Resultados de TCC
              </h1>
              <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-slate-300 sm:text-base">
                Consulte o andamento das apresentações das turmas{' '}
                <strong className="text-white">I2DEV-A</strong> e{' '}
                <strong className="text-white">I2DEV-B</strong>: status da banca, notas liberadas,
                detalhamento completo por integrante e critérios oficiais da rubrica{' '}
                <strong className="text-white">MSEP</strong>.
              </p>

              {/* Composição dos 100 pts */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-slate-100">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-red-500" />
                    Composição da Nota Final (Total: 100 pts)
                  </span>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                    Mínimo p/ aprovação: 50,00 pts
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { label: 'Pilar 1 • Doc TCC', pts: '30 pts' },
                    { label: 'Pilar 2 • Sistema', pts: '40 pts' },
                    { label: 'Pilar 3 • Defesa', pts: '15 pts' },
                    { label: 'Pilar 4 • Sprints', pts: '15 pts' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-center transition duration-200 hover:border-red-500/40"
                    >
                      <span className="block text-[10px] font-bold uppercase text-slate-400">
                        {item.label}
                      </span>
                      <strong className="font-mono text-sm font-black text-white">{item.pts}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ação Principal + Filtros de Turma */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <a
                  href="#resultados-bancas"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById('resultados-bancas')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition duration-200 hover:bg-red-500 active:scale-[0.98]"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Ver Cronograma e Notas
                </a>

                {(['Todas', 'I2DEV-A', 'I2DEV-B'] as const).map((turma) => (
                  <button
                    key={turma}
                    type="button"
                    onClick={() => setTurmaSelecionada(turma)}
                    className={`cursor-pointer whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-bold transition duration-200 active:scale-[0.98] ${
                      turmaSelecionada === turma
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {turma === 'Todas' ? `Todas (${resumoStats.total})` : `Turma ${turma}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Painel de Métricas Reais + Legenda de Status */}
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 transition duration-200 hover:border-white/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total de Bancas
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 text-2xl font-black text-white">
                    {resumoStats.total}
                    <span className="text-xs font-semibold text-slate-400">agendadas</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/35 p-4 transition duration-200 hover:border-emerald-400/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    Já Realizadas
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 text-2xl font-black text-emerald-400">
                    {resumoStats.realizadas}
                    <span className="text-xs font-semibold text-emerald-300/80">concluídas</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 transition duration-200 hover:border-white/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Arquivos Recebidos
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 text-2xl font-black text-white">
                    {resumoStats.entregues}
                    <span className="text-xs font-semibold text-slate-400">
                      de {resumoStats.total} grupos
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 transition duration-200 hover:border-amber-400/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Próximas Bancas
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 text-2xl font-black text-amber-400">
                    {resumoStats.proximas}
                    <span className="text-xs font-semibold text-amber-300/80">aguardando</span>
                  </p>
                </div>
              </div>

              {/* Legenda das Cores de Status */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Legenda Visual de Status nos Cards
                </span>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-200">
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-950/60 px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                    <span className="truncate">Aguardando Banca</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-slate-950/60 px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                    <span className="truncate">Nota Liberada</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-orange-500/40 bg-slate-950/60 px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                    <span className="truncate">Nota Retida</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-slate-950/60 px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
                    <span className="truncate">Nova Apresentação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal: Filtros + Grade de Cards Compactos (3 colunas) */}
      <main id="resultados-bancas" className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6">
        {/* Barra de Filtros e Busca */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'todas', label: 'Todas as Apresentações' },
                { id: 'proximas', label: 'Ainda Vão Ocorrer' },
                { id: 'realizadas', label: 'Já Realizadas (Com Notas)' },
                { id: 'pendencias', label: 'Com Pendências / Retidas' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSituacaoFiltro(opt.id)}
                className={`cursor-pointer whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition duration-200 active:scale-[0.98] ${
                  situacaoFiltro === opt.id
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno, grupo ou projeto..."
              aria-label="Buscar aluno, grupo ou projeto"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-500 transition focus:border-red-500 focus:bg-white focus:outline-none"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-2 cursor-pointer rounded-md p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Estado de Carregamento (Skeleton no formato exato de 3 colunas) */}
        {carregando ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((sk) => (
              <div
                key={sk}
                className="flex h-[340px] animate-pulse flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="h-6 w-24 rounded-lg bg-slate-200" />
                    <div className="h-6 w-28 rounded-full bg-slate-200" />
                  </div>
                  <div className="h-5 w-4/5 rounded bg-slate-200" />
                  <div className="h-4 w-2/3 rounded bg-slate-100" />
                </div>
                <div className="h-20 rounded-xl bg-slate-100" />
                <div className="flex gap-2">
                  <div className="h-9 flex-1 rounded-xl bg-slate-200" />
                  <div className="h-9 flex-1 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : gruposPorTurma.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs">
            <Users className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-3 text-base font-bold text-slate-800">
              Nenhuma apresentação encontrada com os filtros atuais
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Limpe o campo de busca ou altere o filtro de turma para visualizar todo o cronograma.
            </p>
          </div>
        ) : (
          gruposPorTurma.map((secaoTurma) => (
            <section key={secaoTurma.turma} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-slate-900 px-3 py-1 text-sm font-black tracking-wide text-white">
                    {secaoTurma.turma}
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Ordem Oficial de Apresentações — {secaoTurma.turma}
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {secaoTurma.itens.length} apresentação(ões)
                </span>
              </div>

              {/* Grade de 3 Cards por linha com altura uniforme */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {secaoTurma.itens.map((banca, idx) => {
                  const sessao = mapaSessoesBanca[banca.id];
                  const info = resolverDadosBancaRealizada(banca, sessao);
                  const arquivosEncontrados = banca.arquivos_entregues.filter((a) => a.encontrado);
                  const notaLiberada = info.realizada && info.statusLiberacao === 'Aprovado';
                  const notaRetida =
                    info.realizada && info.statusLiberacao === 'Nota Retida (Pendências)';
                  const novaApresentacao =
                    info.realizada && info.statusLiberacao === 'Nova Chance (Data Futura)';

                  // Cores semânticas de barra superior e borda
                  const faixaTopo = info.emAndamento
                    ? 'bg-red-600'
                    : !info.realizada
                    ? info.adiamentoAtivo
                      ? 'bg-red-600'
                      : 'bg-amber-400'
                    : notaLiberada
                    ? 'bg-emerald-500'
                    : notaRetida
                    ? 'bg-orange-500'
                    : 'bg-red-600';

                  const bordaCard = info.emAndamento
                    ? 'border-red-300 ring-2 ring-red-200/80 hover:border-red-500'
                    : !info.realizada
                    ? info.adiamentoAtivo
                      ? 'border-red-200 hover:border-red-400'
                      : 'border-amber-200/90 hover:border-amber-400'
                    : notaLiberada
                    ? 'border-emerald-200 hover:border-emerald-400'
                    : notaRetida
                    ? 'border-orange-200 hover:border-orange-400'
                    : 'border-red-200 hover:border-red-400';

                  const percentualNota = Math.min(100, Math.max(0, info.mediaFinal));

                  return (
                    <article
                      key={banca.id}
                      style={{ animationDelay: `${Math.min(idx * 45, 360)}ms` }}
                      className={`student-card-enter group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/8 ${bordaCard}`}
                    >
                      {/* Faixa de status superior */}
                      <div className={`h-1.5 w-full ${faixaTopo}`} />

                      {/* Conteúdo principal do card compacto */}
                      <div className="flex flex-1 flex-col p-5">
                        {/* Linha 1: Ordem + Grupo + Selo de Estado */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-mono text-xs font-black text-white">
                              #{String(banca.ordem_apresentacao).padStart(2, '0')}
                            </span>
                            <span className="truncate rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                              {banca.grupo}
                            </span>
                          </div>

                          {/* Badge do Estado Atual */}
                          {info.realizada ? (
                            <span
                              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                notaLiberada
                                  ? 'bg-emerald-600 text-white'
                                  : notaRetida
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-red-600 text-white'
                              }`}
                            >
                              {notaLiberada && <CheckCircle2 className="h-3 w-3" />}
                              {notaRetida && <Lock className="h-3 w-3" />}
                              {novaApresentacao && <XCircle className="h-3 w-3" />}
                              <span>
                                {notaLiberada
                                  ? 'Nota Liberada'
                                  : notaRetida
                                  ? 'Nota Retida'
                                  : 'Nova Banca'}
                              </span>
                            </span>
                          ) : info.emAndamento ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                              Ao Vivo
                            </span>
                          ) : info.adiamentoAtivo ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                              <CalendarClock className="h-3 w-3" />
                              Data Futura
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                              <Clock className="h-3 w-3 text-amber-700" />
                              Aguardando
                            </span>
                          )}
                        </div>

                        {/* Linha 2: Projeto e Tema (altura controlada para simetria total) */}
                        <div className="mt-3.5">
                          <h3
                            title={banca.projeto}
                            className="line-clamp-2 min-h-[2.75rem] text-[15px] font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-red-600"
                          >
                            {banca.projeto}
                          </h3>
                          <p
                            title={banca.tema}
                            className="mt-1 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-slate-500"
                          >
                            {banca.tema}
                          </p>
                        </div>

                        {/* Linha 3: Metadados de Agendamento */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-red-600" />
                            {banca.data_banca}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {banca.horario}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            Sala {banca.sala}
                          </span>
                        </div>

                        {/* Linha 4: Integrantes (compacto com altura uniforme) */}
                        <div className="mt-3 flex min-h-[1.75rem] flex-wrap items-center gap-1">
                          {banca.integrantes.slice(0, 4).map((nome) => (
                            <span
                              key={nome}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                            >
                              {nome}
                            </span>
                          ))}
                          {banca.integrantes.length > 4 && (
                            <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              +{banca.integrantes.length - 4}
                            </span>
                          )}
                        </div>

                        {/* Bloco Central: Foco no Estado Atual e Nota Liberada */}
                        <div className="mt-4 flex-1">
                          {notaLiberada ? (
                            <div className="flex h-full flex-col justify-center rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                                  Nota do Grupo Liberada
                                </span>
                                <span className="font-mono text-2xl font-black tracking-tight text-emerald-700">
                                  {info.mediaFinal.toFixed(2)}
                                  <span className="ml-0.5 text-xs font-bold text-emerald-600/80">
                                    pts
                                  </span>
                                </span>
                              </div>
                              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-200/70">
                                <div
                                  className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                                  style={{ width: `${percentualNota}%` }}
                                />
                              </div>
                              <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-emerald-800/80">
                                <span>Escala de 0 a 100 pts</span>
                                <span>{info.nomesAvaliadores.length || 2} avaliador(es)</span>
                              </div>
                            </div>
                          ) : notaRetida ? (
                            <div className="flex h-full flex-col justify-center rounded-xl border border-orange-200 bg-orange-50/80 p-3.5">
                              <div className="flex items-center gap-2 text-xs font-extrabold text-orange-900">
                                <Lock className="h-4 w-4 shrink-0 text-orange-600" />
                                <span>Nota Retida por Pendências</span>
                              </div>
                              <p className="mt-1 text-[11px] leading-snug text-orange-800/90">
                                {info.revisaoPosBanca?.status === 'aguardando_validacao'
                                  ? 'Arquivos revisados recebidos — aguardando validação docente.'
                                  : 'Expanda os detalhes para consultar as pendências e parciais.'}
                              </p>
                            </div>
                          ) : novaApresentacao ? (
                            <div className="flex h-full flex-col justify-center rounded-xl border border-red-200 bg-red-50/80 p-3.5">
                              <div className="flex items-center gap-2 text-xs font-extrabold text-red-900">
                                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>Nova Apresentação Agendada</span>
                              </div>
                              <p className="mt-1 text-[11px] leading-snug text-red-800/90">
                                Expanda o card para ver as orientações e critérios da banca.
                              </p>
                            </div>
                          ) : info.emAndamento ? (
                            <div className="flex h-full flex-col justify-center rounded-xl border border-red-300 bg-red-50/80 p-3.5">
                              <div className="flex items-center gap-2 text-xs font-extrabold text-red-800">
                                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
                                <span>Apresentação em Andamento</span>
                              </div>
                              <p className="mt-1 text-[11px] text-red-700/90">
                                Os avaliadores estão registrando as notas da banca neste momento.
                              </p>
                            </div>
                          ) : info.adiamentoAtivo ? (
                            <div className="flex h-full flex-col justify-center rounded-xl border border-red-200 bg-red-50/70 p-3.5">
                              <div className="flex items-center gap-2 text-xs font-extrabold text-red-900">
                                <CalendarClock className="h-4 w-4 shrink-0 text-red-600" />
                                <span>Não Apresentou — Data Futura</span>
                              </div>
                              <p className="mt-1 font-mono text-[11px] font-bold text-red-800">
                                Nova previsão:{' '}
                                {formatarDataPrevistaBr(info.adiamentoAtivo.nova_data_prevista)}
                              </p>
                            </div>
                          ) : (
                            <div className="flex h-full flex-col justify-center rounded-xl border border-slate-200 bg-slate-50/90 p-3.5">
                              <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800">
                                <span className="inline-flex items-center gap-1.5">
                                  {banca.entregue_na_pasta ? (
                                    <FileCheck2 className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <FolderOpen className="h-4 w-4 text-amber-600" />
                                  )}
                                  {banca.entregue_na_pasta
                                    ? 'Arquivos Entregues'
                                    : 'Entrega Pendente'}
                                </span>
                                {banca.entregue_na_pasta && (
                                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-800">
                                    {arquivosEncontrados.length}/{banca.arquivos_entregues.length || 7}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {banca.entregue_na_pasta
                                  ? 'Entrega recebida. Aguardando realização da banca.'
                                  : 'Aguardando envio dos arquivos na pasta oficial da turma.'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Rodapé do Card (alinhado na base para todos terem exatamente o mesmo tamanho) */}
                        <div className="mt-4 border-t border-slate-100 pt-3.5">
                          {info.realizada ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setBancaExpandidaId(banca.id)}
                                className="inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xs transition duration-200 hover:bg-red-600 active:scale-[0.98]"
                              >
                                <Maximize2 className="h-3.5 w-3.5" />
                                <span>Expandir</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirModalMsep(banca)}
                                className="inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition duration-200 hover:border-slate-900 hover:bg-slate-50 active:scale-[0.98]"
                              >
                                <ClipboardList className="h-3.5 w-3.5 text-red-600" />
                                <span>Critérios MSEP</span>
                              </button>
                            </div>
                          ) : banca.entregue_na_pasta && banca.arquivos_entregues.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setArquivosModalBancaId(banca.id)}
                              className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98]"
                            >
                              <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>
                                Ver Checklist de Arquivos ({arquivosEncontrados.length}/
                                {banca.arquivos_entregues.length})
                              </span>
                            </button>
                          ) : (
                            <div className="flex h-[34px] items-center justify-center rounded-xl bg-slate-50 text-[11px] font-semibold text-slate-400">
                              Detalhes disponíveis após a banca
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ========================================================================
          MODAL 1: CARD EXPANDIDO (EXIBE TUDO COMO ANTES + BOTÃO CRITÉRIOS MSEP)
         ======================================================================== */}
      {bancaExpandida && infoExpandida && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-banca-expandida-titulo"
          onClick={() => setBancaExpandidaId(null)}
          className="student-modal-overlay fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="student-modal-panel relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Cabeçalho Fixo do Modal Expandido */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-red-600 text-white shadow-sm">
                  <span className="text-[9px] font-bold uppercase leading-none text-red-100">
                    Ordem
                  </span>
                  <span className="font-mono text-base font-black leading-tight">
                    #{String(bancaExpandida.ordem_apresentacao).padStart(2, '0')}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 font-bold text-white">
                      {bancaExpandida.turma} • {bancaExpandida.grupo}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-red-400" />
                      {bancaExpandida.data_banca} ({bancaExpandida.dia_semana})
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {bancaExpandida.horario}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                      Sala {bancaExpandida.sala}
                    </span>
                  </div>

                  <h2
                    id="modal-banca-expandida-titulo"
                    className="mt-1.5 text-lg font-black tracking-tight text-white sm:text-xl"
                  >
                    {bancaExpandida.projeto}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-300">{bancaExpandida.tema}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider ${
                    infoExpandida.statusLiberacao === 'Aprovado'
                      ? 'bg-emerald-600 text-white'
                      : infoExpandida.statusLiberacao === 'Nota Retida (Pendências)'
                      ? 'bg-orange-500 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {infoExpandida.statusLiberacao === 'Aprovado' && (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {infoExpandida.statusLiberacao === 'Nota Retida (Pendências)' && (
                    <Lock className="h-4 w-4" />
                  )}
                  {infoExpandida.statusLiberacao === 'Nova Chance (Data Futura)' && (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span>
                    {infoExpandida.statusLiberacao === 'Aprovado'
                      ? 'Nota Liberada'
                      : infoExpandida.statusLiberacao === 'Nota Retida (Pendências)'
                      ? 'Nota Retida'
                      : 'Nova Apresentação'}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setBancaExpandidaId(null)}
                  aria-label="Fechar detalhes da banca"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 active:scale-[0.96]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Corpo Rolável do Modal Expandido */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              {/* Barra Secundária: Integrantes + Duração + Avaliadores */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    Integrantes:
                  </span>
                  {bancaExpandida.integrantes.map((nome) => (
                    <span
                      key={nome}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-800"
                    >
                      {nome}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {sessaoExpandida?.duracao_formatada && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      Duração: {sessaoExpandida.duracao_formatada}
                    </span>
                  )}
                  <span
                    title={
                      infoExpandida.nomesAvaliadores.length > 0
                        ? `Avaliadores: ${infoExpandida.nomesAvaliadores.join(' • ')}`
                        : undefined
                    }
                    className="group relative inline-flex cursor-help items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 transition hover:border-slate-500"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-red-600" />
                    <span>
                      {infoExpandida.nomesAvaliadores.length || 2}{' '}
                      {(infoExpandida.nomesAvaliadores.length || 2) === 1
                        ? 'Avaliador'
                        : 'Avaliadores'}
                    </span>
                    {infoExpandida.nomesAvaliadores.length > 0 && (
                      <span className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-1.5 w-max max-w-[240px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-left text-[11px] font-medium text-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
                        <span className="block border-b border-slate-700 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-300">
                          Avaliadores da Banca
                        </span>
                        <span className="mt-1 block space-y-0.5">
                          {infoExpandida.nomesAvaliadores.map((nomeAv) => (
                            <span
                              key={nomeAv}
                              className="block truncate font-semibold text-slate-100"
                            >
                              • {nomeAv}
                            </span>
                          ))}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Placar de Média do Grupo + Parciais P1-P4 em pts */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">
                    Pilar 1 • Doc (30 pts)
                  </span>
                  <p className="mt-1 font-mono text-lg font-black text-slate-900">
                    {infoExpandida.p1.toFixed(2)}
                    <span className="text-[11px] font-normal text-slate-400"> / 30</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">
                    Pilar 2 • Sist (40 pts)
                  </span>
                  <p className="mt-1 font-mono text-lg font-black text-slate-900">
                    {infoExpandida.p2.toFixed(2)}
                    <span className="text-[11px] font-normal text-slate-400"> / 40</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">
                    Pilar 3 • Banca (15 pts)
                  </span>
                  <p className="mt-1 font-mono text-lg font-black text-slate-900">
                    {infoExpandida.p3.toFixed(2)}
                    <span className="text-[11px] font-normal text-slate-400"> / 15</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">
                    Pilar 4 • Sprints (15 pts)
                  </span>
                  <p className="mt-1 font-mono text-lg font-black text-slate-900">
                    {infoExpandida.p4.toFixed(2)}
                    <span className="text-[11px] font-normal text-slate-400"> / 15</span>
                  </p>
                </div>
                <div className="col-span-2 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-center sm:col-span-1">
                  <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-red-700">
                    Média do Grupo
                  </span>
                  <p className="mt-1 font-mono text-xl font-black text-red-600">
                    {infoExpandida.mediaFinal.toFixed(2)} pts
                  </p>
                </div>
              </div>

              {/* Tabela de Notas Individuais por Integrante + Botão Critérios MSEP */}
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  <Award className="h-4 w-4 text-red-600" />
                  Notas Individuais por Integrante
                </h3>
                <div className="mt-2.5 overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                        <th className="px-3.5 py-2.5">Aluno</th>
                        <th className="px-2 py-2.5 text-center">P1 Doc</th>
                        <th className="px-2 py-2.5 text-center">P2 Sist</th>
                        <th className="px-2 py-2.5 text-center">P3 Banca</th>
                        <th className="px-2 py-2.5 text-center">P4 Sprints</th>
                        <th className="px-3 py-2.5 text-center">Nota Final</th>
                        <th className="px-3 py-2.5 text-center">Situação</th>
                        <th className="px-3 py-2.5 text-center">Detalhamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {infoExpandida.integrantes.map((al) => {
                        const ap = al.resultado === 'Aprovado';
                        const ret = al.resultado === 'Nota Retida (Pendências)';
                        return (
                          <tr
                            key={al.nome}
                            className="bg-white transition-colors hover:bg-slate-50/80"
                          >
                            <td className="px-3.5 py-3 font-bold text-slate-900">
                              {al.nome}
                              {al.nome_completo_planilha && (
                                <span className="block text-[10px] font-normal text-slate-500">
                                  {al.nome_completo_planilha}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center font-mono text-slate-700">
                              {al.p1_nota.toFixed(2)}
                            </td>
                            <td className="px-2 py-3 text-center font-mono text-slate-700">
                              {al.p2_nota.toFixed(2)}
                            </td>
                            <td className="px-2 py-3 text-center font-mono text-slate-700">
                              {al.p3_nota.toFixed(2)}
                            </td>
                            <td className="px-2 py-3 text-center font-mono text-slate-700">
                              {al.p4_nota.toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-sm font-black text-slate-900">
                              {al.nota_final.toFixed(2)} pts
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                                  ap
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ret
                                    ? 'bg-orange-100 text-orange-900'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {ap ? 'Aprovado' : ret ? 'Retido' : 'Nova Apresentação'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => abrirModalMsep(bancaExpandida, al.nome)}
                                className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition duration-200 hover:border-red-600 hover:bg-red-600 active:scale-[0.97]"
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                                <span>Critérios MSEP</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Considerações dos Professores Avaliadores */}
              {infoExpandida.consideracoesProfessores.length > 0 && (
                <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    <MessageSquareText className="h-4 w-4 text-red-600" />
                    Considerações dos Professores Avaliadores
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {infoExpandida.consideracoesProfessores.map((cp, cpIdx) => (
                      <div
                        key={`${cp.professor_nome}_${cpIdx}`}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                          <span className="font-bold text-slate-900">Prof. {cp.professor_nome}</span>
                          {cp.atualizado_em && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(cp.atualizado_em).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">
                          {cp.parecer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Painel Explícito de Pendências & Cumprimento */}
              <div
                className={`rounded-2xl border p-4 text-xs ${
                  infoExpandida.pendenciasCumpridas
                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                    : infoExpandida.statusLiberacao === 'Nova Chance (Data Futura)'
                    ? 'border-red-300 bg-red-50/70 text-red-950'
                    : infoExpandida.possuiPendencias ||
                      infoExpandida.statusLiberacao === 'Nota Retida (Pendências)'
                    ? 'border-orange-300 bg-orange-50/80 text-orange-950'
                    : 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider">
                    {infoExpandida.pendenciasCumpridas ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Status das Pendências: Já Cumpridas pelo Grupo</span>
                      </>
                    ) : infoExpandida.possuiPendencias ||
                      infoExpandida.statusLiberacao !== 'Aprovado' ? (
                      <>
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            infoExpandida.statusLiberacao === 'Nova Chance (Data Futura)'
                              ? 'text-red-600'
                              : 'text-orange-600'
                          }`}
                        />
                        <span>Status das Pendências: Há Pendências em Aberto</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Status das Pendências: Nenhuma Pendência Registrada</span>
                      </>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      infoExpandida.statusLiberacao === 'Aprovado'
                        ? 'bg-emerald-600 text-white'
                        : infoExpandida.statusLiberacao === 'Nota Retida (Pendências)'
                        ? 'bg-orange-500 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {infoExpandida.statusLiberacao === 'Aprovado'
                      ? 'Nota Liberada'
                      : infoExpandida.statusLiberacao === 'Nota Retida (Pendências)'
                      ? 'Nota Retida'
                      : 'Nova Apresentação'}
                  </span>
                </div>

                {infoExpandida.historicoPendencias.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
                      Histórico de Registros &amp; Pendências:
                    </p>
                    {infoExpandida.historicoPendencias.map((reg) => {
                      const dataFmt = reg.data_hora
                        ? new Date(reg.data_hora).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';
                      const isRev = reg.origem === 'revisados';
                      const isAdiamento = reg.origem === 'adiamento';
                      return (
                        <div
                          key={reg.id || `${reg.data_hora}-${reg.mensagem.slice(0, 12)}`}
                          className="rounded-xl border border-black/10 bg-white/90 px-3.5 py-2.5 text-xs text-slate-800"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 font-extrabold uppercase ${
                                  isRev
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isAdiamento
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-slate-200 text-slate-800'
                                }`}
                              >
                                {isRev
                                  ? 'Arquivos Revisados'
                                  : isAdiamento
                                  ? 'Data Futura'
                                  : 'Durante a Banca'}
                              </span>
                              <span className="font-bold text-slate-700">{reg.autor}</span>
                            </div>
                            {dataFmt && (
                              <span className="font-mono font-semibold text-slate-500">
                                {dataFmt}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-line leading-relaxed text-slate-800">
                            {reg.mensagem}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  infoExpandida.pendenciasTexto && (
                    <p className="mt-2.5 whitespace-pre-line rounded-xl border border-black/5 bg-white/85 p-3 text-xs leading-relaxed text-slate-800">
                      {infoExpandida.pendenciasTexto}
                    </p>
                  )
                )}

                {infoExpandida.pendenciasCumpridas && infoExpandida.pendenciasCumpridasEm && (
                  <p className="mt-2 text-[11px] font-semibold text-emerald-800">
                    Confirmado cumprimento das pendências em{' '}
                    {new Date(infoExpandida.pendenciasCumpridasEm).toLocaleDateString('pt-BR')}.
                  </p>
                )}
              </div>

              {/* Sinalização de Entrega de Arquivos Revisados (Pós-Banca) */}
              {infoExpandida.revisaoPosBanca &&
                (infoExpandida.revisaoPosBanca.arquivos_qtd > 0 ||
                  infoExpandida.revisaoPosBanca.status !== 'sem_revisao') && (
                  <div
                    className={`rounded-2xl border p-4 text-xs ${
                      infoExpandida.revisaoPosBanca.status === 'aceito'
                        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                        : infoExpandida.revisaoPosBanca.status === 'ajustes_pendentes'
                        ? 'border-orange-300 bg-orange-50/80 text-orange-950'
                        : 'border-amber-300 bg-amber-50/80 text-amber-950'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider">
                        <FileCheck2
                          className={`h-4 w-4 ${
                            infoExpandida.revisaoPosBanca.status === 'aceito'
                              ? 'text-emerald-600'
                              : infoExpandida.revisaoPosBanca.status === 'ajustes_pendentes'
                              ? 'text-orange-600'
                              : 'text-amber-700'
                          }`}
                        />
                        <span>
                          {infoExpandida.revisaoPosBanca.status === 'aceito'
                            ? 'Revisão Pós-Banca Aceita pelo Professor'
                            : infoExpandida.revisaoPosBanca.status === 'ajustes_pendentes'
                            ? 'Revisão Pós-Banca: Novos Ajustes Solicitados'
                            : `${infoExpandida.revisaoPosBanca.arquivos_qtd} arquivo(s) revisado(s) recebido(s) — Aguardando validação do professor`}
                        </span>
                      </div>
                      <span className="rounded-full border border-black/10 bg-white/85 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-800">
                        {infoExpandida.revisaoPosBanca.arquivos_qtd} arquivo(s) em revisão
                      </span>
                    </div>

                    {infoExpandida.revisaoPosBanca.observacao_professor && (
                      <p className="mt-2.5 whitespace-pre-line rounded-xl border border-black/5 bg-white/85 p-3 text-xs leading-relaxed text-slate-800">
                        <strong>Consideração do Professor Titular:</strong>{' '}
                        {infoExpandida.revisaoPosBanca.observacao_professor}
                      </p>
                    )}

                    {infoExpandida.revisaoPosBanca.avaliado_em &&
                      infoExpandida.revisaoPosBanca.avaliado_por && (
                        <p className="mt-2 text-[11px] font-semibold opacity-80">
                          Validado por {infoExpandida.revisaoPosBanca.avaliado_por} em{' '}
                          {new Date(infoExpandida.revisaoPosBanca.avaliado_em).toLocaleDateString(
                            'pt-BR',
                          )}
                        </p>
                      )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL 2: CRITÉRIOS MSEP POR INTEGRANTE (PARCIAIS ITEM A ITEM + NÍVEL)
         ======================================================================== */}
      {bancaMsep && infoMsep && alunoMsepSelecionado && (() => {
        const itensAluno = montarCriteriosMsepDoAluno(infoMsep.rubricas, alunoMsepSelecionado);
        const pilares = [1, 2, 3, 4] as const;

        const contagemNiveis = itensAluno.reduce(
          (acc, it) => {
            acc[it.nivel] = (acc[it.nivel] || 0) + 1;
            return acc;
          },
          { Avançado: 0, Pleno: 0, Insuficiente: 0, Pendente: 0 } as Record<NivelMSEP, number>,
        );

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-msep-titulo"
            onClick={() => setMsepModalState(null)}
            className="student-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="student-modal-panel relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              {/* Cabeçalho do Modal MSEP */}
              <div className="border-b border-slate-800 bg-slate-950 px-6 py-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-600/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-red-300">
                      <ClipboardList className="h-3 w-3" />
                      Boletim Detalhado • Critérios MSEP
                    </span>
                    <h2
                      id="modal-msep-titulo"
                      className="mt-1.5 truncate text-lg font-black text-white sm:text-xl"
                    >
                      {alunoMsepSelecionado.nome_completo_planilha || alunoMsepSelecionado.nome}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {bancaMsep.turma} • {bancaMsep.grupo} — {bancaMsep.projeto}
                      {alunoMsepSelecionado.matricula
                        ? ` • Matrícula: ${alunoMsepSelecionado.matricula}`
                        : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMsepModalState(null)}
                    aria-label="Fechar critérios MSEP"
                    className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 active:scale-[0.96]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Abas rápidas para alternar entre os integrantes do grupo */}
                {infoMsep.integrantes.length > 1 && (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {infoMsep.integrantes.map((al) => {
                      const ativo = al.nome === alunoMsepSelecionado.nome;
                      return (
                        <button
                          key={al.nome}
                          type="button"
                          onClick={() =>
                            setMsepModalState({ bancaId: bancaMsep.id, alunoNome: al.nome })
                          }
                          className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            ativo
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {al.nome} ({al.nota_final.toFixed(2)} pts)
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Corpo Rolável do Modal MSEP */}
              <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                {/* Resumo Geral do Aluno + Distribuição MSEP */}
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 sm:col-span-5">
                    <div>
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Nota Final Individual
                      </span>
                      <p className="mt-0.5 font-mono text-2xl font-black text-slate-900">
                        {alunoMsepSelecionado.nota_final.toFixed(2)}
                        <span className="ml-1 text-xs font-semibold text-slate-400">/ 100 pts</span>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                        alunoMsepSelecionado.resultado === 'Aprovado'
                          ? 'bg-emerald-600 text-white'
                          : alunoMsepSelecionado.resultado === 'Nota Retida (Pendências)'
                          ? 'bg-orange-500 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {alunoMsepSelecionado.resultado === 'Aprovado'
                        ? 'Aprovado'
                        : alunoMsepSelecionado.resultado === 'Nota Retida (Pendências)'
                        ? 'Retido'
                        : 'Nova Banca'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:col-span-7">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-center">
                      <span className="block text-[10px] font-extrabold uppercase text-emerald-800">
                        Avançado
                      </span>
                      <strong className="font-mono text-xl font-black text-emerald-700">
                        {contagemNiveis['Avançado']}
                      </strong>
                      <span className="block text-[10px] text-emerald-700/80">itens</span>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-2.5 text-center">
                      <span className="block text-[10px] font-extrabold uppercase text-sky-800">
                        Pleno
                      </span>
                      <strong className="font-mono text-xl font-black text-sky-700">
                        {contagemNiveis['Pleno']}
                      </strong>
                      <span className="block text-[10px] text-sky-700/80">itens</span>
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50/70 px-3 py-2.5 text-center">
                      <span className="block text-[10px] font-extrabold uppercase text-red-800">
                        Insuficiente
                      </span>
                      <strong className="font-mono text-xl font-black text-red-700">
                        {contagemNiveis['Insuficiente']}
                      </strong>
                      <span className="block text-[10px] text-red-700/80">itens</span>
                    </div>
                  </div>
                </div>

                {/* Observação individual do aluno (se houver) */}
                {alunoMsepSelecionado.observacoes_individuais &&
                  alunoMsepSelecionado.observacoes_individuais.trim() !== '' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800">
                      <strong className="font-extrabold text-slate-900">
                        Observação Individual:
                      </strong>{' '}
                      {alunoMsepSelecionado.observacoes_individuais}
                    </div>
                  )}

                {/* Lista de Pilares e Todos os Itens MSEP */}
                <div className="space-y-4">
                  {pilares.map((numPilar) => {
                    const itensPilar = itensAluno.filter((i) => i.pilar === numPilar);
                    const meta = PILARES_META[numPilar];
                    const totalPilarAluno =
                      numPilar === 1
                        ? alunoMsepSelecionado.p1_nota
                        : numPilar === 2
                        ? alunoMsepSelecionado.p2_nota
                        : numPilar === 3
                        ? alunoMsepSelecionado.p3_nota
                        : alunoMsepSelecionado.p4_nota;

                    return (
                      <div
                        key={numPilar}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                              {meta.titulo}
                            </h3>
                            <p className="text-[11px] text-slate-500">{meta.subtitulo}</p>
                          </div>
                          <span className="rounded-xl border border-slate-200 bg-white px-3 py-1 font-mono text-xs font-black text-slate-900">
                            {totalPilarAluno.toFixed(2)}{' '}
                            <span className="font-normal text-slate-400">/ {meta.pesoMax} pts</span>
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {itensPilar.map((item) => {
                            const estilos = obterEstilosNivelMsep(item.nivel);
                            const pct =
                              item.peso_max > 0
                                ? Math.min(100, Math.max(0, (item.nota / item.peso_max) * 100))
                                : 0;

                            return (
                              <div
                                key={item.codigo}
                                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-black text-white">
                                      {item.codigo}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900">
                                      {item.titulo}
                                    </span>
                                    {item.individual && (
                                      <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-red-700">
                                        Individual
                                      </span>
                                    )}
                                  </div>
                                  {item.detalheExtra && (
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                      {item.detalheExtra}
                                    </p>
                                  )}
                                  <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${estilos.bar}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                                  <span className="font-mono text-xs font-black text-slate-900">
                                    {item.nota.toFixed(2)}
                                    <span className="font-normal text-slate-400">
                                      {' '}
                                      / {item.peso_max.toFixed(2)} pts
                                    </span>
                                  </span>
                                  <span
                                    className={`inline-flex min-w-[92px] items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${estilos.badge}`}
                                  >
                                    {item.nivel}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================
          MODAL 3: CHECKLIST DE ARQUIVOS (SOMENTE PARA BANCAS PENDENTES ENTREGUES)
         ======================================================================== */}
      {bancaArquivos && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-arquivos-titulo"
          onClick={() => setArquivosModalBancaId(null)}
          className="student-modal-overlay fixed inset-0 z-40 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="student-modal-panel w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Checklist de Entrega Digital
                </span>
                <h2 id="modal-arquivos-titulo" className="mt-0.5 truncate text-base font-black">
                  {bancaArquivos.grupo} — {bancaArquivos.projeto}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setArquivosModalBancaId(null)}
                aria-label="Fechar checklist de arquivos"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2.5 p-5 sm:grid-cols-2">
              {bancaArquivos.arquivos_entregues.map((arq) => (
                <div
                  key={arq.tipo}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                    arq.encontrado
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                      : 'border-red-200 bg-red-50/60 text-red-900'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block font-bold">{arq.tipo}</span>
                    {arq.encontrado && arq.nome_arquivo && (
                      <span
                        title={arq.nome_arquivo}
                        className="block truncate text-[10px] text-slate-500"
                      >
                        {arq.nome_arquivo}
                      </span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase ${
                      arq.encontrado
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {arq.encontrado ? 'Entregue' : 'Ausente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default StudentLandingPage;

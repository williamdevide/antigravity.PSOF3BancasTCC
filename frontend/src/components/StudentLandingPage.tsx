import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  Award,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  Lock,
  MapPin,
  MessageSquareText,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { APP_VERSION } from '../config/version';
import {
  formatarDataPrevistaBr,
  obterAdiamentoDataFuturaAtivo,
  obterNomesAvaliadoresBanca,
  recalcularConsolidadaExistente,
} from '../services/bancaMultiAvaliador';
import type {
  AvaliacaoGrupo,
  NotaIndividualIntegrante,
  RegistroHistoricoPendencia,
  ResultadoFinalTipo,
  SessaoBancaAoVivo,
} from '../types';

interface StudentLandingPageProps {
  bancas: AvaliacaoGrupo[];
  mapaSessoesBanca: Record<string, SessaoBancaAoVivo>;
  carregando: boolean;
  usuarioAutenticado: boolean;
  onIrParaProfessor: () => void;
}

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

  // Considerações escritas exclusivamente pelos professores avaliadores durante/após a banca (sem texto automático pré-banca da IA)
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
  const [expandidosArquivos, setExpandidosArquivos] = useState<Record<string, boolean>>({});

  const bancasOrdenadas = useMemo(() => {
    return [...bancas].sort(compararOrdemApresentacao);
  }, [bancas]);

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

  const toggleArquivos = (id: string) => {
    setExpandidosArquivos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navegação Superior Única (Desktop single-line <= 72px) */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-red-600">
              <img src="/senai_icon.png" alt="SENAI Ourinhos" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-extrabold tracking-tight sm:text-base">
                  Portal das Bancas TCC — SENAI Ourinhos
                </span>
                <span className="hidden rounded border border-red-500/40 bg-red-600/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-300 sm:inline-block">
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
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{usuarioAutenticado ? 'Painel do Professor' : 'Área do Professor'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Institucional de Abertura — Papel do Portal de Visualização das Bancas para os Alunos */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-700">
                <GraduationCap className="h-3.5 w-3.5" />
                Portal Oficial dos Alunos • PSOF3 — SENAI Ourinhos
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Portal de Visualização das Bancas de TCC
              </h1>
              <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-slate-600 sm:text-base">
                Este portal foi criado para que os alunos das turmas <strong>I2DEV-A</strong> e{' '}
                <strong>I2DEV-B</strong> acompanhem com transparência toda a jornada das bancas de
                Conclusão de Curso: desde o agendamento e confirmação de entrega dos arquivos até as
                notas por pilar em <strong>pts</strong>, considerações dos professores e pendências.
              </p>

              {/* Explicação da Composição dos 100 pts */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/90 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-red-600" />
                    Como a nota da banca é composta (Total: 100 pts)
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Média mínima para aprovação: 50,00 pts
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Pilar 1 • Doc TCC
                    </span>
                    <strong className="font-mono text-sm font-black text-slate-900">30 pts</strong>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Pilar 2 • Sistema
                    </span>
                    <strong className="font-mono text-sm font-black text-slate-900">40 pts</strong>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Pilar 3 • Defesa
                    </span>
                    <strong className="font-mono text-sm font-black text-slate-900">15 pts</strong>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Pilar 4 • Sprints/Aulas
                    </span>
                    <strong className="font-mono text-sm font-black text-slate-900">15 pts</strong>
                  </div>
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-red-700 cursor-pointer"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Ver Cronograma e Resultados
                </a>

                {(['Todas', 'I2DEV-A', 'I2DEV-B'] as const).map((turma) => (
                  <button
                    key={turma}
                    type="button"
                    onClick={() => setTurmaSelecionada(turma)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      turmaSelecionada === turma
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {turma === 'Todas' ? `Todas (${resumoStats.total})` : `Turma ${turma}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Painel de Métricas Reais + Legenda das Bordas Coloridas */}
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total de Bancas
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 text-2xl font-black text-slate-900">
                    {resumoStats.total}
                    <span className="text-xs font-semibold text-slate-500">agendadas</span>
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Já Realizadas
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 text-2xl font-black text-emerald-700">
                    {resumoStats.realizadas}
                    <span className="text-xs font-semibold text-emerald-700/80">concluídas</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Arquivos Recebidos
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 text-2xl font-black text-slate-900">
                    {resumoStats.entregues}
                    <span className="text-xs font-semibold text-slate-500">
                      de {resumoStats.total} grupos
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-yellow-300 bg-yellow-50/60 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-900">
                    Próximas Bancas
                  </span>
                  <p className="mt-1 flex items-baseline gap-2 text-2xl font-black text-yellow-800">
                    {resumoStats.proximas}
                    <span className="text-xs font-semibold text-yellow-800/90">aguardando</span>
                  </p>
                </div>
              </div>

              {/* Legenda das Bordas Coloridas dos Cards */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Legenda Visual das Bordas nos Cards
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-800">
                  <div className="flex items-center gap-2 rounded-lg border-2 border-yellow-400 bg-white px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-400" />
                    <span>Aguardando Apresentação</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border-2 border-emerald-500 bg-white px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>Nota Liberada</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border-2 border-orange-500 bg-white px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                    <span>Nota Retida (Pendências)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border-2 border-red-600 bg-white px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
                    <span>Nova Apresentação / Data Futura</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Filtros e Busca */}
      <main id="resultados-bancas" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
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
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  situacaoFiltro === opt.id
                    ? 'bg-red-600 text-white'
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
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Estado de Carregamento */}
        {carregando ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((sk) => (
              <div key={sk} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white p-6" />
            ))}
          </div>
        ) : gruposPorTurma.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
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
                  <span className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-black tracking-wide text-white">
                    {secaoTurma.turma}
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Ordem Oficial de Apresentações — {secaoTurma.turma}
                  </h2>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {secaoTurma.itens.length} apresentação(ões) listada(s)
                </span>
              </div>

              <div className="space-y-4">
                {secaoTurma.itens.map((banca) => {
                  const info = resolverDadosBancaRealizada(banca, mapaSessoesBanca[banca.id]);
                  const arquivosEncontrados = banca.arquivos_entregues.filter((a) => a.encontrado);
                  const mostraArquivos = Boolean(expandidosArquivos[banca.id]);
                  const classeBordaStatus = info.emAndamento
                    ? 'border-2 border-red-600 ring-2 ring-red-200'
                    : !info.realizada
                    ? info.adiamentoAtivo
                      ? 'border-2 border-red-600 bg-red-50/15'
                      : 'border-2 border-yellow-400'
                    : info.statusLiberacao === 'Aprovado'
                    ? 'border-2 border-emerald-500'
                    : info.statusLiberacao === 'Nota Retida (Pendências)'
                    ? 'border-2 border-orange-500'
                    : 'border-2 border-red-600';

                  return (
                    <article
                      key={banca.id}
                      className={`overflow-hidden rounded-2xl bg-white shadow-xs transition ${classeBordaStatus}`}
                    >
                      {/* Faixa de Cabeçalho da Banca */}
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs">
                            <span className="text-[9px] font-bold uppercase leading-none text-slate-400">
                              Ordem
                            </span>
                            <span className="font-mono text-base font-black leading-tight">
                              #{String(banca.ordem_apresentacao).padStart(2, '0')}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800">
                                {banca.grupo}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                                <Calendar className="h-3.5 w-3.5 text-red-600" />
                                {banca.data_banca} ({banca.dia_semana})
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                {banca.horario}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3.5 w-3.5" />
                                Sala {banca.sala}
                              </span>
                            </div>

                            <h3 className="mt-1.5 text-base font-extrabold text-slate-900 sm:text-lg">
                              {banca.projeto}
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-600">{banca.tema}</p>

                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-slate-500 mr-1">
                                <Users className="h-3.5 w-3.5" />
                                Integrantes:
                              </span>
                              {banca.integrantes.map((nome) => (
                                <span
                                  key={nome}
                                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800"
                                >
                                  {nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Selos de Situação à Direita */}
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {info.realizada ? (
                            <>
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider ${
                                  info.statusLiberacao === 'Aprovado'
                                    ? 'bg-emerald-600 text-white'
                                    : info.statusLiberacao === 'Nota Retida (Pendências)'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-red-600 text-white'
                                }`}
                              >
                                {info.statusLiberacao === 'Aprovado' && <CheckCircle2 className="h-4 w-4" />}
                                {info.statusLiberacao === 'Nota Retida (Pendências)' && <Lock className="h-4 w-4" />}
                                {info.statusLiberacao === 'Nova Chance (Data Futura)' && <XCircle className="h-4 w-4" />}
                                <span>
                                  {info.statusLiberacao === 'Aprovado'
                                    ? 'Nota Liberada'
                                    : info.statusLiberacao === 'Nota Retida (Pendências)'
                                    ? 'Nota Retida'
                                    : 'Nova Apresentação'}
                                </span>
                              </span>

                              {(() => {
                                const qtdAv = info.nomesAvaliadores.length || 2;
                                return (
                                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                                    {sessao?.duracao_formatada && (
                                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                        <Clock className="h-3 w-3 text-slate-500" />
                                        {sessao.duracao_formatada}
                                      </span>
                                    )}
                                    <span
                                      title={
                                        info.nomesAvaliadores.length > 0
                                          ? `Avaliadores: ${info.nomesAvaliadores.join(' • ')}`
                                          : undefined
                                      }
                                      className="group relative inline-flex cursor-help items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/90 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 transition hover:border-purple-400 hover:bg-purple-100"
                                    >
                                      <span>
                                        👨‍🏫 {qtdAv} {qtdAv === 1 ? 'Avaliador' : 'Avaliadores'}
                                      </span>
                                      {info.nomesAvaliadores.length > 0 && (
                                        <span className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-1.5 w-max max-w-[240px] rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-left text-[11px] font-medium text-white opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
                                          <span className="block border-b border-slate-700/80 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-300">
                                            Avaliadores da Banca
                                          </span>
                                          <span className="mt-1 block space-y-0.5">
                                            {info.nomesAvaliadores.map((nomeAv) => (
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
                                );
                              })()}
                            </>
                          ) : info.emAndamento ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white">
                              <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                              Banca Ao Vivo
                            </span>
                          ) : info.adiamentoAtivo ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white">
                              <CalendarClock className="h-4 w-4" />
                              Não Apresentou • Data Futura
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400 bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-900">
                              <Clock className="h-3.5 w-3.5 text-yellow-700" />
                              Aguardando Apresentação
                            </span>
                          )}

                          {/* Indicador de Entrega dos Arquivos */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                              banca.entregue_na_pasta
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {banca.entregue_na_pasta ? (
                              <>
                                <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                                Arquivos Entregues ({arquivosEncontrados.length}/{banca.arquivos_entregues.length || 7})
                              </>
                            ) : (
                              <>
                                <FolderOpen className="h-3.5 w-3.5 text-amber-700" />
                                Entrega de Arquivos Pendente
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Corpo do Card */}
                      <div className="p-5">
                        {/* CASO 1: BANCA AINDA VAI OCORRER (incluindo "Não Apresentou / Data Futura") -> Sem notas P1-P4/individuais */}
                        {!info.realizada ? (
                          <div className="space-y-3">
                            {info.adiamentoAtivo && (
                              <div className="rounded-xl border border-red-300 bg-red-50/80 p-3.5 text-xs text-red-950">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[11px] text-red-800">
                                    <CalendarClock className="h-4 w-4 text-red-600" />
                                    Grupo optou por não apresentar na data agendada ({banca.data_banca})
                                  </span>
                                  <span className="rounded-full border border-red-300 bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-red-900">
                                    Nova data prevista:{' '}
                                    {formatarDataPrevistaBr(info.adiamentoAtivo.nova_data_prevista)}
                                  </span>
                                </div>
                                {info.adiamentoAtivo.motivo && (
                                  <p className="mt-2 whitespace-pre-line rounded-lg border border-red-200/80 bg-white/85 px-3 py-2 text-xs leading-relaxed text-slate-800">
                                    {info.adiamentoAtivo.motivo}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                            <div className="flex items-center gap-2.5 text-slate-700">
                              {banca.entregue_na_pasta ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                  <span>
                                    Entrega localizada na pasta oficial do grupo ({arquivosEncontrados.length} de {banca.arquivos_entregues.length || 7} entregáveis digitais).
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                                  <span>
                                    Os arquivos finais da equipe ainda não foram protocolados na pasta de entrega da turma.
                                  </span>
                                </>
                              )}
                            </div>

                            {banca.entregue_na_pasta && banca.arquivos_entregues.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleArquivos(banca.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                {mostraArquivos ? 'Ocultar Arquivos' : 'Ver Checklist de Arquivos'}
                                {mostraArquivos ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            </div>
                          </div>
                        ) : (
                          /* CASO 2: BANCA JÁ REALIZADA -> Parciais P1-P4, Média Grupo, Notas Individuais e Pendências */
                          <div className="space-y-4">
                            {/* Placar de Média do Grupo + Parciais P1-P4 em pts */}
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">
                                  Pilar 1 • Doc (30 pts)
                                </span>
                                <p className="mt-1 font-mono text-lg font-black text-slate-900">
                                  {info.p1.toFixed(2)}
                                  <span className="text-[11px] font-normal text-slate-400"> / 30 pts</span>
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">
                                  Pilar 2 • Sist (40 pts)
                                </span>
                                <p className="mt-1 font-mono text-lg font-black text-slate-900">
                                  {info.p2.toFixed(2)}
                                  <span className="text-[11px] font-normal text-slate-400"> / 40 pts</span>
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">
                                  Pilar 3 • Banca (15 pts)
                                </span>
                                <p className="mt-1 font-mono text-lg font-black text-slate-900">
                                  {info.p3.toFixed(2)}
                                  <span className="text-[11px] font-normal text-slate-400"> / 15 pts</span>
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">
                                  Pilar 4 • Sprints (15 pts)
                                </span>
                                <p className="mt-1 font-mono text-lg font-black text-slate-900">
                                  {info.p4.toFixed(2)}
                                  <span className="text-[11px] font-normal text-slate-400"> / 15 pts</span>
                                </p>
                              </div>
                              <div className="col-span-2 sm:col-span-1 rounded-xl border border-red-200 bg-red-50/70 p-3 text-center">
                                <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-red-700">
                                  Média do Grupo
                                </span>
                                <p className="mt-1 font-mono text-xl font-black text-red-600">
                                  {info.mediaFinal.toFixed(2)} pts
                                </p>
                              </div>
                            </div>

                            {/* Tabela / Cards de Notas Individuais dos Alunos */}
                            <div>
                              <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                <Award className="h-4 w-4 text-red-600" />
                                Notas Individuais por Integrante
                              </h4>
                              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                                      <th className="px-3 py-2">Aluno</th>
                                      <th className="px-2 py-2 text-center">P1 Doc (30 pts)</th>
                                      <th className="px-2 py-2 text-center">P2 Sist (40 pts)</th>
                                      <th className="px-2 py-2 text-center">P3 Banca (15 pts)</th>
                                      <th className="px-2 py-2 text-center">P4 Sprints (15 pts)</th>
                                      <th className="px-3 py-2 text-center">Nota Final</th>
                                      <th className="px-3 py-2 text-center">Situação</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {info.integrantes.map((al) => {
                                      const ap = al.resultado === 'Aprovado';
                                      const ret = al.resultado === 'Nota Retida (Pendências)';
                                      return (
                                        <tr key={al.nome} className="bg-white">
                                          <td className="px-3 py-2.5 font-bold text-slate-900">
                                            {al.nome}
                                            {al.nome_completo_planilha && (
                                              <span className="block text-[10px] font-normal text-slate-500">
                                                {al.nome_completo_planilha}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-2 py-2.5 text-center font-mono text-slate-700">
                                            {al.p1_nota.toFixed(2)}
                                          </td>
                                          <td className="px-2 py-2.5 text-center font-mono text-slate-700">
                                            {al.p2_nota.toFixed(2)}
                                          </td>
                                          <td className="px-2 py-2.5 text-center font-mono text-slate-700">
                                            {al.p3_nota.toFixed(2)}
                                          </td>
                                          <td className="px-2 py-2.5 text-center font-mono text-slate-700">
                                            {al.p4_nota.toFixed(2)}
                                          </td>
                                          <td className="px-3 py-2.5 text-center font-mono text-sm font-black text-slate-900">
                                            {al.nota_final.toFixed(2)} pts
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <span
                                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase whitespace-nowrap ${
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
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Considerações dos Professores Avaliadores (quando registradas na banca) */}
                            {info.consideracoesProfessores.length > 0 && (
                              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                                <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800">
                                  <MessageSquareText className="h-4 w-4 text-red-600" />
                                  Considerações dos Professores Avaliadores
                                </h4>
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                  {info.consideracoesProfessores.map((cp, cpIdx) => (
                                    <div
                                      key={`${cp.professor_nome}_${cpIdx}`}
                                      className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                                        <span className="font-bold text-slate-900">
                                          Prof. {cp.professor_nome}
                                        </span>
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
                              className={`rounded-xl border p-3.5 text-xs ${
                                info.pendenciasCumpridas
                                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                                  : info.statusLiberacao === 'Nova Chance (Data Futura)'
                                  ? 'border-red-300 bg-red-50/70 text-red-950'
                                  : info.possuiPendencias || info.statusLiberacao === 'Nota Retida (Pendências)'
                                  ? 'border-orange-300 bg-orange-50/80 text-orange-950'
                                  : 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider text-[11px]">
                                  {info.pendenciasCumpridas ? (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                      <span>Status das Pendências: Já Cumpridas pelo Grupo</span>
                                    </>
                                  ) : info.possuiPendencias || info.statusLiberacao !== 'Aprovado' ? (
                                    <>
                                      <AlertTriangle
                                        className={`h-4 w-4 ${
                                          info.statusLiberacao === 'Nova Chance (Data Futura)'
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
                                    info.statusLiberacao === 'Aprovado'
                                      ? 'bg-emerald-600 text-white'
                                      : info.statusLiberacao === 'Nota Retida (Pendências)'
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-red-600 text-white'
                                  }`}
                                >
                                  {info.statusLiberacao === 'Aprovado'
                                    ? 'Nota Liberada'
                                    : info.statusLiberacao === 'Nota Retida (Pendências)'
                                    ? 'Nota Retida'
                                    : 'Nova Apresentação'}
                                </span>
                              </div>

                              {info.historicoPendencias.length > 0 ? (
                                <div className="mt-2.5 space-y-1.5">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
                                    Histórico de Registros &amp; Pendências:
                                  </p>
                                  {info.historicoPendencias.map((reg) => {
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
                                        className="rounded-lg border border-black/10 bg-white/85 px-3 py-2 text-xs text-slate-800"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span
                                              className={`rounded px-1.5 py-0.5 font-extrabold uppercase ${
                                                isRev
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : isAdiamento
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-indigo-100 text-indigo-800'
                                              }`}
                                            >
                                              {isRev
                                                ? 'Arquivos Revisados'
                                                : isAdiamento
                                                ? 'Data Futura'
                                                : 'Durante a Banca'}
                                            </span>
                                            <span className="font-bold text-slate-700">
                                              {reg.autor}
                                            </span>
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
                                info.pendenciasTexto && (
                                  <p className="mt-2 whitespace-pre-line rounded-lg border border-black/5 bg-white/80 p-2.5 text-xs leading-relaxed text-slate-800">
                                    {info.pendenciasTexto}
                                  </p>
                                )
                              )}

                              {info.pendenciasCumpridas && info.pendenciasCumpridasEm && (
                                <p className="mt-1.5 text-[11px] font-semibold text-emerald-800">
                                  Confirmado cumprimento das pendências em{' '}
                                  {new Date(info.pendenciasCumpridasEm).toLocaleDateString('pt-BR')}.
                                </p>
                              )}
                            </div>

                            {/* Sinalização de Entrega de Arquivos Revisados (Pós-Banca) */}
                            {info.revisaoPosBanca &&
                              (info.revisaoPosBanca.arquivos_qtd > 0 ||
                                info.revisaoPosBanca.status !== 'sem_revisao') && (
                                <div
                                  className={`rounded-xl border p-3.5 text-xs ${
                                    info.revisaoPosBanca.status === 'aceito'
                                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                                      : info.revisaoPosBanca.status === 'ajustes_pendentes'
                                      ? 'border-orange-300 bg-orange-50/80 text-orange-950'
                                      : 'border-amber-300 bg-amber-50/80 text-amber-950'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider text-[11px]">
                                      <FileCheck2
                                        className={`h-4 w-4 ${
                                          info.revisaoPosBanca.status === 'aceito'
                                            ? 'text-emerald-600'
                                            : info.revisaoPosBanca.status === 'ajustes_pendentes'
                                            ? 'text-orange-600'
                                            : 'text-amber-700'
                                        }`}
                                      />
                                      <span>
                                        {info.revisaoPosBanca.status === 'aceito'
                                          ? 'Revisão Pós-Banca Aceita pelo Professor'
                                          : info.revisaoPosBanca.status === 'ajustes_pendentes'
                                          ? 'Revisão Pós-Banca: Novos Ajustes Solicitados'
                                          : `${info.revisaoPosBanca.arquivos_qtd} arquivo(s) revisado(s) recebido(s) — Aguardando validação do professor`}
                                      </span>
                                    </div>
                                    <span className="rounded-full bg-white/80 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-800 border border-black/10">
                                      {info.revisaoPosBanca.arquivos_qtd} arquivo(s) extra(s) em revisão
                                    </span>
                                  </div>

                                  {info.revisaoPosBanca.observacao_professor && (
                                    <p className="mt-2 whitespace-pre-line rounded-lg border border-black/5 bg-white/80 p-2.5 text-xs leading-relaxed text-slate-800">
                                      <strong>Consideração do Professor Titular:</strong>{' '}
                                      {info.revisaoPosBanca.observacao_professor}
                                    </p>
                                  )}

                                  {info.revisaoPosBanca.avaliado_em && info.revisaoPosBanca.avaliado_por && (
                                    <p className="mt-1.5 text-[11px] font-semibold opacity-80">
                                      Validado por {info.revisaoPosBanca.avaliado_por} em{' '}
                                      {new Date(info.revisaoPosBanca.avaliado_em).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              )}
                          </div>
                        )}

                        {/* Checklist Expansível de Arquivos para Bancas Futuras */}
                        {!info.realizada && mostraArquivos && banca.arquivos_entregues.length > 0 && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {banca.arquivos_entregues.map((arq) => (
                              <div
                                key={arq.tipo}
                                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                                  arq.encontrado
                                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                                    : 'border-red-200 bg-red-50/50 text-red-800'
                                }`}
                              >
                                <span className="font-bold">{arq.tipo}</span>
                                <span className="truncate font-mono text-[10px]">
                                  {arq.encontrado ? 'Entregue' : 'Ausente'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
export default StudentLandingPage;

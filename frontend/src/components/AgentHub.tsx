import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Cloud,
  FileSpreadsheet,
  FolderCheck,
  GraduationCap,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { AgentSummary } from '../types';

export type AbaAgente = 'bancas' | 'ficha' | 'consolidado' | 'regras' | 'configuracoes';

interface AgentHubProps {
  agentes: AgentSummary[];
  onAbrirAgente: (agentId: string, abaInicial?: AbaAgente) => void;
  onExecutarRapido: (agentId: string) => void;
}

export function AgentHub({ agentes, onAbrirAgente, onExecutarRapido }: AgentHubProps) {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas');
  const [mostrarGuiaNovoAgente, setMostrarGuiaNovoAgente] = useState(false);

  const categorias = ['Todas', ...Array.from(new Set(agentes.map((a) => a.categoria)))];

  const agentesFiltrados = agentes.filter((ag) => {
    const matchCat = categoriaAtiva === 'Todas' || ag.categoria === categoriaAtiva;
    const termo = busca.trim().toLowerCase();
    const matchBusca =
      !termo ||
      ag.nome.toLowerCase().includes(termo) ||
      ag.descricao.toLowerCase().includes(termo) ||
      ag.sistema_alvo.toLowerCase().includes(termo);
    return matchCat && matchBusca;
  });

  const totalAtivos = agentes.filter((a) => a.ativo).length;
  const totalRodando = agentes.filter((a) => a.estado === 'running').length;
  const totalEntregues = agentes.reduce((acc, a) => acc + (a.grupos_entregues_qtd || 0), 0);
  const totalCronograma = agentes.reduce((acc, a) => acc + (a.total_bancas_cronograma || 25), 0);

  return (
    <div className="space-y-6">
      {/* Banner Institucional do Hub */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 p-6 text-white shadow-md sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            Arquitetura de 3 Camadas • Ecossistema SENAI Ourinhos (PSOF3)
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Central de Agentes Inteligentes — Bancas de TCC
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Auditoria técnica automatizada dos entregáveis das turmas <strong>I2DEV-A</strong> e{' '}
            <strong>I2DEV-B</strong> na pasta <code>./tcc</code> segundo os documentos normativos de{' '}
            <code>./tcc/regras</code>, com geração de Ficha MSEP Oficial, Dossiê de Arguição e
            Planilha Consolidada XLSX.
          </p>
        </div>
      </div>

      {/* Resumo Geral no Topo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Agentes Disponíveis</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Bot className="h-5 w-5 text-red-600" />
            {totalAtivos}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Auditorias em Andamento</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Activity
              className={`h-5 w-5 ${
                totalRodando > 0 ? 'animate-pulse text-amber-500' : 'text-slate-400'
              }`}
            />
            {totalRodando}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Entregas Recebidas em ./tcc</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <FolderCheck className="h-5 w-5 text-emerald-600" />
            {totalEntregues} de {totalCronograma} bancas
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Persistência Cloud & Local</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Cloud className="h-5 w-5 text-indigo-600" />
            Firebase + XLSX
          </p>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaAtiva(cat)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                categoriaAtiva === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar agente ou disciplina..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid de Cards dos Agentes + Card Novo Agente */}
      <div className="grid gap-5 md:grid-cols-2">
        {agentesFiltrados.map((ag) => {
          const rodando = ag.estado === 'running';
          const pct =
            ag.progresso_total > 0
              ? Math.min(100, Math.round((ag.progresso_atual / ag.progresso_total) * 100))
              : ag.estado === 'success'
              ? 100
              : 0;

          return (
            <div
              key={ag.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-slate-300 hover:shadow-md"
            >
              <div>
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                        {ag.categoria}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{ag.nome}</h3>
                      <p className="text-xs text-slate-500">{ag.sistema_alvo}</p>
                    </div>
                  </div>

                  {/* Badge de Status ao Vivo */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      ag.estado === 'running'
                        ? 'bg-amber-100 text-amber-800'
                        : ag.estado === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ag.estado === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {ag.estado === 'running' && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {ag.estado === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {ag.estado === 'error' && <XCircle className="h-3.5 w-3.5" />}
                    {ag.estado === 'running'
                      ? 'Auditando'
                      : ag.estado === 'success'
                      ? 'Auditado'
                      : ag.estado === 'error'
                      ? 'Com Erro'
                      : 'Pronto'}
                  </span>
                </div>

                {/* Descrição */}
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{ag.descricao}</p>

                {/* Mini Barra de Progresso */}
                {(rodando || ag.progresso_total > 0) && (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium text-slate-700">
                        {ag.tarefa_atual || 'Processando...'}
                      </span>
                      <span className="font-bold text-slate-900">
                        {ag.progresso_total > 0
                          ? `${ag.progresso_atual}/${ag.progresso_total} (${pct}%)`
                          : `${pct}%`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          ag.estado === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Metadados Rápidos do Agente */}
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs">
                  <div>
                    <span className="text-slate-400">Turmas Monitoradas</span>
                    <p className="mt-0.5 font-semibold text-slate-800">
                      I2DEV-A (13) • I2DEV-B (12)
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Entregas em ./tcc</span>
                    <p className="mt-0.5 font-semibold text-emerald-700">
                      {ag.grupos_entregues_qtd} entregue(s) / {ag.grupos_auditados_qtd} auditado(s)
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Regras Carregadas</span>
                    <p className="mt-0.5 font-semibold text-slate-800">
                      4 PDFs Oficiais • 18 Rubricas MSEP
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Saídas Oficiais</span>
                    <p className="mt-0.5 font-semibold text-indigo-700">
                      Ficha PDF • Dossiê • XLSX • Firebase
                    </p>
                  </div>
                </div>
              </div>

              {/* Ações do Card */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => onAbrirAgente(ag.id, 'bancas')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Abrir Painel de Bancas
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onAbrirAgente(ag.id, 'consolidado')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  title="Abrir Tela Consolidada por Turma e Exportar XLSX"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Consolidado
                </button>

                <button
                  type="button"
                  onClick={() => onExecutarRapido(ag.id)}
                  disabled={rodando}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {rodando ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Auditando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Auditar ./tcc
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Card de Expansão para Novos Agentes */}
        <div className="flex flex-col justify-between rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 transition hover:border-red-300 hover:bg-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200/80 text-slate-600">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Expansão Modular
                </span>
                <h3 className="text-lg font-bold text-slate-800">Adicionar Novo Agente</h3>
                <p className="text-xs text-slate-500">Solicitação e desenvolvimento sob demanda</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Esta plataforma foi projetada na Arquitetura de 3 Camadas para receber novos agentes
              de automação pedagógica e avaliação (ex.: Corretor de Sprints Semanais, Assiduidade
              PESS Portal, Validador de Repositórios GitHub).
            </p>

            {/* Destaque de governança e responsável pelo desenvolvimento */}
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-950 shadow-sm">
              <div className="flex items-start gap-2.5">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold text-red-900">Como solicitar um novo agente?</p>
                  <p className="mt-1 leading-relaxed text-red-800">
                    Para criar, homologar ou integrar um novo agente nesta plataforma, é necessário
                    acionar o{' '}
                    <strong className="font-extrabold text-red-950 underline decoration-red-300 underline-offset-2">
                      Professor William Devidé Komel
                    </strong>
                    , responsável técnico pelo desenvolvimento dos agentes.
                  </p>
                </div>
              </div>
            </div>

            {mostrarGuiaNovoAgente && (
              <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
                <p className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Layers className="h-4 w-4 text-red-600" />
                  Fluxo técnico conduzido pelo Prof. William Devidé Komel:
                </p>
                <ol className="list-inside list-decimal space-y-1.5 text-slate-600">
                  <li>
                    <strong>Camada 1 (Diretiva):</strong> Mapeamento da regra de negócio e criação
                    do SOP em <code>/directives/avaliador_bancas_tcc.md</code>.
                  </li>
                  <li>
                    <strong>Camada 3 (Execução):</strong> Construção do motor determinístico em{' '}
                    <code>/backend/app/tcc_auditor.py</code> e <code>/execution/</code>.
                  </li>
                  <li>
                    <strong>Catálogo Central:</strong> Registro do agente na API FastAPI para
                    exibição imediata nesta Central.
                  </li>
                </ol>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-200/70 pt-4">
            <button
              type="button"
              onClick={() => setMostrarGuiaNovoAgente((v) => !v)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {mostrarGuiaNovoAgente ? 'Ocultar Detalhes Técnicos' : 'Ver Fluxo de Desenvolvimento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import type {
  BancaConsolidada,
  AvaliacaoGrupo,
  RegistroHistoricoPendencia,
  ResultadoFinalTipo,
  SessaoBancaAoVivo,
} from '../types';
import {
  Users,
  CheckCircle2,
  Clock,
  FileText,
  Play,
  Check,
  Lock,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Edit3,
  ClipboardCheck,
  Save,
} from 'lucide-react';
import { CronometroBanca } from './CronometroBanca';
import { obterP3TotalAvaliador } from '../services/bancaMultiAvaliador';

interface PainelBancaConsolidadaProps {
  banca: BancaConsolidada | null;
  sessaoAoVivo: SessaoBancaAoVivo | null;
  grupoAtual: AvaliacaoGrupo;
  professorLogadoUid?: string;
  isProfessorTitular: boolean;
  onIniciarBanca: () => Promise<void>;
  onEncerrarMinhaAvaliacao: () => Promise<void>;
  onEncerrarEConsolidarBanca: (contingencia?: boolean, justificativa?: string) => Promise<void>;
  onResetarBanca?: () => Promise<void>;
  onReabrirEdicao?: () => void;
  onAtualizarPendencias?: (dados: {
    possui_pendencias: boolean;
    pendencias_descricao: string;
    pendencias_cumpridas: boolean;
    novo_status_liberacao: ResultadoFinalTipo;
    origem?: 'banca' | 'revisados';
  }) => Promise<void>;
  modoEdicaoReaberto?: boolean;
  salvando: boolean;
}

export const PainelBancaConsolidada: React.FC<PainelBancaConsolidadaProps> = ({
  banca,
  sessaoAoVivo,
  grupoAtual,
  professorLogadoUid,
  isProfessorTitular,
  onIniciarBanca,
  onEncerrarMinhaAvaliacao,
  onEncerrarEConsolidarBanca,
  onResetarBanca,
  onReabrirEdicao,
  onAtualizarPendencias,
  modoEdicaoReaberto,
  salvando,
}) => {
  const [modalContingenciaAberto, setModalContingenciaAberto] = useState(false);
  const [justificativaContingencia, setJustificativaContingencia] = useState('');
  const [modalResetAberto, setModalResetAberto] = useState(false);
  const [pendenciasTexto, setPendenciasTexto] = useState('');
  const [pendenciasCumpridasEdit, setPendenciasCumpridasEdit] = useState(false);
  const [statusFinalPendEdit, setStatusFinalPendEdit] = useState<ResultadoFinalTipo>('Aprovado');

  useEffect(() => {
    const statusAtual =
      sessaoAoVivo?.status_liberacao_final ??
      banca?.status_liberacao_final ??
      grupoAtual.status_liberacao_nota ??
      'Aprovado';
    const descAtual =
      sessaoAoVivo?.pendencias_descricao !== undefined
        ? sessaoAoVivo.pendencias_descricao
        : (grupoAtual.itens_insuficientes_grupo || []).join('\n');
    setPendenciasTexto(descAtual);
    setPendenciasCumpridasEdit(Boolean(sessaoAoVivo?.pendencias_cumpridas));
    setStatusFinalPendEdit(statusAtual);
  }, [
    grupoAtual.id,
    sessaoAoVivo?.pendencias_descricao,
    sessaoAoVivo?.pendencias_cumpridas,
    sessaoAoVivo?.status_liberacao_final,
    banca?.status_liberacao_final,
  ]);

  const statusSessao = sessaoAoVivo?.status || 'aguardando_inicio';
  const avaliadoresList = banca ? Object.values(banca.avaliacoes_individuais) : [];
  const av1 = avaliadoresList[0] || null;
  const av2 = avaliadoresList[1] || null;

  // Verifica se o professor logado já salvou ou concluiu
  const minhaAvaliacao = professorLogadoUid && banca
    ? banca.avaliacoes_individuais[professorLogadoUid]
    : null;
  const euJaEncerrei = Boolean(minhaAvaliacao?.concluido);

  // Verifica quantos avaliadores concluíram (clicaram em encerrar)
  const concluidosCount = avaliadoresList.filter((a) => a.concluido).length;
  const podeConsolidarNormal = concluidosCount >= 2;

  return (
    <div className="space-y-4 rounded-2xl border-2 border-indigo-200/80 bg-linear-to-b from-indigo-50/40 to-white p-4 shadow-xs">
      {/* =================================================================== */}
      {/* BARRA SUPERIOR: CRONÔMETRO + CONTROLES DE FLUXO AO VIVO DA BANCA   */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <CronometroBanca
            status={statusSessao}
            iniciadoEm={sessaoAoVivo?.iniciado_em || null}
            encerradoEm={sessaoAoVivo?.encerrado_em || null}
            duracaoFormatada={sessaoAoVivo?.duracao_formatada}
            duracaoSegundos={sessaoAoVivo?.duracao_segundos}
          />

          {/* Status dos Avaliadores */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Avaliadores Concluídos:</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-800 border border-slate-300">
              {concluidosCount}/2
            </span>
          </div>
        </div>

        {/* Botões de Ação por Papel */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. AGUARDANDO INÍCIO */}
          {statusSessao === 'aguardando_inicio' && (
            <>
              {isProfessorTitular ? (
                <button
                  type="button"
                  onClick={() => void onIniciarBanca()}
                  disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
                  title="Disparar o cronômetro oficial e abrir a sala para votação ao vivo de todos os avaliadores"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Iniciar Banca Oficial (Ao Vivo)
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 font-medium">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Aguardando o Prof. Titular iniciar a banca para liberação das notas.</span>
                </div>
              )}
            </>
          )}

          {/* 2. EM ANDAMENTO */}
          {statusSessao === 'em_andamento' && (
            <>
              {/* Botão de Encerrar Minha Avaliação */}
              {professorLogadoUid && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void onEncerrarMinhaAvaliacao()}
                    disabled={salvando}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                      euJaEncerrei
                        ? 'border border-emerald-500 bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                    title="Conclui sua atribuição de notas e libera para consolidação da banca"
                  >
                    <Check className="h-4 w-4" />
                    {euJaEncerrei ? '✓ Minha Avaliação Encerrada' : 'Encerrar Minha Avaliação'}
                  </button>
                  {euJaEncerrei && !modoEdicaoReaberto && onReabrirEdicao && (
                    <button
                      type="button"
                      onClick={onReabrirEdicao}
                      disabled={salvando}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      title="Reabrir minha ficha para ajustes antes da consolidação final"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-indigo-600 inline mr-1" />
                      Reabrir
                    </button>
                  )}
                </div>
              )}

              {/* Botão de Fechar e Consolidar (Exclusivo Titular) */}
              {isProfessorTitular && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void onEncerrarEConsolidarBanca(false)}
                    disabled={!podeConsolidarNormal || salvando}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                    title={
                      podeConsolidarNormal
                        ? 'Fechar ata e consolidar médias finais'
                        : 'Aguardando o 2º avaliador encerrar para liberar a consolidação'
                    }
                  >
                    <Lock className="h-4 w-4" />
                    Encerrar Banca & Consolidar Média
                  </button>

                  {/* Contingência com 1 avaliador caso o outro falte */}
                  {!podeConsolidarNormal && (
                    <button
                      type="button"
                      onClick={() => setModalContingenciaAberto(true)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 transition"
                      title="Permite fechar a banca sozinho em caso excepcional de ausência do segundo professor"
                    >
                      Contingência (1 Avaliador)
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* 3. CONCLUÍDA */}
          {statusSessao === 'concluida' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>Ata Oficial Consolidada &amp; Encerrada</span>
              </div>
              {modoEdicaoReaberto ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-950">
                  <Edit3 className="h-3.5 w-3.5 text-amber-700" />
                  <span>Modo Edição Ativo</span>
                </div>
              ) : (
                onReabrirEdicao && (
                  <button
                    type="button"
                    onClick={onReabrirEdicao}
                    disabled={salvando}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-900 shadow-2xs transition hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer"
                    title="Reabrir a edição da banca para ajustar notas ou parecer técnico. Ao salvar, as médias e descrições serão recalculadas."
                  >
                    <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                    {isProfessorTitular ? 'Editar Banca' : 'Editar Minha Avaliação'}
                  </button>
                )
              )}
            </div>
          )}

          {/* 4. BOTÃO RESETAR / EXCLUIR AVALIAÇÕES & BANCA (SEMPRE ACESSÍVEL) */}
          {onResetarBanca && (
            <button
              type="button"
              onClick={() => setModalResetAberto(true)}
              disabled={salvando}
              className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50/90 px-3.5 py-2 text-xs font-bold text-red-700 shadow-2xs transition hover:bg-red-100 hover:border-red-400 hover:text-red-800 disabled:opacity-50 cursor-pointer"
              title="Excluir as avaliações individuais dos professores, zerar notas e reiniciar a banca deste grupo"
            >
              <RotateCcw className="h-3.5 w-3.5 text-red-600" />
              Resetar / Excluir Banca
            </button>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Reset / Exclusão da Banca */}
      {modalResetAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <span>Excluir Avaliações e Resetar Banca?</span>
            </div>
            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              Você está prestes a excluir as avaliações lançadas para o grupo{' '}
              <strong className="text-white underline">{grupoAtual.projeto}</strong> ({grupoAtual.turma}).
            </p>
            <div className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-[11px] text-red-200">
              <p className="font-bold text-red-300 mb-1">O que será resetado:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>As avaliações individuais de ambos os professores serão apagadas do Firebase.</li>
                <li>A média final consolidada e os pareceres escritos serão excluídos.</li>
                <li>O cronômetro voltará para 00:00 e o status da banca para "Aguardando Início".</li>
                <li>As rubricas na interface serão restauradas para a auditoria automática padrão.</li>
              </ul>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalResetAberto(false)}
                disabled={salvando}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setModalResetAberto(false);
                  if (onResetarBanca) {
                    await onResetarBanca();
                  }
                }}
                disabled={salvando}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-red-700 transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Confirmar Exclusão e Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contingência */}
      {modalContingenciaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>Consolidação Excepcional com 1 Avaliador</span>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              O regulamento do SENAI prevê 2 avaliadores. Use este recurso apenas se o segundo professor estiver impossibilitado de votar.
            </p>
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-300">Justificativa da Ausência:</label>
              <textarea
                rows={2}
                value={justificativaContingencia}
                onChange={(e) => setJustificativaContingencia(e.target.value)}
                placeholder="Ex: 2º avaliador em atendimento externo de urgência, avaliado apenas pelo Titular."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalContingenciaAberto(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setModalContingenciaAberto(false);
                  await onEncerrarEConsolidarBanca(true, justificativaContingencia);
                }}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Status da Banca */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${
          statusSessao === 'concluida'
            ? 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
            : statusSessao === 'em_andamento'
            ? 'border-blue-300 bg-blue-50/90 text-blue-950'
            : 'border-slate-300 bg-slate-100 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {statusSessao === 'concluida' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
          ) : statusSessao === 'em_andamento' ? (
            <Clock className="h-5 w-5 shrink-0 text-blue-700 animate-spin" />
          ) : (
            <Users className="h-5 w-5 shrink-0 text-slate-500" />
          )}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider">
              {statusSessao === 'concluida'
                ? '✅ BANCA CONCLUÍDA — Média Simples Oficial dos 2 Professores'
                : statusSessao === 'em_andamento'
                ? `🔴 BANCA AO VIVO EM ANDAMENTO (${concluidosCount}/2 Avaliações Encerradas)`
                : `Aguardando Início da Banca (${grupoAtual.projeto})`}
            </h4>
            <p className="text-[11px] leading-relaxed">
              {statusSessao === 'concluida'
                ? `Média Simples Oficial: ${(banca?.media_final || 0).toFixed(2)} pts (${banca?.status_liberacao_final}). Duração total: ${sessaoAoVivo?.duracao_formatada || '—'}.`
                : statusSessao === 'em_andamento'
                ? `Banca iniciada por ${sessaoAoVivo?.titular_nome || 'Prof. Titular'}. Cada professor deve lançar suas notas e clicar em "Encerrar Minha Avaliação".`
                : 'O Prof. Titular deve clicar em "Iniciar Banca Oficial" para disparar o cronômetro e abrir a sala de votação.'}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-mono text-xs font-black ${
            statusSessao === 'concluida'
              ? 'bg-emerald-600 text-white'
              : statusSessao === 'em_andamento'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-500 text-white'
          }`}
        >
          {statusSessao === 'concluida'
            ? `Média Oficial: ${(banca?.media_final || 0).toFixed(2)} pts`
            : statusSessao === 'em_andamento'
            ? `Parcial: ${(banca?.media_final || 0).toFixed(2)} pts`
            : 'Pré-Banca'}
        </span>
      </div>

      {/* Grid Comparativo dos 4 Pilares: Prof 1 vs Prof 2 vs Média Simples */}
      {banca && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* P1 */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
            <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">Pilar 1 • Doc (30 pts)</span>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-600">
              <span>{av1 ? `${av1.professor_nome.split(' ')[0]}: ${av1.p1_total.toFixed(2)}` : 'P1: —'}</span>
              <span>•</span>
              <span>{av2 ? `${av2.professor_nome.split(' ')[0]}: ${av2.p1_total.toFixed(2)}` : 'P2: —'}</span>
            </div>
            <p className="mt-1 text-base font-black text-slate-900">
              Média: {banca.media_p1.toFixed(2)}
            </p>
          </div>

          {/* P2 */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
            <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">Pilar 2 • Sist (40 pts)</span>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-600">
              <span>{av1 ? `${av1.professor_nome.split(' ')[0]}: ${av1.p2_total.toFixed(2)}` : 'P1: —'}</span>
              <span>•</span>
              <span>{av2 ? `${av2.professor_nome.split(' ')[0]}: ${av2.p2_total.toFixed(2)}` : 'P2: —'}</span>
            </div>
            <p className="mt-1 text-base font-black text-slate-900">
              Média: {banca.media_p2.toFixed(2)}
            </p>
          </div>

          {/* P3 (completo: 3.1 arguição + 3.2 pitch + 3.3 slides) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
            <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">Pilar 3 • Banca (15 pts)</span>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-600">
              <span>{av1 ? `${av1.professor_nome.split(' ')[0]}: ${obterP3TotalAvaliador(av1).toFixed(2)}` : 'P1: —'}</span>
              <span>•</span>
              <span>{av2 ? `${av2.professor_nome.split(' ')[0]}: ${obterP3TotalAvaliador(av2).toFixed(2)}` : 'P2: —'}</span>
            </div>
            <p className="mt-1 text-base font-black text-slate-900">
              Média: {banca.media_p3.toFixed(2)}
            </p>
          </div>

          {/* P4 */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
            <span className="block whitespace-nowrap text-[10px] font-bold uppercase text-slate-500">Pilar 4 • Sprints (15 pts)</span>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
              <span>Oficial: {banca.media_p4.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-base font-black text-indigo-700">
              Média: {banca.media_p4.toFixed(2)}
            </p>
          </div>

          {/* Média Final */}
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-center shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-red-700">Nota Final da Banca</span>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-red-800">
              <span>{av1 ? `${av1.professor_nome.split(' ')[0]}: ${av1.nota_final_grupo.toFixed(2)}` : 'P1: —'}</span>
              <span>•</span>
              <span>{av2 ? `${av2.professor_nome.split(' ')[0]}: ${av2.nota_final_grupo.toFixed(2)}` : 'P2: —'}</span>
            </div>
            <p className="mt-1 text-lg font-black text-red-600">
              {banca.media_final.toFixed(2)} pts
            </p>
          </div>
        </div>
      )}

      {/* Caixa dos Dois Pareceres Técnicos Consolidados */}
      {banca && banca.pareceres_professores.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800">
            <FileText className="h-4 w-4 text-indigo-600" />
            Pareceres Técnicos dos Avaliadores da Banca:
          </h4>

          {banca.pareceres_professores.map((p, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs leading-relaxed"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <span className="font-bold text-slate-900">
                  👨‍🏫 Parecer do Avaliador: <span className="text-indigo-700">{p.professor_nome}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Atualizado em: {p.atualizado_em.slice(0, 19).replace('T', ' ')}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-slate-800">
                {p.parecer || '(O professor ainda não registrou considerações por escrito)'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATUS CONSOLIDADO DA LIBERAÇÃO DA NOTA DA BANCA + ALUNOS NA FRENTE      */}
      {/* ========================================================================= */}
      {banca && (() => {
        const statusEfetivo = sessaoAoVivo?.status_liberacao_final ?? banca.status_liberacao_final;
        return (
        <div className="rounded-xl border border-slate-200 bg-linear-to-r from-slate-50 to-white p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider shadow-sm ${
                  statusEfetivo === 'Aprovado'
                    ? 'bg-emerald-600 text-white'
                    : statusEfetivo === 'Nota Retida (Pendências)'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-red-600 text-white'
                }`}
              >
                {statusEfetivo === 'Aprovado' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {statusEfetivo === 'Aprovado'
                    ? '✅ NOTA LIBERADA'
                    : statusEfetivo === 'Nota Retida (Pendências)'
                    ? '⚠️ NOTA RETIDA'
                    : '❌ NECESSÁRIO NOVA APRESENTAÇÃO'}
                </span>
              </div>

              {/* Na frente: Status individual de cada aluno */}
              <div className="flex flex-wrap items-center gap-1.5 pl-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-0.5">
                  Alunos:
                </span>
                {banca.integrantes_medias.map((ind) => {
                  const isAprovado = ind.resultado === 'Aprovado';
                  const isRetido = ind.resultado === 'Nota Retida (Pendências)';

                  return (
                    <div
                      key={ind.nome}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs ${
                        isAprovado
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                          : isRetido
                          ? 'border-amber-300 bg-amber-50 text-amber-950'
                          : 'border-red-300 bg-red-50 text-red-950'
                      }`}
                    >
                      <span className="font-bold text-slate-900">{ind.nome}:</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                          isAprovado
                            ? 'bg-emerald-600 text-white'
                            : isRetido
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {isAprovado ? 'Aprovado' : isRetido ? 'Retido' : 'Nova Apresentação'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400">Média Oficial da Banca</span>
              <p className="text-xs font-black text-slate-800">{banca.media_final.toFixed(2)} pts</p>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* GESTÃO SIMPLIFICADA DE PENDÊNCIAS & CUMPRIMENTO (PORTAL DOS ALUNOS)       */}
      {/* ========================================================================= */}
      {(statusSessao === 'em_andamento' || statusSessao === 'concluida') &&
        onAtualizarPendencias && (() => {
          const historicoLista: RegistroHistoricoPendencia[] =
            (sessaoAoVivo?.historico_pendencias && sessaoAoVivo.historico_pendencias.length > 0
              ? sessaoAoVivo.historico_pendencias
              : grupoAtual.historico_pendencias) || [];
          return (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-amber-700" />
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      Controle de Pendências &amp; Cumprimento (Portal dos Alunos)
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Registre mensagens e pendências com data/hora durante a banca ou pós-banca para atualizar o portal público.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const proximo = !pendenciasCumpridasEdit;
                    setPendenciasCumpridasEdit(proximo);
                    if (proximo) {
                      setStatusFinalPendEdit('Aprovado');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer ${
                    pendenciasCumpridasEdit
                      ? 'border border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200'
                  }`}
                >
                  {pendenciasCumpridasEdit ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Pendências Cumpridas
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      Pendências em Aberto
                    </>
                  )}
                </button>
              </div>

              {historicoLista.length > 0 && (
                <div className="rounded-lg border border-amber-200/80 bg-white/90 p-3 space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-amber-700" />
                    Histórico Cronológico de Mensagens &amp; Pendências ({historicoLista.length})
                  </p>
                  <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                    {historicoLista.map((reg) => {
                      const dataFmt = reg.data_hora
                        ? new Date(reg.data_hora).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';
                      const isRevisados = reg.origem === 'revisados';
                      return (
                        <div
                          key={reg.id || `${reg.data_hora}-${reg.mensagem.slice(0, 12)}`}
                          className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[11px]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                                  isRevisados
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {isRevisados ? 'Arquivos Revisados' : 'Durante a Banca'}
                              </span>
                              <span className="font-bold text-slate-800">{reg.autor}</span>
                              {reg.status_aplicado && (
                                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                                  {reg.status_aplicado}
                                </span>
                              )}
                            </div>
                            {dataFmt && (
                              <span className="font-mono text-[10px] font-semibold text-slate-500">
                                {dataFmt}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-800">
                            {reg.mensagem}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-8">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase text-slate-700">
                      Descrição das Pendências da Banca (registra data e hora ao salvar):
                    </label>
                    {grupoAtual.itens_insuficientes_grupo.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPendenciasTexto(grupoAtual.itens_insuficientes_grupo.join('\n'))
                        }
                        className="text-[11px] font-semibold text-red-700 hover:underline cursor-pointer"
                      >
                        Carregar itens detectados ({grupoAtual.itens_insuficientes_grupo.length})
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={pendenciasTexto}
                    onChange={(e) => setPendenciasTexto(e.target.value)}
                    placeholder="Ex: Ajustar persistência em localStorage e enviar script .sql atualizado."
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-4 flex flex-col justify-between gap-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Situação da Nota:
                    </label>
                    <select
                      value={statusFinalPendEdit}
                      onChange={(e) => setStatusFinalPendEdit(e.target.value as ResultadoFinalTipo)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 focus:border-red-500 focus:outline-none"
                    >
                      <option value="Aprovado">✅ Nota Liberada (Aprovado)</option>
                      <option value="Nota Retida (Pendências)">⚠️ Nota Retida (Pendências)</option>
                      <option value="Nova Chance (Data Futura)">❌ Nova Apresentação</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() =>
                      void onAtualizarPendencias({
                        possui_pendencias: Boolean(pendenciasTexto.trim()) || statusFinalPendEdit !== 'Aprovado',
                        pendencias_descricao: pendenciasTexto,
                        pendencias_cumpridas: pendenciasCumpridasEdit,
                        novo_status_liberacao: statusFinalPendEdit,
                        origem: 'banca',
                      })
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Salvar Pendências no Portal
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

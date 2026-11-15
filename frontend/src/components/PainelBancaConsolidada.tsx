import React, { useState } from 'react';
import type { BancaConsolidada, AvaliacaoGrupo, SessaoBancaAoVivo } from '../types';
import { Users, CheckCircle2, Clock, FileText, Play, Check, Lock, AlertTriangle } from 'lucide-react';
import { CronometroBanca } from './CronometroBanca';

interface PainelBancaConsolidadaProps {
  banca: BancaConsolidada | null;
  sessaoAoVivo: SessaoBancaAoVivo | null;
  grupoAtual: AvaliacaoGrupo;
  professorLogadoUid?: string;
  isProfessorTitular: boolean;
  onIniciarBanca: () => Promise<void>;
  onEncerrarMinhaAvaliacao: () => Promise<void>;
  onEncerrarEConsolidarBanca: (contingencia?: boolean, justificativa?: string) => Promise<void>;
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
  salvando,
}) => {
  const [modalContingenciaAberto, setModalContingenciaAberto] = useState(false);
  const [justificativaContingencia, setJustificativaContingencia] = useState('');

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
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Ata Oficial Consolidada & Encerrada</span>
            </div>
          )}
        </div>
      </div>

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
            ? `Média Oficial: ${(banca?.media_final || 0).toFixed(2)}%`
            : statusSessao === 'em_andamento'
            ? `Parcial: ${(banca?.media_final || 0).toFixed(2)}%`
            : 'Pré-Banca'}
        </span>
      </div>

      {/* Grid Comparativo dos 4 Pilares: Prof 1 vs Prof 2 vs Média Simples */}
      {banca && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* P1 */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Pilar 1 • Doc (30%)</span>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-600">
              <span>P1: {av1 ? av1.p1_total.toFixed(1) : '—'}</span>
              <span>•</span>
              <span>P2: {av2 ? av2.p1_total.toFixed(1) : '—'}</span>
            </div>
            <p className="mt-1 text-base font-black text-slate-900">
              Média: {banca.media_p1.toFixed(2)}
            </p>
          </div>

          {/* P2 */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Pilar 2 • Sist (40%)</span>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-600">
              <span>P1: {av1 ? av1.p2_total.toFixed(1) : '—'}</span>
              <span>•</span>
              <span>P2: {av2 ? av2.p2_total.toFixed(1) : '—'}</span>
            </div>
            <p className="mt-1 text-base font-black text-slate-900">
              Média: {banca.media_p2.toFixed(2)}
            </p>
          </div>

          {/* P3 */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Pilar 3 • Banca (15%)</span>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-600">
              <span>P1: {av1 ? av1.p3_grupo_base.toFixed(1) : '—'}</span>
              <span>•</span>
              <span>P2: {av2 ? av2.p3_grupo_base.toFixed(1) : '—'}</span>
            </div>
            <p className="mt-1 text-base font-black text-slate-900">
              Média: {banca.media_p3.toFixed(2)}
            </p>
          </div>

          {/* P4 */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Pilar 4 • Sprints (15%)</span>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-600">
              <span>Oficial: {banca.media_p4.toFixed(1)}</span>
            </div>
            <p className="mt-1 text-base font-black text-indigo-700">
              Média: {banca.media_p4.toFixed(2)}
            </p>
          </div>

          {/* Média Final */}
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-center shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-red-700">Nota Final da Banca</span>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-red-800">
              <span>P1: {av1 ? av1.nota_final_grupo.toFixed(1) : '—'}</span>
              <span>•</span>
              <span>P2: {av2 ? av2.nota_final_grupo.toFixed(1) : '—'}</span>
            </div>
            <p className="mt-1 text-lg font-black text-red-600">
              {banca.media_final.toFixed(2)}%
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
    </div>
  );
};

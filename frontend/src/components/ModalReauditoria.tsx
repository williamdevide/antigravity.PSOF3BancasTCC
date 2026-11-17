import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  FolderSync,
  Clock,
  Users,
  Calendar,
} from 'lucide-react';
import type { AvaliacaoGrupo } from '../types';
import type { SessaoBancaAoVivo } from '../services/bancaMultiAvaliador';

interface ModalReauditoriaProps {
  aberto: boolean;
  onClose: () => void;
  bancas: AvaliacaoGrupo[];
  mapaSessoesBanca: Record<string, SessaoBancaAoVivo>;
  turmaFiltroInicial: 'Todas' | 'I2DEV-A' | 'I2DEV-B';
  carregando?: boolean;
  onConfirmarReauditoria: (grupoIds: string[], turma: string | null) => void;
}

export const ModalReauditoria: React.FC<ModalReauditoriaProps> = ({
  aberto,
  onClose,
  bancas,
  mapaSessoesBanca,
  turmaFiltroInicial,
  carregando = false,
  onConfirmarReauditoria,
}) => {
  const [turmaModal, setTurmaModal] = useState<'Todas' | 'I2DEV-A' | 'I2DEV-B'>(turmaFiltroInicial);
  const [selecionadosIds, setSelecionadosIds] = useState<string[]>([]);

  // Sincronizar turma inicial quando o modal abre
  useEffect(() => {
    if (aberto) {
      setTurmaModal(turmaFiltroInicial);
    }
  }, [aberto, turmaFiltroInicial]);

  // Filtrar grupos conforme turma selecionada
  const bancasDaTurma = bancas.filter(
    (b) => turmaModal === 'Todas' || b.turma === turmaModal
  );

  const bancasEntregues = bancasDaTurma.filter((b) => b.entregue_na_pasta);

  // Bancas já realizadas (sessão concluída no Firebase ou marcadas como avaliadas)
  const bancasConcluidas = bancasEntregues.filter((b) => {
    const s = mapaSessoesBanca[b.id];
    return s?.status === 'concluida' || b.status_avaliacao === 'avaliado_banca' || (b as any).banca_realizada;
  });

  // Bancas elegíveis para reauditoria (entregues na pasta e que AINDA NÃO tiveram banca)
  const bancasElegiveis = bancasEntregues.filter((b) => {
    const s = mapaSessoesBanca[b.id];
    return !(s?.status === 'concluida' || b.status_avaliacao === 'avaliado_banca' || (b as any).banca_realizada);
  });

  // Atualizar selecionados quando as bancas elegíveis mudarem
  useEffect(() => {
    setSelecionadosIds(bancasElegiveis.map((b) => b.id));
  }, [turmaModal, bancas.length]);

  if (!aberto) return null;

  const todosSelecionados =
    bancasElegiveis.length > 0 && selecionadosIds.length === bancasElegiveis.length;

  const handleToggleTodos = () => {
    if (todosSelecionados) {
      setSelecionadosIds([]);
    } else {
      setSelecionadosIds(bancasElegiveis.map((b) => b.id));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelecionadosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecutar = () => {
    if (selecionadosIds.length === 0) return;
    onConfirmarReauditoria(
      selecionadosIds,
      turmaModal === 'Todas' ? null : turmaModal
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Janela Modal */}
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/90 text-white shadow-sm ring-2 ring-red-400/30">
              <FolderSync className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Reauditoria de Entregas & Documentos TCC (<code className="text-xs text-red-300 font-mono">./tcc</code>)
              </h2>
              <p className="text-xs text-slate-300">
                Selecione os trabalhos pendentes que serão inspecionados pelo motor de auditoria.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Seletor de Turma no Modal */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Turma:</span>
              {(['Todas', 'I2DEV-A', 'I2DEV-B'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurmaModal(t)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    turmaModal === t
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t === 'Todas' ? 'Todas as Turmas' : t}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Entregues na pasta: <strong className="text-slate-800">{bancasEntregues.length}</strong> | Pendentes de Banca: <strong className="text-emerald-700">{bancasElegiveis.length}</strong>
            </div>
          </div>

          {/* Banner de Proteção de Bancas Já Realizadas */}
          {bancasConcluidas.length > 0 && (
            <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                      🛡️ {bancasConcluidas.length} Banca(s) Já Realizada(s) Preservada(s)
                    </h4>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800">
                      Protegidas contra reescrita
                    </span>
                  </div>
                  <p className="text-xs text-purple-900/80 leading-relaxed">
                    As pastas e arquivos dessas bancas <strong>NÃO serão reauditados</strong> para proteger as notas oficiais, pareceres e atas já consolidados pelos professores avaliadores:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bancasConcluidas.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-purple-950 shadow-2xs"
                      >
                        ✓ {b.projeto} <span className="text-[10px] text-purple-600">({b.turma})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de TCCs Elegíveis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={handleToggleTodos}
                disabled={bancasElegiveis.length === 0}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition disabled:opacity-40"
              >
                {todosSelecionados ? (
                  <CheckSquare className="h-4 w-4 text-red-600" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                <span>
                  {todosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </span>
                <span className="text-slate-400 font-normal">
                  ({selecionadosIds.length} de {bancasElegiveis.length} selecionados)
                </span>
              </button>

              <span className="text-[11px] text-slate-500">
                Apenas trabalhos com entrega física em <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">./tcc</code>
              </span>
            </div>

            {bancasElegiveis.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center space-y-2">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700">
                  Nenhum TCC com banca pendente encontrado na pasta para esta seleção.
                </p>
                <p className="text-[11px] text-slate-500">
                  {bancasConcluidas.length > 0
                    ? 'Todos os trabalhos entregues nesta turma já tiveram suas bancas realizadas e foram preservados.'
                    : 'Verifique se os arquivos dos grupos foram copiados para as pastas da turma em ./tcc.'}
                </p>
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {bancasElegiveis.map((b) => {
                  const marcado = selecionadosIds.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleToggleItem(b.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition select-none ${
                        marcado
                          ? 'border-red-300 bg-red-50/20 shadow-2xs ring-1 ring-red-400/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 opacity-75'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => {}} // controlado pelo onClick do container
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                            #{b.ordem_apresentacao}º
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              b.turma === 'I2DEV-A'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {b.turma}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {b.projeto}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                            <Clock className="h-3 w-3" />
                            Aguardando Banca
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            {b.integrantes.join(', ')}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Calendar className="h-3 w-3 text-red-400" />
                            {b.data_banca} às {b.horario}
                          </span>
                        </div>

                        {b.nome_pasta_entregue && (
                          <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">
                            📁 {b.nome_pasta_entregue}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="text-xs text-slate-600">
            {selecionadosIds.length > 0 ? (
              <span>
                <strong className="text-slate-900">{selecionadosIds.length}</strong> trabalho(s) selecionado(s) para reauditoria.
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                Selecione pelo menos um trabalho para continuar.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={carregando}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecutar}
              disabled={carregando || selecionadosIds.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Reauditar Selecionados ({selecionadosIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

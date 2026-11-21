import React, { useEffect, useState } from 'react';
import { CalendarClock, Info, RotateCcw, Save, X, XCircle } from 'lucide-react';
import type { AdiamentoDataFutura, AvaliacaoGrupo } from '../types';

const MOTIVO_PADRAO_ADIAMENTO =
  'Grupo optou por não apresentar na data agendada, ficando para nova apresentação em data futura.';

interface ModalAdiamentoDataFuturaProps {
  aberto: boolean;
  grupo: AvaliacaoGrupo;
  adiamentoAtual: AdiamentoDataFutura | null;
  salvando: boolean;
  onFechar: () => void;
  onConfirmar: (dados: {
    ativo: boolean;
    motivo: string;
    nova_data_prevista: string;
  }) => Promise<void> | void;
}

export const ModalAdiamentoDataFutura: React.FC<ModalAdiamentoDataFuturaProps> = ({
  aberto,
  grupo,
  adiamentoAtual,
  salvando,
  onFechar,
  onConfirmar,
}) => {
  const jaAtivo = Boolean(adiamentoAtual?.ativo);
  const [motivo, setMotivo] = useState<string>(MOTIVO_PADRAO_ADIAMENTO);
  const [novaDataPrevista, setNovaDataPrevista] = useState<string>('');

  useEffect(() => {
    if (!aberto) return;
    if (adiamentoAtual?.ativo) {
      setMotivo(adiamentoAtual.motivo || MOTIVO_PADRAO_ADIAMENTO);
      setNovaDataPrevista(adiamentoAtual.nova_data_prevista || '');
    } else {
      setMotivo(MOTIVO_PADRAO_ADIAMENTO);
      setNovaDataPrevista('');
    }
  }, [aberto, adiamentoAtual, grupo.id]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onFechar}
      />

      <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm ring-2 ring-red-400/30">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold tracking-tight">
                {jaAtivo
                  ? 'Gerenciar Adiamento (Data Futura)'
                  : 'Não Apresentou / Marcar Data Futura'}
              </h2>
              <p className="truncate text-xs text-slate-300">
                [{grupo.turma} • {grupo.grupo}] {grupo.projeto} • Banca original: {grupo.data_banca}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="space-y-4 p-6 text-xs text-slate-700">
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-red-950">
            <p className="font-bold flex items-center gap-1.5">
              <Info className="h-4 w-4 text-red-600 shrink-0" />
              <span>Como funciona este status:</span>
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11px] leading-relaxed">
              <li>
                O card exibirá <strong>borda vermelha</strong> com o status dedicado{' '}
                <strong>&ldquo;Não Apresentou / Data Futura&rdquo;</strong> no painel e no Portal
                dos Alunos, sem expor notas P1–P4.
              </li>
              <li>
                O envio, substituição e auditoria de arquivos continuam liberados normalmente, e ao
                concluir a banca na data futura este adiamento é encerrado automaticamente.
              </li>
            </ul>
          </div>

          <div>
            <label
              htmlFor="motivo-adiamento"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Observação / Motivo (Opcional — visível aos alunos)
            </label>
            <textarea
              id="motivo-adiamento"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={MOTIVO_PADRAO_ADIAMENTO}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="nova-data-adiamento"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Nova Data Prevista (Opcional — se vazio, exibe &ldquo;A definir&rdquo;)
              </label>
              {novaDataPrevista && (
                <button
                  type="button"
                  onClick={() => setNovaDataPrevista('')}
                  className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                >
                  Definir como &ldquo;A definir&rdquo;
                </button>
              )}
            </div>
            <input
              id="nova-data-adiamento"
              type="date"
              value={novaDataPrevista}
              onChange={(e) => setNovaDataPrevista(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-red-500 focus:outline-none sm:w-64"
            />
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          {jaAtivo ? (
            <button
              type="button"
              disabled={salvando}
              onClick={() =>
                void onConfirmar({
                  ativo: false,
                  motivo: '',
                  nova_data_prevista: '',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Desmarcar / Restaurar para Aguardando
            </button>
          ) : (
            <button
              type="button"
              disabled={salvando}
              onClick={onFechar}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
          )}

          <div className="flex items-center gap-2">
            {jaAtivo && (
              <button
                type="button"
                disabled={salvando}
                onClick={onFechar}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
              >
                Fechar
              </button>
            )}
            <button
              type="button"
              disabled={salvando}
              onClick={() =>
                void onConfirmar({
                  ativo: true,
                  motivo: motivo.trim() || MOTIVO_PADRAO_ADIAMENTO,
                  nova_data_prevista: novaDataPrevista.trim(),
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              {jaAtivo ? <Save className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {salvando
                ? 'Salvando...'
                : jaAtivo
                ? 'Salvar Alterações'
                : 'Confirmar: Não Apresentou (Data Futura)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ModalAdiamentoDataFutura;

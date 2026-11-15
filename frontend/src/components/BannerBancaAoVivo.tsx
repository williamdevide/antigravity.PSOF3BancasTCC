import React from 'react';
import { Radio, ArrowRight, Clock } from 'lucide-react';
import type { SessaoBancaAoVivo } from '../types';

interface BannerBancaAoVivoProps {
  sessoesAtivas: SessaoBancaAoVivo[];
  grupoAtualId: string;
  onEntrarNaBanca: (grupoId: string) => void;
}

export const BannerBancaAoVivo: React.FC<BannerBancaAoVivoProps> = ({
  sessoesAtivas,
  grupoAtualId,
  onEntrarNaBanca,
}) => {
  if (sessoesAtivas.length === 0) return null;

  // Se houver mais de uma (raro), pega a mais recente
  const sessao = sessoesAtivas[0];
  const estaNaBancaAtual = sessao.grupo_id === grupoAtualId;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-red-500/80 bg-linear-to-r from-red-650 via-red-600 to-rose-700 text-white shadow-lg shadow-red-900/25 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs ring-2 ring-white/40">
            <Radio className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-700">
                🔴 Ao Vivo
              </span>
              <h3 className="text-sm font-black tracking-wide text-white">
                Banca Oficial em Execução: {sessao.turma} • {sessao.projeto}
              </h3>
            </div>
            <p className="text-xs text-red-100 mt-0.5">
              Iniciada pelo Prof. Titular ({sessao.titular_nome}). Todos os professores logados podem entrar na sala para avaliar simultaneamente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!estaNaBancaAtual ? (
            <button
              type="button"
              onClick={() => onEntrarNaBanca(sessao.grupo_id)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-red-700 shadow-md transition hover:bg-red-50 hover:shadow-lg"
            >
              <span>Entrar na Sala da Banca</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl bg-black/20 px-3.5 py-1.5 text-xs font-bold text-white border border-white/20">
              <Clock className="h-4 w-4 text-emerald-300 animate-pulse" />
              <span>Você está avaliando esta banca agora</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

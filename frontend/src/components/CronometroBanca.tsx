import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Play } from 'lucide-react';
import type { StatusSessaoBanca } from '../types';

interface CronometroBancaProps {
  status: StatusSessaoBanca;
  iniciadoEm: string | null;
  encerradoEm: string | null;
  duracaoFormatada?: string;
  duracaoSegundos?: number;
}

export const CronometroBanca: React.FC<CronometroBancaProps> = ({
  status,
  iniciadoEm,
  duracaoFormatada,
  duracaoSegundos = 0,
}) => {
  const [tempoSegundos, setTempoSegundos] = useState<number>(() => {
    if (status === 'concluida') return duracaoSegundos;
    if (status === 'em_andamento' && iniciadoEm) {
      return Math.max(0, Math.floor((Date.now() - new Date(iniciadoEm).getTime()) / 1000));
    }
    return 0;
  });

  useEffect(() => {
    if (status !== 'em_andamento' || !iniciadoEm) return;

    const recalcular = () => {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(iniciadoEm).getTime()) / 1000));
      setTempoSegundos(diff);
    };

    recalcular();
    const timer = setInterval(recalcular, 1000);
    return () => clearInterval(timer);
  }, [status, iniciadoEm]);

  if (status === 'aguardando_inicio') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-300">
        <Clock className="h-4 w-4 text-slate-400" />
        <span className="font-semibold">Cronômetro de Banca:</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-slate-400">00:00</span>
        <span className="text-[11px] text-slate-500">(Aguardando Início do Titular)</span>
      </div>
    );
  }

  if (status === 'concluida') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/70 px-3.5 py-2 text-xs text-emerald-200">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <span className="font-bold">Tempo Total de Banca:</span>
        <span className="rounded bg-emerald-900/80 px-2 py-0.5 font-mono text-sm font-black text-emerald-300">
          {duracaoFormatada || `${Math.floor(tempoSegundos / 60)}m ${(tempoSegundos % 60).toString().padStart(2, '0')}s`}
        </span>
        <span className="text-[11px] text-emerald-400/80">(Banca Concluída)</span>
      </div>
    );
  }

  const mins = Math.floor(tempoSegundos / 60);
  const segs = tempoSegundos % 60;
  const textoMmSs = `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;

  let temaCor = 'border-emerald-500/50 bg-emerald-950/60 text-emerald-200';
  let badgeTexto = 'Apresentação em Andamento (Até 25 min)';
  let icone = <Play className="h-4 w-4 text-emerald-400 animate-pulse" />;

  if (mins >= 30) {
    temaCor = 'border-red-500 bg-red-950/80 text-red-200';
    badgeTexto = '⚠️ Tempo Limite Excedido (>30 min)';
    icone = <AlertTriangle className="h-4 w-4 text-red-400 animate-bounce" />;
  } else if (mins >= 25) {
    temaCor = 'border-orange-500/70 bg-orange-950/70 text-orange-200';
    badgeTexto = 'Sabatina Técnica & Arguição da Banca (Até 30 min)';
    icone = <Clock className="h-4 w-4 text-orange-400" />;
  } else if (mins >= 20) {
    temaCor = 'border-amber-500/60 bg-amber-950/60 text-amber-200';
    badgeTexto = 'Atenção ao Tempo: Roteiro SENAI (25-30 min)';
    icone = <Clock className="h-4 w-4 text-amber-400" />;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs shadow-md ${temaCor}`}>
      {icone}
      <span className="font-bold uppercase tracking-wider text-[11px]">Tempo de Banca:</span>
      <span className="rounded-md bg-black/40 px-2.5 py-0.5 font-mono text-base font-black tracking-widest text-white shadow-inner">
        {textoMmSs}
      </span>
      <span className="text-[11px] font-semibold opacity-90">• {badgeTexto}</span>
    </div>
  );
};

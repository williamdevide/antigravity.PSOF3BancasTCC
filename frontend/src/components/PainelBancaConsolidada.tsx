import React from 'react';
import type { BancaConsolidada, AvaliacaoGrupo } from '../types';
import { Users, CheckCircle2, Clock, FileText } from 'lucide-react';

interface PainelBancaConsolidadaProps {
  banca: BancaConsolidada | null;
  grupoAtual: AvaliacaoGrupo;
  professorLogadoUid?: string;
}

export const PainelBancaConsolidada: React.FC<PainelBancaConsolidadaProps> = ({
  banca,
  grupoAtual,
  professorLogadoUid,
}) => {
  if (!banca || banca.status_banca === 'pendente') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
        <Users className="mx-auto h-6 w-6 text-slate-400" />
        <h4 className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-700">
          Aguardando Lançamento dos 2 Professores da Banca ({grupoAtual.projeto})
        </h4>
        <p className="mt-0.5 text-xs text-slate-500">
          Nenhum professor avaliador salvou notas para este grupo no Firebase ainda.
          Faça login acima e clique em &quot;Salvar Minha Avaliação&quot;.
        </p>
      </div>
    );
  }

  const avaliadoresList = Object.values(banca.avaliacoes_individuais);
  const av1 = avaliadoresList[0] || null;
  const av2 = avaliadoresList[1] || null;
  const professorLogadoJaSalvou = professorLogadoUid
    ? Boolean(banca.avaliacoes_individuais[professorLogadoUid])
    : false;

  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 shadow-2xs">
      {/* Banner de Status da Banca */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${
          banca.status_banca === 'banca_concluida'
            ? 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
            : 'border-amber-300 bg-amber-50/90 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {banca.status_banca === 'banca_concluida' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
          ) : (
            <Clock className="h-5 w-5 shrink-0 text-amber-700" />
          )}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider">
              {banca.status_banca === 'banca_concluida'
                ? '✅ BANCA CONCLUÍDA — Média Simples Oficial dos 2 Professores'
                : `🟡 AGUARDANDO 2º AVALIADOR (${banca.avaliadores_concluidos.length}/2 Avaliações Concluídas)`}
            </h4>
            <p className="text-[11px] leading-relaxed">
              {banca.status_banca === 'banca_concluida'
                ? `Avaliadores: ${banca.avaliadores_concluidos.join(' e ')}. Média Simples Oficial: ${banca.media_final.toFixed(2)} pts (${banca.status_liberacao_final}).`
                : `O Prof. ${banca.avaliadores_concluidos[0]} já lançou suas notas (${av1?.nota_final_grupo.toFixed(2)} pts). ${
                    professorLogadoJaSalvou
                      ? 'Você já registrou sua avaliação! Aguardando o 2º professor salvar para fechar a média.'
                      : 'Aguardando o seu lançamento para consolidar a média da banca!'
                  }`}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-mono text-xs font-black ${
            banca.status_banca === 'banca_concluida'
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-500 text-white'
          }`}
        >
          {banca.status_banca === 'banca_concluida'
            ? `Média Oficial: ${banca.media_final.toFixed(2)}%`
            : `Parcial: ${banca.media_final.toFixed(2)}%`}
        </span>
      </div>

      {/* Grid Comparativo dos 4 Pilares: Prof 1 vs Prof 2 vs Média Simples */}
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

      {/* Caixa dos Dois Pareceres Técnicos Consolidados */}
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
    </div>
  );
};

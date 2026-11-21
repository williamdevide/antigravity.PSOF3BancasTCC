import React from 'react';
import {
  ArrowLeft,
  Clock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { User } from '../services/firebase';
import type { DocenteAutorizacaoRegistro } from '../types';

interface TelaAguardandoAutorizacaoProps {
  usuario: User;
  status: 'pendente' | 'recusado' | 'revogado';
  registro?: DocenteAutorizacaoRegistro | null;
  titularEmail: string;
  onVoltarPortal: () => void;
  onSair: () => Promise<void> | void;
}

export const TelaAguardandoAutorizacao: React.FC<TelaAguardandoAutorizacaoProps> = ({
  usuario,
  status,
  registro,
  titularEmail,
  onVoltarPortal,
  onSair,
}) => {
  const isPendente = status === 'pendente';
  const nomeExibicao = usuario.displayName || registro?.nome || usuario.email?.split('@')[0] || 'Docente';
  const dataPedidoFmt = registro?.solicitado_em
    ? new Date(registro.solicitado_em).toLocaleString('pt-BR')
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Faixa Institucional Superior */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isPendente
              ? 'border-amber-500/30 bg-amber-950/30'
              : 'border-red-500/30 bg-red-950/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isPendente
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isPendente ? <Clock className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                SENAI Ourinhos • Bancas TCC (PSOF3)
              </p>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">
                {isPendente
                  ? 'Aguardando Autorização do Titular'
                  : status === 'recusado'
                  ? 'Solicitação Recusada'
                  : 'Acesso Revogado'}
              </h1>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase ${
              isPendente
                ? 'border border-amber-400/50 bg-amber-500/20 text-amber-200'
                : 'border border-red-400/50 bg-red-500/20 text-red-200'
            }`}
          >
            {isPendente && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />}
            {isPendente ? 'Pendente' : status === 'recusado' ? 'Recusado' : 'Revogado'}
          </span>
        </div>

        {/* Corpo */}
        <div className="space-y-5 p-6">
          {/* Card do usuário autenticado */}
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            {usuario.photoURL ? (
              <img
                src={usuario.photoURL}
                alt={nomeExibicao}
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-slate-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800 text-base font-black text-slate-200 ring-2 ring-slate-700">
                {nomeExibicao[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-white">{nomeExibicao}</p>
              <p className="truncate font-mono text-xs text-slate-400">{usuario.email}</p>
              {dataPedidoFmt && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Pedido registrado em {dataPedidoFmt}
                </p>
              )}
            </div>
          </div>

          {isPendente ? (
            <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
              <div className="flex items-start gap-2.5">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="leading-relaxed">
                  Sua solicitação já foi enviada para o Professor Titular (
                  <strong className="font-mono text-amber-300">{titularEmail}</strong>). Enquanto
                  ele não aprovar, nenhuma página da área dos professores pode ser acessada.
                </p>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-emerald-200">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="leading-relaxed">
                  <strong>Liberação automática em tempo real:</strong> mantenha esta aba aberta.
                  Assim que sua conta for autorizada uma primeira vez, você será liberado como{' '}
                  <strong>Professor Convidado</strong> em caráter permanente (sem precisar pedir
                  novamente nos próximos acessos).
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="leading-relaxed">
                O acesso desta conta foi{' '}
                <strong>{status === 'recusado' ? 'recusado' : 'revogado'}</strong> pelo Professor
                Titular (<strong className="font-mono">{titularEmail}</strong>). Caso considere um
                equívoco, solicite ao Titular a reautorização do seu e-mail no painel{' '}
                <strong>Docentes</strong>.
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onVoltarPortal}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Portal dos Alunos
            </button>

            <button
              type="button"
              onClick={() => void onSair()}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-red-700 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sair / Trocar Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Crown,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { EMAIL_PROFESSOR_TITULAR, type User } from '../services/firebase';
import {
  atualizarStatusDocenteFirestore,
  autorizarDocenteFirestore,
  excluirRegistroDocenteFirestore,
} from '../services/docentesAutorizados';
import type { DocenteAutorizacaoRegistro } from '../types';

interface ModalGestaoDocentesProps {
  aberto: boolean;
  onClose: () => void;
  docentes: DocenteAutorizacaoRegistro[];
  titularUser: User;
  onFeedback?: (tipo: 'ok' | 'erro', texto: string) => void;
}

export const ModalGestaoDocentes: React.FC<ModalGestaoDocentesProps> = ({
  aberto,
  onClose,
  docentes,
  titularUser,
  onFeedback,
}) => {
  const [novoEmail, setNovoEmail] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [processandoEmail, setProcessandoEmail] = useState<string | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  if (!aberto) return null;

  const pendentes = docentes.filter((d) => d.status === 'pendente');
  const autorizados = docentes.filter(
    (d) => d.status === 'autorizado' && d.email !== EMAIL_PROFESSOR_TITULAR,
  );
  const bloqueados = docentes.filter(
    (d) => d.status === 'recusado' || d.status === 'revogado',
  );

  const reportar = (ok: boolean, mensagem: string) => {
    if (!ok) setErroLocal(mensagem);
    else setErroLocal(null);
    if (onFeedback) onFeedback(ok ? 'ok' : 'erro', mensagem);
  };

  const handleAutorizar = async (reg: DocenteAutorizacaoRegistro) => {
    setErroLocal(null);
    setProcessandoEmail(reg.email);
    const res = await autorizarDocenteFirestore(
      reg.email,
      reg.nome,
      titularUser,
      reg.origem === 'manual_titular' ? 'manual_titular' : 'solicitacao',
    );
    setProcessandoEmail(null);
    reportar(res.ok, res.mensagem);
  };

  const handleAlterarStatus = async (
    email: string,
    novoStatus: 'autorizado' | 'recusado' | 'revogado',
  ) => {
    setErroLocal(null);
    setProcessandoEmail(email);
    const res = await atualizarStatusDocenteFirestore(email, novoStatus, titularUser);
    setProcessandoEmail(null);
    reportar(res.ok, res.mensagem);
  };

  const handleExcluir = async (email: string) => {
    setErroLocal(null);
    setProcessandoEmail(email);
    const res = await excluirRegistroDocenteFirestore(email, titularUser);
    setProcessandoEmail(null);
    reportar(res.ok, res.mensagem);
  };

  const handlePreAutorizarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLocal(null);
    setProcessandoEmail('__manual__');
    const res = await autorizarDocenteFirestore(
      novoEmail,
      novoNome,
      titularUser,
      'manual_titular',
    );
    setProcessandoEmail(null);
    if (res.ok) {
      setNovoEmail('');
      setNovoNome('');
    }
    reportar(res.ok, res.mensagem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white text-slate-900 shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider">
                Gestão de Docentes Autorizados (Firestore)
              </h2>
              <p className="text-xs text-slate-300">
                Autorize novos e-mails permanentemente para atuar como Professor Convidado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Fechar painel de docentes"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {erroLocal && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-900">
              {erroLocal}
            </div>
          )}

          {/* Bloco 1: Solicitações Pendentes */}
          <section className="space-y-2.5 rounded-xl border-2 border-amber-300 bg-amber-50/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-950">
                <Clock className="h-4 w-4 text-amber-700" />
                Solicitações Aguardando Autorização ({pendentes.length})
              </h3>
              {pendentes.length > 0 && (
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white animate-pulse">
                  Ação Necessária
                </span>
              )}
            </div>

            {pendentes.length === 0 ? (
              <p className="text-xs text-amber-900/80">
                Nenhuma solicitação pendente no momento. Quando um novo professor entrar na área
                docente, ele aparecerá aqui em tempo real.
              </p>
            ) : (
              <ul className="space-y-2">
                {pendentes.map((reg) => {
                  const carregando = processandoEmail === reg.email;
                  return (
                    <li
                      key={reg.email}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-white p-3 shadow-2xs"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {reg.foto_url ? (
                          <img
                            src={reg.foto_url}
                            alt={reg.nome}
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-900">
                            {(reg.nome || reg.email)[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-slate-900">
                            {reg.nome || reg.email}
                          </p>
                          <p className="truncate font-mono text-[11px] text-slate-600">
                            {reg.email}
                          </p>
                          {reg.solicitado_em && (
                            <p className="text-[10px] text-slate-400">
                              Solicitado em{' '}
                              {new Date(reg.solicitado_em).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={processandoEmail !== null}
                          onClick={() => void handleAutorizar(reg)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                          {carregando ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          Autorizar (Permanente)
                        </button>
                        <button
                          type="button"
                          disabled={processandoEmail !== null}
                          onClick={() => void handleAlterarStatus(reg.email, 'recusado')}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Recusar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Bloco 2: Pré-autorizar Novo E-mail Manualmente */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800">
              <MailPlus className="h-4 w-4 text-indigo-600" />
              Pré-autorizar Novo E-mail Antecipadamente
            </h3>
            <form onSubmit={handlePreAutorizarManual} className="grid gap-2.5 sm:grid-cols-12">
              <input
                type="email"
                required
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="email.professor@gmail.com ou @docente.senai.br"
                className="sm:col-span-6 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome do Professor (opcional)"
                className="sm:col-span-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={processandoEmail !== null}
                className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white shadow-2xs transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {processandoEmail === '__manual__' ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Pré-autorizar
              </button>
            </form>
          </section>

          {/* Bloco 3: Professores Autorizados */}
          <section className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Professores com Acesso Liberado ({1 + autorizados.length})
            </h3>

            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {/* Titular fixo */}
              <li className="flex flex-wrap items-center justify-between gap-3 bg-amber-50/50 px-4 py-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">
                      {titularUser.displayName || 'Prof. William Devidé Komel'}
                    </p>
                    <p className="font-mono text-[11px] text-slate-600">
                      {EMAIL_PROFESSOR_TITULAR}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950">
                  Prof. Titular • Permanente
                </span>
              </li>

              {/* Convidados autorizados */}
              {autorizados.map((reg) => {
                const carregando = processandoEmail === reg.email;
                return (
                  <li
                    key={reg.email}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">
                        {(reg.nome || reg.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate font-bold text-slate-900">
                            {reg.nome || reg.email}
                          </p>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-emerald-800">
                            {reg.origem === 'pre_autorizado'
                              ? 'Pré-autorizado'
                              : 'Prof. Convidado'}
                          </span>
                        </div>
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          {reg.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={processandoEmail !== null}
                      onClick={() => void handleAlterarStatus(reg.email, 'revogado')}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                    >
                      {carregando ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserX className="h-3.5 w-3.5" />
                      )}
                      Revogar
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Bloco 4: Recusados / Revogados */}
          {bloqueados.length > 0 && (
            <section className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Recusados / Revogados ({bloqueados.length})
              </h3>
              <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {bloqueados.map((reg) => (
                  <li
                    key={reg.email}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-slate-800">
                          {reg.nome || reg.email}
                        </p>
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-red-800">
                          {reg.status}
                        </span>
                      </div>
                      <p className="truncate font-mono text-[11px] text-slate-500">{reg.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={processandoEmail !== null}
                        onClick={() => void handleAlterarStatus(reg.email, 'autorizado')}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Reautorizar
                      </button>
                      <button
                        type="button"
                        disabled={processandoEmail !== null}
                        onClick={() => void handleExcluir(reg.email)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                        title="Excluir registro do Firestore"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

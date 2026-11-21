import React, { useState } from 'react';
import {
  DOMINIO_DOCENTE_AUTORIZADO,
  EMAIL_PROFESSOR_TITULAR,
  isUsuarioProfessorTitular,
  loginComGoogle,
  type User,
} from '../services/firebase';
import { X, Shield, CheckCircle, AlertCircle, ArrowLeft, Crown, Lock } from 'lucide-react';

interface AuthModalProps {
  aberto: boolean;
  onClose?: () => void;
  onFechar?: () => void;
  onVoltarPortal?: () => void;
  usuarioAtual?: User | null;
  onSucesso?: (user: User) => void;
  onLoginSucesso?: (user: User) => void;
  obrigatorio?: boolean;
  erroExterno?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  aberto,
  onClose,
  onFechar,
  onVoltarPortal,
  onSucesso,
  onLoginSucesso,
  obrigatorio = false,
  erroExterno = null,
}) => {
  const fechar = onClose || onFechar || (() => {});
  const sucessoLogin = onSucesso || onLoginSucesso || (() => {});
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  if (!aberto) return null;

  const erroExibido = erro || erroExterno;

  const handleLoginGoogle = async () => {
    setErro(null);
    setSucesso(null);
    setCarregandoGoogle(true);
    try {
      const user = await loginComGoogle();
      const ehTitular = isUsuarioProfessorTitular(user);
      setSucesso(
        `Autenticado (${ehTitular ? 'Professor Titular' : 'Avaliador SENAI'}): ${user.displayName || user.email}`,
      );
      sucessoLogin(user);
      setTimeout(fechar, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg);
    } finally {
      setCarregandoGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-red-600/20 p-2 text-red-500">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Acesso Institucional Docente
              </h3>
              <p className="text-[11px] text-slate-400">
                Somente conta Google {DOMINIO_DOCENTE_AUTORIZADO} • Cloud Firestore
              </p>
            </div>
          </div>
          {obrigatorio ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              Restrito SENAI
            </span>
          ) : (
            <button
              type="button"
              onClick={fechar}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Corpo */}
        <div className="space-y-4 p-5">
          {obrigatorio && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="leading-snug">
                <strong>Autenticação Institucional Obrigatória:</strong> Entre exclusivamente com
                sua conta Google <strong>{DOMINIO_DOCENTE_AUTORIZADO}</strong> para acessar a área
                dos professores.
              </p>
            </div>
          )}

          {erroExibido && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-950/60 p-3 text-xs text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{erroExibido}</span>
            </div>
          )}

          {sucesso && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-950/50 p-3 text-xs text-emerald-200">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{sucesso}</span>
            </div>
          )}

          {/* Regras de Perfil Institucional */}
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-[11px] text-slate-300">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Crown className="h-3.5 w-3.5 shrink-0" />
              <span>Professor Titular: {EMAIL_PROFESSOR_TITULAR}</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              Gestão completa de bancas, início/consolidação, revisão pós-banca, adiamentos e
              arquivos exclusiva da conta titular. Outras contas{' '}
              <code className="text-slate-200">{DOMINIO_DOCENTE_AUTORIZADO}</code> acessam em modo
              avaliador para lançar suas notas individuais no Firestore.
            </p>
          </div>

          {/* Botão Único de Login Institucional Google (@docente.senai.br) */}
          <button
            type="button"
            onClick={handleLoginGoogle}
            disabled={carregandoGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-extrabold text-slate-900 shadow-md transition hover:bg-slate-100 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {carregandoGoogle
                ? 'Validando conta @docente.senai.br...'
                : 'Entrar com Google Institucional (@docente.senai.br)'}
            </span>
          </button>

          {onVoltarPortal && (
            <div className="border-t border-slate-800 pt-3 text-center">
              <button
                type="button"
                onClick={onVoltarPortal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para o Portal Público dos Alunos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

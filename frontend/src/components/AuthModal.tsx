import React, { useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  loginComGoogle,
  type User,
} from '../services/firebase';
import { LogIn, UserPlus, X, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  aberto: boolean;
  onClose?: () => void;
  onFechar?: () => void;
  usuarioAtual?: User | null;
  onSucesso?: (user: User) => void;
  onLoginSucesso?: (user: User) => void;
  obrigatorio?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  aberto,
  onClose,
  onFechar,
  onSucesso,
  onLoginSucesso,
  obrigatorio = false,
}) => {
  const fechar = onClose || onFechar || (() => {});
  const sucessoLogin = onSucesso || onLoginSucesso || (() => {});
  const [isCadastro, setIsCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  if (!aberto) return null;

  const handleLoginGoogle = async () => {
    setErro(null);
    setSucesso(null);
    setCarregandoGoogle(true);
    try {
      const user = await loginComGoogle();
      setSucesso(`Autenticado com o Google: ${user.displayName || user.email}!`);
      sucessoLogin(user);
      setTimeout(fechar, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg);
    } finally {
      setCarregandoGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setCarregando(true);

    try {
      if (isCadastro) {
        if (!nome.trim()) {
          throw new Error('Informe o nome completo do professor avaliador.');
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
        await updateProfile(cred.user, { displayName: nome.trim() });
        setSucesso('Conta de avaliador criada com sucesso!');
        sucessoLogin(cred.user);
        setTimeout(fechar, 1200);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
        setSucesso(`Bem-vindo(a), ${cred.user.displayName || cred.user.email}!`);
        sucessoLogin(cred.user);
        setTimeout(fechar, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setErro('E-mail ou senha incorretos.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setErro('Este e-mail já está cadastrado. Alterne para Entrar.');
      } else if (msg.includes('auth/weak-password')) {
        setErro('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setErro(msg);
      }
    } finally {
      setCarregando(false);
    }
  };

  const preencherAtalho = (emailAtalho: string, nomeAtalho: string) => {
    setEmail(emailAtalho);
    setNome(nomeAtalho);
    setSenha('senai@2026');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-red-600/20 p-2 text-red-500">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                {isCadastro ? 'Cadastrar Novo Avaliador' : 'Acesso do Professor Avaliador'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Firebase Authentication • Avaliação Simultânea da Banca
              </p>
            </div>
          </div>
          {obrigatorio ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              Obrigatório
            </span>
          ) : (
            <button
              type="button"
              onClick={fechar}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Corpo */}
        <div className="space-y-4 p-5">
          {obrigatorio && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <p className="leading-snug">
                <strong>Identificação Obrigatória:</strong> Identifique-se com sua conta de avaliador para ter acesso às análises e avaliações das bancas.
              </p>
            </div>
          )}
          {erro && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-950/50 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{erro}</span>
            </div>
          )}

          {sucesso && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-950/50 p-3 text-xs text-emerald-200">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{sucesso}</span>
            </div>
          )}

          {/* Botão de Login com Conta Google */}
          <button
            type="button"
            onClick={handleLoginGoogle}
            disabled={carregando || carregandoGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-600 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-md transition hover:bg-slate-100 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
              {carregandoGoogle ? 'Conectando ao Google...' : 'Continuar com conta Google'}
            </span>
          </button>

          {/* Divisor Visual */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <span className="relative bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ou com e-mail institucional
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isCadastro && (
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Nome Completo do Professor:
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Prof. William Devidé Komel"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300">E-mail:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@docente.senai.br"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Senha de Acesso:</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Atalhos Rápidos para Bancas SENAI */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Atalhos Rápidos de Credenciais para a Banca:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    preencherAtalho('william.komel@docente.senai.br', 'Prof. William Devidé Komel')
                  }
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-red-500 hover:bg-slate-700"
                >
                  👨‍🏫 Prof. William Devidé
                </button>
                <button
                  type="button"
                  onClick={() =>
                    preencherAtalho('avaliador2.senai@docente.senai.br', 'Prof. Segundo Avaliador')
                  }
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-indigo-500 hover:bg-slate-700"
                >
                  👨‍🏫 Prof. 2º Avaliador
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando || carregandoGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-900/30 hover:bg-red-700 disabled:opacity-50"
            >
              {isCadastro ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  {carregando ? 'Cadastrando...' : 'Criar Conta com E-mail'}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {carregando ? 'Entrando...' : 'Entrar com E-mail'}
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCadastro(!isCadastro);
                  setErro(null);
                  setSucesso(null);
                }}
                className="text-xs text-slate-400 hover:text-red-400 hover:underline"
              >
                {isCadastro
                  ? 'Já possui cadastro? Clique aqui para Entrar.'
                  : 'Primeira vez avaliando? Clique para Criar Conta de Avaliador.'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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
}

export const AuthModal: React.FC<AuthModalProps> = ({
  aberto,
  onClose,
  onFechar,
  onSucesso,
  onLoginSucesso,
}) => {
  const fechar = onClose || onFechar || (() => {});
  const sucessoLogin = onSucesso || onLoginSucesso || (() => {});
  const [isCadastro, setIsCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  if (!aberto) return null;

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
          <button
            type="button"
            onClick={fechar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
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
            <label className="block text-xs font-semibold text-slate-300">E-mail Institucional:</label>
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
            disabled={carregando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-900/30 hover:bg-red-700 disabled:opacity-50"
          >
            {isCadastro ? (
              <>
                <UserPlus className="h-4 w-4" />
                {carregando ? 'Cadastrando...' : 'Criar Conta de Avaliador'}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {carregando ? 'Entrando...' : 'Entrar como Avaliador'}
              </>
            )}
          </button>

          <div className="text-center">
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
  );
};

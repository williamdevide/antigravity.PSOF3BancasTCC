import {
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  type User,
} from './firebase';
import {
  CONVIDADOS_PRE_AUTORIZADOS_META,
  EMAIL_PROFESSOR_TITULAR,
  isEmailFormatoValido,
  isEmailPreAutorizadoConvidado,
  isUsuarioProfessorTitular,
  normalizarEmailDocente,
} from './authPolicy';
import { formatarErroFirestore } from './bancaMultiAvaliador';
import type { DocenteAutorizacaoRegistro, StatusAutorizacaoDocente } from '../types';

export const COLECAO_DOCENTES_AUTORIZADOS = 'psof3_docentes_autorizados';

const PESO_STATUS: Record<StatusAutorizacaoDocente, number> = {
  pendente: 0,
  autorizado: 1,
  revogado: 2,
  recusado: 3,
};

function ordenarRegistrosDocentes(
  lista: DocenteAutorizacaoRegistro[],
): DocenteAutorizacaoRegistro[] {
  return [...lista].sort((a, b) => {
    const pDiff = (PESO_STATUS[a.status] ?? 9) - (PESO_STATUS[b.status] ?? 9);
    if (pDiff !== 0) return pDiff;
    return (a.nome || a.email).localeCompare(b.nome || b.email, 'pt-BR');
  });
}

/**
 * Escuta em tempo real o documento de autorização do docente logado em psof3_docentes_autorizados/{email}.
 */
export function escutarMeuRegistroDocenteFirestore(
  email: string | null | undefined,
  onUpdate: (registro: DocenteAutorizacaoRegistro | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const emailDocId = normalizarEmailDocente(email);
  if (!emailDocId) {
    onUpdate(null);
    return () => {};
  }

  try {
    const docRef = doc(db, COLECAO_DOCENTES_AUTORIZADOS, emailDocId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate(null);
          return;
        }
        onUpdate(snapshot.data() as DocenteAutorizacaoRegistro);
      },
      (err) => {
        if (onError) onError(err);
      },
    );
  } catch (err: unknown) {
    if (onError && err instanceof Error) onError(err);
    return () => {};
  }
}

/**
 * Registra uma solicitação inicial com status 'pendente' quando um novo docente entra pela 1ª vez.
 * Caso o documento já exista como 'pendente', atualiza apenas metadados de presença.
 */
export async function registrarSolicitacaoAcessoDocente(
  user: User,
): Promise<{ ok: boolean; mensagem: string }> {
  const emailDocId = normalizarEmailDocente(user.email);
  if (!emailDocId) {
    return { ok: false, mensagem: 'Conta autenticada sem endereço de e-mail.' };
  }
  if (isUsuarioProfessorTitular(user) || isEmailPreAutorizadoConvidado(emailDocId)) {
    return { ok: true, mensagem: '' };
  }

  try {
    const docRef = doc(db, COLECAO_DOCENTES_AUTORIZADOS, emailDocId);
    const snap = await getDoc(docRef);
    const agora = new Date().toISOString();
    const nomeDocente =
      user.displayName?.trim() || emailDocId.split('@')[0] || 'Professor Solicitante';

    if (!snap.exists()) {
      const novoRegistro: DocenteAutorizacaoRegistro = {
        email: emailDocId,
        uid: user.uid,
        nome: nomeDocente,
        foto_url: user.photoURL || null,
        status: 'pendente',
        origem: 'solicitacao',
        solicitado_em: agora,
        autorizado_em: null,
        autorizado_por: null,
        ultimo_acesso_em: agora,
        atualizado_em: agora,
      };
      await setDoc(docRef, novoRegistro);
      return {
        ok: true,
        mensagem: 'Solicitação de acesso enviada ao Professor Titular.',
      };
    }

    const existente = snap.data() as DocenteAutorizacaoRegistro;
    if (existente.status === 'pendente') {
      await setDoc(
        docRef,
        {
          nome: nomeDocente,
          foto_url: user.photoURL || existente.foto_url || null,
          uid: user.uid,
          ultimo_acesso_em: agora,
          atualizado_em: agora,
        },
        { merge: true },
      );
    }
    return { ok: true, mensagem: '' };
  } catch (err: unknown) {
    return {
      ok: false,
      mensagem: formatarErroFirestore(err, 'registrar solicitação de autorização docente'),
    };
  }
}

/**
 * Escuta toda a coleção psof3_docentes_autorizados no Firestore (exclusivo Professor Titular).
 */
export function escutarTodosDocentesAutorizadosFirestore(
  onUpdate: (lista: DocenteAutorizacaoRegistro[]) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    const colRef = collection(db, COLECAO_DOCENTES_AUTORIZADOS);
    const q = query(colRef);
    return onSnapshot(
      q,
      (snapshot) => {
        const registros = snapshot.docs.map((d) => {
          const data = d.data() as DocenteAutorizacaoRegistro;
          return {
            ...data,
            email: normalizarEmailDocente(data.email || d.id),
          };
        });
        onUpdate(ordenarRegistrosDocentes(registros));
      },
      (err) => {
        if (onError) onError(err);
      },
    );
  } catch (err: unknown) {
    if (onError && err instanceof Error) onError(err);
    return () => {};
  }
}

/**
 * Garante no Firestore os documentos iniciais dos convidados pré-autorizados (Edivan e João)
 * apenas se ainda não existirem — preservando eventual revogação manual posterior do Titular.
 */
export async function garantirSeedPreAutorizadosFirestore(titular: User): Promise<void> {
  if (!isUsuarioProfessorTitular(titular)) return;
  try {
    const agora = new Date().toISOString();
    await Promise.all(
      CONVIDADOS_PRE_AUTORIZADOS_META.map(async ({ email, nome }) => {
        const docRef = doc(db, COLECAO_DOCENTES_AUTORIZADOS, email);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          const registro: DocenteAutorizacaoRegistro = {
            email,
            uid: null,
            nome,
            foto_url: null,
            status: 'autorizado',
            origem: 'pre_autorizado',
            solicitado_em: agora,
            autorizado_em: agora,
            autorizado_por: EMAIL_PROFESSOR_TITULAR,
            ultimo_acesso_em: null,
            atualizado_em: agora,
          };
          await setDoc(docRef, registro);
        }
      }),
    );
  } catch {
    // Falha eventual não impede o carregamento da aplicação do Titular
  }
}

/**
 * Autoriza permanentemente um docente (por solicitação pendente ou pré-autorização manual).
 */
export async function autorizarDocenteFirestore(
  email: string,
  nome: string,
  titular: User,
  origem: 'solicitacao' | 'manual_titular' = 'solicitacao',
): Promise<{ ok: boolean; mensagem: string }> {
  if (!isUsuarioProfessorTitular(titular)) {
    return {
      ok: false,
      mensagem: `Apenas o Professor Titular (${EMAIL_PROFESSOR_TITULAR}) pode autorizar docentes.`,
    };
  }
  const emailLimpo = normalizarEmailDocente(email);
  if (!isEmailFormatoValido(emailLimpo)) {
    return { ok: false, mensagem: 'Informe um e-mail válido para autorizar.' };
  }
  if (emailLimpo === EMAIL_PROFESSOR_TITULAR) {
    return { ok: false, mensagem: 'O e-mail informado já é o do Professor Titular.' };
  }

  try {
    const docRef = doc(db, COLECAO_DOCENTES_AUTORIZADOS, emailLimpo);
    const snap = await getDoc(docRef);
    const existente = snap.exists() ? (snap.data() as DocenteAutorizacaoRegistro) : null;
    const agora = new Date().toISOString();
    const nomeFinal =
      nome.trim() || existente?.nome?.trim() || emailLimpo.split('@')[0] || 'Prof. Convidado';

    const payload: DocenteAutorizacaoRegistro = {
      email: emailLimpo,
      uid: existente?.uid ?? null,
      nome: nomeFinal,
      foto_url: existente?.foto_url ?? null,
      status: 'autorizado',
      origem: existente?.origem || origem,
      solicitado_em: existente?.solicitado_em || agora,
      autorizado_em: agora,
      autorizado_por: EMAIL_PROFESSOR_TITULAR,
      ultimo_acesso_em: existente?.ultimo_acesso_em ?? null,
      atualizado_em: agora,
    };

    await setDoc(docRef, payload, { merge: true });
    return {
      ok: true,
      mensagem: `E-mail '${emailLimpo}' autorizado permanentemente como Professor Convidado!`,
    };
  } catch (err: unknown) {
    return { ok: false, mensagem: formatarErroFirestore(err, 'autorizar docente') };
  }
}

/**
 * Altera o status de um registro docente (autorizado, recusado ou revogado).
 */
export async function atualizarStatusDocenteFirestore(
  email: string,
  novoStatus: 'autorizado' | 'recusado' | 'revogado',
  titular: User,
): Promise<{ ok: boolean; mensagem: string }> {
  if (!isUsuarioProfessorTitular(titular)) {
    return {
      ok: false,
      mensagem: `Apenas o Professor Titular (${EMAIL_PROFESSOR_TITULAR}) pode alterar autorizações.`,
    };
  }
  const emailLimpo = normalizarEmailDocente(email);
  if (!emailLimpo || emailLimpo === EMAIL_PROFESSOR_TITULAR) {
    return { ok: false, mensagem: 'Não é permitido alterar o status do Professor Titular.' };
  }

  try {
    const docRef = doc(db, COLECAO_DOCENTES_AUTORIZADOS, emailLimpo);
    const agora = new Date().toISOString();
    const patch: Record<string, unknown> = {
      email: emailLimpo,
      status: novoStatus,
      atualizado_em: agora,
    };
    if (novoStatus === 'autorizado') {
      patch.autorizado_em = agora;
      patch.autorizado_por = EMAIL_PROFESSOR_TITULAR;
    }
    await setDoc(docRef, patch, { merge: true });

    const acaoTxt =
      novoStatus === 'autorizado'
        ? 'autorizado permanentemente'
        : novoStatus === 'recusado'
        ? 'recusado'
        : 'revogado';
    return {
      ok: true,
      mensagem: `Acesso de '${emailLimpo}' ${acaoTxt} com sucesso.`,
    };
  } catch (err: unknown) {
    return { ok: false, mensagem: formatarErroFirestore(err, 'atualizar status do docente') };
  }
}

/**
 * Remove o registro de um docente recusado/revogado do Firestore (exclusivo Titular).
 */
export async function excluirRegistroDocenteFirestore(
  email: string,
  titular: User,
): Promise<{ ok: boolean; mensagem: string }> {
  if (!isUsuarioProfessorTitular(titular)) {
    return {
      ok: false,
      mensagem: `Apenas o Professor Titular (${EMAIL_PROFESSOR_TITULAR}) pode excluir registros.`,
    };
  }
  const emailLimpo = normalizarEmailDocente(email);
  if (!emailLimpo || emailLimpo === EMAIL_PROFESSOR_TITULAR) {
    return { ok: false, mensagem: 'Registro do Titular não pode ser removido.' };
  }

  try {
    await deleteDoc(doc(db, COLECAO_DOCENTES_AUTORIZADOS, emailLimpo));
    return { ok: true, mensagem: `Registro de '${emailLimpo}' removido do Firestore.` };
  } catch (err: unknown) {
    return { ok: false, mensagem: formatarErroFirestore(err, 'excluir registro docente') };
  }
}

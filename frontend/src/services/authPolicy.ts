export const EMAIL_PROFESSOR_TITULAR = 'williamdevide@gmail.com';
export const DOMINIOS_RECOMENDADOS_DOCENTE = ['@gmail.com', '@docente.senai.br'] as const;
export const EMAILS_CONVIDADOS_PRE_AUTORIZADOS: readonly string[] = [
  'edivan.andrade2025@gmail.com',
  'joaopaulooliveiira@hotmail.com',
];

export const CONVIDADOS_PRE_AUTORIZADOS_META: readonly { email: string; nome: string }[] = [
  { email: 'edivan.andrade2025@gmail.com', nome: 'Prof. Edivan Andrade' },
  { email: 'joaopaulooliveiira@hotmail.com', nome: 'Prof. João Paulo Oliveira' },
];

export type StatusAutorizacaoDocentePolicy = 'autorizado' | 'pendente' | 'recusado' | 'revogado';
export type StatusAcessoDocenteResolvido =
  | 'nao_autenticado'
  | 'titular'
  | 'autorizado'
  | 'pendente'
  | 'recusado'
  | 'revogado';

export function normalizarEmailDocente(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Valida se a string informada possui sintaxe básica de endereço de e-mail.
 */
export function isEmailFormatoValido(email?: string | null): boolean {
  const limpo = normalizarEmailDocente(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo);
}

/**
 * Indica se o e-mail pertence à lista de docentes convidados pré-autorizados pelo Titular.
 */
export function isEmailPreAutorizadoConvidado(email?: string | null): boolean {
  const limpo = normalizarEmailDocente(email);
  return EMAILS_CONVIDADOS_PRE_AUTORIZADOS.includes(limpo);
}

/**
 * Garante que apenas o Professor Titular oficial (williamdevide@gmail.com, com e-mail verificado)
 * possua privilégios de gestão total, consolidação e aprovação de outros docentes.
 */
export function isUsuarioProfessorTitular(
  user?: { email?: string | null; emailVerified?: boolean } | null,
): boolean {
  if (!user) return false;
  return Boolean(user.emailVerified) && normalizarEmailDocente(user.email) === EMAIL_PROFESSOR_TITULAR;
}

/**
 * Resolve o estado efetivo de acesso na área dos professores considerando:
 * 1) Professor Titular verificado -> 'titular'
 * 2) Registro persistido no Firestore (psof3_docentes_autorizados) -> soberano (inclusive revogação/recusa)
 * 3) Pré-autorizados (João e Edivan) sem documento -> 'autorizado'
 * 4) Qualquer outro docente autenticado -> 'pendente' (aguardando autorização do Titular)
 */
export function resolverStatusAcessoDocente(
  user?: { email?: string | null; emailVerified?: boolean } | null,
  registro?: { status?: StatusAutorizacaoDocentePolicy | string | null } | null,
): StatusAcessoDocenteResolvido {
  const email = normalizarEmailDocente(user?.email);
  if (!user || !email) {
    return 'nao_autenticado';
  }
  if (isUsuarioProfessorTitular(user)) {
    return 'titular';
  }
  // Proteção extra caso uma conta não verificada tente se passar pelo e-mail titular
  if (email === EMAIL_PROFESSOR_TITULAR) {
    return 'pendente';
  }

  const st = (registro?.status || '').trim().toLowerCase();
  if (st === 'autorizado' || st === 'pendente' || st === 'recusado' || st === 'revogado') {
    return st;
  }

  if (isEmailPreAutorizadoConvidado(email)) {
    return 'autorizado';
  }
  return 'pendente';
}

/**
 * Retorna true somente quando o usuário já pode acessar a área docente (Titular ou Convidado autorizado).
 */
export function isDocenteComAcessoLiberado(
  user?: { email?: string | null; emailVerified?: boolean } | null,
  registro?: { status?: StatusAutorizacaoDocentePolicy | string | null } | null,
): boolean {
  const status = resolverStatusAcessoDocente(user, registro);
  return status === 'titular' || status === 'autorizado';
}

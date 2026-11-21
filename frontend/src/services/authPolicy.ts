export const DOMINIO_DOCENTE_AUTORIZADO = '@docente.senai.br';
export const EMAIL_PROFESSOR_TITULAR = 'william.komel@docente.senai.br';

export function normalizarEmailDocente(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Verifica se o e-mail pertence estritamente ao domínio institucional @docente.senai.br.
 */
export function isEmailDocenteSenai(email?: string | null): boolean {
  const limpo = normalizarEmailDocente(email);
  return /^[^\s@]+@docente\.senai\.br$/i.test(limpo);
}

/**
 * Valida se o usuário autenticado possui conta institucional @docente.senai.br com e-mail verificado.
 */
export function isUsuarioDocenteAutorizado(
  user?: { email?: string | null; emailVerified?: boolean } | null,
): boolean {
  if (!user) return false;
  return Boolean(user.emailVerified) && isEmailDocenteSenai(user.email);
}

/**
 * Garante que apenas o Professor Titular oficial (william.komel@docente.senai.br) possua privilégios de gestão total.
 */
export function isUsuarioProfessorTitular(
  user?: { email?: string | null; emailVerified?: boolean } | null,
): boolean {
  if (!isUsuarioDocenteAutorizado(user)) return false;
  return normalizarEmailDocente(user?.email) === EMAIL_PROFESSOR_TITULAR;
}

import {
  db,
  doc,
  setDoc,
  collection,
  query,
  onSnapshot,
} from './firebase';
import type {
  AvaliacaoGrupo,
  AvaliacaoProfessorIndividual,
  BancaConsolidada,
  DraftAvaliacaoLocal,
  NivelMSEP,
  ResultadoFinalTipo,
  RubricaItemAvaliacao,
  NotaIndividualIntegrante,
  SessaoBancaAoVivo,
} from '../types';
import type { User } from './firebase';

export const COLECAO_AVALIACOES_PROFESSORES = 'psof3_avaliacoes_professores';
export const COLECAO_SESSOES_BANCA = 'psof3_sessoes_banca';
export const COLECAO_ANALISES_AUTOMATICAS = 'psof3_analises_automaticas';

function calcularNivel(nota: number, max: number): NivelMSEP {
  if (nota <= 0) return 'Insuficiente';
  const pct = (nota / max) * 100;
  if (pct >= 90) return 'Avançado';
  if (pct >= 50) return 'Pleno';
  return 'Insuficiente';
}

export function calcularMediaBanca(
  avaliacoes: AvaliacaoProfessorIndividual[],
  grupoBase: AvaliacaoGrupo,
): BancaConsolidada {
  if (avaliacoes.length === 0) {
    return {
      grupo_id: grupoBase.id,
      status_banca: 'pendente',
      avaliadores_concluidos: [],
      avaliacoes_individuais: {},
      media_p1: grupoBase.p1_total,
      media_p2: grupoBase.p2_total,
      media_p3: grupoBase.p3_grupo_base,
      media_p4:
        grupoBase.integrantes_notas.length > 0
          ? grupoBase.integrantes_notas.reduce((a, b) => a + b.p4_nota, 0) /
            grupoBase.integrantes_notas.length
          : 0,
      media_final: grupoBase.media_nota_final_grupo,
      rubricas_medias: grupoBase.rubricas,
      integrantes_medias: grupoBase.integrantes_notas,
      pareceres_professores: [],
      status_liberacao_final: grupoBase.status_liberacao_nota,
    };
  }

  const mapaIndividuais: Record<string, AvaliacaoProfessorIndividual> = {};
  const pareceres = avaliacoes.map((av) => {
    mapaIndividuais[av.professor_uid] = av;
    return {
      professor_nome: av.professor_nome,
      parecer: av.parecer_tecnico,
      atualizado_em: av.atualizado_em,
    };
  });

  const nomes = avaliacoes.map((a) => a.professor_nome);

  if (avaliacoes.length === 1) {
    const av = avaliacoes[0];
    const mediaP4 =
      av.integrantes_notas.length > 0
        ? av.integrantes_notas.reduce((acc, curr) => acc + curr.p4_nota, 0) /
          av.integrantes_notas.length
        : 0;

    return {
      grupo_id: grupoBase.id,
      status_banca: 'aguardando_segundo_avaliador',
      avaliadores_concluidos: nomes,
      avaliacoes_individuais: mapaIndividuais,
      media_p1: av.p1_total,
      media_p2: av.p2_total,
      media_p3: av.p3_grupo_base,
      media_p4: Number(mediaP4.toFixed(2)),
      media_final: av.nota_final_grupo,
      rubricas_medias: av.rubricas,
      integrantes_medias: av.integrantes_notas,
      pareceres_professores: pareceres,
      status_liberacao_final:
        av.nota_final_grupo >= 50
          ? av.integrantes_notas.some((i) => i.possui_item_insuficiente)
            ? 'Nota Retida (Pendências)'
            : 'Aprovado'
          : 'Nova Chance (Data Futura)',
    };
  }

  // Dois ou mais avaliadores: calcula a média simples exata
  const av1 = avaliacoes[0];
  const av2 = avaliacoes[1];

  const mediaP1 = Number(((av1.p1_total + av2.p1_total) / 2).toFixed(2));
  const mediaP2 = Number(((av1.p2_total + av2.p2_total) / 2).toFixed(2));
  const mediaP3Base = Number(((av1.p3_grupo_base + av2.p3_grupo_base) / 2).toFixed(2));
  const mediaFinal = Number(((av1.nota_final_grupo + av2.nota_final_grupo) / 2).toFixed(2));

  // Média simples de cada rubrica
  const rubricasMedias: RubricaItemAvaliacao[] = av1.rubricas.map((r1) => {
    const r2 = av2.rubricas.find((r) => r.codigo === r1.codigo) || r1;
    const notaMedia = Number(((r1.nota + r2.nota) / 2).toFixed(2));
    const nivel = calcularNivel(notaMedia, r1.peso_max);
    return {
      ...r1,
      nota: notaMedia,
      nivel,
      editado_manualmente: true,
      justificativa_ia: `Média Simples da Banca: Prof. ${av1.professor_nome} (${r1.nota.toFixed(
        1,
      )}) + Prof. ${av2.professor_nome} (${r2.nota.toFixed(1)}) = ${notaMedia.toFixed(1)} pts.`,
    };
  });

  // Média simples de cada integrante
  const integrantesMedias: NotaIndividualIntegrante[] = av1.integrantes_notas.map((i1) => {
    const i2 = av2.integrantes_notas.find((i) => i.nome === i1.nome) || i1;
    const nota31Media = Number(((i1.nota_3_1_arguicao + i2.nota_3_1_arguicao) / 2).toFixed(2));
    const nivel31 = calcularNivel(nota31Media, 6.0);
    const p3Media = Number((nota31Media + mediaP3Base).toFixed(2));
    const p4Media = Number(((i1.p4_nota + i2.p4_nota) / 2).toFixed(2));
    const finalMedia = Number((mediaP1 + mediaP2 + p3Media + p4Media).toFixed(2));

    const insuf: string[] = [];
    rubricasMedias.forEach((r) => {
      if (r.codigo !== '3.1' && r.nivel === 'Insuficiente') {
        insuf.push(`${r.titulo} (${r.nota.toFixed(1)}/${r.peso_max.toFixed(1)})`);
      }
    });
    if (nivel31 === 'Insuficiente') {
      insuf.push(`3.1 Arguição Técnica — ${i1.nome} (${nota31Media.toFixed(1)}/6.0)`);
    }

    let resultado: ResultadoFinalTipo = 'Aprovado';
    if (finalMedia >= 50.0) {
      resultado = insuf.length > 0 ? 'Nota Retida (Pendências)' : 'Aprovado';
    } else {
      resultado = 'Nova Chance (Data Futura)';
    }

    return {
      ...i1,
      nota_3_1_arguicao: nota31Media,
      nivel_3_1: nivel31,
      p1_nota: mediaP1,
      p2_nota: mediaP2,
      p3_nota: p3Media,
      p4_nota: p4Media,
      nota_final: finalMedia,
      possui_item_insuficiente: insuf.length > 0,
      itens_insuficientes: insuf,
      resultado,
    };
  });

  const mediaP4 =
    integrantesMedias.length > 0
      ? integrantesMedias.reduce((a, b) => a + b.p4_nota, 0) / integrantesMedias.length
      : 0;

  const possuiInsufGrupo = integrantesMedias.some((i) => i.possui_item_insuficiente);
  let statusFinal: ResultadoFinalTipo = 'Aprovado';
  if (mediaFinal >= 50.0) {
    statusFinal = possuiInsufGrupo ? 'Nota Retida (Pendências)' : 'Aprovado';
  } else {
    statusFinal = 'Nova Chance (Data Futura)';
  }

  return {
    grupo_id: grupoBase.id,
    status_banca: 'banca_concluida',
    avaliadores_concluidos: nomes,
    avaliacoes_individuais: mapaIndividuais,
    media_p1: mediaP1,
    media_p2: mediaP2,
    media_p3: mediaP3Base,
    media_p4: Number(mediaP4.toFixed(2)),
    media_final: mediaFinal,
    rubricas_medias: rubricasMedias,
    integrantes_medias: integrantesMedias,
    pareceres_professores: pareceres,
    status_liberacao_final: statusFinal,
  };
}

export async function salvarAvaliacaoNoFirestore(
  avaliacao: AvaliacaoProfessorIndividual,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const docRef = doc(
      db,
      COLECAO_AVALIACOES_PROFESSORES,
      `${avaliacao.grupo_id}_${avaliacao.professor_uid}`,
    );
    await setDoc(docRef, avaliacao, { merge: true });
    return { ok: true, mensagem: `Avaliação do Prof. ${avaliacao.professor_nome} salva no Firebase!` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mensagem: `Erro ao salvar no Firestore: ${msg}` };
  }
}

export function escutarAvaliacoesGrupoFirestore(
  grupoId: string,
  onUpdate: (avaliacoes: AvaliacaoProfessorIndividual[]) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    const colRef = collection(db, COLECAO_AVALIACOES_PROFESSORES);
    const q = query(colRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((d) => d.data() as AvaliacaoProfessorIndividual)
          .filter((d) => d.grupo_id === grupoId);
        onUpdate(docs);
      },
      (error) => {
        if (onError) onError(error);
      },
    );

    return unsubscribe;
  } catch (e: unknown) {
    if (onError && e instanceof Error) onError(e);
    return () => {};
  }
}

/**
 * Salva a análise prévia automática do TCC (calculada pelo backend) no Firestore
 */
export async function salvarAnaliseAutomaticaFirestore(
  grupo: AvaliacaoGrupo,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const docRef = doc(db, COLECAO_ANALISES_AUTOMATICAS, grupo.id);
    const dados = {
      grupo_id: grupo.id,
      turma: grupo.turma,
      projeto: grupo.projeto,
      tema: grupo.tema,
      integrantes: grupo.integrantes,
      data_banca: grupo.data_banca,
      horario: grupo.horario,
      ordem_apresentacao: grupo.ordem_apresentacao,
      p1_total: grupo.p1_total,
      p2_total: grupo.p2_total,
      p3_grupo_base: grupo.p3_grupo_base,
      media_nota_final_grupo: grupo.media_nota_final_grupo,
      rubricas: grupo.rubricas,
      integrantes_notas: grupo.integrantes_notas,
      parecer_tecnico: grupo.parecer_tecnico,
      status_liberacao_nota: grupo.status_liberacao_nota,
      atualizado_em: new Date().toISOString(),
    };
    await setDoc(docRef, dados, { merge: true });
    return { ok: true, mensagem: `Análise automática do grupo ${grupo.projeto} salva no Firebase!` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mensagem: `Falha ao salvar análise automática no Firestore: ${msg}` };
  }
}

/**
 * Inicia a sessão oficial da banca ao vivo pelo Professor Titular, disparando o cronômetro
 */
export async function iniciarSessaoBanca(
  grupo: AvaliacaoGrupo,
  titular: User,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const docRef = doc(db, COLECAO_SESSOES_BANCA, grupo.id);
    const sessao: SessaoBancaAoVivo = {
      grupo_id: grupo.id,
      turma: grupo.turma,
      projeto: grupo.projeto,
      status: 'em_andamento',
      titular_uid: titular.uid,
      titular_nome: titular.displayName || titular.email?.split('@')[0] || 'Prof. Titular',
      titular_email: titular.email || '',
      iniciado_em: new Date().toISOString(),
      encerrado_em: null,
      duracao_segundos: 0,
      duracao_formatada: '00:00',
      avaliadores_presentes: [titular.displayName || titular.email || 'Titular'],
      avaliacoes_concluidas: [],
      atualizado_em: new Date().toISOString(),
    };
    await setDoc(docRef, sessao, { merge: true });
    return { ok: true, mensagem: `Banca de ${grupo.projeto} iniciada pelo Prof. Titular! Cronômetro ativo.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mensagem: `Erro ao iniciar sessão da banca: ${msg}` };
  }
}

/**
 * Escuta em tempo real a sessão da banca do grupo selecionado
 */
export function escutarSessaoBanca(
  grupoId: string,
  onUpdate: (sessao: SessaoBancaAoVivo | null) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    const docRef = doc(db, COLECAO_SESSOES_BANCA, grupoId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as SessaoBancaAoVivo);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        if (onError) onError(error);
      },
    );
    return unsubscribe;
  } catch (e: unknown) {
    if (onError && e instanceof Error) onError(e);
    return () => {};
  }
}

/**
 * Escuta todas as sessões de bancas ativas (para o banner de alerta "Ao Vivo" em qualquer tela)
 */
export function escutarTodasSessoesAtivas(
  onUpdate: (sessoes: SessaoBancaAoVivo[]) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    const colRef = collection(db, COLECAO_SESSOES_BANCA);
    const q = query(colRef);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ativas = snapshot.docs
          .map((d) => d.data() as SessaoBancaAoVivo)
          .filter((s) => s.status === 'em_andamento');
        onUpdate(ativas);
      },
      (error) => {
        if (onError) onError(error);
      },
    );
    return unsubscribe;
  } catch (e: unknown) {
    if (onError && e instanceof Error) onError(e);
    return () => {};
  }
}

/**
 * O professor encerra sua avaliação individual, salvando notas e marcando como concluído no Firestore
 */
export async function encerrarMinhaAvaliacao(
  grupoId: string,
  avaliacao: AvaliacaoProfessorIndividual,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    // 1. Salvar a avaliação individual com flag concluido = true
    const docAvRef = doc(
      db,
      COLECAO_AVALIACOES_PROFESSORES,
      `${grupoId}_${avaliacao.professor_uid}`,
    );
    const avCompleta: AvaliacaoProfessorIndividual = {
      ...avaliacao,
      concluido: true,
      atualizado_em: new Date().toISOString(),
    };
    await setDoc(docAvRef, avCompleta, { merge: true });

    // 2. Adicionar o professor na lista de avaliacoes_concluidas da sessão
    const docSessaoRef = doc(db, COLECAO_SESSOES_BANCA, grupoId);
    // Para simplificar e evitar race conditions, atualizamos a lista de concluídos
    await setDoc(
      docSessaoRef,
      {
        avaliacoes_concluidas: [avaliacao.professor_uid],
        atualizado_em: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      ok: true,
      mensagem: `Avaliação do Prof. ${avaliacao.professor_nome} encerrada com sucesso!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mensagem: `Erro ao encerrar avaliação: ${msg}` };
  }
}

/**
 * O Professor Titular encerra formalmente a banca e consolida a média final dos 2 professores
 */
export async function encerrarEConsolidarBanca(
  grupoId: string,
  bancaConsolidada: BancaConsolidada,
  titular: User,
  iniciadoEm: string | null,
  contingencia = false,
  justificativa = '',
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const agora = new Date();
    const encerradoEm = agora.toISOString();
    let duracaoSegundos = 0;
    if (iniciadoEm) {
      duracaoSegundos = Math.max(0, Math.floor((agora.getTime() - new Date(iniciadoEm).getTime()) / 1000));
    }
    const mins = Math.floor(duracaoSegundos / 60);
    const segs = duracaoSegundos % 60;
    const duracaoFormatada = `${mins}m ${segs.toString().padStart(2, '0')}s`;

    const docSessaoRef = doc(db, COLECAO_SESSOES_BANCA, grupoId);
    const dadosConsolidacao: Partial<SessaoBancaAoVivo> & Record<string, unknown> = {
      status: 'concluida',
      encerrado_em: encerradoEm,
      duracao_segundos: duracaoSegundos,
      duracao_formatada: duracaoFormatada,
      titular_uid: titular.uid,
      titular_nome: titular.displayName || titular.email?.split('@')[0] || 'Prof. Titular',
      contingencia_um_avaliador: contingencia,
      justificativa_contingencia: justificativa,
      media_final_consolidada: bancaConsolidada.media_final,
      status_liberacao_final: bancaConsolidada.status_liberacao_final,
      banca_consolidada: bancaConsolidada,
      atualizado_em: encerradoEm,
    };

    await setDoc(docSessaoRef, dadosConsolidacao, { merge: true });

    return {
      ok: true,
      mensagem: `Banca encerrada com sucesso pelo Prof. Titular! Duração total: ${duracaoFormatada}. Média oficial consolidada.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mensagem: `Erro ao consolidar fechamento da banca: ${msg}` };
  }
}

// =========================================================================
// AUTO-SAVE EM LOCALSTORAGE (Resiliência Local)
// =========================================================================

export function salvarDraftLocalStorage(draft: DraftAvaliacaoLocal): void {
  try {
    const chave = `psof3_draft_${draft.grupo_id}_${draft.professor_uid}`;
    localStorage.setItem(chave, JSON.stringify(draft));
  } catch {
    // Ignorar falha de cota de localStorage
  }
}

export function carregarDraftLocalStorage(
  grupoId: string,
  professorUid: string,
): DraftAvaliacaoLocal | null {
  try {
    const chave = `psof3_draft_${grupoId}_${professorUid}`;
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;
    return JSON.parse(bruto) as DraftAvaliacaoLocal;
  } catch {
    return null;
  }
}

export function limparDraftLocalStorage(grupoId: string, professorUid: string): void {
  try {
    const chave = `psof3_draft_${grupoId}_${professorUid}`;
    localStorage.removeItem(chave);
  } catch {
    // Ignorar
  }
}

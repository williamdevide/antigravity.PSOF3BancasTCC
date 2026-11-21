import {
  db,
  doc,
  setDoc,
  collection,
  query,
  onSnapshot,
  getDocs,
  deleteDoc,
  where,
} from './firebase';
import type {
  AvaliacaoGrupo,
  AvaliacaoProfessorIndividual,
  BancaConsolidada,
  DraftAvaliacaoLocal,
  RegistroHistoricoPendencia,
  ResultadoFinalTipo,
  RevisaoPosBanca,
  SessaoBancaAoVivo,
} from '../types';
import type { User } from './firebase';
import {
  aplicarDiffConsensoNaAvaliacao,
  calcularMediaBanca,
  calcularNivelMsep,
  consolidadaDivergeDeSessao,
  mesclarIntegrantesSoberanosComBase,
  mesclarRubricasSoberanasComBase,
  normalizarRubricasComNivel,
  obterP3TotalAvaliador,
  recalcularAvaliacaoProfessor,
  recalcularConsolidadaExistente,
  round2,
  type DiffConsensoBanca,
} from './calculoBanca';

export {
  aplicarDiffConsensoNaAvaliacao,
  calcularMediaBanca,
  calcularNivelMsep,
  consolidadaDivergeDeSessao,
  mesclarIntegrantesSoberanosComBase,
  mesclarRubricasSoberanasComBase,
  normalizarRubricasComNivel,
  obterP3TotalAvaliador,
  recalcularAvaliacaoProfessor,
  recalcularConsolidadaExistente,
  round2,
  type DiffConsensoBanca,
};

export const COLECAO_AVALIACOES_PROFESSORES = 'psof3_avaliacoes_professores';
export const COLECAO_SESSOES_BANCA = 'psof3_sessoes_banca';
export const COLECAO_ANALISES_AUTOMATICAS = 'psof3_analises_automaticas';

function formatarErroFirestore(err: unknown, acao: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.toLowerCase().includes('permission-denied') ||
    msg.toLowerCase().includes('missing or insufficient permissions')
  ) {
    return `Permissão insuficiente no Firestore para ${acao}. Acesse o Firebase Console (Firestore Database > aba Regras) e publique o arquivo firestore.rules do projeto.`;
  }
  return `Erro ao ${acao}: ${msg}`;
}

export async function salvarAvaliacaoNoFirestore(
  avaliacao: AvaliacaoProfessorIndividual,
  grupoBase?: AvaliacaoGrupo,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const avaliacaoNormalizada = grupoBase
      ? recalcularAvaliacaoProfessor(avaliacao, grupoBase)
      : avaliacao;
    const docRef = doc(
      db,
      COLECAO_AVALIACOES_PROFESSORES,
      `${avaliacaoNormalizada.grupo_id}_${avaliacaoNormalizada.professor_uid}`,
    );
    await setDoc(docRef, avaliacaoNormalizada, { merge: true });
    return { ok: true, mensagem: `Avaliação do Prof. ${avaliacaoNormalizada.professor_nome} salva no Firebase!` };
  } catch (err: unknown) {
    return { ok: false, mensagem: formatarErroFirestore(err, 'salvar avaliação individual no Firestore') };
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
 * Escuta em tempo real TODAS as avaliações individuais dos docentes agrupadas por grupo_id,
 * garantindo que cards, consolidado e troca de grupo tenham sempre os dados soberanos recalculados.
 */
export function escutarTodasAvaliacoesProfessoresFirestore(
  onUpdate: (mapa: Record<string, AvaliacaoProfessorIndividual[]>) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    const colRef = collection(db, COLECAO_AVALIACOES_PROFESSORES);
    const q = query(colRef);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mapa: Record<string, AvaliacaoProfessorIndividual[]> = {};
        snapshot.docs.forEach((d) => {
          const av = d.data() as AvaliacaoProfessorIndividual;
          if (!av?.grupo_id) return;
          if (!mapa[av.grupo_id]) mapa[av.grupo_id] = [];
          mapa[av.grupo_id].push(av);
        });
        onUpdate(mapa);
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
    return { ok: false, mensagem: formatarErroFirestore(err, 'salvar análise automática no Firestore') };
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
    return { ok: false, mensagem: formatarErroFirestore(err, 'iniciar sessão da banca') };
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
 * Escuta todas as sessões de bancas cadastradas no Firestore (em andamento, concluídas, etc.)
 */
export function escutarTodasSessoesBanca(
  onUpdate: (sessoes: Record<string, SessaoBancaAoVivo>) => void,
  onError?: (err: Error) => void,
): () => void {
  try {
    const colRef = collection(db, COLECAO_SESSOES_BANCA);
    const q = query(colRef);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mapa: Record<string, SessaoBancaAoVivo> = {};
        snapshot.docs.forEach((d) => {
          mapa[d.id] = d.data() as SessaoBancaAoVivo;
        });
        onUpdate(mapa);
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
    return { ok: false, mensagem: formatarErroFirestore(err, 'encerrar avaliação individual') };
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

    // Inicializar controle de pendências a partir das médias consolidadas
    const itensPendenciaAuto = Array.from(
      new Set(
        bancaConsolidada.integrantes_medias.flatMap((ind) => ind.itens_insuficientes || []),
      ),
    );
    const possuiPendenciasInit =
      bancaConsolidada.status_liberacao_final !== 'Aprovado' || itensPendenciaAuto.length > 0;

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
      possui_pendencias: possuiPendenciasInit,
      pendencias_descricao: itensPendenciaAuto.join('\n'),
      pendencias_cumpridas: false,
      pendencias_cumpridas_em: null,
      pendencias_atualizado_por: titular.displayName || titular.email || 'Prof. Titular',
      atualizado_em: encerradoEm,
    };

    await setDoc(docSessaoRef, dadosConsolidacao, { merge: true });

    return {
      ok: true,
      mensagem: `Banca encerrada com sucesso pelo Prof. Titular! Duração total: ${duracaoFormatada}. Média oficial consolidada.`,
    };
  } catch (err: unknown) {
    return { ok: false, mensagem: formatarErroFirestore(err, 'fechar e consolidar a banca') };
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

export function limparTodosDraftsGrupoLocalStorage(grupoId: string): void {
  try {
    const chavesParaRemover: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave && chave.startsWith(`psof3_draft_${grupoId}_`)) {
        chavesParaRemover.push(chave);
      }
    }
    chavesParaRemover.forEach((chave) => localStorage.removeItem(chave));
  } catch {
    // Ignorar falhas de acesso ao localStorage
  }
}

/**
 * O Professor Titular reseta e exclui a banca e as avaliações de um grupo específico:
 * 1. Remove do Firestore todas as avaliações individuais dos professores daquele grupo (psof3_avaliacoes_professores)
 * 2. Redefine o status da sessão (psof3_sessoes_banca) para 'aguardando_inicio', zerando cronômetro e consolidação
 * 3. Limpa rascunhos de localStorage do grupo
 */
export async function resetarBancaGrupo(
  grupo: AvaliacaoGrupo,
  titular: User,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    // 1. Buscar e deletar as avaliações dos professores desse grupo no Firestore
    const colAvRef = collection(db, COLECAO_AVALIACOES_PROFESSORES);
    const snap = await getDocs(colAvRef);
    const promessasDelecao: Promise<void>[] = [];

    snap.docs.forEach((d) => {
      const data = d.data() as Partial<AvaliacaoProfessorIndividual>;
      if (data.grupo_id === grupo.id) {
        promessasDelecao.push(deleteDoc(doc(db, COLECAO_AVALIACOES_PROFESSORES, d.id)));
      }
    });
    await Promise.all(promessasDelecao);

    // 2. Redefinir a sessão da banca para aguardando_inicio com cronômetro zerado e sem merge
    const docSessaoRef = doc(db, COLECAO_SESSOES_BANCA, grupo.id);
    const sessaoResetada: SessaoBancaAoVivo = {
      grupo_id: grupo.id,
      turma: grupo.turma,
      projeto: grupo.projeto,
      status: 'aguardando_inicio',
      titular_uid: titular.uid,
      titular_nome: titular.displayName || titular.email?.split('@')[0] || 'Prof. Titular',
      titular_email: titular.email || '',
      iniciado_em: null,
      encerrado_em: null,
      duracao_segundos: 0,
      duracao_formatada: '00:00',
      avaliadores_presentes: [titular.displayName || titular.email || 'Titular'],
      avaliacoes_concluidas: [],
      atualizado_em: new Date().toISOString(),
    };
    await setDoc(docSessaoRef, sessaoResetada, { merge: false });

    // 3. Limpar drafts locais no localStorage do navegador para este grupo
    limparTodosDraftsGrupoLocalStorage(grupo.id);

    return {
      ok: true,
      mensagem: `Banca de ${grupo.projeto} resetada com sucesso! As avaliações e consolidação foram excluídas.`,
    };
  } catch (err: unknown) {
    return { ok: false, mensagem: formatarErroFirestore(err, 'resetar e excluir avaliações da banca') };
  }
}

/**
 * Recalcula cada avaliação individual direto de suas rubricas, cura documentos defasados
 * em psof3_avaliacoes_professores e reconsolida a sessão no Firestore após edição pós-fechamento.
 */
export async function recalcularEConsolidarBancaAposEdicao(
  grupoId: string,
  grupoBase: AvaliacaoGrupo,
  opcoes?: {
    statusSessaoPreservado?: ResultadoFinalTipo | null;
    avaliacoesFallbackSessao?: AvaliacaoProfessorIndividual[];
  },
): Promise<{ ok: boolean; mensagem: string; consolidada?: BancaConsolidada }> {
  try {
    const colRef = collection(db, COLECAO_AVALIACOES_PROFESSORES);
    const q = query(colRef, where('grupo_id', '==', grupoId));
    const snap = await getDocs(q);
    const porUid = new Map<string, AvaliacaoProfessorIndividual>();
    snap.forEach((d) => {
      const av = d.data() as AvaliacaoProfessorIndividual;
      if (av?.professor_uid) porUid.set(av.professor_uid, av);
    });

    // Preserva avaliadores vindos do snapshot caso ainda não tenham doc individual separado
    (opcoes?.avaliacoesFallbackSessao || []).forEach((avFb) => {
      if (avFb?.professor_uid && !porUid.has(avFb.professor_uid)) {
        porUid.set(avFb.professor_uid, avFb);
      }
    });

    const listaBruta = Array.from(porUid.values());
    const consolidada = calcularMediaBanca(
      listaBruta,
      grupoBase,
      opcoes?.statusSessaoPreservado,
    );
    const agora = new Date().toISOString();

    // Auto-cura em psof3_avaliacoes_professores caso algum avaliador tivesse totais defasados
    const promessasCura: Promise<void>[] = [];
    Object.values(consolidada.avaliacoes_individuais).forEach((avRecalc) => {
      const avOrig = porUid.get(avRecalc.professor_uid);
      const precisaAtualizar =
        !avOrig ||
        Math.abs(Number(avOrig.p1_total ?? -1) - avRecalc.p1_total) > 0.01 ||
        Math.abs(Number(avOrig.p2_total ?? -1) - avRecalc.p2_total) > 0.01 ||
        Math.abs(Number(avOrig.p3_total ?? -1) - Number(avRecalc.p3_total ?? 0)) > 0.01 ||
        Math.abs(Number(avOrig.nota_final_grupo ?? -1) - avRecalc.nota_final_grupo) > 0.01;
      if (precisaAtualizar) {
        const docAvRef = doc(
          db,
          COLECAO_AVALIACOES_PROFESSORES,
          `${grupoId}_${avRecalc.professor_uid}`,
        );
        promessasCura.push(setDoc(docAvRef, avRecalc, { merge: true }));
      }
    });
    if (promessasCura.length > 0) {
      await Promise.all(promessasCura);
    }

    const docSessaoRef = doc(db, COLECAO_SESSOES_BANCA, grupoId);
    await setDoc(
      docSessaoRef,
      {
        status: 'concluida',
        media_final_consolidada: consolidada.media_final,
        status_liberacao_final: consolidada.status_liberacao_final,
        banca_consolidada: consolidada,
        atualizado_em: agora,
      },
      { merge: true },
    );

    return {
      ok: true,
      mensagem: 'Médias e pareceres da banca reconsolidados com sucesso no Firebase!',
      consolidada,
    };
  } catch (err: unknown) {
    return { ok: false, mensagem: formatarErroFirestore(err, 'recalcular e consolidar banca após edição') };
  }
}

/**
 * Aplica alterações de consenso (somente rubricas e campos tocados na edição) aos 2 avaliadores
 * em psof3_avaliacoes_professores, recalculando cada professor e a média geral consolidada.
 */
export async function aplicarAjusteConsensoBancaNoFirestore(
  grupoId: string,
  grupoBase: AvaliacaoGrupo,
  avaliacaoMinhaCompleta: AvaliacaoProfessorIndividual,
  diff: DiffConsensoBanca,
  opcoes?: {
    avaliacoesFallbackSessao?: AvaliacaoProfessorIndividual[];
    statusSessaoPreservado?: ResultadoFinalTipo | null;
  },
): Promise<{ ok: boolean; mensagem: string; consolidada?: BancaConsolidada }> {
  try {
    const colRef = collection(db, COLECAO_AVALIACOES_PROFESSORES);
    const q = query(colRef, where('grupo_id', '==', grupoId));
    const snap = await getDocs(q);

    const porUid = new Map<string, AvaliacaoProfessorIndividual>();
    snap.forEach((d) => {
      const av = d.data() as AvaliacaoProfessorIndividual;
      if (av?.professor_uid) porUid.set(av.professor_uid, av);
    });
    (opcoes?.avaliacoesFallbackSessao || []).forEach((avFb) => {
      if (avFb?.professor_uid && !porUid.has(avFb.professor_uid)) {
        porUid.set(avFb.professor_uid, avFb);
      }
    });

    const agora = new Date().toISOString();
    const minhaRecalc = recalcularAvaliacaoProfessor(
      {
        ...avaliacaoMinhaCompleta,
        concluido: true,
        atualizado_em: agora,
      },
      grupoBase,
    );
    porUid.set(minhaRecalc.professor_uid, minhaRecalc);

    // Atualiza os demais avaliadores aplicando somente o diff de consenso e preservando seu parecer
    const todosAtualizados: AvaliacaoProfessorIndividual[] = [];
    for (const [uid, av] of porUid.entries()) {
      if (uid === minhaRecalc.professor_uid) {
        todosAtualizados.push(minhaRecalc);
      } else {
        const avOutroAtualizada = aplicarDiffConsensoNaAvaliacao(av, grupoBase, {
          ...diff,
          atualizadoEm: agora,
        });
        todosAtualizados.push({
          ...avOutroAtualizada,
          concluido: av.concluido ?? true,
        });
      }
    }

    await Promise.all(
      todosAtualizados.map((avItem) =>
        setDoc(
          doc(db, COLECAO_AVALIACOES_PROFESSORES, `${grupoId}_${avItem.professor_uid}`),
          avItem,
          { merge: true },
        ),
      ),
    );

    const statusManualEfetivo = diff.alterarStatusManual
      ? diff.statusManualNovo ?? null
      : opcoes?.statusSessaoPreservado;

    const consolidada = calcularMediaBanca(
      todosAtualizados,
      grupoBase,
      statusManualEfetivo,
    );

    await setDoc(
      doc(db, COLECAO_SESSOES_BANCA, grupoId),
      {
        status: 'concluida',
        media_final_consolidada: consolidada.media_final,
        status_liberacao_final: consolidada.status_liberacao_final,
        banca_consolidada: consolidada,
        atualizado_em: agora,
      },
      { merge: true },
    );

    return {
      ok: true,
      mensagem:
        'Ajuste de consenso aplicado nos avaliadores com recálculo integral de todas as médias no Firebase!',
      consolidada,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      mensagem: formatarErroFirestore(err, 'aplicar ajuste de consenso na banca'),
    };
  }
}

/**
 * Sincroniza o snapshot psof3_sessoes_banca quando divergir dos cálculos derivados de
 * psof3_avaliacoes_professores, preservando pendências, revisões e status já homologados.
 */
export async function sincronizarSnapshotSessaoFirestore(
  grupoId: string,
  consolidada: BancaConsolidada,
  sessaoAtual: SessaoBancaAoVivo,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const agora = new Date().toISOString();
    const docSessaoRef = doc(db, COLECAO_SESSOES_BANCA, grupoId);
    const statusPreservado = sessaoAtual.status_liberacao_final ?? consolidada.status_liberacao_final;
    const bancaSincronizada: BancaConsolidada = {
      ...consolidada,
      status_liberacao_final: statusPreservado,
    };
    await setDoc(
      docSessaoRef,
      {
        status: sessaoAtual.status || 'concluida',
        media_final_consolidada: bancaSincronizada.media_final,
        banca_consolidada: bancaSincronizada,
        atualizado_em: agora,
      },
      { merge: true },
    );
    return { ok: true, mensagem: 'Snapshot da sessão sincronizado.' };
  } catch (err: unknown) {
    return {
      ok: false,
      mensagem: formatarErroFirestore(err, 'sincronizar snapshot da sessão'),
    };
  }
}

/**
 * Atualiza o registro datado de pendências/mensagens (origem 'banca' ou 'revisados')
 * e o cumprimento/status final da nota no Firestore para o Portal dos Alunos.
 */
export async function atualizarPendenciasBanca(
  grupoId: string,
  sessaoAtual: SessaoBancaAoVivo | null,
  consolidadaAtual: BancaConsolidada | null,
  professor: User,
  dados: {
    possui_pendencias: boolean;
    pendencias_descricao: string;
    pendencias_cumpridas: boolean;
    novo_status_liberacao: ResultadoFinalTipo;
    origem?: 'banca' | 'revisados';
  },
): Promise<{ ok: boolean; mensagem: string; historico?: RegistroHistoricoPendencia[] }> {
  try {
    const agora = new Date().toISOString();
    const autorNome = professor.displayName || professor.email || 'Docente';
    const docSessaoRef = doc(db, COLECAO_SESSOES_BANCA, grupoId);

    const bancaBruta = consolidadaAtual || sessaoAtual?.banca_consolidada || null;
    const bancaOrigem = bancaBruta ? { ...bancaBruta } : null;
    const bancaAtualizada: BancaConsolidada | undefined = bancaOrigem
      ? {
          ...bancaOrigem,
          status_liberacao_final: dados.novo_status_liberacao,
          status_liberacao_manual: dados.novo_status_liberacao,
          integrantes_medias: bancaOrigem.integrantes_medias.map((ind) => ({
            ...ind,
            resultado: dados.novo_status_liberacao,
          })),
        }
      : undefined;

    const histExistente: RegistroHistoricoPendencia[] = [
      ...(sessaoAtual?.historico_pendencias || []),
    ];
    const msgNova = dados.pendencias_descricao.trim();
    const origemAtual = dados.origem || 'banca';
    if (msgNova) {
      const ultimo = histExistente[histExistente.length - 1];
      const mesmaEntrada =
        ultimo &&
        ultimo.origem === origemAtual &&
        ultimo.mensagem.trim() === msgNova &&
        ultimo.status_aplicado === dados.novo_status_liberacao &&
        ultimo.pendencias_cumpridas === dados.pendencias_cumpridas;
      if (!mesmaEntrada) {
        histExistente.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          data_hora: agora,
          autor: autorNome,
          origem: origemAtual,
          mensagem: msgNova,
          status_aplicado: dados.novo_status_liberacao,
          pendencias_cumpridas: dados.pendencias_cumpridas,
        });
      }
    }

    const payload: Record<string, unknown> = {
      status: sessaoAtual?.status || 'concluida',
      possui_pendencias: dados.possui_pendencias,
      pendencias_descricao: msgNova || sessaoAtual?.pendencias_descricao || '',
      pendencias_cumpridas: dados.pendencias_cumpridas,
      pendencias_cumpridas_em: dados.pendencias_cumpridas
        ? sessaoAtual?.pendencias_cumpridas_em || agora
        : null,
      pendencias_atualizado_por: autorNome,
      status_liberacao_final: dados.novo_status_liberacao,
      historico_pendencias: histExistente,
      atualizado_em: agora,
    };

    if (bancaAtualizada) {
      payload.banca_consolidada = bancaAtualizada;
    }

    await setDoc(docSessaoRef, payload, { merge: true });

    return {
      ok: true,
      mensagem: dados.pendencias_cumpridas
        ? 'Pendências marcadas como cumpridas e registro datado atualizado no Portal dos Alunos!'
        : 'Registro datado de pendências e status da nota salvos no Firebase!',
      historico: histExistente,
    };
  } catch (err: unknown) {
    return { ok: false, mensagem: formatarErroFirestore(err, 'atualizar pendências da banca') };
  }
}

/**
 * Reabre uma banca já concluída para o estado entregue ('aguardando_inicio') no Firestore,
 * PRESERVANDO o histórico das avaliações individuais dos professores em psof3_avaliacoes_professores,
 * liberando a gestão (upload/exclusão) dos arquivos de entrega e nova auditoria técnica.
 */
export async function reabrirBancaParaEntregue(
  grupo: AvaliacaoGrupo,
  professor: User,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const agora = new Date().toISOString();
    const nomeProf =
      professor.displayName || professor.email?.split('@')[0] || 'Docente';
    const docSessaoRef = doc(db, COLECAO_SESSOES_BANCA, grupo.id);

    await setDoc(
      docSessaoRef,
      {
        grupo_id: grupo.id,
        turma: grupo.turma,
        projeto: grupo.projeto,
        status: 'aguardando_inicio',
        encerrado_em: null,
        reaberto_por: nomeProf,
        reaberto_em: agora,
        atualizado_em: agora,
      },
      { merge: true },
    );

    return {
      ok: true,
      mensagem: `Banca de ${grupo.projeto} reaberta para 'Entregue' com histórico docente preservado.`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      mensagem: formatarErroFirestore(err, 'reabrir banca para estado entregue'),
    };
  }
}

/**
 * Sincroniza o estado dos arquivos revisados pós-banca (subpasta revisados/) e,
 * quando aceitos pelo Professor Titular, aplica a alteração de status do trabalho
 * no Firestore sem modificar as notas numéricas originais da banca.
 */
export async function sincronizarRevisaoPosBancaFirestore(
  grupo: AvaliacaoGrupo,
  sessaoAtual: SessaoBancaAoVivo | null,
  consolidadaAtual: BancaConsolidada | null,
  professor: User,
  revisao: RevisaoPosBanca,
  novoStatusLiberacao?: ResultadoFinalTipo | null,
): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const agora = new Date().toISOString();
    const autorNome = professor.displayName || professor.email || 'Prof. Titular';
    const docSessaoRef = doc(db, COLECAO_SESSOES_BANCA, grupo.id);
    const bancaOrigem = consolidadaAtual || sessaoAtual?.banca_consolidada || null;

    const histExistente: RegistroHistoricoPendencia[] = [
      ...(sessaoAtual?.historico_pendencias || []),
    ];
    const msgRev = (revisao.observacao_professor || '').trim();
    if (msgRev) {
      const ultimo = histExistente[histExistente.length - 1];
      const jaRegistrada =
        ultimo &&
        ultimo.origem === 'revisados' &&
        ultimo.mensagem.trim() === msgRev &&
        ultimo.status_aplicado === (novoStatusLiberacao || null);
      if (!jaRegistrada) {
        histExistente.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          data_hora: agora,
          autor: autorNome,
          origem: 'revisados',
          mensagem: msgRev,
          status_aplicado: novoStatusLiberacao || null,
          pendencias_cumpridas: Boolean(revisao.aceito && novoStatusLiberacao === 'Aprovado'),
        });
      }
    }

    const payload: Record<string, unknown> = {
      grupo_id: grupo.id,
      turma: grupo.turma,
      projeto: grupo.projeto,
      status: sessaoAtual?.status || 'concluida',
      revisao_pos_banca: revisao,
      historico_pendencias: histExistente,
      atualizado_em: agora,
    };

    if (revisao.aceito && novoStatusLiberacao) {
      payload.status_liberacao_final = novoStatusLiberacao;
      if (novoStatusLiberacao === 'Aprovado') {
        payload.pendencias_cumpridas = true;
        payload.pendencias_cumpridas_em = sessaoAtual?.pendencias_cumpridas_em || agora;
        payload.pendencias_atualizado_por = autorNome;
      } else {
        payload.pendencias_cumpridas = false;
        payload.pendencias_cumpridas_em = null;
      }

      if (bancaOrigem) {
        payload.banca_consolidada = {
          ...bancaOrigem,
          status_liberacao_final: novoStatusLiberacao,
          status_liberacao_manual: novoStatusLiberacao,
          integrantes_medias: bancaOrigem.integrantes_medias.map((ind) => ({
            ...ind,
            resultado: novoStatusLiberacao,
          })),
        };
      }
    }

    await setDoc(docSessaoRef, payload, { merge: true });
    return {
      ok: true,
      mensagem: 'Revisão pós-banca sincronizada com o Firebase e Portal dos Alunos.',
    };
  } catch (err: unknown) {
    return {
      ok: false,
      mensagem: formatarErroFirestore(err, 'sincronizar revisão pós-banca'),
    };
  }
}

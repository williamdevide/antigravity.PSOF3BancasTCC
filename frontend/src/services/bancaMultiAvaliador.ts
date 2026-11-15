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
  NivelMSEP,
  ResultadoFinalTipo,
  RubricaItemAvaliacao,
  NotaIndividualIntegrante,
} from '../types';

export const COLECAO_AVALIACOES_PROFESSORES = 'psof3_avaliacoes_professores';

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

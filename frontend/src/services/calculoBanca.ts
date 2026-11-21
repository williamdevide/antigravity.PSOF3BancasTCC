import type {
  AvaliacaoGrupo,
  AvaliacaoProfessorIndividual,
  BancaConsolidada,
  NivelMSEP,
  NotaIndividualIntegrante,
  ResultadoFinalTipo,
  RubricaItemAvaliacao,
  SessaoBancaAoVivo,
} from '../types';

/**
 * Arredonda valores numéricos de pontuação para 2 casas decimais evitando ruído de ponto flutuante.
 */
export function round2(valor: number): number {
  return Number((Number.isFinite(valor) ? valor : 0).toFixed(2));
}

/**
 * Calcula o nível MSEP oficial a partir da nota obtida e do peso máximo do critério.
 */
export function calcularNivelMsep(nota: number, pesoMax: number): NivelMSEP {
  if (pesoMax <= 0) return 'Pleno';
  if (nota <= 0) return 'Insuficiente';
  const pct = (nota / pesoMax) * 100;
  if (pct >= 90) return 'Avançado';
  if (pct >= 50) return 'Pleno';
  return 'Insuficiente';
}

/**
 * Normaliza as rubricas garantindo que o nível MSEP sempre reflita exatamente a nota atual,
 * preservando 'Pendente' apenas quando o critério ao vivo ainda está zerado como pendente.
 */
export function normalizarRubricasComNivel(
  rubricas: RubricaItemAvaliacao[],
): RubricaItemAvaliacao[] {
  return (rubricas || []).map((r) => {
    const notaBruta = Number(r.nota || 0);
    const mantemPendente = r.nivel === 'Pendente' && notaBruta <= 0;
    const notaLimitada = mantemPendente
      ? 0
      : round2(Math.max(0, Math.min(r.peso_max || 0, notaBruta)));
    const nivel = mantemPendente
      ? 'Pendente'
      : calcularNivelMsep(notaLimitada, r.peso_max);

    const notaSugBruta = Number(r.nota_sugerida_ia ?? r.nota ?? 0);
    const sugPendente = r.nivel_sugerido_ia === 'Pendente' && notaSugBruta <= 0;
    const nivelSugerido = sugPendente
      ? 'Pendente'
      : calcularNivelMsep(notaSugBruta, r.peso_max);

    return {
      ...r,
      nota: notaLimitada,
      nivel,
      nivel_sugerido_ia: nivelSugerido,
    };
  });
}

/**
 * Mescla rubricas soberanas salvas pelos docentes sobre a base estrutural mais recente do grupo,
 * preservando integralmente notas, edições manuais e níveis recalculados a partir da nota salva.
 */
export function mesclarRubricasSoberanasComBase(
  soberanas: RubricaItemAvaliacao[],
  base: RubricaItemAvaliacao[],
): RubricaItemAvaliacao[] {
  if (!base || base.length === 0) {
    return normalizarRubricasComNivel((soberanas || []).map((r) => ({ ...r })));
  }
  const mapaSoberanas = new Map((soberanas || []).map((r) => [r.codigo, r]));
  const codigosBase = new Set(base.map((b) => b.codigo));

  const mescladas = base.map((b) => {
    const s = mapaSoberanas.get(b.codigo);
    if (!s) return { ...b };
    return {
      ...b,
      ...s,
      peso_max: Number(b.peso_max ?? s.peso_max ?? 0),
      nota: Number(s.nota ?? b.nota ?? 0),
      editado_manualmente: Boolean(s.editado_manualmente),
      nota_sugerida_ia: b.nota_sugerida_ia ?? s.nota_sugerida_ia,
      nivel_sugerido_ia: b.nivel_sugerido_ia ?? s.nivel_sugerido_ia,
      evidencias: s.evidencias && s.evidencias.length > 0 ? s.evidencias : b.evidencias,
      justificativa_ia: s.justificativa_ia || b.justificativa_ia,
    };
  });

  // Garante preservação caso exista alguma rubrica salva fora da base atual
  (soberanas || []).forEach((s) => {
    if (!codigosBase.has(s.codigo)) {
      mescladas.push({ ...s });
    }
  });

  return normalizarRubricasComNivel(mescladas);
}

/**
 * Mescla notas individuais dos integrantes mantendo metadados/sugestões da base e valores soberanos salvos.
 */
export function mesclarIntegrantesSoberanosComBase(
  soberanos: NotaIndividualIntegrante[],
  base: NotaIndividualIntegrante[],
): NotaIndividualIntegrante[] {
  if (!base || base.length === 0) {
    return (soberanos || []).map((i) => ({ ...i }));
  }
  const mapaExato = new Map((soberanos || []).map((i) => [i.nome, i]));
  const mapaNorm = new Map(
    (soberanos || []).map((i) => [i.nome.trim().toLowerCase(), i]),
  );

  return base.map((b) => {
    const s = mapaExato.get(b.nome) || mapaNorm.get(b.nome.trim().toLowerCase());
    if (!s) return { ...b };
    return {
      ...b,
      ...s,
      nome: b.nome,
      nome_completo_planilha: s.nome_completo_planilha || b.nome_completo_planilha,
      matricula: s.matricula || b.matricula,
      nota_3_1_sugerida: b.nota_3_1_sugerida ?? s.nota_3_1_sugerida ?? 0,
      nivel_3_1_sugerido: b.nivel_3_1_sugerido ?? s.nivel_3_1_sugerido ?? 'Pendente',
      nota_4_1_sugerida: b.nota_4_1_sugerida ?? s.nota_4_1_sugerida,
      nivel_4_1_sugerido: b.nivel_4_1_sugerido ?? s.nivel_4_1_sugerido,
      nota_4_2_sugerida: b.nota_4_2_sugerida ?? s.nota_4_2_sugerida,
      nivel_4_2_sugerido: b.nivel_4_2_sugerido ?? s.nivel_4_2_sugerido,
    };
  });
}

function resolverP3GrupoBase(rubricas: RubricaItemAvaliacao[]): number {
  const r32 = rubricas.find((r) => r.codigo === '3.2');
  const r33 = rubricas.find((r) => r.codigo === '3.3');
  const n32 = r32 && r32.nivel !== 'Pendente' ? Number(r32.nota || 0) : 0;
  const n33 = r33 && r33.nivel !== 'Pendente' ? Number(r33.nota || 0) : 0;
  return round2(n32 + n33);
}

function coletarItensInsuficientesColetivos(rubricas: RubricaItemAvaliacao[]): string[] {
  const itens: string[] = [];
  rubricas.forEach((r) => {
    // Regra SENAI: Pilar 4 nunca retém nota; 3.1 é avaliado por integrante
    if (r.pilar !== 4 && r.codigo !== '3.1' && r.nivel === 'Insuficiente') {
      itens.push(`${r.titulo} (${r.nota.toFixed(1)}/${r.peso_max.toFixed(1)})`);
    }
  });
  return itens;
}

/**
 * Retorna a nota total do Pilar 3 (3.1 + 3.2 + 3.3, máx. 15 pts) para um avaliador individual.
 */
export function obterP3TotalAvaliador(av: AvaliacaoProfessorIndividual): number {
  if (typeof av.p3_total === 'number' && Number.isFinite(av.p3_total)) {
    return round2(av.p3_total);
  }
  if (av.integrantes_notas && av.integrantes_notas.length > 0) {
    const mediaP3 =
      av.integrantes_notas.reduce((acc, i) => acc + Number(i.p3_nota || 0), 0) /
      av.integrantes_notas.length;
    return round2(mediaP3);
  }
  return round2(Number(av.p3_grupo_base || 0));
}

/**
 * Recalcula deterministicamente todos os subtotais (P1, P2, P3 base, P3 completo, P4),
 * notas individuais de cada integrante e nota final de UM professor a partir das suas rubricas.
 */
export function recalcularAvaliacaoProfessor(
  av: AvaliacaoProfessorIndividual,
  grupoBase: AvaliacaoGrupo,
): AvaliacaoProfessorIndividual {
  const rubricasRecalc = mesclarRubricasSoberanasComBase(
    av.rubricas || [],
    grupoBase.rubricas || [],
  );

  const p1Total = round2(
    rubricasRecalc
      .filter((r) => r.pilar === 1)
      .reduce((acc, r) => acc + Number(r.nota || 0), 0),
  );
  const p2Total = round2(
    rubricasRecalc
      .filter((r) => r.pilar === 2)
      .reduce((acc, r) => acc + Number(r.nota || 0), 0),
  );
  const p3GrupoBase = resolverP3GrupoBase(rubricasRecalc);
  const itensInsufColetivos = coletarItensInsuficientesColetivos(rubricasRecalc);

  const integrantesMesclados = mesclarIntegrantesSoberanosComBase(
    av.integrantes_notas || [],
    grupoBase.integrantes_notas || [],
  );

  const integrantesRecalc: NotaIndividualIntegrante[] = integrantesMesclados.map((ind) => {
    const n31Bruto = Number(ind.nota_3_1_arguicao || 0);
    const pendente31 = ind.nivel_3_1 === 'Pendente' && n31Bruto <= 0;
    const n31 = pendente31 ? 0 : round2(Math.max(0, Math.min(6, n31Bruto)));
    const nivel31: NivelMSEP = pendente31 ? 'Pendente' : calcularNivelMsep(n31, 6.0);

    const n41 = round2(Math.max(0, Math.min(8, Number(ind.nota_4_1_sprints ?? 0))));
    const nivel41 = calcularNivelMsep(n41, 8.0);
    const n42 = round2(Math.max(0, Math.min(7, Number(ind.nota_4_2_participacao ?? 0))));
    const nivel42 = calcularNivelMsep(n42, 7.0);

    const p3Nota = round2(n31 + p3GrupoBase);
    const p4Nota = round2(n41 + n42);
    const notaFinal = round2(p1Total + p2Total + p3Nota + p4Nota);

    const insufAluno = [...itensInsufColetivos];
    if (nivel31 === 'Insuficiente') {
      insufAluno.push(`3.1 Arguição Técnica — ${ind.nome} (${n31.toFixed(1)}/6.0)`);
    }

    let resultado: ResultadoFinalTipo;
    if (av.status_liberacao_manual) {
      resultado = av.status_liberacao_manual;
    } else if (notaFinal >= 50.0) {
      resultado = insufAluno.length > 0 ? 'Nota Retida (Pendências)' : 'Aprovado';
    } else {
      resultado = 'Nova Chance (Data Futura)';
    }

    return {
      ...ind,
      nota_3_1_arguicao: n31,
      nivel_3_1: nivel31,
      nota_4_1_sprints: n41,
      nivel_4_1: nivel41,
      nota_4_2_participacao: n42,
      nivel_4_2: nivel42,
      p1_nota: p1Total,
      p2_nota: p2Total,
      p3_nota: p3Nota,
      p4_nota: p4Nota,
      nota_final: notaFinal,
      possui_item_insuficiente: insufAluno.length > 0,
      itens_insuficientes: insufAluno,
      resultado,
    };
  });

  const p3Total =
    integrantesRecalc.length > 0
      ? round2(
          integrantesRecalc.reduce((acc, i) => acc + i.p3_nota, 0) /
            integrantesRecalc.length,
        )
      : p3GrupoBase;

  const notaFinalGrupo =
    integrantesRecalc.length > 0
      ? round2(
          integrantesRecalc.reduce((acc, i) => acc + i.nota_final, 0) /
            integrantesRecalc.length,
        )
      : round2(p1Total + p2Total + p3GrupoBase);

  return {
    ...av,
    rubricas: rubricasRecalc,
    integrantes_notas: integrantesRecalc,
    p1_total: p1Total,
    p2_total: p2Total,
    p3_grupo_base: p3GrupoBase,
    p3_total: p3Total,
    nota_final_grupo: notaFinalGrupo,
  };
}

function deduplicarEOrdenarAvaliacoes(
  avaliacoes: AvaliacaoProfessorIndividual[],
): AvaliacaoProfessorIndividual[] {
  const porUid = new Map<string, AvaliacaoProfessorIndividual>();
  avaliacoes.forEach((av) => {
    if (!av || !av.professor_uid) return;
    const existente = porUid.get(av.professor_uid);
    if (!existente) {
      porUid.set(av.professor_uid, av);
      return;
    }
    const tsNovo = new Date(av.atualizado_em || 0).getTime();
    const tsAtual = new Date(existente.atualizado_em || 0).getTime();
    if (tsNovo >= tsAtual) {
      porUid.set(av.professor_uid, av);
    }
  });

  return Array.from(porUid.values()).sort((a, b) => {
    const compNome = (a.professor_nome || '').localeCompare(b.professor_nome || '', 'pt-BR');
    if (compNome !== 0) return compNome;
    return a.professor_uid.localeCompare(b.professor_uid);
  });
}

/**
 * Calcula a consolidação oficial da banca entre N avaliadores (1, 2 ou mais),
 * SEMPRE recalculando primeiro cada professor individual a partir de suas rubricas.
 */
export function calcularMediaBanca(
  avaliacoes: AvaliacaoProfessorIndividual[],
  grupoBase: AvaliacaoGrupo,
  statusSessaoSobrescrito?: ResultadoFinalTipo | null,
): BancaConsolidada {
  const unicas = deduplicarEOrdenarAvaliacoes(avaliacoes);

  if (unicas.length === 0) {
    const mediaP3 =
      grupoBase.integrantes_notas.length > 0
        ? round2(
            grupoBase.integrantes_notas.reduce((a, b) => a + Number(b.p3_nota || 0), 0) /
              grupoBase.integrantes_notas.length,
          )
        : round2(grupoBase.p3_grupo_base);
    const mediaP4 =
      grupoBase.integrantes_notas.length > 0
        ? round2(
            grupoBase.integrantes_notas.reduce((a, b) => a + Number(b.p4_nota || 0), 0) /
              grupoBase.integrantes_notas.length,
          )
        : 0;
    return {
      grupo_id: grupoBase.id,
      status_banca: 'pendente',
      avaliadores_concluidos: [],
      avaliacoes_individuais: {},
      media_p1: round2(grupoBase.p1_total),
      media_p2: round2(grupoBase.p2_total),
      media_p3: mediaP3,
      media_p4: mediaP4,
      media_final: round2(grupoBase.media_nota_final_grupo),
      rubricas_medias: normalizarRubricasComNivel(grupoBase.rubricas || []),
      integrantes_medias: grupoBase.integrantes_notas || [],
      pareceres_professores: [],
      status_liberacao_final: grupoBase.status_liberacao_nota,
      status_liberacao_manual: grupoBase.status_liberacao_manual || null,
    };
  }

  // Recalcula obrigatoriamente cada avaliação individual direto de suas rubricas
  const recalculadas = unicas.map((av) => recalcularAvaliacaoProfessor(av, grupoBase));

  const mapaIndividuais: Record<string, AvaliacaoProfessorIndividual> = {};
  const pareceres = recalculadas.map((av) => {
    mapaIndividuais[av.professor_uid] = av;
    return {
      professor_nome: av.professor_nome,
      parecer: av.parecer_tecnico,
      atualizado_em: av.atualizado_em,
    };
  });
  const nomes = recalculadas.map((a) => a.professor_nome);

  const rubricasBase =
    grupoBase.rubricas && grupoBase.rubricas.length > 0
      ? grupoBase.rubricas
      : recalculadas[0].rubricas;

  const rubricasMedias: RubricaItemAvaliacao[] = rubricasBase.map((rBase) => {
    const itensAv = recalculadas
      .map((av) => av.rubricas.find((r) => r.codigo === rBase.codigo))
      .filter((r): r is RubricaItemAvaliacao => Boolean(r));

    const fonte = itensAv.length > 0 ? itensAv : [rBase];
    const todosPendentes = fonte.every((r) => r.nivel === 'Pendente' && Number(r.nota || 0) <= 0);
    const notaMedia = todosPendentes
      ? 0
      : round2(fonte.reduce((acc, r) => acc + Number(r.nota || 0), 0) / fonte.length);
    const nivel = todosPendentes ? 'Pendente' : calcularNivelMsep(notaMedia, rBase.peso_max);

    let justificativa = rBase.justificativa_ia;
    if (recalculadas.length >= 2) {
      const partes = recalculadas
        .map((av) => {
          const rAv = av.rubricas.find((r) => r.codigo === rBase.codigo);
          const n = rAv ? rAv.nota : notaMedia;
          return `Prof. ${av.professor_nome} (${n.toFixed(1)})`;
        })
        .join(' + ');
      justificativa = `Média Simples da Banca: ${partes} = ${notaMedia.toFixed(1)} pts.`;
    } else {
      const rUnica = itensAv[0];
      if (rUnica?.justificativa_ia) justificativa = rUnica.justificativa_ia;
    }

    return {
      ...rBase,
      nota: notaMedia,
      nivel,
      editado_manualmente:
        recalculadas.length >= 2 ? true : Boolean(itensAv[0]?.editado_manualmente),
      justificativa_ia: justificativa,
    };
  });

  const mediaP1 = round2(
    rubricasMedias
      .filter((r) => r.pilar === 1)
      .reduce((acc, r) => acc + Number(r.nota || 0), 0),
  );
  const mediaP2 = round2(
    rubricasMedias
      .filter((r) => r.pilar === 2)
      .reduce((acc, r) => acc + Number(r.nota || 0), 0),
  );
  const mediaP3Base = resolverP3GrupoBase(rubricasMedias);
  const insufColetivos = coletarItensInsuficientesColetivos(rubricasMedias);

  const integrantesBase =
    grupoBase.integrantes_notas && grupoBase.integrantes_notas.length > 0
      ? grupoBase.integrantes_notas
      : recalculadas[0].integrantes_notas;

  const integrantesMediasCalculados: NotaIndividualIntegrante[] = integrantesBase.map((iBase) => {
    const indsAv = recalculadas
      .map(
        (av) =>
          av.integrantes_notas.find((i) => i.nome === iBase.nome) ||
          av.integrantes_notas.find(
            (i) => i.nome.trim().toLowerCase() === iBase.nome.trim().toLowerCase(),
          ),
      )
      .filter((i): i is NotaIndividualIntegrante => Boolean(i));

    const fonteInds = indsAv.length > 0 ? indsAv : [iBase];
    const todosPend31 = fonteInds.every(
      (i) => i.nivel_3_1 === 'Pendente' && Number(i.nota_3_1_arguicao || 0) <= 0,
    );
    const nota31Media = todosPend31
      ? 0
      : round2(
          fonteInds.reduce((acc, i) => acc + Number(i.nota_3_1_arguicao || 0), 0) /
            fonteInds.length,
        );
    const nivel31: NivelMSEP = todosPend31 ? 'Pendente' : calcularNivelMsep(nota31Media, 6.0);

    const nota41Media = round2(
      fonteInds.reduce((acc, i) => acc + Number(i.nota_4_1_sprints ?? 0), 0) /
        fonteInds.length,
    );
    const nota42Media = round2(
      fonteInds.reduce((acc, i) => acc + Number(i.nota_4_2_participacao ?? 0), 0) /
        fonteInds.length,
    );

    const p3Media = round2(nota31Media + mediaP3Base);
    const p4Media = round2(nota41Media + nota42Media);
    const finalMedia = round2(mediaP1 + mediaP2 + p3Media + p4Media);

    const insuf = [...insufColetivos];
    if (nivel31 === 'Insuficiente') {
      insuf.push(`3.1 Arguição Técnica — ${iBase.nome} (${nota31Media.toFixed(1)}/6.0)`);
    }

    let resultado: ResultadoFinalTipo = 'Aprovado';
    if (finalMedia >= 50.0) {
      resultado = insuf.length > 0 ? 'Nota Retida (Pendências)' : 'Aprovado';
    } else {
      resultado = 'Nova Chance (Data Futura)';
    }

    return {
      ...iBase,
      nota_3_1_arguicao: nota31Media,
      nivel_3_1: nivel31,
      nota_4_1_sprints: nota41Media,
      nivel_4_1: calcularNivelMsep(nota41Media, 8.0),
      nota_4_2_participacao: nota42Media,
      nivel_4_2: calcularNivelMsep(nota42Media, 7.0),
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

  const mediaP3 =
    integrantesMediasCalculados.length > 0
      ? round2(
          integrantesMediasCalculados.reduce((a, b) => a + b.p3_nota, 0) /
            integrantesMediasCalculados.length,
        )
      : mediaP3Base;

  const mediaP4 =
    integrantesMediasCalculados.length > 0
      ? round2(
          integrantesMediasCalculados.reduce((a, b) => a + b.p4_nota, 0) /
            integrantesMediasCalculados.length,
        )
      : 0;

  const mediaFinal =
    integrantesMediasCalculados.length > 0
      ? round2(
          integrantesMediasCalculados.reduce((a, b) => a + b.nota_final, 0) /
            integrantesMediasCalculados.length,
        )
      : round2(mediaP1 + mediaP2 + mediaP3 + mediaP4);

  const possuiInsufGrupo = integrantesMediasCalculados.some((i) => i.possui_item_insuficiente);
  let statusFinal: ResultadoFinalTipo =
    mediaFinal >= 50.0
      ? possuiInsufGrupo
        ? 'Nota Retida (Pendências)'
        : 'Aprovado'
      : 'Nova Chance (Data Futura)';

  const avComManualMaisRecente = [...recalculadas]
    .filter((a) => Boolean(a.status_liberacao_manual))
    .sort(
      (a, b) =>
        new Date(b.atualizado_em || 0).getTime() - new Date(a.atualizado_em || 0).getTime(),
    )[0];

  const statusManualConsolidado: ResultadoFinalTipo | null =
    statusSessaoSobrescrito ??
    avComManualMaisRecente?.status_liberacao_manual ??
    null;

  if (statusManualConsolidado) {
    statusFinal = statusManualConsolidado;
  }

  const integrantesFinais = statusManualConsolidado
    ? integrantesMediasCalculados.map((i) => ({ ...i, resultado: statusManualConsolidado }))
    : integrantesMediasCalculados;

  return {
    grupo_id: grupoBase.id,
    status_banca: recalculadas.length >= 2 ? 'banca_concluida' : 'aguardando_segundo_avaliador',
    avaliadores_concluidos: nomes,
    avaliacoes_individuais: mapaIndividuais,
    media_p1: mediaP1,
    media_p2: mediaP2,
    media_p3: mediaP3,
    media_p4: mediaP4,
    media_final: mediaFinal,
    rubricas_medias: rubricasMedias,
    integrantes_medias: integrantesFinais,
    pareceres_professores: pareceres,
    status_liberacao_final: statusFinal,
    status_liberacao_manual: statusManualConsolidado,
  };
}

/**
 * Recalcula uma BancaConsolidada já persistida em sessões (por exemplo na Landing Page pública,
 * onde psof3_avaliacoes_professores exige autenticação) usando prioritariamente avaliacoes_individuais
 * ou, na ausência delas, suas rubricas_medias e integrantes_medias.
 */
export function recalcularConsolidadaExistente(
  consolidada: BancaConsolidada,
  grupoBase: AvaliacaoGrupo,
  statusSessaoSobrescrito?: ResultadoFinalTipo | null,
): BancaConsolidada {
  const listaIndividuais = Object.values(consolidada.avaliacoes_individuais || {});
  if (listaIndividuais.length > 0) {
    const recalculada = calcularMediaBanca(
      listaIndividuais,
      grupoBase,
      statusSessaoSobrescrito ?? consolidada.status_liberacao_manual ?? null,
    );
    return {
      ...recalculada,
      status_banca: consolidada.status_banca || recalculada.status_banca,
      pareceres_professores:
        consolidada.pareceres_professores?.length
          ? consolidada.pareceres_professores
          : recalculada.pareceres_professores,
    };
  }

  const rubricasMedias = mesclarRubricasSoberanasComBase(
    consolidada.rubricas_medias || [],
    grupoBase.rubricas || [],
  );
  const mediaP1 = round2(
    rubricasMedias.filter((r) => r.pilar === 1).reduce((a, r) => a + r.nota, 0),
  );
  const mediaP2 = round2(
    rubricasMedias.filter((r) => r.pilar === 2).reduce((a, r) => a + r.nota, 0),
  );
  const mediaP3Base = resolverP3GrupoBase(rubricasMedias);
  const insufColetivos = coletarItensInsuficientesColetivos(rubricasMedias);

  const intsMesclados = mesclarIntegrantesSoberanosComBase(
    consolidada.integrantes_medias || [],
    grupoBase.integrantes_notas || [],
  );
  const statusOverride =
    statusSessaoSobrescrito ?? consolidada.status_liberacao_manual ?? null;

  const integrantesRecalc: NotaIndividualIntegrante[] = intsMesclados.map((ind) => {
    const n31 =
      ind.nivel_3_1 === 'Pendente' && Number(ind.nota_3_1_arguicao || 0) <= 0
        ? 0
        : round2(Number(ind.nota_3_1_arguicao || 0));
    const n41 = round2(Number(ind.nota_4_1_sprints ?? 0));
    const n42 = round2(Number(ind.nota_4_2_participacao ?? 0));
    const p3 = round2(n31 + mediaP3Base);
    const p4 = round2(n41 + n42);
    const nf = round2(mediaP1 + mediaP2 + p3 + p4);
    const insuf = [...insufColetivos];
    if (ind.nivel_3_1 === 'Insuficiente') {
      insuf.push(`3.1 Arguição Técnica — ${ind.nome} (${n31.toFixed(1)}/6.0)`);
    }
    const resultado: ResultadoFinalTipo =
      statusOverride ||
      (nf >= 50.0
        ? insuf.length > 0
          ? 'Nota Retida (Pendências)'
          : 'Aprovado'
        : 'Nova Chance (Data Futura)');

    return {
      ...ind,
      p1_nota: mediaP1,
      p2_nota: mediaP2,
      p3_nota: p3,
      p4_nota: p4,
      nota_final: nf,
      possui_item_insuficiente: insuf.length > 0,
      itens_insuficientes: insuf,
      resultado,
    };
  });

  const mediaP3 =
    integrantesRecalc.length > 0
      ? round2(integrantesRecalc.reduce((a, b) => a + b.p3_nota, 0) / integrantesRecalc.length)
      : mediaP3Base;
  const mediaP4 =
    integrantesRecalc.length > 0
      ? round2(integrantesRecalc.reduce((a, b) => a + b.p4_nota, 0) / integrantesRecalc.length)
      : round2(consolidada.media_p4 || 0);
  const mediaFinal =
    integrantesRecalc.length > 0
      ? round2(integrantesRecalc.reduce((a, b) => a + b.nota_final, 0) / integrantesRecalc.length)
      : round2(mediaP1 + mediaP2 + mediaP3 + mediaP4);

  const statusFinal: ResultadoFinalTipo =
    statusOverride ||
    (mediaFinal >= 50.0
      ? integrantesRecalc.some((i) => i.possui_item_insuficiente)
        ? 'Nota Retida (Pendências)'
        : 'Aprovado'
      : 'Nova Chance (Data Futura)');

  return {
    ...consolidada,
    media_p1: mediaP1,
    media_p2: mediaP2,
    media_p3: mediaP3,
    media_p4: mediaP4,
    media_final: mediaFinal,
    rubricas_medias: rubricasMedias,
    integrantes_medias: integrantesRecalc,
    status_liberacao_final: statusFinal,
    status_liberacao_manual: statusOverride,
  };
}

export interface DiffConsensoBanca {
  rubricasAlteradas: Map<string, { nota: number; nivel: NivelMSEP }>;
  integrantesAlterados: Map<
    string,
    Partial<
      Pick<
        NotaIndividualIntegrante,
        | 'nota_3_1_arguicao'
        | 'nivel_3_1'
        | 'nota_4_1_sprints'
        | 'nivel_4_1'
        | 'nota_4_2_participacao'
        | 'nivel_4_2'
      >
    >
  >;
  alterarStatusManual?: boolean;
  statusManualNovo?: ResultadoFinalTipo | null;
  atualizadoEm?: string;
}

/**
 * Aplica em um avaliador apenas os itens efetivamente alterados no modo de consenso pós-fechamento,
 * preservando intactas suas demais rubricas e parecer técnico individual e recalculando seus totais.
 */
export function aplicarDiffConsensoNaAvaliacao(
  avAlvo: AvaliacaoProfessorIndividual,
  grupoBase: AvaliacaoGrupo,
  diff: DiffConsensoBanca,
): AvaliacaoProfessorIndividual {
  const rubricasBase = mesclarRubricasSoberanasComBase(
    avAlvo.rubricas || [],
    grupoBase.rubricas || [],
  );

  const rubricasAtualizadas = rubricasBase.map((r) => {
    const alt = diff.rubricasAlteradas.get(r.codigo);
    if (!alt) return r;
    const nivelNorm =
      alt.nivel === 'Pendente' && alt.nota <= 0
        ? 'Pendente'
        : calcularNivelMsep(alt.nota, r.peso_max);
    return {
      ...r,
      nota: round2(Math.max(0, Math.min(r.peso_max, alt.nota))),
      nivel: nivelNorm,
      editado_manualmente: true,
    };
  });

  const intsBase = mesclarIntegrantesSoberanosComBase(
    avAlvo.integrantes_notas || [],
    grupoBase.integrantes_notas || [],
  );

  const intsAtualizados = intsBase.map((ind) => {
    const alt =
      diff.integrantesAlterados.get(ind.nome) ||
      diff.integrantesAlterados.get(ind.nome.trim().toLowerCase());
    if (!alt) return ind;
    return {
      ...ind,
      ...alt,
    };
  });

  const avAtualizada: AvaliacaoProfessorIndividual = {
    ...avAlvo,
    rubricas: rubricasAtualizadas,
    integrantes_notas: intsAtualizados,
    status_liberacao_manual: diff.alterarStatusManual
      ? diff.statusManualNovo ?? null
      : avAlvo.status_liberacao_manual ?? null,
    atualizado_em: diff.atualizadoEm || avAlvo.atualizado_em,
  };

  return recalcularAvaliacaoProfessor(avAtualizada, grupoBase);
}

/**
 * Verifica se o snapshot salvo em psof3_sessoes_banca diverge dos cálculos derivados das rubricas.
 */
export function consolidadaDivergeDeSessao(
  recalculada: BancaConsolidada,
  sessao?: SessaoBancaAoVivo | null,
): boolean {
  if (!sessao || sessao.status !== 'concluida') return false;
  const bc = sessao.banca_consolidada;
  if (!bc) return true;

  if (Math.abs(Number(sessao.media_final_consolidada ?? -1) - recalculada.media_final) > 0.01) {
    return true;
  }
  if (
    Math.abs(Number(bc.media_p1 ?? -1) - recalculada.media_p1) > 0.01 ||
    Math.abs(Number(bc.media_p2 ?? -1) - recalculada.media_p2) > 0.01 ||
    Math.abs(Number(bc.media_p3 ?? -1) - recalculada.media_p3) > 0.01 ||
    Math.abs(Number(bc.media_p4 ?? -1) - recalculada.media_p4) > 0.01 ||
    Math.abs(Number(bc.media_final ?? -1) - recalculada.media_final) > 0.01
  ) {
    return true;
  }

  const rubSalvas = new Map((bc.rubricas_medias || []).map((r) => [r.codigo, r]));
  for (const r of recalculada.rubricas_medias) {
    const rs = rubSalvas.get(r.codigo);
    if (!rs || Math.abs(Number(rs.nota || 0) - r.nota) > 0.01 || rs.nivel !== r.nivel) {
      return true;
    }
  }

  const avsSalvas = bc.avaliacoes_individuais || {};
  for (const [uid, avRecalc] of Object.entries(recalculada.avaliacoes_individuais)) {
    const avSalva = avsSalvas[uid];
    if (!avSalva) return true;
    if (
      Math.abs(Number(avSalva.p1_total ?? -1) - avRecalc.p1_total) > 0.01 ||
      Math.abs(Number(avSalva.p2_total ?? -1) - avRecalc.p2_total) > 0.01 ||
      Math.abs(obterP3TotalAvaliador(avSalva) - obterP3TotalAvaliador(avRecalc)) > 0.01 ||
      Math.abs(Number(avSalva.nota_final_grupo ?? -1) - avRecalc.nota_final_grupo) > 0.01
    ) {
      return true;
    }
  }

  return false;
}

import assert from 'node:assert/strict';
import {
  DOMINIO_DOCENTE_AUTORIZADO,
  EMAIL_PROFESSOR_TITULAR,
  isEmailDocenteSenai,
  isUsuarioDocenteAutorizado,
  isUsuarioProfessorTitular,
} from '../src/services/authPolicy.ts';
import {
  aplicarDiffConsensoNaAvaliacao,
  calcularMediaBanca,
  calcularNivelMsep,
  consolidadaDivergeDeSessao,
  normalizarRubricasComNivel,
  obterP3TotalAvaliador,
  recalcularAvaliacaoProfessor,
  recalcularConsolidadaExistente,
  round2,
} from '../src/services/calculoBanca.ts';
import type {
  AvaliacaoGrupo,
  AvaliacaoProfessorIndividual,
  NotaIndividualIntegrante,
  RubricaItemAvaliacao,
  SessaoBancaAoVivo,
} from '../src/types.ts';

function criarRubrica(
  codigo: string,
  pilar: number,
  pesoMax: number,
  nota: number,
  nivel?: RubricaItemAvaliacao['nivel'],
  sugestao = nota,
): RubricaItemAvaliacao {
  return {
    codigo,
    pilar,
    titulo: `Critério ${codigo}`,
    peso_max: pesoMax,
    nivel: nivel ?? calcularNivelMsep(nota, pesoMax),
    nota,
    nota_sugerida_ia: sugestao,
    nivel_sugerido_ia:
      codigo === '3.1' || codigo === '3.2'
        ? 'Pendente'
        : calcularNivelMsep(sugestao, pesoMax),
    justificativa_ia: `Justificativa ${codigo}`,
    evidencias: [`Evidência ${codigo}`],
    editado_manualmente: nota !== sugestao,
  };
}

function criarIntegrante(
  nome: string,
  n41: number,
  n42: number,
  n31: number,
  nivel31?: NotaIndividualIntegrante['nivel_3_1'],
): NotaIndividualIntegrante {
  return {
    nome,
    nome_completo_planilha: `${nome} Completo`,
    matricula: '12345',
    github_autor: nome.toLowerCase(),
    commits_qtd: 10,
    relatorios_entregues: 8,
    total_relatorios: 10,
    aulas_participadas: 15,
    total_aulas_turma: 16,
    nota_3_1_arguicao: n31,
    nivel_3_1: nivel31 ?? calcularNivelMsep(n31, 6),
    nota_3_1_sugerida: 0,
    nivel_3_1_sugerido: 'Pendente',
    nota_4_1_sprints: n41,
    nivel_4_1: calcularNivelMsep(n41, 8),
    nota_4_1_sugerida: n41,
    nivel_4_1_sugerido: calcularNivelMsep(n41, 8),
    nota_4_2_participacao: n42,
    nivel_4_2: calcularNivelMsep(n42, 7),
    nota_4_2_sugerida: n42,
    nivel_4_2_sugerido: calcularNivelMsep(n42, 7),
    p1_nota: 0,
    p2_nota: 0,
    p3_nota: 0,
    p4_nota: round2(n41 + n42),
    nota_final: 0,
    possui_item_insuficiente: false,
    itens_insuficientes: [],
    resultado: 'Aprovado',
    observacoes_individuais: '',
  };
}

function criarGrupoBase(): AvaliacaoGrupo {
  const rubricasBase: RubricaItemAvaliacao[] = [
    criarRubrica('1.1', 1, 8, 7.2),
    criarRubrica('1.2', 1, 3, 3.0),
    criarRubrica('1.3', 1, 3, 2.9),
    criarRubrica('1.4', 1, 3, 2.55),
    criarRubrica('1.5', 1, 3, 2.9),
    criarRubrica('1.6', 1, 3, 2.85),
    criarRubrica('1.7', 1, 3, 2.55),
    criarRubrica('1.8', 1, 4, 3.75),
    criarRubrica('2.1', 2, 10, 9.5),
    criarRubrica('2.2', 2, 10, 9.5),
    criarRubrica('2.3', 2, 10, 3.8, 'Insuficiente'),
    criarRubrica('2.4', 2, 5, 4.8),
    criarRubrica('2.5', 2, 5, 3.7),
    criarRubrica('3.1', 3, 6, 0, 'Pendente', 0),
    criarRubrica('3.2', 3, 5, 0, 'Pendente', 0),
    criarRubrica('3.3', 3, 4, 3.9),
    criarRubrica('4.1', 4, 8, 6.13),
    criarRubrica('4.2', 4, 7, 6.84),
  ];

  return {
    id: 'I2DEV-A_Grupo05',
    ordem_apresentacao: 5,
    turma: 'I2DEV-A',
    dia_semana: 'Terça',
    sala: 'Lab 1',
    data_banca: '17/11/2026',
    data_banca_iso: '2026-11-17',
    horario: 'Primeiro Horário',
    grupo: 'Grupo 05',
    grupo_num: 5,
    projeto: 'Projeto Teste',
    tema: 'Sistema Web',
    integrantes: ['Antonio', 'Isabelle', 'Nicolle'],
    entregue_na_pasta: true,
    nome_pasta_entregue: 'Banca05',
    caminho_pasta: './tcc/I2DEV-A/Banca05',
    status_avaliacao: 'auditado_ia',
    banca_realizada: false,
    auditado_em: '2026-11-20T13:12:01',
    atualizado_em: '2026-11-21T12:56:53',
    avaliador: 'Sistema',
    sincronizado_firebase: true,
    firebase_sync_em: '2026-11-21T12:56:53',
    arquivos_entregues: [],
    conformidade_nomenclatura_pct: 100,
    auditoria_tecnica: {} as AvaliacaoGrupo['auditoria_tecnica'],
    rubricas: rubricasBase,
    integrantes_notas: [
      criarIntegrante('Antonio', 4.0, 5.4, 0, 'Pendente'),
      criarIntegrante('Isabelle', 7.53, 7.0, 0, 'Pendente'),
      criarIntegrante('Nicolle', 8.0, 7.0, 0, 'Pendente'),
    ],
    perguntas_arguicao: [],
    p1_total: 27.7,
    p2_total: 31.3,
    p3_grupo_base: 3.9,
    media_nota_final_grupo: 75.88,
    possui_item_insuficiente_grupo: true,
    itens_insuficientes_grupo: ['2.3 Banco de Dados Físico (3.8/10.0)'],
    status_liberacao_nota: 'Nota Retida (Pendências)',
    parecer_tecnico: '',
    parecer_estruturado: [],
    pontos_fortes: [],
    pontos_atencao: [],
    usou_llm_gemini: false,
  };
}

// 1. Teste de normalização e recálculo de professor único ao mudar 2.3 de Insuficiente (2.0) -> Avançado (10.0)
{
  const grupo = criarGrupoBase();
  const rubricasProf1 = grupo.rubricas.map((r) => {
    if (r.codigo === '2.3') {
      // Simula rubrica alterada para nota 10 mas com nivel ainda stale ou atualizado
      return { ...r, nota: 10.0, nivel: 'Avançado' as const, editado_manualmente: true };
    }
    if (r.codigo === '3.2') return { ...r, nota: 5.0, nivel: 'Avançado' as const };
    return r;
  });

  const avStale: AvaliacaoProfessorIndividual = {
    grupo_id: grupo.id,
    professor_uid: 'uid_w',
    professor_nome: 'William Devidé Komel',
    professor_email: 'w@senai.br',
    rubricas: rubricasProf1,
    integrantes_notas: [
      criarIntegrante('Antonio', 4.0, 5.4, 6.0),
      criarIntegrante('Isabelle', 7.53, 7.0, 6.0),
      criarIntegrante('Nicolle', 8.0, 7.0, 6.0),
    ],
    // Totais propositalmente obsoletos (como se 2.3 ainda fosse 2.0!)
    p1_total: 10.0,
    p2_total: 29.5,
    p3_grupo_base: 3.9,
    nota_final_grupo: 50.0,
    parecer_tecnico: 'Bom trabalho.',
    concluido: true,
    atualizado_em: '2026-11-21T17:00:00Z',
  };

  const recalc = recalcularAvaliacaoProfessor(avStale, grupo);
  assert.equal(recalc.p1_total, 27.7);
  // P2: 9.5 + 9.5 + 10.0 + 4.8 + 3.7 = 37.5
  assert.equal(recalc.p2_total, 37.5);
  assert.equal(recalc.p3_grupo_base, 8.9);
  assert.equal(recalc.p3_total, 14.9); // 6.0 + 5.0 + 3.9
  // Antonio: 27.7 + 37.5 + 14.9 + 9.4 = 89.5
  // Isabelle: 27.7 + 37.5 + 14.9 + 14.53 = 94.63
  // Nicolle: 27.7 + 37.5 + 14.9 + 15.0 = 95.1
  // Média: (89.5 + 94.63 + 95.1) / 3 = 93.08
  assert.equal(recalc.integrantes_notas[0].nota_final, 89.5);
  assert.equal(recalc.integrantes_notas[1].nota_final, 94.63);
  assert.equal(recalc.integrantes_notas[2].nota_final, 95.1);
  assert.equal(recalc.nota_final_grupo, 93.08);
  assert.equal(recalc.integrantes_notas[0].resultado, 'Aprovado');
}

// 2. Teste fiel do cenário I2DEV-A_Grupo05 (William vs Edivan) + Pilar 3 completo (3.1 + 3.2 + 3.3)
{
  const grupo = criarGrupoBase();
  const makeRubs = (vals: Record<string, number>) =>
    grupo.rubricas.map((r) => {
      const n = vals[r.codigo] ?? r.nota;
      return {
        ...r,
        nota: n,
        nivel: r.codigo === '3.1' ? ('Pendente' as const) : calcularNivelMsep(n, r.peso_max),
      };
    });

  const common = {
    '1.1': 6.82, '1.2': 3.0, '1.3': 2.9, '1.4': 2.55,
    '1.5': 2.9, '1.6': 2.85, '1.7': 2.55, '1.8': 3.75,
    '2.1': 9.4, '2.2': 8.5, '2.4': 5.0, '2.5': 3.5, '3.3': 3.85,
  };

  const avWilliam: AvaliacaoProfessorIndividual = {
    grupo_id: grupo.id,
    professor_uid: 'uid_w',
    professor_nome: 'William Devidé Komel',
    professor_email: 'w@senai.br',
    rubricas: makeRubs({ ...common, '2.3': 6.2, '3.2': 3.75 }),
    integrantes_notas: [
      criarIntegrante('Antonio', 4.0, 5.4, 4.5),
      criarIntegrante('Isabelle', 7.53, 7.0, 4.5),
      criarIntegrante('Nicolle', 8.0, 7.0, 4.5),
    ],
    // Valores obsoletos propositais para verificar recálculo
    p1_total: 0,
    p2_total: 0,
    p3_grupo_base: 0,
    nota_final_grupo: 0,
    parecer_tecnico: 'Parecer W',
    concluido: true,
    status_liberacao_manual: 'Nota Retida (Pendências)',
    atualizado_em: '2026-11-17T17:51:33Z',
  };

  const avEdivan: AvaliacaoProfessorIndividual = {
    grupo_id: grupo.id,
    professor_uid: 'uid_e',
    professor_nome: 'Edivan Andrade',
    professor_email: 'e@senai.br',
    rubricas: makeRubs({ ...common, '2.3': 10.0, '3.2': 5.0 }),
    integrantes_notas: [
      criarIntegrante('Antonio', 4.0, 5.4, 6.0),
      criarIntegrante('Isabelle', 7.53, 7.0, 6.0),
      criarIntegrante('Nicolle', 8.0, 7.0, 6.0),
    ],
    p1_total: 0,
    p2_total: 0,
    p3_grupo_base: 0,
    nota_final_grupo: 0,
    parecer_tecnico: 'Parecer E',
    concluido: true,
    atualizado_em: '2026-11-17T17:51:40Z',
  };

  const cons = calcularMediaBanca([avWilliam, avEdivan], grupo, 'Aprovado');
  assert.equal(cons.media_p1, 27.32);
  assert.equal(cons.media_p2, 34.5); // (32.6 + 36.4) / 2
  // P3 completo: média de 3.1 (5.25) + média 3.2 (4.38) + 3.3 (3.85) = 13.48 (ou com arredondamento por integrante)
  assert.equal(cons.avaliacoes_individuais['uid_w'].p2_total, 32.6);
  assert.equal(cons.avaliacoes_individuais['uid_w'].nota_final_grupo, 85.0);
  assert.equal(obterP3TotalAvaliador(cons.avaliacoes_individuais['uid_w']), 12.1);
  assert.equal(cons.avaliacoes_individuais['uid_e'].p2_total, 36.4);
  assert.equal(cons.avaliacoes_individuais['uid_e'].nota_final_grupo, 91.55);
  assert.equal(obterP3TotalAvaliador(cons.avaliacoes_individuais['uid_e']), 14.85);
  assert.equal(cons.media_p3, 13.48); // 5.25 + 8.23 = 13.48
  assert.equal(cons.media_p4, 12.98);
  assert.equal(cons.media_final, 88.28);
  assert.equal(cons.status_liberacao_final, 'Aprovado');
  assert.equal(cons.rubricas_medias.find((r) => r.codigo === '2.3')?.nota, 8.1);
  assert.equal(cons.rubricas_medias.find((r) => r.codigo === '2.3')?.nivel, 'Pleno');
}

// 3. Teste de edição de consenso (alterando apenas 2.3 no Edivan + William, preservando demais rubricas)
{
  const grupo = criarGrupoBase();
  const avOutro: AvaliacaoProfessorIndividual = {
    grupo_id: grupo.id,
    professor_uid: 'uid_j',
    professor_nome: 'Joao Paulo Oliveira',
    professor_email: 'j@senai.br',
    rubricas: grupo.rubricas.map((r) => {
      if (r.codigo === '1.6') return { ...r, nota: 2.0, nivel: 'Pleno' as const };
      if (r.codigo === '2.3') return { ...r, nota: 2.0, nivel: 'Insuficiente' as const };
      if (r.codigo === '3.2') return { ...r, nota: 3.0, nivel: 'Pleno' as const };
      return r;
    }),
    integrantes_notas: [
      criarIntegrante('Antonio', 4.0, 5.4, 5.0),
      criarIntegrante('Isabelle', 7.53, 7.0, 5.0),
      criarIntegrante('Nicolle', 8.0, 7.0, 5.0),
    ],
    p1_total: 26.85,
    p2_total: 29.5,
    p3_grupo_base: 6.9,
    nota_final_grupo: 75.0,
    parecer_tecnico: 'Parecer original João intacto',
    concluido: true,
    atualizado_em: '2026-11-17T12:00:00Z',
  };

  const atualizado = aplicarDiffConsensoNaAvaliacao(avOutro, grupo, {
    rubricasAlteradas: new Map([['2.3', { nota: 10.0, nivel: 'Avançado' }]]),
    integrantesAlterados: new Map(),
    alterarStatusManual: false,
    atualizadoEm: '2026-11-21T18:00:00Z',
  });

  // 2.3 mudou para 10.0 (Avançado), 1.6 manteve 2.0, parecer manteve intacto
  assert.equal(atualizado.rubricas.find((r) => r.codigo === '2.3')?.nota, 10.0);
  assert.equal(atualizado.rubricas.find((r) => r.codigo === '2.3')?.nivel, 'Avançado');
  assert.equal(atualizado.rubricas.find((r) => r.codigo === '1.6')?.nota, 2.0);
  assert.equal(atualizado.parecer_tecnico, 'Parecer original João intacto');
  // P2 saltou exatamente +8.0 pts (de 29.5 para 37.5)
  assert.equal(atualizado.p2_total, 37.5);
  assert.equal(atualizado.p1_total, 26.85);
  assert.equal(obterP3TotalAvaliador(atualizado), 11.9); // 5.0 + 3.0 + 3.9
  assert.equal(atualizado.nota_final_grupo, 89.23); // (26.85+37.5+11.9+12.98)
}

// 4. Teste de detecção de divergência e recalcularConsolidadaExistente
{
  const grupo = criarGrupoBase();
  const cons = calcularMediaBanca(
    [
      {
        grupo_id: grupo.id,
        professor_uid: 'u1',
        professor_nome: 'Prof A',
        professor_email: 'a@s.br',
        rubricas: grupo.rubricas.map((r) =>
          r.codigo === '2.3'
            ? { ...r, nota: 7.5, nivel: 'Pleno' as const }
            : r.codigo === '3.2'
            ? { ...r, nota: 4.0, nivel: 'Pleno' as const }
            : r,
        ),
        integrantes_notas: [
          criarIntegrante('Antonio', 4.0, 5.4, 5.0),
          criarIntegrante('Isabelle', 7.53, 7.0, 5.0),
          criarIntegrante('Nicolle', 8.0, 7.0, 5.0),
        ],
        p1_total: 0,
        p2_total: 0,
        p3_grupo_base: 0,
        nota_final_grupo: 0,
        parecer_tecnico: '',
        concluido: true,
        atualizado_em: '2026-11-21T10:00:00Z',
      },
    ],
    grupo,
  );

  // Sessão simulando bug antigo: media_p3 sem 3.1 (7.90 ao invés de 12.90) e 2.3 antigo (2.0)
  const sessaoAntiga: SessaoBancaAoVivo = {
    grupo_id: grupo.id,
    turma: grupo.turma,
    projeto: grupo.projeto,
    status: 'concluida',
    titular_uid: 'u1',
    titular_nome: 'Prof A',
    iniciado_em: null,
    encerrado_em: null,
    duracao_segundos: 600,
    duracao_formatada: '10m 00s',
    avaliadores_presentes: ['Prof A'],
    avaliacoes_concluidas: ['u1'],
    media_final_consolidada: 82.0,
    banca_consolidada: {
      ...cons,
      media_p3: 7.9,
      media_final: 82.0,
      rubricas_medias: cons.rubricas_medias.map((r) =>
        r.codigo === '2.3' ? { ...r, nota: 2.0, nivel: 'Insuficiente' as const } : r,
      ),
    },
    atualizado_em: '2026-11-21T10:00:00Z',
  };

  assert.equal(consolidadaDivergeDeSessao(cons, sessaoAntiga), true);
  assert.equal(
    consolidadaDivergeDeSessao(cons, {
      ...sessaoAntiga,
      media_final_consolidada: cons.media_final,
      banca_consolidada: cons,
    }),
    false,
  );

  const consViaExistente = recalcularConsolidadaExistente(sessaoAntiga.banca_consolidada!, grupo);
  assert.equal(consViaExistente.media_p2, 35.0);
  assert.equal(consViaExistente.media_p3, 12.9);
  assert.equal(consViaExistente.media_final, 88.58);

  // Normalização corrige nível que veio dessincronizado com a nota
  const rubCorrigidas = normalizarRubricasComNivel([
    { ...grupo.rubricas[0], nota: 7.5, peso_max: 10, nivel: 'Insuficiente' },
  ]);
  assert.equal(rubCorrigidas[0].nivel, 'Pleno');
}

// 5. Política institucional de acesso docente (@docente.senai.br) e Professor Titular exclusivo
{
  assert.equal(DOMINIO_DOCENTE_AUTORIZADO, '@docente.senai.br');
  assert.equal(EMAIL_PROFESSOR_TITULAR, 'william.komel@docente.senai.br');

  assert.equal(isEmailDocenteSenai('william.komel@docente.senai.br'), true);
  assert.equal(isEmailDocenteSenai('  Edivan.Souza@DOCENTE.SENAI.BR '), true);
  assert.equal(isEmailDocenteSenai('williamdevide@gmail.com'), false);
  assert.equal(isEmailDocenteSenai('aluno@aluno.senai.br'), false);
  assert.equal(isEmailDocenteSenai('docente.senai.br@gmail.com'), false);
  assert.equal(isEmailDocenteSenai(null), false);

  assert.equal(
    isUsuarioDocenteAutorizado({
      email: 'professor@docente.senai.br',
      emailVerified: true,
    }),
    true,
  );
  assert.equal(
    isUsuarioDocenteAutorizado({
      email: 'professor@docente.senai.br',
      emailVerified: false,
    }),
    false,
  );
  assert.equal(
    isUsuarioDocenteAutorizado({
      email: 'williamdevide@gmail.com',
      emailVerified: true,
    }),
    false,
  );

  // Apenas william.komel@docente.senai.br (e-mail verificado) é Professor Titular
  assert.equal(
    isUsuarioProfessorTitular({
      email: 'William.Komel@docente.senai.br',
      emailVerified: true,
    }),
    true,
  );
  assert.equal(
    isUsuarioProfessorTitular({
      email: 'william.komel@docente.senai.br',
      emailVerified: false,
    }),
    false,
  );
  assert.equal(
    isUsuarioProfessorTitular({
      email: 'outro.docente@docente.senai.br',
      emailVerified: true,
    }),
    false,
  );
  assert.equal(
    isUsuarioProfessorTitular({
      email: 'williamdevide@gmail.com',
      emailVerified: true,
    }),
    false,
  );
  assert.equal(isUsuarioProfessorTitular(null), false);
}

console.log('✅ Todos os testes unitários (calculoBanca + authPolicy) passaram com 100% de exatidão!');

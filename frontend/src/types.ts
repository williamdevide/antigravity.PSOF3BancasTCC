export type NivelMSEP = 'Pendente' | 'Insuficiente' | 'Pleno' | 'Avançado';
export type ResultadoFinalTipo = 'Aprovado' | 'Nota Retida (Pendências)' | 'Nova Chance (Data Futura)';

export interface ConfigEnv {
  escola: string;
  disciplina: string;
  avaliador_padrao: string;
  pasta_tcc: string;
  pasta_destino: string;
  github_token_configurado: boolean;
  github_token_preview: string;
  gemini_api_key: string;
  gemini_model: string;
  firebase_project_id: string;
  firebase_api_key: string;
  firebase_auth_domain: string;
  firebase_storage_bucket: string;
  firebase_sincronizacao_ativa: boolean;
  auditar_online_github_deploy: boolean;
}

export interface RubricaItemAvaliacao {
  codigo: string;
  pilar: number;
  titulo: string;
  peso_max: number;
  nivel: NivelMSEP;
  nota: number;
  nota_sugerida_ia: number;
  nivel_sugerido_ia: NivelMSEP;
  justificativa_ia: string;
  evidencias: string[];
  editado_manualmente: boolean;
}

export interface NotaIndividualIntegrante {
  nome: string;
  nome_completo_planilha: string;
  matricula: string;
  github_autor: string;
  commits_qtd: number;
  relatorios_entregues: number;
  total_relatorios: number;
  aulas_participadas: number;
  total_aulas_turma: number;
  nota_3_1_arguicao: number;
  nivel_3_1: NivelMSEP;
  nota_3_1_sugerida: number;
  nivel_3_1_sugerido: NivelMSEP;
  nota_4_1_sprints: number;
  nivel_4_1: NivelMSEP;
  nota_4_1_sugerida: number;
  nivel_4_1_sugerido: NivelMSEP;
  nota_4_2_participacao: number;
  nivel_4_2: NivelMSEP;
  nota_4_2_sugerida: number;
  nivel_4_2_sugerido: NivelMSEP;
  p1_nota: number;
  p2_nota: number;
  p3_nota: number;
  p4_nota: number;
  nota_final: number;
  possui_item_insuficiente: boolean;
  itens_insuficientes: string[];
  resultado: ResultadoFinalTipo;
  observacoes_individuais: string;
}

export interface PerguntaArguicao {
  integrante_sugerido: string;
  categoria: string;
  arquivo_referencia: string;
  trecho_codigo: string;
  pergunta: string;
  resposta_esperada: string;
}

export interface BlocoParecerTecnico {
  categoria: string;
  titulo: string;
  status: 'conforme' | 'alerta' | 'critico';
  resumo: string;
  itens: string[];
}

export interface AuditoriaArquivoItem {
  tipo: string;
  obrigatorio: boolean;
  encontrado: boolean;
  nome_arquivo: string;
  tamanho_bytes: number;
  padrao_esperado: string;
  nomenclatura_conforme: boolean;
  alertas_nomenclatura: string[];
}

export interface AuditoriaTabelaBanco {
  tabela: string;
  presente_no_sql: boolean;
  registros_no_sql: number;
  presente_no_banco_online: boolean;
  status_banco_online: string;
  codigo_faz_gravacao: boolean;
  codigo_faz_consumo_leitura: boolean;
  evidencia_codigo: string;
  conforme_ciclo_completo: boolean;
}

export interface AuditoriaTecnicaDetalhada {
  monografia_paginas_estimadas: number;
  monografia_palavras: number;
  monografia_caracteres: number;
  secoes_abnt_detectadas: Record<string, boolean>;
  rfs_detectados_qtd: number;
  rnfs_detectados_qtd: number;
  possui_mer_der: boolean;
  possui_dicionario_dados: boolean;
  possui_link_figma: boolean;
  links_figma_encontrados: string[];
  possui_plano_negocios: boolean;
  possui_casos_teste: boolean;
  possui_backlog_cronograma: boolean;
  resumo_monografia: string;

  sql_arquivo: string;
  sql_linhas: number;
  sql_tabelas: string[];
  sql_tabelas_qtd: number;
  sql_inserts_por_tabela: Record<string, number>;
  sql_total_registros_inseridos: number;
  sql_atende_min_20_por_tabela: boolean;
  sql_tabelas_abaixo_20: string[];
  sql_possui_pk: boolean;
  sql_possui_fk: boolean;
  sql_possui_indices: boolean;
  sql_possui_rls: boolean;
  sql_possui_triggers_functions: boolean;
  sql_diagnostico: string;

  zip_arquivo: string;
  zip_total_arquivos: number;
  zip_extensoes: Record<string, number>;
  zip_stack_detectada: string[];
  zip_possui_readme: boolean;
  zip_readme_tamanho: number;
  zip_possui_package_json: boolean;
  zip_dependencias: string[];
  zip_arquivos_backend: string[];
  zip_arquivos_frontend: string[];
  zip_arquivos_teste: string[];
  zip_alertas_seguranca: string[];

  slides_arquivo: string;
  slides_qtd: number;
  slides_etapas_roteiro: Record<string, boolean>;
  slides_titulos: string[];

  github_url: string;
  github_online_ok: boolean;
  github_status_http: number;
  github_commits_total: number;
  github_commits_por_autor: Record<string, number>;
  github_ultimo_commit_data: string;
  github_readme_online: boolean;
  github_linguagens: string[];
  github_diagnostico: string;

  deploy_url: string;
  deploy_online_ok: boolean;
  deploy_status_http: number;
  deploy_tempo_ms: number;
  deploy_titulo_pagina: string;
  deploy_provedor: string;
  deploy_rodando_inteiramente_nuvem: boolean;
  deploy_diagnostico: string;

  banco_provedor_nuvem: string;
  banco_url_detectada: string;
  banco_exclusivo_nuvem: boolean;
  usa_localstorage_indevido: boolean;
  arquivos_localstorage_detectados: string[];
  chaves_localstorage_permitidas_ui: string[];
  chaves_localstorage_negocio: string[];
  usa_arquivos_json_locais_no_servidor: boolean;
  arquivos_json_locais_detectados: string[];
  tabelas_auditoria_online: AuditoriaTabelaBanco[];
  tabelas_sql_presentes_online_qtd: number;
  tabelas_sql_gravadas_pelo_codigo_qtd: number;
  tabelas_sql_consumidas_pelo_codigo_qtd: number;
  tabelas_ciclo_completo_qtd: number;
  entidades_tema_sem_tabela_banco: string[];
  inviabiliza_finalizacao_persistencia: boolean;
  diagnostico_persistencia_2_3_2_4: string;
}

export interface AvaliacaoGrupo {
  id: string;
  ordem_apresentacao: number;
  turma: string;
  dia_semana: string;
  sala: string;
  data_banca: string;
  data_banca_iso: string;
  horario: string;
  grupo: string;
  grupo_num: number;
  projeto: string;
  tema: string;
  integrantes: string[];
  entregue_na_pasta: boolean;
  nome_pasta_entregue: string;
  caminho_pasta: string;
  status_avaliacao: 'pendente_entrega' | 'entregue_nao_auditado' | 'auditado_ia' | 'avaliado_banca';
  auditado_em: string | null;
  atualizado_em: string | null;
  avaliador: string;
  sincronizado_firebase: boolean;
  firebase_sync_em: string | null;

  arquivos_entregues: AuditoriaArquivoItem[];
  conformidade_nomenclatura_pct: number;
  auditoria_tecnica: AuditoriaTecnicaDetalhada;
  rubricas: RubricaItemAvaliacao[];
  integrantes_notas: NotaIndividualIntegrante[];
  perguntas_arguicao: PerguntaArguicao[];

  p1_total: number;
  p2_total: number;
  p3_grupo_base: number;
  media_nota_final_grupo: number;
  possui_item_insuficiente_grupo: boolean;
  itens_insuficientes_grupo: string[];
  status_liberacao_nota: ResultadoFinalTipo;

  parecer_tecnico: string;
  parecer_estruturado: BlocoParecerTecnico[];
  pontos_fortes: string[];
  pontos_atencao: string[];
  usou_llm_gemini: boolean;
}

export interface AgentSummary {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  sistema_alvo: string;
  icone: string;
  ativo: boolean;
  estado: 'idle' | 'running' | 'success' | 'error';
  tarefa_atual: string | null;
  progresso_atual: number;
  progresso_total: number;
  ultima_execucao_em: string | null;
  grupos_entregues_qtd: number;
  grupos_auditados_qtd: number;
  total_bancas_cronograma: number;
  firebase_ativo: boolean;
}

export interface AgentStatus {
  estado: 'idle' | 'running' | 'success' | 'error';
  tarefa_atual: string | null;
  progresso_atual: number;
  progresso_total: number;
  progresso_etapa: string | null;
  logs: string[];
  ultimo_arquivo: string | null;
  erro: string | null;
}

export interface ExecucaoHistorico {
  id: string;
  iniciado_em: string;
  finalizado_em?: string | null;
  status: 'running' | 'success' | 'error';
  escopo: string;
  grupos_processados: number;
  arquivo_gerado?: string | null;
  mensagem?: string | null;
}

export interface RegrasOficiaisResponse {
  documentos_regras: { nome: string; tamanho_bytes: number; caminho: string }[];
  rubricas_msep: {
    codigo: string;
    pilar: number;
    pilar_nome: string;
    titulo: string;
    descricao: string;
    insuficiente: string;
    pleno: string;
    avancado: string;
    peso_max: number;
    individual: boolean;
  }[];
  cronograma_oficial: unknown[];
}

export interface AvaliacaoProfessorIndividual {
  grupo_id: string;
  professor_uid: string;
  professor_nome: string;
  professor_email: string;
  rubricas: RubricaItemAvaliacao[];
  integrantes_notas: NotaIndividualIntegrante[];
  p1_total: number;
  p2_total: number;
  p3_grupo_base: number;
  nota_final_grupo: number;
  parecer_tecnico: string;
  atualizado_em: string;
}

export interface BancaConsolidada {
  grupo_id: string;
  status_banca: 'pendente' | 'aguardando_segundo_avaliador' | 'banca_concluida';
  avaliadores_concluidos: string[];
  avaliacoes_individuais: Record<string, AvaliacaoProfessorIndividual>;
  media_p1: number;
  media_p2: number;
  media_p3: number;
  media_p4: number;
  media_final: number;
  rubricas_medias: RubricaItemAvaliacao[];
  integrantes_medias: NotaIndividualIntegrante[];
  pareceres_professores: { professor_nome: string; parecer: string; atualizado_em: string }[];
  status_liberacao_final: ResultadoFinalTipo;
}

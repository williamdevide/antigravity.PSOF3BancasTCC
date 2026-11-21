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

export interface SecaoAbntEvidencia {
  secao: string;
  presente: boolean;
  titulo_encontrado: string;
  evidencia: string;
  origem: 'heading' | 'sumario' | 'conteudo' | 'ia' | 'ausente';
}

export interface ItemChecklistAbnt {
  regra: string;
  conforme: boolean;
  valor_detectado: string;
  esperado: string;
  gravidade: 'conforme' | 'recomendacao' | 'critico';
}

export interface AuditoriaArquivoItem {
  tipo: string;
  obrigatorio: boolean;
  encontrado: boolean;
  nome_arquivo: string;
  tamanho_bytes: number;
  padrao_esperado: string;
  nomenclatura_conforme: boolean;
  possui_apenas_aviso_leve?: boolean;
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
  codigo_faz_insert?: boolean;
  codigo_faz_update?: boolean;
  codigo_faz_select?: boolean;
  codigo_faz_delete?: boolean;
  colunas_qtd?: number;
  possui_pk?: boolean;
  possui_fk?: boolean;
  presente_no_der?: boolean;
  evidencia_codigo: string;
  conforme_ciclo_completo: boolean;
}

export interface ItemPersistenciaForaBD {
  chave: string;
  origem: 'localStorage' | 'sessionStorage' | 'json_local';
  arquivo: string;
  classificacao: 'cache_espelho_bd' | 'exclusivo_fora_bd' | 'json_local_servidor';
  tabela_relacionada: string;
  motivo: string;
}

export interface AuditoriaTecnicaDetalhada {
  monografia_paginas_estimadas: number;
  monografia_palavras: number;
  monografia_caracteres: number;
  secoes_abnt_detectadas: Record<string, boolean>;
  secoes_abnt_presentes?: string[];
  secoes_abnt_faltantes?: string[];
  secoes_abnt_evidencias?: SecaoAbntEvidencia[];
  pendencias_formatacao_abnt?: string[];
  detalhes_formatacao_abnt?: Record<string, string>;
  checklist_abnt?: ItemChecklistAbnt[];
  abnt_score_pct?: number;
  docx_somente_imagens?: boolean;
  fonte_texto_monografia?: string;
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
  backend_rotas_detectadas?: string[];
  backend_possui_auth?: boolean;
  backend_possui_validacao?: boolean;
  backend_possui_tratamento_erro?: boolean;
  backend_crud_resumo?: Record<string, number>;
  frontend_paginas_detectadas?: string[];
  frontend_possui_responsividade?: boolean;
  frontend_possui_chamadas_api?: boolean;
  sistema_aderencia_proposto_resumo?: string;
  sistema_aderencia_proposto_pct?: number;

  slides_arquivo: string;
  slides_qtd: number;
  slides_etapas_roteiro: Record<string, boolean>;
  slides_etapas_faltantes?: string[];
  slides_titulos: string[];
  slides_palavras_total?: number;
  slides_media_palavras_por_slide?: number;
  slides_imagens_qtd?: number;
  slides_com_excesso_texto?: string[];
  slides_objetividade_nivel?: string;
  slides_qualidade_resumo?: string;
  slides_fonte_texto?: string;

  github_url: string;
  github_online_ok: boolean;
  github_status_http: number;
  github_commits_total: number;
  github_commits_por_autor: Record<string, number>;
  github_ultimo_commit_data: string;
  github_readme_online: boolean;
  github_linguagens: string[];
  github_diagnostico: string;
  github_branch_padrao?: string;
  github_ultimo_commit_sha?: string;
  github_ultimo_commit_msg?: string;
  github_total_arquivos_arvore?: number;
  github_sistema_funcional?: boolean;
  github_estrutura_diagnostico?: string;
  github_rate_limited?: boolean;

  deploy_url: string;
  deploy_online_ok: boolean;
  deploy_status_http: number;
  deploy_tempo_ms: number;
  deploy_titulo_pagina: string;
  deploy_provedor: string;
  hospedado_vm_oracle?: boolean;
  banco_online_ativo_e_apontado?: boolean;
  deploy_rodando_inteiramente_nuvem: boolean;
  deploy_diagnostico: string;
  deploy_versao_compativel_github?: 'sincronizado' | 'possivelmente_desatualizado' | 'divergente' | 'nao_verificavel';
  deploy_versao_diagnostico?: string;
  deploy_protegido_antibot_host?: boolean;
  deploy_erros_runtime_detectados?: string[];

  banco_provedor_nuvem: string;
  banco_url_detectada: string;
  banco_exclusivo_nuvem: boolean;
  usa_localstorage_indevido: boolean;
  arquivos_localstorage_detectados: string[];
  chaves_localstorage_permitidas_ui: string[];
  chaves_localstorage_cache_bd?: string[];
  chaves_localstorage_negocio: string[];
  usa_arquivos_json_locais_no_servidor: boolean;
  arquivos_json_locais_detectados: string[];
  itens_persistencia_fora_bd?: ItemPersistenciaForaBD[];
  tabelas_auditoria_online: AuditoriaTabelaBanco[];
  tabelas_sql_presentes_online_qtd: number;
  tabelas_sql_gravadas_pelo_codigo_qtd: number;
  tabelas_sql_consumidas_pelo_codigo_qtd: number;
  tabelas_ciclo_completo_qtd: number;
  entidades_tema_sem_tabela_banco: string[];
  der_entidades_documentadas?: string[];
  der_tabelas_correspondentes?: string[];
  der_entidades_ausentes_no_sql?: string[];
  sql_tabelas_ausentes_no_der?: string[];
  sql_correspondencia_der_pct?: number;
  bd_config_host_detectado?: string;
  bd_host_localhost_valido_em_nuvem?: boolean;
  bd_diagnostico_deploy_online?: string;
  inviabiliza_finalizacao_persistencia: boolean;
  diagnostico_persistencia_2_3_2_4: string;
  analise_qualitativa_gemini?: Record<string, string>;
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
  banca_realizada?: boolean;
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
  status_liberacao_manual?: ResultadoFinalTipo | null;
  revisao_pos_banca?: RevisaoPosBanca;
  adiamento_data_futura?: AdiamentoDataFutura | null;
  historico_pendencias?: RegistroHistoricoPendencia[];

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
  p3_total?: number;
  nota_final_grupo: number;
  parecer_tecnico: string;
  concluido?: boolean;
  status_liberacao_manual?: ResultadoFinalTipo | null;
  atualizado_em: string;
}

export type StatusSessaoBanca = 'aguardando_inicio' | 'em_andamento' | 'concluida';

export interface SessaoBancaAoVivo {
  grupo_id: string;
  turma: string;
  projeto: string;
  status: StatusSessaoBanca;
  titular_uid: string;
  titular_nome: string;
  titular_email?: string;
  iniciado_em: string | null;
  encerrado_em: string | null;
  duracao_segundos: number;
  duracao_formatada: string;
  avaliadores_presentes: string[];
  avaliacoes_concluidas: string[];
  contingencia_um_avaliador?: boolean;
  justificativa_contingencia?: string;
  media_final_consolidada?: number;
  status_liberacao_final?: ResultadoFinalTipo;
  banca_consolidada?: BancaConsolidada;
  possui_pendencias?: boolean;
  pendencias_descricao?: string;
  pendencias_cumpridas?: boolean;
  pendencias_cumpridas_em?: string | null;
  pendencias_atualizado_por?: string;
  revisao_pos_banca?: RevisaoPosBanca;
  adiamento_data_futura?: AdiamentoDataFutura | null;
  historico_pendencias?: RegistroHistoricoPendencia[];
  atualizado_em: string;
}

export interface RascunhoAvaliacaoFirestore {
  grupo_id: string;
  professor_uid: string;
  professor_email?: string;
  rubricas: RubricaItemAvaliacao[];
  integrantes_notas: NotaIndividualIntegrante[];
  parecer_tecnico: string;
  status_liberacao_manual?: ResultadoFinalTipo | null;
  auditado_em_base?: string | null;
  salvo_em: string;
}

export type DraftAvaliacaoLocal = RascunhoAvaliacaoFirestore;

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
  status_liberacao_manual?: ResultadoFinalTipo | null;
}

export interface ArquivoEntregaSalvo {
  nome: string;
  tamanho_bytes: number;
  modificado_em: string;
  tipo_detectado: string;
  extensao: string;
}

export interface ListaArquivosEntregaResponse {
  grupo_id: string;
  pasta_nome: string;
  pasta_caminho: string;
  entregue_na_pasta: boolean;
  banca_realizada: boolean;
  total_arquivos: number;
  tamanho_total_bytes: number;
  arquivos: ArquivoEntregaSalvo[];
}

export type StatusRevisaoPosBanca =
  | 'sem_revisao'
  | 'aguardando_validacao'
  | 'aceito'
  | 'ajustes_pendentes';

export interface RevisaoPosBanca {
  status: StatusRevisaoPosBanca;
  arquivos_qtd: number;
  arquivos_nomes: string[];
  aceito: boolean;
  observacao_professor: string;
  avaliado_por: string;
  avaliado_em: string | null;
  status_trabalho_aplicado?: ResultadoFinalTipo | null;
  atualizado_em: string | null;
}

export interface ListaArquivosRevisadosResponse {
  grupo_id: string;
  pasta_grupo_nome: string;
  pasta_revisados_caminho: string;
  total_arquivos: number;
  tamanho_total_bytes: number;
  arquivos: ArquivoEntregaSalvo[];
  revisao_pos_banca: RevisaoPosBanca;
}

export interface AdiamentoDataFutura {
  ativo: boolean;
  motivo: string;
  nova_data_prevista: string;
  marcado_por: string;
  marcado_em: string | null;
  desmarcado_por: string;
  desmarcado_em: string | null;
  atualizado_em: string | null;
}

export interface RegistroHistoricoPendencia {
  id: string;
  data_hora: string;
  autor: string;
  origem: 'banca' | 'revisados' | 'adiamento';
  mensagem: string;
  status_aplicado?: ResultadoFinalTipo | null;
  pendencias_cumpridas: boolean;
}

export interface NoArvoreArquivo {
  nome: string;
  caminho_relativo: string;
  tipo: 'pasta' | 'arquivo';
  tamanho_bytes: number;
  modificado_em: string;
  extensao: string;
  tipo_detectado?: string;
  protegido: boolean;
  filhos: NoArvoreArquivo[];
}

export interface ArvoreArquivosResponse {
  raiz_nome: string;
  total_pastas: number;
  total_arquivos: number;
  tamanho_total_bytes: number;
  filhos: NoArvoreArquivo[];
}

export interface EntradaZipItem {
  caminho: string;
  tamanho_bytes: number;
  extensao: string;
  visualizavel: boolean;
}

export interface PreviewArquivoResponse {
  nome: string;
  caminho_relativo: string;
  extensao: string;
  tamanho_bytes: number;
  modificado_em: string;
  tipo_detectado: string;
  protegido: boolean;
  modo: 'texto' | 'pdf' | 'imagem' | 'documento_extraido' | 'zip' | 'binario';
  subtipo?: string;
  linguagem: string;
  truncado: boolean;
  conteudo_texto: string | null;
  url_raw: string;
  url_download: string;
  entradas_zip: EntradaZipItem[];
  total_entradas_zip: number;
  entrada_zip_atual?: string | null;
}




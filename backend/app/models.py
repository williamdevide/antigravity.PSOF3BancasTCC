"""
Modelos Pydantic do Agente Avaliador de Bancas TCC (PSOF3 — SENAI Ourinhos).
"""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


NivelMSEP = Literal["Pendente", "Insuficiente", "Pleno", "Avançado"]
ResultadoFinalTipo = Literal["Aprovado", "Nota Retida (Pendências)", "Nova Chance (Data Futura)"]


class ConfigEnvModel(BaseModel):
    escola: str = "794 - ESCOLA SENAI OURINHOS"
    disciplina: str = "Projetos de Software III (PSOF3)"
    avaliador_padrao: str = "Prof. William Devidé Komel"
    pasta_tcc: str = "./tcc"
    pasta_destino: str = "./downloads_relatorios"
    github_token_configurado: bool = False
    github_token_preview: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    firebase_project_id: str = ""
    firebase_api_key: str = ""
    firebase_auth_domain: str = ""
    firebase_storage_bucket: str = ""
    firebase_sincronizacao_ativa: bool = True
    auditar_online_github_deploy: bool = True


class RubricaItemAvaliacao(BaseModel):
    codigo: str
    pilar: int
    titulo: str
    peso_max: float
    nivel: NivelMSEP = "Pleno"
    nota: float = 0.0
    nota_sugerida_ia: float = 0.0
    nivel_sugerido_ia: NivelMSEP = "Pleno"
    justificativa_ia: str = ""
    evidencias: list[str] = Field(default_factory=list)
    editado_manualmente: bool = False


class NotaIndividualIntegrante(BaseModel):
    nome: str
    nome_completo_planilha: str = ""
    matricula: str = ""
    github_autor: str = ""
    commits_qtd: int = 0
    relatorios_entregues: int = 8
    total_relatorios: int = 10
    aulas_participadas: int = 14
    total_aulas_turma: int = 16
    nota_3_1_arguicao: float = 0.0  # Max 6.0 (inicia vazio/Pendente = 0.0)
    nivel_3_1: NivelMSEP = "Pendente"
    nota_3_1_sugerida: float = 0.0
    nivel_3_1_sugerido: NivelMSEP = "Pendente"
    nota_4_1_sprints: float = 6.4   # Max 8.0 (extraído do PDF de entregas)
    nota_4_1_sugerida: float = 6.4
    nivel_4_1: NivelMSEP = "Pleno"
    nivel_4_1_sugerido: NivelMSEP = "Pleno"
    nota_4_2_participacao: float = 6.1  # Max 7.0 (extraído do PDF de participação)
    nota_4_2_sugerida: float = 6.1
    nivel_4_2: NivelMSEP = "Pleno"
    nivel_4_2_sugerido: NivelMSEP = "Pleno"
    p1_nota: float = 0.0  # Max 30.0
    p2_nota: float = 0.0  # Max 40.0
    p3_nota: float = 0.0  # Max 15.0 (3.1 individual + 3.2 grupo + 3.3 slides)
    p4_nota: float = 0.0  # Max 15.0 (4.1 + 4.2 individual)
    nota_final: float = 0.0  # Max 100.0
    possui_item_insuficiente: bool = False
    itens_insuficientes: list[str] = Field(default_factory=list)
    resultado: ResultadoFinalTipo = "Aprovado"
    observacoes_individuais: str = ""


class PerguntaArguicao(BaseModel):
    integrante_sugerido: str
    categoria: str  # "Arquitetura & Cloud", "Persistência & Banco de Dados", "Segurança & Autenticação", "Frontend & Estado"
    arquivo_referencia: str
    trecho_codigo: str = ""
    pergunta: str
    resposta_esperada: str


class BlocoParecerTecnico(BaseModel):
    categoria: str
    titulo: str
    status: Literal["conforme", "alerta", "critico"] = "conforme"
    resumo: str = ""
    itens: list[str] = Field(default_factory=list)


class SecaoAbntEvidencia(BaseModel):
    secao: str
    presente: bool
    titulo_encontrado: str = ""
    evidencia: str = ""
    origem: Literal["heading", "sumario", "conteudo", "ia", "ausente"] = "ausente"


class ItemChecklistAbnt(BaseModel):
    regra: str
    conforme: bool
    valor_detectado: str
    esperado: str
    gravidade: Literal["conforme", "recomendacao", "critico"] = "conforme"


class AuditoriaTabelaBanco(BaseModel):
    tabela: str
    presente_no_sql: bool = True
    registros_no_sql: int = 0
    presente_no_banco_online: bool = False
    status_banco_online: str = "Não verificado"
    codigo_faz_gravacao: bool = False
    codigo_faz_consumo_leitura: bool = False
    codigo_faz_insert: bool = False
    codigo_faz_update: bool = False
    codigo_faz_select: bool = False
    codigo_faz_delete: bool = False
    colunas_qtd: int = 0
    possui_pk: bool = False
    possui_fk: bool = False
    presente_no_der: bool = False
    evidencia_codigo: str = ""
    conforme_ciclo_completo: bool = False


class AuditoriaArquivoItem(BaseModel):
    tipo: str  # "TCC_PDF", "TCC_DOCX", "SISTEMA_ZIP", "BD_SQL", "SLIDES_PDF", "SLIDES_PPTX", "LINKS_TXT"
    obrigatorio: bool = True
    encontrado: bool = False
    nome_arquivo: str = ""
    tamanho_bytes: int = 0
    padrao_esperado: str = ""
    nomenclatura_conforme: bool = False
    possui_apenas_aviso_leve: bool = False
    alertas_nomenclatura: list[str] = Field(default_factory=list)


class ItemPersistenciaForaBD(BaseModel):
    chave: str
    origem: Literal["localStorage", "sessionStorage", "json_local"] = "localStorage"
    arquivo: str = ""
    classificacao: Literal["cache_espelho_bd", "exclusivo_fora_bd", "json_local_servidor"] = "exclusivo_fora_bd"
    tabela_relacionada: str = ""
    motivo: str = ""


class AuditoriaTecnicaDetalhada(BaseModel):
    # Monografia (DOCX/PDF)
    monografia_paginas_estimadas: int = 0
    monografia_palavras: int = 0
    monografia_caracteres: int = 0
    secoes_abnt_detectadas: dict[str, bool] = Field(default_factory=dict)
    secoes_abnt_presentes: list[str] = Field(default_factory=list)
    secoes_abnt_faltantes: list[str] = Field(default_factory=list)
    secoes_abnt_evidencias: list[SecaoAbntEvidencia] = Field(default_factory=list)
    pendencias_formatacao_abnt: list[str] = Field(default_factory=list)
    detalhes_formatacao_abnt: dict[str, str] = Field(default_factory=dict)
    checklist_abnt: list[ItemChecklistAbnt] = Field(default_factory=list)
    abnt_score_pct: float = 0.0
    docx_somente_imagens: bool = False
    fonte_texto_monografia: str = ""
    rfs_detectados_qtd: int = 0
    rnfs_detectados_qtd: int = 0
    possui_mer_der: bool = False
    possui_dicionario_dados: bool = False
    possui_link_figma: bool = False
    links_figma_encontrados: list[str] = Field(default_factory=list)
    possui_plano_negocios: bool = False
    possui_casos_teste: bool = False
    possui_backlog_cronograma: bool = False
    resumo_monografia: str = ""

    # Banco de Dados (.sql)
    sql_arquivo: str = ""
    sql_linhas: int = 0
    sql_tabelas: list[str] = Field(default_factory=list)
    sql_tabelas_qtd: int = 0
    sql_inserts_por_tabela: dict[str, int] = Field(default_factory=dict)
    sql_total_registros_inseridos: int = 0
    sql_atende_min_20_por_tabela: bool = False
    sql_tabelas_abaixo_20: list[str] = Field(default_factory=list)
    sql_possui_pk: bool = False
    sql_possui_fk: bool = False
    sql_possui_indices: bool = False
    sql_possui_rls: bool = False
    sql_possui_triggers_functions: bool = False
    sql_diagnostico: str = ""

    # Código-Fonte (.zip) + Análise Profunda Frontend/Backend
    zip_arquivo: str = ""
    zip_total_arquivos: int = 0
    zip_extensoes: dict[str, int] = Field(default_factory=dict)
    zip_stack_detectada: list[str] = Field(default_factory=list)
    zip_possui_readme: bool = False
    zip_readme_tamanho: int = 0
    zip_possui_package_json: bool = False
    zip_dependencias: list[str] = Field(default_factory=list)
    zip_arquivos_backend: list[str] = Field(default_factory=list)
    zip_arquivos_frontend: list[str] = Field(default_factory=list)
    zip_arquivos_teste: list[str] = Field(default_factory=list)
    zip_alertas_seguranca: list[str] = Field(default_factory=list)
    backend_rotas_detectadas: list[str] = Field(default_factory=list)
    backend_possui_auth: bool = False
    backend_possui_validacao: bool = False
    backend_possui_tratamento_erro: bool = False
    backend_crud_resumo: dict[str, int] = Field(default_factory=dict)
    frontend_paginas_detectadas: list[str] = Field(default_factory=list)
    frontend_possui_responsividade: bool = False
    frontend_possui_chamadas_api: bool = False
    sistema_aderencia_proposto_resumo: str = ""
    sistema_aderencia_proposto_pct: float = 0.0

    # Apresentação (Slides .pptx / .pdf)
    slides_arquivo: str = ""
    slides_qtd: int = 0
    slides_etapas_roteiro: dict[str, bool] = Field(default_factory=dict)
    slides_etapas_faltantes: list[str] = Field(default_factory=list)
    slides_titulos: list[str] = Field(default_factory=list)
    slides_palavras_total: int = 0
    slides_media_palavras_por_slide: float = 0.0
    slides_imagens_qtd: int = 0
    slides_com_excesso_texto: list[str] = Field(default_factory=list)
    slides_objetividade_nivel: str = ""
    slides_qualidade_resumo: str = ""
    slides_fonte_texto: str = ""

    # Links Online (GitHub & Deploy)
    github_url: str = ""
    github_online_ok: bool = False
    github_status_http: int = 0
    github_commits_total: int = 0
    github_commits_por_autor: dict[str, int] = Field(default_factory=dict)
    github_ultimo_commit_data: str = ""
    github_readme_online: bool = False
    github_linguagens: list[str] = Field(default_factory=list)
    github_diagnostico: str = ""
    github_branch_padrao: str = ""
    github_ultimo_commit_sha: str = ""
    github_ultimo_commit_msg: str = ""
    github_total_arquivos_arvore: int = 0
    github_sistema_funcional: bool = False
    github_estrutura_diagnostico: str = ""
    github_rate_limited: bool = False

    deploy_url: str = ""
    deploy_online_ok: bool = False
    deploy_status_http: int = 0
    deploy_tempo_ms: int = 0
    deploy_titulo_pagina: str = ""
    deploy_diagnostico: str = ""
    deploy_versao_compativel_github: Literal[
        "sincronizado", "possivelmente_desatualizado", "divergente", "nao_verificavel"
    ] = "nao_verificavel"
    deploy_versao_diagnostico: str = ""
    deploy_protegido_antibot_host: bool = False
    deploy_erros_runtime_detectados: list[str] = Field(default_factory=list)

    # Persistência em Banco Nuvem vs LocalStorage/SessionStorage, DER & Deploy BD (Itens 2.3 e 2.4)
    hospedado_vm_oracle: bool = False
    banco_online_ativo_e_apontado: bool = False
    deploy_provedor: str = ""
    deploy_rodando_inteiramente_nuvem: bool = False
    banco_provedor_nuvem: str = ""
    banco_url_detectada: str = ""
    banco_exclusivo_nuvem: bool = False
    usa_localstorage_indevido: bool = False
    arquivos_localstorage_detectados: list[str] = Field(default_factory=list)
    chaves_localstorage_negocio: list[str] = Field(default_factory=list)
    chaves_localstorage_cache_bd: list[str] = Field(default_factory=list)
    chaves_localstorage_permitidas_ui: list[str] = Field(default_factory=list)
    usa_arquivos_json_locais_no_servidor: bool = False
    arquivos_json_locais_detectados: list[str] = Field(default_factory=list)
    itens_persistencia_fora_bd: list[ItemPersistenciaForaBD] = Field(default_factory=list)
    tabelas_auditoria_online: list[AuditoriaTabelaBanco] = Field(default_factory=list)
    tabelas_sql_presentes_online_qtd: int = 0
    tabelas_sql_gravadas_pelo_codigo_qtd: int = 0
    tabelas_sql_consumidas_pelo_codigo_qtd: int = 0
    tabelas_ciclo_completo_qtd: int = 0
    entidades_tema_sem_tabela_banco: list[str] = Field(default_factory=list)
    der_entidades_documentadas: list[str] = Field(default_factory=list)
    der_tabelas_correspondentes: list[str] = Field(default_factory=list)
    der_entidades_ausentes_no_sql: list[str] = Field(default_factory=list)
    sql_tabelas_ausentes_no_der: list[str] = Field(default_factory=list)
    sql_correspondencia_der_pct: float = 0.0
    bd_config_host_detectado: str = ""
    bd_host_localhost_valido_em_nuvem: bool = False
    bd_diagnostico_deploy_online: str = ""
    inviabiliza_finalizacao_persistencia: bool = False
    diagnostico_persistencia_2_3_2_4: str = ""

    # Enriquecimento qualitativo opcional (Camada 2 Gemini)
    analise_qualitativa_gemini: dict[str, str] = Field(default_factory=dict)


class RevisaoPosBancaModel(BaseModel):
    status: Literal["sem_revisao", "aguardando_validacao", "aceito", "ajustes_pendentes"] = "sem_revisao"
    arquivos_qtd: int = 0
    arquivos_nomes: list[str] = Field(default_factory=list)
    aceito: bool = False
    observacao_professor: str = ""
    avaliado_por: str = ""
    avaliado_em: str | None = None
    status_trabalho_aplicado: ResultadoFinalTipo | None = None
    atualizado_em: str | None = None


class RegistroHistoricoPendenciaModel(BaseModel):
    id: str
    data_hora: str
    autor: str = "Docente"
    origem: Literal["banca", "revisados"] = "banca"
    mensagem: str
    status_aplicado: ResultadoFinalTipo | None = None
    pendencias_cumpridas: bool = False


class AvaliacaoGrupoModel(BaseModel):
    id: str  # Ex: "I2DEV-B_Grupo08"
    ordem_apresentacao: int = 1
    turma: str
    dia_semana: str
    sala: str = "Metrologia"
    data_banca: str
    data_banca_iso: str = ""
    horario: str
    grupo: str
    grupo_num: int
    projeto: str
    tema: str
    integrantes: list[str]
    entregue_na_pasta: bool = False
    nome_pasta_entregue: str = ""
    caminho_pasta: str = ""
    status_avaliacao: Literal["pendente_entrega", "entregue_nao_auditado", "auditado_ia", "avaliado_banca", "concluida"] = "pendente_entrega"
    banca_realizada: bool = False
    auditado_em: str | None = None
    atualizado_em: str | None = None
    avaliador: str = "Prof. William Devidé Komel"
    sincronizado_firebase: bool = False
    firebase_sync_em: str | None = None

    arquivos_entregues: list[AuditoriaArquivoItem] = Field(default_factory=list)
    conformidade_nomenclatura_pct: float = 0.0
    auditoria_tecnica: AuditoriaTecnicaDetalhada = Field(default_factory=AuditoriaTecnicaDetalhada)
    rubricas: list[RubricaItemAvaliacao] = Field(default_factory=list)
    integrantes_notas: list[NotaIndividualIntegrante] = Field(default_factory=list)
    perguntas_arguicao: list[PerguntaArguicao] = Field(default_factory=list)

    p1_total: float = 0.0  # Max 30.0
    p2_total: float = 0.0  # Max 40.0
    p3_grupo_base: float = 0.0  # 3.2 + 3.3 (Max 9.0)
    media_nota_final_grupo: float = 0.0  # Max 100.0

    possui_item_insuficiente_grupo: bool = False
    itens_insuficientes_grupo: list[str] = Field(default_factory=list)
    status_liberacao_nota: str = "Aguardando Entrega"
    status_liberacao_manual: str | None = None

    revisao_pos_banca: RevisaoPosBancaModel = Field(default_factory=RevisaoPosBancaModel)
    historico_pendencias: list[RegistroHistoricoPendenciaModel] = Field(default_factory=list)

    parecer_tecnico: str = ""
    parecer_estruturado: list[BlocoParecerTecnico] = Field(default_factory=list)
    pontos_fortes: list[str] = Field(default_factory=list)
    pontos_atencao: list[str] = Field(default_factory=list)
    usou_llm_gemini: bool = False


class AgentSummaryModel(BaseModel):
    id: str
    nome: str
    descricao: str
    categoria: str
    sistema_alvo: str
    icone: str
    ativo: bool
    estado: Literal["idle", "running", "success", "error"]
    tarefa_atual: str | None = None
    progresso_atual: int = 0
    progresso_total: int = 0
    ultima_execucao_em: str | None = None
    grupos_entregues_qtd: int = 0
    grupos_auditados_qtd: int = 0
    total_bancas_cronograma: int = 25
    firebase_ativo: bool = True


class AgentStatusResponse(BaseModel):
    estado: Literal["idle", "running", "success", "error"]
    tarefa_atual: str | None = None
    progresso_atual: int = 0
    progresso_total: int = 0
    progresso_etapa: str | None = None
    logs: list[str] = Field(default_factory=list)
    ultimo_arquivo: str | None = None
    erro: str | None = None


class ExecucaoHistorico(BaseModel):
    id: str
    iniciado_em: str
    finalizado_em: str | None = None
    status: Literal["running", "success", "error"]
    escopo: str
    grupos_processados: int = 0
    arquivo_gerado: str | None = None
    mensagem: str = ""


class SalvarAvaliacaoRequest(BaseModel):
    avaliador: str | None = None
    rubricas: list[RubricaItemAvaliacao]
    integrantes_notas: list[NotaIndividualIntegrante]
    parecer_tecnico: str
    pontos_fortes: list[str] | None = None
    pontos_atencao: list[str] | None = None
    status_liberacao_manual: str | None = None
    sincronizar_firebase: bool = True


class ExecutarAuditoriaRequest(BaseModel):
    grupo_ids: list[str] | None = None  # None = audita todos os grupos entregues
    turma: str | None = None
    forcar_reauditoria: bool = True
    sincronizar_firebase: bool = True


class AvaliarRevisaoPosBancaRequest(BaseModel):
    aceito: bool
    observacao_professor: str = ""
    avaliador: str = "Prof. Titular"
    novo_status_liberacao: ResultadoFinalTipo | None = None
    pendencias_cumpridas: bool | None = None


class SalvarPendenciasGrupoRequest(BaseModel):
    mensagem: str = ""
    origem: Literal["banca", "revisados"] = "banca"
    autor: str = "Docente"
    possui_pendencias: bool = True
    pendencias_cumpridas: bool = False
    novo_status_liberacao: ResultadoFinalTipo | None = None


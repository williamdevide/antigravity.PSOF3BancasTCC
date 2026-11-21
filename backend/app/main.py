"""
API Principal FastAPI — Central de Agentes Inteligentes SENAI Ourinhos
Agente Avaliador de Bancas TCC (PSOF3 — Rubricas MSEP).
"""
from __future__ import annotations

from datetime import datetime
import mimetypes
import os
from pathlib import Path
import subprocess
import threading
import uuid
from typing import Any

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config_manager import (
    ler_avaliacoes_salvas,
    ler_env,
    ler_state,
    obter_pasta_frontend_dist,
    obter_raiz_projeto,
    registrar_execucao,
    resolver_pasta_destino,
    resolver_pasta_tcc,
    salvar_avaliacoes_salvas,
    salvar_env,
)
from .firebase_service import (
    listar_avaliacoes_firestore,
    sincronizar_avaliacao_firestore,
)
from .models import (
    AgentStatusResponse,
    AgentSummaryModel,
    AvaliacaoGrupoModel,
    AvaliarRevisaoPosBancaRequest,
    ConfigEnvModel,
    ExecucaoHistorico,
    ExecutarAuditoriaRequest,
    SalvarAvaliacaoRequest,
)
from .regras_msep import CRONOGRAMA_OFICIAL_BANCAS, RUBRICAS_MSEP_OFICIAIS
from .report_generator import (
    exportar_dossie_analitico_pdf_e_md,
    exportar_ficha_msep_pdf,
    exportar_planilha_consolidada_xlsx,
)
from .tcc_auditor import (
    _pasta_possui_arquivos_reais,
    avaliar_revisao_pos_banca_backend,
    banca_esta_concluida_no_backend,
    classificar_tipo_arquivo_entrega,
    obter_meta_e_ordem_grupo,
    reabrir_banca_para_entregue_backend,
    recalcular_totais_avaliacao,
    resolver_ou_criar_pasta_grupo,
    resolver_ou_criar_pasta_revisados,
    sincronizar_e_obter_todas_bancas,
    sincronizar_revisao_pos_banca_grupo,
    sincronizar_status_entrega_grupo,
)


EXTENSOES_UPLOAD_PERMITIDAS = {
    ".docx",
    ".pdf",
    ".pptx",
    ".sql",
    ".zip",
    ".txt",
    ".md",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB por arquivo


def _sanitizar_nome_arquivo_upload(nome: str, validar_extensao: bool = True) -> str:
    """Valida nome de arquivo contra path traversal e extensões não permitidas."""
    if not nome or "\x00" in nome:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")
    if "/" in nome or "\\" in nome or ".." in nome:
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido.")
    nome_base = Path(nome).name.strip()
    if not nome_base or nome_base in (".", ".."):
        raise HTTPException(status_code=400, detail="Nome de arquivo vazio.")
    if validar_extensao:
        ext = Path(nome_base).suffix.lower()
        if ext not in EXTENSOES_UPLOAD_PERMITIDAS:
            permitidas = ", ".join(sorted(EXTENSOES_UPLOAD_PERMITIDAS))
            raise HTTPException(
                status_code=400,
                detail=f"Extensão '{ext or '(sem extensão)'}' não permitida para '{nome_base}'. Aceitas: {permitidas}",
            )
    return nome_base


def _serializar_arquivos_pasta(pasta: Path | None) -> list[dict[str, Any]]:
    """Lista os arquivos reais da pasta de entrega com tamanho, data e classificação."""
    if not pasta or not pasta.exists():
        return []
    itens: list[dict[str, Any]] = []
    for arq in sorted(pasta.iterdir(), key=lambda p: p.name.lower()):
        if not arq.is_file() or arq.name.startswith(".") or arq.name.lower() == "thumbs.db":
            continue
        st = arq.stat()
        itens.append(
            {
                "nome": arq.name,
                "tamanho_bytes": st.st_size,
                "modificado_em": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
                "tipo_detectado": classificar_tipo_arquivo_entrega(arq.name),
                "extensao": arq.suffix.lower(),
            }
        )
    return itens


async def _gravar_uploads_em_pasta(
    pasta: Path,
    arquivos: list[UploadFile],
) -> tuple[list[str], list[str]]:
    """Grava uploads multipart em chunks validando extensões, path traversal e limite de 200 MB."""
    pasta_res = pasta.resolve()
    enviados: list[str] = []
    substituidos: list[str] = []

    for arq in arquivos:
        nome_limpo = _sanitizar_nome_arquivo_upload(arq.filename or "", validar_extensao=True)
        destino = (pasta_res / nome_limpo).resolve()
        if destino.parent != pasta_res:
            raise HTTPException(status_code=400, detail="Destino de arquivo inválido.")

        ja_existia = destino.exists()
        total_lido = 0
        try:
            with destino.open("wb") as out:
                while True:
                    chunk = await arq.read(1024 * 1024)
                    if not chunk:
                        break
                    total_lido += len(chunk)
                    if total_lido > MAX_UPLOAD_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail=f"Arquivo '{nome_limpo}' excede o limite de 200 MB por arquivo.",
                        )
                    out.write(chunk)
        except HTTPException:
            destino.unlink(missing_ok=True)
            raise
        except Exception as exc:
            destino.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Falha ao salvar '{nome_limpo}': {exc}") from exc
        finally:
            await arq.close()

        enviados.append(nome_limpo)
        if ja_existia:
            substituidos.append(nome_limpo)

    return enviados, substituidos


app = FastAPI(
    title="Central de Agentes SENAI — Avaliador de Bancas TCC (PSOF3)",
    description="API de orquestração, auditoria híbrida e avaliação MSEP das Bancas de TCC do SENAI Ourinhos.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8765",
        "http://127.0.0.1:8765",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EstadoRuntime:
    """Mantém o estado em memória das tarefas em andamento (logs ao vivo e barra de progresso)."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.estado: str = "idle"
        self.tarefa_atual: str | None = None
        self.progresso_atual: int = 0
        self.progresso_total: int = 0
        self.progresso_etapa: str | None = None
        self.logs: list[str] = []
        self.ultimo_arquivo: str | None = None
        self.erro: str | None = None

    def iniciar(self, tarefa: str) -> None:
        with self.lock:
            self.estado = "running"
            self.tarefa_atual = tarefa
            self.progresso_atual = 0
            self.progresso_total = 0
            self.progresso_etapa = "Iniciando auditoria..."
            self.logs = [f"[{datetime.now().strftime('%H:%M:%S')}] 🚀 {tarefa}"]
            self.ultimo_arquivo = None
            self.erro = None

    def atualizar_progresso(self, atual: int, total: int, etapa: str | None = None) -> None:
        with self.lock:
            self.progresso_atual = atual
            self.progresso_total = total
            if etapa is not None:
                self.progresso_etapa = etapa

    def adicionar_log(self, linha: str) -> None:
        with self.lock:
            ts = datetime.now().strftime("%H:%M:%S")
            self.logs.append(f"[{ts}] {linha}")
            if len(self.logs) > 400:
                self.logs = self.logs[-400:]

    def finalizar_sucesso(self, arquivo: str | None = None, msg: str | None = None) -> None:
        with self.lock:
            self.estado = "success"
            if self.progresso_total > 0:
                self.progresso_atual = self.progresso_total
            self.progresso_etapa = msg or "Auditoria concluída com sucesso!"
            if arquivo:
                self.ultimo_arquivo = arquivo
            ts = datetime.now().strftime("%H:%M:%S")
            self.logs.append(f"[{ts}] ✅ {self.progresso_etapa}")

    def finalizar_erro(self, erro: str) -> None:
        with self.lock:
            self.estado = "error"
            self.erro = erro
            ts = datetime.now().strftime("%H:%M:%S")
            self.logs.append(f"[{ts}] ❌ ERRO: {erro}")

    def snapshot(self) -> AgentStatusResponse:
        with self.lock:
            return AgentStatusResponse(
                estado=self.estado,  # type: ignore[arg-type]
                tarefa_atual=self.tarefa_atual,
                progresso_atual=self.progresso_atual,
                progresso_total=self.progresso_total,
                progresso_etapa=self.progresso_etapa,
                logs=list(self.logs),
                ultimo_arquivo=self.ultimo_arquivo,
                erro=self.erro,
            )


runtime = EstadoRuntime()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/agents")
def listar_agentes() -> dict[str, list[AgentSummaryModel]]:
    cfg = ler_env()
    estado = ler_state()
    snap = runtime.snapshot()
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    entregues = sum(1 for b in bancas if b.entregue_na_pasta)
    auditados = sum(1 for b in bancas if b.status_avaliacao in ("auditado_ia", "avaliado_banca"))

    agente_tcc = AgentSummaryModel(
        id="avaliador-bancas-tcc",
        nome="Agente Avaliador de Bancas TCC — PSOF3",
        descricao=(
            "Audita automaticamente as entregas das turmas I2DEV-A e I2DEV-B na subpasta ./tcc "
            "(Monografia ABNT, Script SQL com contagem de registros, Código ZIP, Slides, GitHub API e Deploy Online), "
            "calcula as Rubricas MSEP dos 4 Pilares, gera perguntas de arguição por aluno, sincroniza com Firebase "
            "e exporta a Ficha MSEP Oficial em PDF, Dossiê Analítico e Planilha Consolidada XLSX."
        ),
        categoria="Avaliação Acadêmica & Engenharia de Software",
        sistema_alvo="Curso Técnico em Desenvolvimento de Sistemas • PSOF3 (Rubricas MSEP)",
        icone="graduation-cap",
        ativo=True,
        estado=snap.estado,
        tarefa_atual=snap.tarefa_atual,
        progresso_atual=snap.progresso_atual,
        progresso_total=snap.progresso_total,
        ultima_execucao_em=estado.get("ultima_execucao_em"),
        grupos_entregues_qtd=entregues,
        grupos_auditados_qtd=auditados,
        total_bancas_cronograma=len(CRONOGRAMA_OFICIAL_BANCAS),
        firebase_ativo=cfg.firebase_sincronizacao_ativa,
    )
    return {"agentes": [agente_tcc]}


@app.get("/api/regras")
def obter_regras_oficiais() -> dict[str, Any]:
    """Retorna os metadados dos 4 documentos oficiais da pasta tcc/regras e a matriz MSEP."""
    cfg = ler_env()
    pasta_regras = resolver_pasta_tcc(cfg.pasta_tcc) / "regras"
    documentos: list[dict[str, Any]] = []
    if pasta_regras.exists():
        for arq in sorted(pasta_regras.iterdir()):
            if arq.is_file():
                documentos.append(
                    {
                        "nome": arq.name,
                        "tamanho_bytes": arq.stat().st_size,
                        "caminho": str(arq),
                    }
                )
    return {
        "documentos_regras": documentos,
        "rubricas_msep": RUBRICAS_MSEP_OFICIAIS,
        "cronograma_oficial": CRONOGRAMA_OFICIAL_BANCAS,
    }


@app.get("/api/regras/pdf/{nome_arquivo}")
def abrir_pdf_regra(nome_arquivo: str) -> FileResponse:
    if "/" in nome_arquivo or "\\" in nome_arquivo or ".." in nome_arquivo:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")
    cfg = ler_env()
    caminho = resolver_pasta_tcc(cfg.pasta_tcc) / "regras" / nome_arquivo
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Documento de regra não encontrado.")
    return FileResponse(path=caminho, filename=nome_arquivo, media_type="application/pdf")


@app.get("/api/bancas")
def listar_bancas(turma: str | None = Query(default=None)) -> dict[str, Any]:
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    if turma and turma in ("I2DEV-A", "I2DEV-B"):
        bancas = [b for b in bancas if b.turma == turma]

    entregues = sum(1 for b in bancas if b.entregue_na_pasta)
    auditados = sum(1 for b in bancas if b.status_avaliacao in ("auditado_ia", "avaliado_banca"))
    sincronizados = sum(1 for b in bancas if b.sincronizado_firebase)

    return {
        "total": len(bancas),
        "entregues": entregues,
        "pendentes": len(bancas) - entregues,
        "auditados": auditados,
        "sincronizados_firebase": sincronizados,
        "bancas": [b.model_dump() for b in bancas],
    }


@app.get("/api/bancas/{grupo_id}", response_model=AvaliacaoGrupoModel)
def obter_banca_detalhe(grupo_id: str) -> AvaliacaoGrupoModel:
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    for b in bancas:
        if b.id == grupo_id:
            return b
    raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado no cronograma.")


@app.post("/api/bancas/auditar")
def disparar_auditoria(payload: ExecutarAuditoriaRequest) -> dict[str, str]:
    if runtime.snapshot().estado == "running":
        raise HTTPException(status_code=409, detail="Já existe uma auditoria em andamento.")

    escopo_txt = (
        f"Grupo(s): {', '.join(payload.grupo_ids)}"
        if payload.grupo_ids
        else (f"Turma {payload.turma}" if payload.turma else "Todas as Entregas em ./tcc")
    )
    exec_id = uuid.uuid4().hex[:10]
    iniciado_em = datetime.now().isoformat(timespec="seconds")
    runtime.iniciar(f"Auditoria Técnica de Bancas TCC ({escopo_txt})")

    registrar_execucao(
        ExecucaoHistorico(
            id=exec_id,
            iniciado_em=iniciado_em,
            status="running",
            escopo=escopo_txt,
            grupos_processados=0,
            mensagem="Iniciando varredura de arquivos, SQL, ZIP, GitHub e Deploy...",
        )
    )

    def _worker() -> None:
        try:
            resultados = sincronizar_e_obter_todas_bancas(
                executar_auditoria_nos_entregues=True,
                grupo_ids_alvo=payload.grupo_ids,
                turma_alvo=payload.turma,
                sincronizar_firebase=payload.sincronizar_firebase,
                log_cb=runtime.adicionar_log,
                progress_cb=runtime.atualizar_progresso,
            )
            auditados_qtd = sum(1 for r in resultados if r.entregue_na_pasta)
            # Gerar planilha consolidada automaticamente ao concluir auditoria em lote
            arq_xlsx = exportar_planilha_consolidada_xlsx(resultados, turma_filtro=payload.turma)
            runtime.adicionar_log(f"📊 Planilha Consolidada atualizada: {arq_xlsx.name}")

            registrar_execucao(
                ExecucaoHistorico(
                    id=exec_id,
                    iniciado_em=iniciado_em,
                    finalizado_em=datetime.now().isoformat(timespec="seconds"),
                    status="success",
                    escopo=escopo_txt,
                    grupos_processados=auditados_qtd,
                    arquivo_gerado=arq_xlsx.name,
                    mensagem=f"{auditados_qtd} grupo(s) auditado(s) com sucesso e sincronizado(s).",
                )
            )
            runtime.finalizar_sucesso(
                arquivo=arq_xlsx.name,
                msg=f"Auditoria concluída! {auditados_qtd} grupo(s) analisado(s) e sincronizado(s).",
            )
        except Exception as exc:
            registrar_execucao(
                ExecucaoHistorico(
                    id=exec_id,
                    iniciado_em=iniciado_em,
                    finalizado_em=datetime.now().isoformat(timespec="seconds"),
                    status="error",
                    escopo=escopo_txt,
                    mensagem=str(exc),
                )
            )
            runtime.finalizar_erro(str(exc))

    threading.Thread(target=_worker, daemon=True).start()
    return {"mensagem": "Auditoria iniciada em background.", "execucao_id": exec_id}


@app.put("/api/bancas/{grupo_id}/avaliacao", response_model=AvaliacaoGrupoModel)
def salvar_avaliacao_grupo(grupo_id: str, payload: SalvarAvaliacaoRequest) -> AvaliacaoGrupoModel:
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    alvo: AvaliacaoGrupoModel | None = None
    for b in bancas:
        if b.id == grupo_id:
            alvo = b
            break
    if not alvo:
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")

    if payload.avaliador:
        alvo.avaliador = payload.avaliador
    alvo.rubricas = payload.rubricas
    alvo.integrantes_notas = payload.integrantes_notas
    alvo.parecer_tecnico = payload.parecer_tecnico
    if payload.pontos_fortes is not None:
        alvo.pontos_fortes = payload.pontos_fortes
    if payload.pontos_atencao is not None:
        alvo.pontos_atencao = payload.pontos_atencao

    alvo.status_avaliacao = "avaliado_banca"
    alvo.banca_realizada = True
    alvo.atualizado_em = datetime.now().isoformat(timespec="seconds")
    recalcular_totais_avaliacao(alvo)

    if payload.status_liberacao_manual:
        alvo.status_liberacao_manual = payload.status_liberacao_manual
        alvo.status_liberacao_nota = payload.status_liberacao_manual
        for ind in alvo.integrantes_notas:
            ind.resultado = payload.status_liberacao_manual

    if payload.sincronizar_firebase:
        sincronizar_avaliacao_firestore(alvo)

    salvas = ler_avaliacoes_salvas()
    salvas[grupo_id] = alvo.model_dump()
    salvar_avaliacoes_salvas(salvas)
    return alvo


@app.post("/api/bancas/{grupo_id}/firebase-sync")
def sincronizar_grupo_firebase_endpoint(grupo_id: str) -> dict[str, Any]:
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    for b in bancas:
        if b.id == grupo_id:
            ok, msg = sincronizar_avaliacao_firestore(b)
            if not ok:
                raise HTTPException(status_code=502, detail=msg)
            salvas = ler_avaliacoes_salvas()
            salvas[grupo_id] = b.model_dump()
            salvar_avaliacoes_salvas(salvas)
            return {"ok": True, "mensagem": msg, "firebase_sync_em": b.firebase_sync_em}
    raise HTTPException(status_code=404, detail="Grupo não encontrado.")


@app.get("/api/bancas/{grupo_id}/arquivos")
def listar_arquivos_entrega_grupo(grupo_id: str) -> dict[str, Any]:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    pasta, _, _ = resolver_ou_criar_pasta_grupo(grupo_id, criar_se_ausente=False)
    arquivos = _serializar_arquivos_pasta(pasta)
    return {
        "grupo_id": grupo_id,
        "pasta_nome": pasta.name if pasta else "",
        "pasta_caminho": str(pasta) if pasta else "",
        "entregue_na_pasta": len(arquivos) > 0,
        "banca_realizada": banca_esta_concluida_no_backend(grupo_id),
        "total_arquivos": len(arquivos),
        "tamanho_total_bytes": sum(a["tamanho_bytes"] for a in arquivos),
        "arquivos": arquivos,
    }


@app.post("/api/bancas/{grupo_id}/arquivos")
async def upload_arquivos_entrega_grupo(
    grupo_id: str,
    arquivos: list[UploadFile] = File(...),
) -> dict[str, Any]:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    if banca_esta_concluida_no_backend(grupo_id):
        raise HTTPException(
            status_code=409,
            detail="Banca já concluída. Use 'Reabrir Banca (Voltar para Entregue)' antes de enviar ou excluir arquivos.",
        )
    if not arquivos:
        raise HTTPException(status_code=400, detail="Nenhum arquivo selecionado para envio.")

    pasta, _, _ = resolver_ou_criar_pasta_grupo(grupo_id, criar_se_ausente=True)
    assert pasta is not None
    enviados, substituidos = await _gravar_uploads_em_pasta(pasta, arquivos)

    banca_atualizada = sincronizar_status_entrega_grupo(grupo_id)
    lista_final = _serializar_arquivos_pasta(pasta)
    return {
        "ok": True,
        "mensagem": f"{len(enviados)} arquivo(s) salvo(s) na pasta '{pasta.name}'.",
        "pasta_nome": pasta.name,
        "enviados": enviados,
        "substituidos": substituidos,
        "arquivos": lista_final,
        "banca": banca_atualizada.model_dump(),
    }


@app.get("/api/bancas/{grupo_id}/arquivos/{nome_arquivo}")
def baixar_arquivo_entrega_grupo(grupo_id: str, nome_arquivo: str) -> FileResponse:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    nome_limpo = _sanitizar_nome_arquivo_upload(nome_arquivo, validar_extensao=False)
    pasta, _, _ = resolver_ou_criar_pasta_grupo(grupo_id, criar_se_ausente=False)
    if not pasta or not pasta.exists():
        raise HTTPException(status_code=404, detail="Pasta de entrega do grupo não encontrada.")

    pasta_res = pasta.resolve()
    alvo = (pasta_res / nome_limpo).resolve()
    if alvo.parent != pasta_res or not alvo.is_file():
        raise HTTPException(status_code=404, detail=f"Arquivo '{nome_limpo}' não encontrado.")

    media, _ = mimetypes.guess_type(str(alvo))
    return FileResponse(path=alvo, filename=alvo.name, media_type=media or "application/octet-stream")


@app.delete("/api/bancas/{grupo_id}/arquivos/{nome_arquivo}")
def excluir_arquivo_entrega_grupo(grupo_id: str, nome_arquivo: str) -> dict[str, Any]:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    if banca_esta_concluida_no_backend(grupo_id):
        raise HTTPException(
            status_code=409,
            detail="Banca já concluída. Use 'Reabrir Banca (Voltar para Entregue)' antes de excluir arquivos.",
        )

    nome_limpo = _sanitizar_nome_arquivo_upload(nome_arquivo, validar_extensao=False)
    pasta, _, _ = resolver_ou_criar_pasta_grupo(grupo_id, criar_se_ausente=False)
    if not pasta or not pasta.exists():
        raise HTTPException(status_code=404, detail="Pasta de entrega não encontrada.")

    pasta_res = pasta.resolve()
    alvo = (pasta_res / nome_limpo).resolve()
    if alvo.parent != pasta_res or not alvo.is_file():
        raise HTTPException(status_code=404, detail=f"Arquivo '{nome_limpo}' não encontrado.")

    alvo.unlink()
    banca_atualizada = sincronizar_status_entrega_grupo(grupo_id)
    pasta_vazia = not _pasta_possui_arquivos_reais(pasta) if pasta.exists() else True
    lista_final = _serializar_arquivos_pasta(pasta if pasta.exists() else None)
    return {
        "ok": True,
        "mensagem": f"Arquivo '{nome_limpo}' excluído da entrega.",
        "pasta_vazia": pasta_vazia,
        "arquivos": lista_final,
        "banca": banca_atualizada.model_dump(),
    }


@app.delete("/api/bancas/{grupo_id}/arquivos")
def limpar_arquivos_entrega_grupo(grupo_id: str) -> dict[str, Any]:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    if banca_esta_concluida_no_backend(grupo_id):
        raise HTTPException(
            status_code=409,
            detail="Banca já concluída. Use 'Reabrir Banca (Voltar para Entregue)' antes de excluir os arquivos.",
        )

    pasta, _, _ = resolver_ou_criar_pasta_grupo(grupo_id, criar_se_ausente=False)
    removidos_qtd = 0
    if pasta and pasta.exists():
        for arq in list(pasta.iterdir()):
            if arq.is_file() and not arq.name.startswith(".") and arq.name.lower() != "thumbs.db":
                arq.unlink()
                removidos_qtd += 1

    banca_atualizada = sincronizar_status_entrega_grupo(grupo_id)
    return {
        "ok": True,
        "mensagem": f"{removidos_qtd} arquivo(s) removido(s) da entrega.",
        "removidos_qtd": removidos_qtd,
        "arquivos": [],
        "banca": banca_atualizada.model_dump(),
    }


@app.post("/api/bancas/{grupo_id}/reabrir")
def reabrir_banca_para_entregue_endpoint(grupo_id: str) -> dict[str, Any]:
    try:
        banca_atualizada = reabrir_banca_para_entregue_backend(grupo_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "ok": True,
        "mensagem": f"Banca de {banca_atualizada.projeto} reaberta para o estado 'Entregue'. Agora é possível gerenciar arquivos e reauditar.",
        "banca": banca_atualizada.model_dump(),
    }


@app.get("/api/bancas/{grupo_id}/revisados")
def listar_arquivos_revisados_grupo(grupo_id: str) -> dict[str, Any]:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    pasta_rev, pasta_grupo, _, _ = resolver_ou_criar_pasta_revisados(grupo_id, criar_se_ausente=False)
    arquivos = _serializar_arquivos_pasta(pasta_rev)
    banca = sincronizar_revisao_pos_banca_grupo(grupo_id, redefinir_para_aguardando=False)
    return {
        "grupo_id": grupo_id,
        "pasta_grupo_nome": pasta_grupo.name if pasta_grupo else "",
        "pasta_revisados_caminho": str(pasta_rev) if pasta_rev else "",
        "total_arquivos": len(arquivos),
        "tamanho_total_bytes": sum(a["tamanho_bytes"] for a in arquivos),
        "arquivos": arquivos,
        "revisao_pos_banca": banca.revisao_pos_banca.model_dump(),
    }


@app.post("/api/bancas/{grupo_id}/revisados")
async def upload_arquivos_revisados_grupo(
    grupo_id: str,
    arquivos: list[UploadFile] = File(...),
) -> dict[str, Any]:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    if not arquivos:
        raise HTTPException(status_code=400, detail="Nenhum arquivo corrigido selecionado para envio.")

    pasta_rev, pasta_grupo, _, _ = resolver_ou_criar_pasta_revisados(grupo_id, criar_se_ausente=True)
    assert pasta_rev is not None
    enviados, substituidos = await _gravar_uploads_em_pasta(pasta_rev, arquivos)

    banca_atualizada = sincronizar_revisao_pos_banca_grupo(grupo_id, redefinir_para_aguardando=True)
    lista_final = _serializar_arquivos_pasta(pasta_rev)
    nome_pasta = pasta_grupo.name if pasta_grupo else grupo_id
    return {
        "ok": True,
        "mensagem": f"{len(enviados)} arquivo(s) corrigido(s) salvo(s) em '{nome_pasta}/revisados/'. Os originais foram preservados.",
        "enviados": enviados,
        "substituidos": substituidos,
        "arquivos": lista_final,
        "revisao_pos_banca": banca_atualizada.revisao_pos_banca.model_dump(),
        "banca": banca_atualizada.model_dump(),
    }


@app.post("/api/bancas/{grupo_id}/revisados/avaliar")
def avaliar_revisao_pos_banca_endpoint(
    grupo_id: str,
    payload: AvaliarRevisaoPosBancaRequest,
) -> dict[str, Any]:
    try:
        banca_atualizada = avaliar_revisao_pos_banca_backend(
            grupo_id=grupo_id,
            aceito=payload.aceito,
            observacao_professor=payload.observacao_professor,
            avaliador=payload.avaliador,
            novo_status_liberacao=payload.novo_status_liberacao,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "ok": True,
        "mensagem": (
            "Arquivos revisados aceitos e parecer do Professor Titular registrado!"
            if payload.aceito
            else "Parecer registrado: novos ajustes solicitados para os arquivos revisados."
        ),
        "revisao_pos_banca": banca_atualizada.revisao_pos_banca.model_dump(),
        "banca": banca_atualizada.model_dump(),
    }


@app.get("/api/bancas/{grupo_id}/revisados/{nome_arquivo}")
def baixar_arquivo_revisado_grupo(grupo_id: str, nome_arquivo: str) -> FileResponse:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    nome_limpo = _sanitizar_nome_arquivo_upload(nome_arquivo, validar_extensao=False)
    pasta_rev, _, _, _ = resolver_ou_criar_pasta_revisados(grupo_id, criar_se_ausente=False)
    if not pasta_rev or not pasta_rev.exists():
        raise HTTPException(status_code=404, detail="Pasta 'revisados' do grupo não encontrada.")

    pasta_res = pasta_rev.resolve()
    alvo = (pasta_res / nome_limpo).resolve()
    if alvo.parent != pasta_res or not alvo.is_file():
        raise HTTPException(status_code=404, detail=f"Arquivo revisado '{nome_limpo}' não encontrado.")

    media, _ = mimetypes.guess_type(str(alvo))
    return FileResponse(path=alvo, filename=alvo.name, media_type=media or "application/octet-stream")


@app.delete("/api/bancas/{grupo_id}/revisados/{nome_arquivo}")
def excluir_arquivo_revisado_grupo(grupo_id: str, nome_arquivo: str) -> dict[str, Any]:
    if not obter_meta_e_ordem_grupo(grupo_id):
        raise HTTPException(status_code=404, detail=f"Grupo '{grupo_id}' não encontrado.")
    nome_limpo = _sanitizar_nome_arquivo_upload(nome_arquivo, validar_extensao=False)
    pasta_rev, _, _, _ = resolver_ou_criar_pasta_revisados(grupo_id, criar_se_ausente=False)
    if not pasta_rev or not pasta_rev.exists():
        raise HTTPException(status_code=404, detail="Pasta 'revisados' do grupo não encontrada.")

    pasta_res = pasta_rev.resolve()
    alvo = (pasta_res / nome_limpo).resolve()
    if alvo.parent != pasta_res or not alvo.is_file():
        raise HTTPException(status_code=404, detail=f"Arquivo revisado '{nome_limpo}' não encontrado.")

    alvo.unlink()
    banca_atualizada = sincronizar_revisao_pos_banca_grupo(grupo_id, redefinir_para_aguardando=False)
    lista_final = _serializar_arquivos_pasta(pasta_rev if pasta_rev.exists() else None)
    return {
        "ok": True,
        "mensagem": f"Arquivo revisado '{nome_limpo}' excluído com sucesso.",
        "arquivos": lista_final,
        "revisao_pos_banca": banca_atualizada.revisao_pos_banca.model_dump(),
        "banca": banca_atualizada.model_dump(),
    }


@app.post("/api/firebase/sync-all")
def sincronizar_todos_firebase_endpoint() -> dict[str, Any]:
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    salvas = ler_avaliacoes_salvas()
    sucesso = 0
    erros: list[str] = []
    for b in bancas:
        if b.entregue_na_pasta:
            ok, msg = sincronizar_avaliacao_firestore(b)
            if ok:
                sucesso += 1
                salvas[b.id] = b.model_dump()
            else:
                erros.append(f"{b.id}: {msg}")
    salvar_avaliacoes_salvas(salvas)
    return {
        "ok": len(erros) == 0,
        "sincronizados": sucesso,
        "erros": erros,
        "mensagem": f"{sucesso} avaliação(ões) sincronizada(s) com o Firebase Firestore.",
    }


@app.get("/api/firebase/pull")
def carregar_do_firebase_endpoint() -> dict[str, Any]:
    ok, remoto, msg = listar_avaliacoes_firestore()
    if not ok:
        raise HTTPException(status_code=502, detail=msg)
    if remoto:
        salvas = ler_avaliacoes_salvas()
        salvas.update(remoto)
        salvar_avaliacoes_salvas(salvas)
    return {"ok": True, "quantidade": len(remoto), "mensagem": msg}


@app.post("/api/bancas/{grupo_id}/exportar/ficha-pdf")
def gerar_ficha_pdf_endpoint(grupo_id: str) -> dict[str, str]:
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    for b in bancas:
        if b.id == grupo_id:
            caminho = exportar_ficha_msep_pdf(b)
            return {
                "arquivo": caminho.name,
                "caminho": str(caminho),
                "url_download": f"/api/reports/download/{caminho.name}",
                "mensagem": f"Ficha MSEP Oficial gerada com sucesso: {caminho.name}",
            }
    raise HTTPException(status_code=404, detail="Grupo não encontrado.")


@app.post("/api/bancas/{grupo_id}/exportar/dossie")
def gerar_dossie_endpoint(grupo_id: str) -> dict[str, str]:
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    for b in bancas:
        if b.id == grupo_id:
            caminho_pdf, caminho_md = exportar_dossie_analitico_pdf_e_md(b)
            return {
                "arquivo_pdf": caminho_pdf.name,
                "arquivo_md": caminho_md.name,
                "url_pdf": f"/api/reports/download/{caminho_pdf.name}",
                "url_md": f"/api/reports/download/{caminho_md.name}",
                "mensagem": f"Dossiê Analítico gerado em PDF ({caminho_pdf.name}) e Markdown ({caminho_md.name}).",
            }
    raise HTTPException(status_code=404, detail="Grupo não encontrado.")


@app.post("/api/exportar/consolidado-xlsx")
def gerar_consolidado_xlsx_endpoint(turma: str | None = Query(default=None)) -> dict[str, str]:
    bancas = sincronizar_e_obter_todas_bancas(executar_auditoria_nos_entregues=False)
    caminho = exportar_planilha_consolidada_xlsx(bancas, turma_filtro=turma)
    return {
        "arquivo": caminho.name,
        "caminho": str(caminho),
        "url_download": f"/api/reports/download/{caminho.name}",
        "mensagem": f"Planilha Consolidada XLSX gerada com sucesso: {caminho.name}",
    }


@app.get("/api/agent/status", response_model=AgentStatusResponse)
def status_agente() -> AgentStatusResponse:
    return runtime.snapshot()


@app.get("/api/config", response_model=ConfigEnvModel)
def obter_config() -> ConfigEnvModel:
    return ler_env()


@app.put("/api/config", response_model=ConfigEnvModel)
def atualizar_config(payload: ConfigEnvModel) -> ConfigEnvModel:
    salvar_env(payload)
    return ler_env()


@app.get("/api/history")
def listar_historico() -> dict[str, list]:
    estado = ler_state()
    return {"historico": estado.get("historico_execucoes", [])}


@app.post("/api/reports/open-folder")
def abrir_pasta_relatorios(qual: str = Query(default="relatorios")) -> dict[str, str]:
    cfg = ler_env()
    pasta = (
        resolver_pasta_tcc(cfg.pasta_tcc)
        if qual == "tcc"
        else resolver_pasta_destino(cfg.pasta_destino)
    )
    try:
        if hasattr(os, "startfile"):
            os.startfile(str(pasta))  # type: ignore[attr-defined]
        else:
            subprocess.Popen(["explorer", str(pasta)])
        return {"pasta": str(pasta), "mensagem": f"Pasta aberta no Windows Explorer: {pasta}"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao abrir pasta: {exc}") from exc


@app.get("/api/reports/download/{filename}")
def baixar_relatorio(filename: str) -> FileResponse:
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")
    cfg = ler_env()
    pasta = resolver_pasta_destino(cfg.pasta_destino)
    arquivo: Path = pasta / filename
    if not arquivo.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado na pasta de relatórios.")

    suf = arquivo.suffix.lower()
    if suf == ".pdf":
        media = "application/pdf"
    elif suf == ".md":
        media = "text/markdown; charset=utf-8"
    else:
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return FileResponse(path=arquivo, filename=filename, media_type=media)


# Servir interface estática compilada (React/Vite) quando disponível
_PASTA_DIST = obter_pasta_frontend_dist()
if (_PASTA_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(_PASTA_DIST / "assets")), name="frontend_assets")


@app.get("/{caminho_spa:path}", include_in_schema=False)
def servir_frontend_spa(caminho_spa: str):
    pasta_dist = obter_pasta_frontend_dist()
    index_file = pasta_dist / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Interface compilada não encontrada.")

    if caminho_spa:
        candidato = (pasta_dist / caminho_spa).resolve()
        if str(candidato).startswith(str(pasta_dist.resolve())) and candidato.is_file():
            return FileResponse(path=candidato)

    return FileResponse(path=index_file)

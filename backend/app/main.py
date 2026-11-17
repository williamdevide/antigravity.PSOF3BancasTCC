"""
API Principal FastAPI — Central de Agentes Inteligentes SENAI Ourinhos
Agente Avaliador de Bancas TCC (PSOF3 — Rubricas MSEP).
"""
from __future__ import annotations

from datetime import datetime
import os
from pathlib import Path
import subprocess
import threading
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException, Query
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
    recalcular_totais_avaliacao,
    sincronizar_e_obter_todas_bancas,
)


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

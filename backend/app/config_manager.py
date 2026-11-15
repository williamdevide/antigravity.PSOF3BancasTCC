"""
Gerenciador de configurações (.env), estado de execução (state.json) e avaliações (avaliacoes.json).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import sys
from typing import Any
from dotenv import dotenv_values

from .models import ConfigEnvModel, ExecucaoHistorico


def obter_raiz_projeto() -> Path:
    """Retorna a raiz do projeto em modo dev ou empacotado via PyInstaller."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[2]


def obter_pasta_data() -> Path:
    pasta = obter_raiz_projeto() / "backend" / "data"
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


def obter_pasta_frontend_dist() -> Path:
    raiz = obter_raiz_projeto()
    candidatos = [
        raiz / "frontend" / "dist",
        Path(getattr(sys, "_MEIPASS", str(raiz))) / "frontend" / "dist",
    ]
    for c in candidatos:
        if c.exists():
            return c
    return candidatos[0]


def resolver_pasta_tcc(caminho_cfg: str = "./tcc") -> Path:
    raiz = obter_raiz_projeto()
    p = Path(caminho_cfg)
    if not p.is_absolute():
        p = (raiz / p).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def resolver_pasta_destino(caminho_cfg: str = "./downloads_relatorios") -> Path:
    raiz = obter_raiz_projeto()
    p = Path(caminho_cfg)
    if not p.is_absolute():
        p = (raiz / p).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def ler_env_bruto() -> dict[str, str]:
    """Lê o arquivo .env da raiz preservando todas as chaves (suporta aspas, vírgulas de objetos JS e comentários)."""
    arq_env = obter_raiz_projeto() / ".env"
    valores: dict[str, str] = {}
    if arq_env.exists():
        for ln in arq_env.read_text(encoding="utf-8", errors="replace").splitlines():
            linha = ln.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, valor = linha.split("=", 1)
            chave_limpa = chave.strip()
            val_limpo = valor.strip().rstrip(",").strip()
            if (val_limpo.startswith('"') and val_limpo.endswith('"')) or (
                val_limpo.startswith("'") and val_limpo.endswith("'")
            ):
                val_limpo = val_limpo[1:-1].strip()
            valores[chave_limpa] = val_limpo
    return valores


def ler_env() -> ConfigEnvModel:
    valores = ler_env_bruto()
    gh_token = valores.get("GITHUB_TOKEN", "")
    gh_preview = f"{gh_token[:7]}...{gh_token[-4:]}" if len(gh_token) > 12 else ("Configurado" if gh_token else "")

    return ConfigEnvModel(
        escola=valores.get("ESCOLA", "794 - ESCOLA SENAI OURINHOS"),
        disciplina=valores.get("DISCIPLINA", "Projetos de Software III (PSOF3)"),
        avaliador_padrao=valores.get("AVALIADOR_PADRAO", "Prof. William Devidé Komel"),
        pasta_tcc=valores.get("PASTA_TCC", "./tcc"),
        pasta_destino=valores.get("PASTA_DESTINO", "./downloads_relatorios"),
        github_token_configurado=bool(gh_token),
        github_token_preview=gh_preview,
        gemini_api_key=valores.get("GEMINI_API_KEY", ""),
        gemini_model=valores.get("GEMINI_MODEL", "gemini-2.5-flash"),
        firebase_project_id=valores.get("FIREBASE_projectId", valores.get("FIREBASE_PROJECT_ID", "")),
        firebase_api_key=valores.get("FIREBASE_API_KEY", ""),
        firebase_auth_domain=valores.get("FIREBASE_AUTHDOMAIN", ""),
        firebase_storage_bucket=valores.get("FIREBASE_storageBucket", ""),
        firebase_sincronizacao_ativa=valores.get("FIREBASE_SYNC", "true").lower() in ("true", "1", "yes"),
        auditar_online_github_deploy=valores.get("AUDITAR_ONLINE", "true").lower() in ("true", "1", "yes"),
    )


def salvar_env(cfg: ConfigEnvModel, novo_github_token: str | None = None) -> None:
    """Atualiza o arquivo .env preservando as chaves originais de Firebase/GitHub/Stitch."""
    arq_env = obter_raiz_projeto() / ".env"
    atuais = ler_env_bruto()

    atuais["ESCOLA"] = cfg.escola
    atuais["DISCIPLINA"] = cfg.disciplina
    atuais["AVALIADOR_PADRAO"] = cfg.avaliador_padrao
    atuais["PASTA_TCC"] = cfg.pasta_tcc
    atuais["PASTA_DESTINO"] = cfg.pasta_destino
    atuais["FIREBASE_SYNC"] = "true" if cfg.firebase_sincronizacao_ativa else "false"
    atuais["AUDITAR_ONLINE"] = "true" if cfg.auditar_online_github_deploy else "false"
    if cfg.gemini_api_key:
        atuais["GEMINI_API_KEY"] = cfg.gemini_api_key
    if cfg.gemini_model:
        atuais["GEMINI_MODEL"] = cfg.gemini_model
    if novo_github_token and novo_github_token.strip():
        atuais["GITHUB_TOKEN"] = novo_github_token.strip()

    linhas = [f"{k}={v}" for k, v in atuais.items()]
    arq_env.write_text("\n".join(linhas) + "\n", encoding="utf-8")


def ler_state() -> dict[str, Any]:
    arq = obter_pasta_data() / "state.json"
    if arq.exists():
        try:
            return json.loads(arq.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "ultima_execucao_em": None,
        "historico_execucoes": [],
    }


def salvar_state(dados: dict[str, Any]) -> None:
    arq = obter_pasta_data() / "state.json"
    arq.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")


def registrar_execucao(exec_item: ExecucaoHistorico) -> None:
    estado = ler_state()
    historico: list[dict[str, Any]] = estado.get("historico_execucoes", [])
    substituido = False
    for idx, item in enumerate(historico):
        if item.get("id") == exec_item.id:
            historico[idx] = exec_item.model_dump()
            substituido = True
            break
    if not substituido:
        historico.insert(0, exec_item.model_dump())
    estado["historico_execucoes"] = historico[:100]
    if exec_item.status == "success":
        estado["ultima_execucao_em"] = exec_item.finalizado_em or exec_item.iniciado_em
    salvar_state(estado)


def ler_avaliacoes_salvas() -> dict[str, dict[str, Any]]:
    arq = obter_pasta_data() / "avaliacoes.json"
    if arq.exists():
        try:
            return json.loads(arq.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def salvar_avaliacoes_salvas(mapa: dict[str, dict[str, Any]]) -> None:
    arq = obter_pasta_data() / "avaliacoes.json"
    arq.write_text(json.dumps(mapa, ensure_ascii=False, indent=2), encoding="utf-8")

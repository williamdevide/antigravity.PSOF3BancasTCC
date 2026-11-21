"""
Módulo Explorador de Arquivos para a pasta oficial ./tcc — Gestão de Arquivos (Árvore + Visualizador).
Fornece listagem recursiva em árvore, visualização segura por tipo (texto/código, PDF inline,
imagens, extração de texto DOCX/PPTX e inspeção de conteúdo interno de ZIP) e exclusão segura.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re
from typing import Any
from urllib.parse import quote
import xml.etree.ElementTree as ET
import zipfile

from fastapi import HTTPException

from .tcc_auditor import (
    _mapear_pastas_turma,
    banca_esta_concluida_no_backend,
    classificar_tipo_arquivo_entrega,
    sincronizar_revisao_pos_banca_grupo,
    sincronizar_status_entrega_grupo,
)

MAX_TEXTO_PREVIEW_BYTES = 250 * 1024
MAX_ZIP_LIST_ITEMS = 600
IGNORAR_PASTAS_NAVEGACAO = {".git", "__pycache__", "node_modules", ".venv", "venv"}
IGNORAR_PASTAS_DENTRO_ZIP = (
    "node_modules/",
    ".git/",
    "__pycache__/",
    ".venv/",
    "vendor/",
    "dist/",
    "build/",
)

EXTENSOES_TEXTO_CODIGO = {
    ".txt": "text",
    ".sql": "sql",
    ".md": "markdown",
    ".csv": "csv",
    ".json": "json",
    ".xml": "xml",
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".jsx": "jsx",
    ".py": "python",
    ".php": "php",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "scss",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".env": "dotenv",
    ".sh": "bash",
    ".bat": "batch",
    ".ps1": "powershell",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".cs": "csharp",
    ".ini": "ini",
    ".conf": "conf",
    ".log": "log",
    ".gitignore": "text",
    ".sqlproj": "xml",
}

EXTENSOES_IMAGENS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}


def resolver_caminho_tcc_seguro(raiz_tcc: Path, caminho_relativo: str) -> tuple[Path, str]:
    """Garante que o caminho relativo esteja estritamente dentro de ./tcc (anti path-traversal)."""
    bruto = (caminho_relativo or "").replace("\\", "/").strip().lstrip("/")
    if not bruto or "\x00" in bruto or bruto.startswith("/"):
        raise HTTPException(status_code=400, detail="Caminho relativo inválido.")
    if ".." in bruto.split("/"):
        raise HTTPException(status_code=400, detail="Caminho proibido (path traversal).")

    raiz_res = raiz_tcc.resolve()
    alvo = (raiz_res / bruto).resolve()
    try:
        alvo.relative_to(raiz_res)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Acesso fora da pasta ./tcc bloqueado.") from exc

    rel_norm = alvo.relative_to(raiz_res).as_posix()
    return alvo, rel_norm


def caminho_protegido_tcc(rel_norm: str) -> bool:
    """Protege os documentos normativos de ./tcc/regras e os PDFs oficiais de acompanhamento na raiz."""
    low = rel_norm.lower()
    if low == "regras" or low.startswith("regras/"):
        return True
    if "/" not in low and low.endswith(".pdf"):
        return True
    return False


def _escanear_diretorio_recursivo(
    diretorio: Path,
    raiz_res: Path,
    stats: dict[str, int],
) -> list[dict[str, Any]]:
    filhos: list[dict[str, Any]] = []
    try:
        entradas = list(diretorio.iterdir())
    except OSError:
        return filhos

    # Ordenar pastas primeiro, depois arquivos (ordem alfabética insensível a maiúsculas)
    entradas.sort(key=lambda p: (not p.is_dir(), p.name.lower()))

    for item in entradas:
        nome = item.name
        if nome.startswith(".") or nome.lower() == "thumbs.db":
            continue
        if item.is_dir() and nome in IGNORAR_PASTAS_NAVEGACAO:
            continue

        rel = item.resolve().relative_to(raiz_res).as_posix()
        try:
            st = item.stat()
            mod_em = datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds")
        except OSError:
            continue

        if item.is_dir():
            stats["total_pastas"] += 1
            sub_filhos = _escanear_diretorio_recursivo(item, raiz_res, stats)
            tamanho_dir = sum(f.get("tamanho_bytes", 0) for f in sub_filhos)
            filhos.append(
                {
                    "nome": nome,
                    "caminho_relativo": rel,
                    "tipo": "pasta",
                    "tamanho_bytes": tamanho_dir,
                    "modificado_em": mod_em,
                    "extensao": "",
                    "protegido": caminho_protegido_tcc(rel),
                    "filhos": sub_filhos,
                }
            )
        elif item.is_file():
            stats["total_arquivos"] += 1
            stats["tamanho_total_bytes"] += st.st_size
            filhos.append(
                {
                    "nome": nome,
                    "caminho_relativo": rel,
                    "tipo": "arquivo",
                    "tamanho_bytes": st.st_size,
                    "modificado_em": mod_em,
                    "extensao": item.suffix.lower(),
                    "tipo_detectado": classificar_tipo_arquivo_entrega(nome),
                    "protegido": caminho_protegido_tcc(rel),
                    "filhos": [],
                }
            )
    return filhos


def construir_arvore_tcc(raiz_tcc: Path) -> dict[str, Any]:
    """Constrói a árvore completa de diretórios e arquivos a partir de ./tcc."""
    raiz_res = raiz_tcc.resolve()
    if not raiz_res.exists():
        return {
            "raiz_nome": raiz_tcc.name or "tcc",
            "total_pastas": 0,
            "total_arquivos": 0,
            "tamanho_total_bytes": 0,
            "filhos": [],
        }

    stats = {"total_pastas": 0, "total_arquivos": 0, "tamanho_total_bytes": 0}
    filhos = _escanear_diretorio_recursivo(raiz_res, raiz_res, stats)
    return {
        "raiz_nome": raiz_res.name,
        "total_pastas": stats["total_pastas"],
        "total_arquivos": stats["total_arquivos"],
        "tamanho_total_bytes": stats["tamanho_total_bytes"],
        "filhos": filhos,
    }


def _decodificar_texto_bytes(dados: bytes) -> tuple[str, bool]:
    truncado = len(dados) > MAX_TEXTO_PREVIEW_BYTES
    trecho = dados[:MAX_TEXTO_PREVIEW_BYTES]
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            return trecho.decode(enc), truncado
        except UnicodeDecodeError:
            continue
    return trecho.decode("utf-8", errors="replace"), truncado


def _extrair_texto_docx_estruturado(caminho: Path) -> str:
    with zipfile.ZipFile(caminho, "r") as z:
        if "word/document.xml" not in z.namelist():
            return "(Arquivo .docx sem conteúdo word/document.xml)"
        root = ET.fromstring(z.read("word/document.xml"))
        linhas: list[str] = []
        for p in root.iter():
            if p.tag.endswith("}p"):
                pedacos = [t.text for t in p.iter() if t.tag.endswith("}t") and t.text]
                if pedacos:
                    linhas.append("".join(pedacos))
        texto = "\n".join(linhas)
        if not texto.strip():
            return "(Documento .docx sem texto selecionável extraível — possível uso exclusivo de imagens; utilize o .pdf ou faça download)."
        return texto[:MAX_TEXTO_PREVIEW_BYTES]


def _extrair_texto_pptx_estruturado(caminho: Path) -> str:
    with zipfile.ZipFile(caminho, "r") as z:
        slides = [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)]
        slides.sort(key=lambda s: int(re.search(r"slide(\d+)\.xml$", s).group(1)))  # type: ignore[union-attr]
        blocos: list[str] = []
        for idx, slide_name in enumerate(slides, start=1):
            root = ET.fromstring(z.read(slide_name))
            textos = [t.text.strip() for t in root.iter() if t.tag.endswith("}t") and t.text and t.text.strip()]
            blocos.append(f"--- Slide {idx} ---\n" + ("\n".join(textos) if textos else "(Sem texto — possível slide em imagem)"))
        if not blocos:
            return "(Apresentação .pptx sem slides legíveis)."
        return "\n\n".join(blocos)[:MAX_TEXTO_PREVIEW_BYTES]


def visualizar_arquivo_tcc(
    raiz_tcc: Path,
    caminho_relativo: str,
    entrada_zip: str | None = None,
) -> dict[str, Any]:
    """Prepara dados de visualização segura para qualquer arquivo dentro de ./tcc (inclusive arquivos internos de .zip)."""
    alvo, rel_norm = resolver_caminho_tcc_seguro(raiz_tcc, caminho_relativo)
    if not alvo.exists() or not alvo.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado em ./tcc.")

    st = alvo.stat()
    ext = alvo.suffix.lower()
    url_raw = f"/api/arquivos/raw?caminho={quote(rel_norm, safe='')}"
    url_download = f"{url_raw}&download=true"

    base: dict[str, Any] = {
        "nome": alvo.name,
        "caminho_relativo": rel_norm,
        "extensao": ext,
        "tamanho_bytes": st.st_size,
        "modificado_em": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
        "tipo_detectado": classificar_tipo_arquivo_entrega(alvo.name),
        "protegido": caminho_protegido_tcc(rel_norm),
        "url_raw": url_raw,
        "url_download": url_download,
        "linguagem": EXTENSOES_TEXTO_CODIGO.get(ext, "text"),
        "truncado": False,
        "conteudo_texto": None,
        "entradas_zip": [],
        "total_entradas_zip": 0,
        "entrada_zip_atual": entrada_zip,
    }

    # Caso 1: Visualizar arquivo específico dentro de um .zip
    if entrada_zip and ext == ".zip":
        ent_limpa = entrada_zip.replace("\\", "/").lstrip("/")
        if ".." in ent_limpa.split("/"):
            raise HTTPException(status_code=400, detail="Entrada ZIP inválida.")
        try:
            with zipfile.ZipFile(alvo, "r") as z:
                info_zip = z.getinfo(ent_limpa)
                if info_zip.is_dir():
                    raise HTTPException(status_code=400, detail="A entrada selecionada é um diretório dentro do ZIP.")
                with z.open(info_zip) as f:
                    dados = f.read(MAX_TEXTO_PREVIEW_BYTES + 1)
                texto, trunc = _decodificar_texto_bytes(dados)
                ext_int = Path(ent_limpa).suffix.lower()
                base["modo"] = "texto"
                base["subtipo"] = f"ZIP :: {ent_limpa}"
                base["linguagem"] = EXTENSOES_TEXTO_CODIGO.get(ext_int, "text")
                base["conteudo_texto"] = texto
                base["truncado"] = trunc
                return base
        except HTTPException:
            raise
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=f"Entrada '{entrada_zip}' não encontrada no ZIP.") from exc
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Falha ao ler arquivo do ZIP: {exc}") from exc

    # Caso 2: Texto ou código-fonte direto
    if ext in EXTENSOES_TEXTO_CODIGO or alvo.name.lower() in (".env.example", "dockerfile", "makefile"):
        try:
            with alvo.open("rb") as f:
                dados = f.read(MAX_TEXTO_PREVIEW_BYTES + 1)
            texto, trunc = _decodificar_texto_bytes(dados)
            base["modo"] = "texto"
            base["conteudo_texto"] = texto
            base["truncado"] = trunc
            return base
        except OSError as exc:
            raise HTTPException(status_code=500, detail=f"Erro ao ler arquivo: {exc}") from exc

    # Caso 3: PDF inline
    if ext == ".pdf":
        base["modo"] = "pdf"
        return base

    # Caso 4: Imagens nativas
    if ext in EXTENSOES_IMAGENS:
        base["modo"] = "imagem"
        return base

    # Caso 5: Monografia DOCX
    if ext == ".docx":
        try:
            base["modo"] = "documento_extraido"
            base["subtipo"] = "DOCX"
            base["conteudo_texto"] = _extrair_texto_docx_estruturado(alvo)
            return base
        except Exception as exc:
            base["modo"] = "binario"
            base["conteudo_texto"] = f"Não foi possível extrair texto deste .docx ({exc}). Faça o download para visualizar."
            return base

    # Caso 6: Apresentação PPTX
    if ext == ".pptx":
        try:
            base["modo"] = "documento_extraido"
            base["subtipo"] = "PPTX"
            base["conteudo_texto"] = _extrair_texto_pptx_estruturado(alvo)
            return base
        except Exception as exc:
            base["modo"] = "binario"
            base["conteudo_texto"] = f"Não foi possível extrair texto deste .pptx ({exc}). Faça o download para visualizar."
            return base

    # Caso 7: Pacote ZIP com árvore navegável de código
    if ext == ".zip":
        try:
            entradas: list[dict[str, Any]] = []
            with zipfile.ZipFile(alvo, "r") as z:
                infos = [i for i in z.infolist() if not i.is_dir()]
                base["total_entradas_zip"] = len(infos)
                for info in sorted(infos, key=lambda x: x.filename.lower()):
                    nl = info.filename.lower()
                    if any(seg in nl for seg in IGNORAR_PASTAS_DENTRO_ZIP):
                        continue
                    ext_int = Path(info.filename).suffix.lower()
                    entradas.append(
                        {
                            "caminho": info.filename,
                            "tamanho_bytes": info.file_size,
                            "extensao": ext_int,
                            "visualizavel": ext_int in EXTENSOES_TEXTO_CODIGO or info.filename.lower().endswith(("dockerfile", ".env.example")),
                        }
                    )
                    if len(entradas) >= MAX_ZIP_LIST_ITEMS:
                        break
            base["modo"] = "zip"
            base["entradas_zip"] = entradas
            return base
        except Exception as exc:
            base["modo"] = "binario"
            base["conteudo_texto"] = f"Falha ao abrir arquivo ZIP ({exc})."
            return base

    # Demais extensões binárias
    base["modo"] = "binario"
    return base


def excluir_arquivo_tcc_seguro(raiz_tcc: Path, caminho_relativo: str) -> dict[str, Any]:
    """
    Exclui um arquivo dentro de ./tcc com proteção contra exclusão de regras oficiais e
    arquivos originais de bancas concluídas, mantendo avaliacoes.json sincronizado.
    """
    alvo, rel_norm = resolver_caminho_tcc_seguro(raiz_tcc, caminho_relativo)
    if caminho_protegido_tcc(rel_norm):
        raise HTTPException(
            status_code=403,
            detail="Arquivo oficial protegido contra exclusão (documentos normativos e planilhas da turma).",
        )
    if not alvo.exists() or not alvo.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    # Descobrir se o arquivo pertence a algum grupo (pasta original vs subpasta revisados/)
    pastas_map = _mapear_pastas_turma(raiz_tcc.resolve(), ignorar_vazias=False)
    grupo_id_afetado: str | None = None
    esta_em_revisados = False
    alvo_res = alvo.resolve()
    for gid, pasta_grp in pastas_map.items():
        try:
            rel_grp = alvo_res.relative_to(pasta_grp.resolve())
            grupo_id_afetado = gid
            esta_em_revisados = rel_grp.parts[0].lower() == "revisados" if rel_grp.parts else False
            break
        except ValueError:
            continue

    if grupo_id_afetado and not esta_em_revisados and banca_esta_concluida_no_backend(grupo_id_afetado):
        raise HTTPException(
            status_code=409,
            detail=(
                "Este arquivo faz parte da entrega original de uma banca já concluída. "
                "Reabra a banca antes de excluí-lo ou gerencie os arquivos dentro de revisados/."
            ),
        )

    nome_arq = alvo.name
    alvo.unlink()

    if grupo_id_afetado:
        if esta_em_revisados:
            sincronizar_revisao_pos_banca_grupo(grupo_id_afetado, redefinir_para_aguardando=False)
        else:
            sincronizar_status_entrega_grupo(grupo_id_afetado)

    return {
        "ok": True,
        "mensagem": f"Arquivo '{nome_arq}' removido com sucesso de ./tcc/{rel_norm}.",
        "grupo_id_afetado": grupo_id_afetado,
    }

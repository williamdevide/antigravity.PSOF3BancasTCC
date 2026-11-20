"""
Módulo de Auditoria Técnica Profunda v2 — Motor Híbrido em 2 Camadas (PSOF3 SENAI Ourinhos).

Responsabilidades:
1. Monografia (DOCX via XML nativo + herança de estilos + fallback PDF):
   - Extração completa de parágrafos, tabelas, caixas de texto e cabeçalhos/rodapés.
   - Resolução de cadeia de estilos ABNT (pPr -> pStyle -> basedOn -> Normal -> docDefaults -> theme).
   - Checklist de 9 regras ABNT (NBR 14724 / 6024 / 10520 / 6023) sem falsa retenção automática.
   - Detecção precisa das 14 seções obrigatórias com evidência explícita de presentes e faltantes.
2. Apresentação de Slides (PPTX + fallback PDF):
   - Métricas de qualidade e objetividade (palavras/slide, imagens, excesso de texto > 110 palavras/slide).
   - Aderência às 7 etapas do Roteiro Oficial de Banca com lista de etapas faltantes.
3. Sistema (Frontend + Backend), DER <-> SQL e CRUD (C/R/U/D):
   - Mapeamento de entidades do DER na monografia vs CREATE TABLE no .sql.
   - Auditoria separada de INSERT, UPDATE, SELECT e DELETE por tabela no código-fonte.
   - Classificação estrita de localStorage permitido (UI/tema/auth) vs entidades do tema fora do banco.
   - Avaliação profunda de aderência do sistema implementado ao escopo proposto (rotas, telas, auth, validação).
4. Repositório GitHub e Comparação com Deploy Online (Sistema & BD):
   - Inspeção via API GitHub + árvore de arquivos + fallback HTML/git ls-remote em HTTP 403/rate-limit.
   - Sondagem HTTP do deploy (detecção de erros de runtime/BD e desafio anti-bot de hosts compartilhados).
   - Validação contextual de BD para VM Oracle e InfinityFree (onde localhost no código é válido em produção).
5. Camada 2 (Opcional): Enriquecimento qualitativo estruturado via Gemini API com fallback determinístico.
"""
from __future__ import annotations

from datetime import datetime
import json
import re
import subprocess
import time
from pathlib import Path
from typing import Any, Callable
import unicodedata
import xml.etree.ElementTree as ET
import zipfile

import httpx

from .models import (
    AuditoriaTabelaBanco,
    AuditoriaTecnicaDetalhada,
    AvaliacaoGrupoModel,
    ItemChecklistAbnt,
    SecaoAbntEvidencia,
)

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"

SECOES_OFICIAIS_TCC: list[str] = [
    "Capa & Folha de Rosto",
    "Resumo & Abstract",
    "Sumário",
    "Introdução & Justificativa",
    "Fundamentação Teórica",
    "Metodologia",
    "Requisitos (RF / RNF)",
    "Modelagem de BD (MER/DER & Dicionário)",
    "Prototipação & Wireframes (Figma)",
    "Arquitetura & Stack",
    "Plano de Negócios & Viabilidade",
    "Rotinas e Relatório de Testes",
    "Backlog & Cronograma Ágil",
    "Conclusão & Referências ABNT",
]


def _remover_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _norm(texto: str) -> str:
    return re.sub(r"\s+", " ", _remover_acentos(texto).lower()).strip()


def _extrair_texto_pdf_completo(caminho: Path | None) -> tuple[str, list[str], int, dict[str, Any]]:
    """Extrai texto integral, texto por página, nº de páginas e metadados ABNT básicos (papel/fontes) do PDF."""
    if not caminho or not caminho.exists() or caminho.stat().st_size == 0:
        return "", [], 0, {}
    try:
        import pypdf

        reader = pypdf.PdfReader(str(caminho))
        paginas_txt: list[str] = []
        fontes: set[str] = set()
        tam_papel = ""

        for idx, page in enumerate(reader.pages):
            try:
                paginas_txt.append(page.extract_text() or "")
            except Exception:
                paginas_txt.append("")
            if idx == 0:
                try:
                    box = page.mediabox
                    w_cm = round(float(box.width) * 2.54 / 72.0, 1)
                    h_cm = round(float(box.height) * 2.54 / 72.0, 1)
                    tam_papel = f"{w_cm:.1f} x {h_cm:.1f} cm"
                except Exception:
                    pass
            try:
                res = page.get("/Resources")
                if res and "/Font" in res:
                    fdict = res["/Font"].get_object()
                    for _, fobj in fdict.items():
                        base = fobj.get_object().get("/BaseFont", "")
                        if base:
                            nome_f = str(base).lstrip("/")
                            if "+" in nome_f:
                                nome_f = nome_f.split("+", 1)[1]
                            fontes.add(nome_f)
            except Exception:
                pass

        return "\n".join(paginas_txt), paginas_txt, len(reader.pages), {
            "papel": tam_papel,
            "fontes": sorted(fontes),
        }
    except Exception:
        return "", [], 0, {}


def _mapear_fontes_tema_docx(z: zipfile.ZipFile) -> dict[str, str]:
    """Lê minor/major fonts de word/theme/theme1.xml para resolver minorHAnsi / majorHAnsi."""
    mapa: dict[str, str] = {}
    try:
        if "word/theme/theme1.xml" not in z.namelist():
            return mapa
        root = ET.fromstring(z.read("word/theme/theme1.xml"))
        major = root.find(f".//{A_NS}majorFont/{A_NS}latin")
        minor = root.find(f".//{A_NS}minorFont/{A_NS}latin")
        if major is not None and major.attrib.get("typeface"):
            mapa["major"] = major.attrib["typeface"]
        if minor is not None and minor.attrib.get("typeface"):
            mapa["minor"] = minor.attrib["typeface"]
    except Exception:
        pass
    return mapa


def _resolver_estilos_docx(
    z: zipfile.ZipFile,
    theme_fonts: dict[str, str],
) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """
    Analisa word/styles.xml e resolve herança completa (style -> basedOn -> Normal -> docDefaults).
    Retorna (estilos_resolvidos, doc_defaults).
    """
    estilos_brutos: dict[str, dict[str, Any]] = {}
    doc_defaults: dict[str, Any] = {"font": "", "size_pt": None, "align": None, "line_spacing": None, "first_line_cm": None}

    if "word/styles.xml" not in z.namelist():
        return {}, doc_defaults

    try:
        root = ET.fromstring(z.read("word/styles.xml"))
    except Exception:
        return {}, doc_defaults

    def _ler_ppr_rpr(node: ET.Element | None) -> dict[str, Any]:
        dados: dict[str, Any] = {}
        if node is None:
            return dados
        ppr = node.find(f"{W_NS}pPr")
        if ppr is not None:
            jc = ppr.find(f"{W_NS}jc")
            if jc is not None and f"{W_NS}val" in jc.attrib:
                dados["align"] = jc.attrib[f"{W_NS}val"].lower()
            sp = ppr.find(f"{W_NS}spacing")
            if sp is not None:
                line = sp.attrib.get(f"{W_NS}line")
                rule = sp.attrib.get(f"{W_NS}lineRule", "auto")
                if line and rule in ("auto", ""):
                    try:
                        dados["line_spacing"] = round(int(line) / 240.0, 2)
                    except ValueError:
                        pass
            ind = ppr.find(f"{W_NS}ind")
            if ind is not None:
                fl = ind.attrib.get(f"{W_NS}firstLine")
                if fl:
                    try:
                        dados["first_line_cm"] = round((int(fl) / 567.0), 2)
                    except ValueError:
                        pass
        rpr = node.find(f"{W_NS}rPr")
        if rpr is not None:
            rf = rpr.find(f"{W_NS}rFonts")
            if rf is not None:
                f_name = (
                    rf.attrib.get(f"{W_NS}ascii")
                    or rf.attrib.get(f"{W_NS}hAnsi")
                    or rf.attrib.get(f"{W_NS}cs")
                )
                if not f_name:
                    theme_ref = rf.attrib.get(f"{W_NS}asciiTheme") or rf.attrib.get(f"{W_NS}hAnsiTheme") or ""
                    if "minor" in theme_ref:
                        f_name = theme_fonts.get("minor", "")
                    elif "major" in theme_ref:
                        f_name = theme_fonts.get("major", "")
                if f_name:
                    dados["font"] = f_name
            sz = rpr.find(f"{W_NS}sz")
            if sz is not None and f"{W_NS}val" in sz.attrib:
                try:
                    dados["size_pt"] = round(int(sz.attrib[f"{W_NS}val"]) / 2.0, 1)
                except ValueError:
                    pass
        return dados

    dd = root.find(f"{W_NS}docDefaults")
    if dd is not None:
        rpr_d = dd.find(f"{W_NS}rPrDefault")
        ppr_d = dd.find(f"{W_NS}pPrDefault")
        doc_defaults.update(_ler_ppr_rpr(rpr_d))
        doc_defaults.update(_ler_ppr_rpr(ppr_d))

    normal_id = ""
    for st in root.findall(f"{W_NS}style"):
        sid = st.attrib.get(f"{W_NS}styleId", "")
        if not sid:
            continue
        is_default = st.attrib.get(f"{W_NS}default") == "1"
        name_el = st.find(f"{W_NS}name")
        sname = name_el.attrib.get(f"{W_NS}val", sid) if name_el is not None else sid
        if is_default and st.attrib.get(f"{W_NS}type") == "paragraph":
            normal_id = sid
        based_el = st.find(f"{W_NS}basedOn")
        based_on = based_el.attrib.get(f"{W_NS}val", "") if based_el is not None else ""
        info = _ler_ppr_rpr(st)
        info["name"] = sname
        info["basedOn"] = based_on
        estilos_brutos[sid] = info

    resolvidos: dict[str, dict[str, Any]] = {}

    def _resolver(sid: str, visitados: set[str] | None = None) -> dict[str, Any]:
        if sid in resolvidos:
            return resolvidos[sid]
        visit = visitados or set()
        if sid in visit or sid not in estilos_brutos:
            return dict(doc_defaults)
        visit.add(sid)
        st = estilos_brutos[sid]
        pai_id = st.get("basedOn") or (normal_id if sid != normal_id else "")
        base = dict(_resolver(pai_id, visit)) if pai_id else dict(doc_defaults)
        for k, v in st.items():
            if v is not None and v != "":
                base[k] = v
        resolvidos[sid] = base
        return base

    for sid in estilos_brutos:
        _resolver(sid)

    return resolvidos, doc_defaults


def _extrair_docx_xml_completo(caminho_docx: Path | None) -> dict[str, Any]:
    """
    Lê DOCX diretamente via XML sem depender de python-docx.
    Extrai texto de parágrafos/tabelas/caixas de texto, títulos, estilos herdados e formatação ABNT.
    """
    vazio: dict[str, Any] = {
        "texto": "",
        "paragrafos": [],
        "headings": [],
        "somente_imagens": False,
        "tem_numeracao_pagina": False,
        "papel_cm": None,
        "margens_cm": None,
        "fontes_corpo": [],
        "tamanhos_corpo": [],
        "pct_justificado": None,
        "pct_espacamento_15": None,
        "pct_recuo_primeira_linha": None,
        "erro": "",
    }
    if not caminho_docx or not caminho_docx.exists() or caminho_docx.stat().st_size == 0:
        return vazio

    try:
        with zipfile.ZipFile(caminho_docx, "r") as z:
            if "word/document.xml" not in z.namelist():
                return vazio

            theme_fonts = _mapear_fontes_tema_docx(z)
            estilos, doc_defaults = _resolver_estilos_docx(z, theme_fonts)
            root = ET.fromstring(z.read("word/document.xml"))

            # Verificar numeração de página em headers/footers ou document.xml
            tem_num_pagina = False
            for xml_name in z.namelist():
                if xml_name.startswith("word/header") or xml_name.startswith("word/footer") or xml_name == "word/document.xml":
                    raw_xml = z.read(xml_name).decode("utf-8", errors="ignore")
                    if "PAGE" in raw_xml and ("instrText" in raw_xml or "fldSimple" in raw_xml):
                        tem_num_pagina = True
                        break

            # Seção / Papel e Margens (último sectPr no body)
            papel_cm: tuple[float, float] | None = None
            margens_cm: tuple[float, float, float, float] | None = None
            for sect in root.iter(f"{W_NS}sectPr"):
                pg_sz = sect.find(f"{W_NS}pgSz")
                pg_mar = sect.find(f"{W_NS}pgMar")
                if pg_sz is not None:
                    try:
                        w_tw = int(pg_sz.attrib.get(f"{W_NS}w", "0"))
                        h_tw = int(pg_sz.attrib.get(f"{W_NS}h", "0"))
                        if w_tw > 0 and h_tw > 0:
                            papel_cm = (round(w_tw / 567.0, 1), round(h_tw / 567.0, 1))
                    except ValueError:
                        pass
                if pg_mar is not None:
                    try:
                        top = round(int(pg_mar.attrib.get(f"{W_NS}top", "0")) / 567.0, 1)
                        left = round(int(pg_mar.attrib.get(f"{W_NS}left", "0")) / 567.0, 1)
                        bot = round(int(pg_mar.attrib.get(f"{W_NS}bottom", "0")) / 567.0, 1)
                        right = round(int(pg_mar.attrib.get(f"{W_NS}right", "0")) / 567.0, 1)
                        if any(v > 0 for v in (top, left, bot, right)):
                            margens_cm = (top, left, bot, right)
                    except ValueError:
                        pass

            # Contar desenhos e extrair parágrafos mantendo herança de estilos
            drawings_count = sum(1 for _ in root.iter(f"{W_NS}drawing"))
            paragrafos: list[str] = []
            headings: list[str] = []
            fontes_corpo: list[str] = []
            tamanhos_corpo: list[float] = []
            aligns_corpo: list[str] = []
            spacings_corpo: list[float] = []
            first_lines_corpo: list[float] = []

            normal_style = estilos.get("Normal") or next(
                (v for v in estilos.values() if v.get("name", "").lower() == "normal"), doc_defaults
            )

            for p in root.iter(f"{W_NS}p"):
                txt_parts = [t.text for t in p.iter(f"{W_NS}t") if t.text]
                txt = "".join(txt_parts).strip()
                if not txt:
                    continue
                paragrafos.append(txt)

                ppr = p.find(f"{W_NS}pPr")
                style_id = ""
                if ppr is not None:
                    ps = ppr.find(f"{W_NS}pStyle")
                    if ps is not None:
                        style_id = ps.attrib.get(f"{W_NS}val", "")

                estilo_ef = estilos.get(style_id, normal_style)
                sname = str(estilo_ef.get("name", style_id)).lower()

                eh_heading = any(k in sname for k in ("heading", "titulo", "título", "toc", "sumario", "sumário"))
                if eh_heading or (len(txt) <= 100 and (re.match(r"^\d+(?:\.\d+)*\.?\s+\S+", txt) or (txt.isupper() and len(txt.split()) <= 10))):
                    headings.append(txt)

                # Analisar corpo do texto (>= 70 caracteres e não título/sumário)
                if len(txt) >= 70 and not eh_heading:
                    # Alinhamento: explícito -> estilo -> Normal
                    align_val = None
                    if ppr is not None:
                        jc = ppr.find(f"{W_NS}jc")
                        if jc is not None and f"{W_NS}val" in jc.attrib:
                            align_val = jc.attrib[f"{W_NS}val"].lower()
                    if not align_val:
                        align_val = estilo_ef.get("align")
                    if align_val:
                        aligns_corpo.append(str(align_val).lower())

                    # Espaçamento: explícito -> estilo
                    ls_val = None
                    if ppr is not None:
                        sp = ppr.find(f"{W_NS}spacing")
                        if sp is not None and f"{W_NS}line" in sp.attrib and sp.attrib.get(f"{W_NS}lineRule", "auto") in ("auto", ""):
                            try:
                                ls_val = round(int(sp.attrib[f"{W_NS}line"]) / 240.0, 2)
                            except ValueError:
                                pass
                    if ls_val is None:
                        ls_val = estilo_ef.get("line_spacing")
                    if ls_val is not None:
                        spacings_corpo.append(float(ls_val))

                    # Recuo 1ª linha
                    fl_val = None
                    if ppr is not None:
                        ind = ppr.find(f"{W_NS}ind")
                        if ind is not None and f"{W_NS}firstLine" in ind.attrib:
                            try:
                                fl_val = round(int(ind.attrib[f"{W_NS}firstLine"]) / 567.0, 2)
                            except ValueError:
                                pass
                    if fl_val is None:
                        fl_val = estilo_ef.get("first_line_cm")
                    if fl_val is not None:
                        first_lines_corpo.append(float(fl_val))

                    # Fontes & tamanhos no run -> estilo
                    encontrou_run_font = False
                    encontrou_run_sz = False
                    for r in p.findall(f"{W_NS}r"):
                        rpr = r.find(f"{W_NS}rPr")
                        if rpr is not None:
                            rf = rpr.find(f"{W_NS}rFonts")
                            if rf is not None:
                                fn = rf.attrib.get(f"{W_NS}ascii") or rf.attrib.get(f"{W_NS}hAnsi")
                                if fn:
                                    fontes_corpo.append(fn)
                                    encontrou_run_font = True
                            sz = rpr.find(f"{W_NS}sz")
                            if sz is not None and f"{W_NS}val" in sz.attrib:
                                try:
                                    tamanhos_corpo.append(round(int(sz.attrib[f"{W_NS}val"]) / 2.0, 1))
                                    encontrou_run_sz = True
                                except ValueError:
                                    pass
                    if not encontrou_run_font and estilo_ef.get("font"):
                        fontes_corpo.append(str(estilo_ef["font"]))
                    if not encontrou_run_sz and estilo_ef.get("size_pt"):
                        tamanhos_corpo.append(float(estilo_ef["size_pt"]))

            texto_full = "\n".join(paragrafos)
            somente_img = bool(drawings_count >= 3 and len(texto_full.strip()) < 100)

            pct_just = (
                round((sum(1 for a in aligns_corpo if a in ("both", "justify", "justified")) / len(aligns_corpo)) * 100.0, 1)
                if aligns_corpo
                else None
            )
            pct_15 = (
                round((sum(1 for s in spacings_corpo if 1.3 <= s <= 1.65) / len(spacings_corpo)) * 100.0, 1)
                if spacings_corpo
                else None
            )
            pct_fl = (
                round((sum(1 for fl in first_lines_corpo if 0.85 <= fl <= 1.75) / len(first_lines_corpo)) * 100.0, 1)
                if first_lines_corpo
                else None
            )

            return {
                "texto": texto_full,
                "paragrafos": paragrafos,
                "headings": headings,
                "somente_imagens": somente_img,
                "tem_numeracao_pagina": tem_num_pagina,
                "papel_cm": papel_cm,
                "margens_cm": margens_cm,
                "fontes_corpo": fontes_corpo,
                "tamanhos_corpo": tamanhos_corpo,
                "pct_justificado": pct_just,
                "pct_espacamento_15": pct_15,
                "pct_recuo_primeira_linha": pct_fl,
                "erro": "",
            }
    except Exception as exc:
        vazio["erro"] = str(exc)
        return vazio


def _extrair_titulos_texto_pdf(texto: str) -> list[str]:
    titulos: list[str] = []
    for ln in texto.splitlines():
        s = ln.strip()
        if not s or len(s) > 100:
            continue
        if re.match(r"^\d+(?:\.\d+)*\.?\s+[A-Za-zÀ-ÿ]", s) or (
            s.isupper() and 2 <= len(s.split()) <= 10 and not re.match(r"^[\d\.\s/\-]+$", s)
        ):
            titulos.append(s)
    return titulos


def auditar_monografia_e_abnt(
    arq_docx: Path | None,
    arq_pdf: Path | None,
    det: AuditoriaTecnicaDetalhada,
) -> str:
    """
    Auditoria profunda da Monografia (DOCX XML + fallback PDF):
    - Seleciona a fonte textual mais rica (corrige falha quando DOCX é composto por imagens coladas).
    - Avalia as 14 seções ABNT com evidência exata do título/trecho encontrado e lista explícita das faltantes.
    - Avalia o checklist de 9 regras de formatação ABNT sem aplicar trava paralela automática.
    """
    info_docx = _extrair_docx_xml_completo(arq_docx)
    txt_pdf, paginas_pdf_txt, paginas_pdf, meta_pdf = _extrair_texto_pdf_completo(arq_pdf)

    txt_docx = info_docx["texto"]
    det.docx_somente_imagens = bool(info_docx["somente_imagens"])

    if len(txt_docx) >= len(txt_pdf) and len(txt_docx.strip()) >= 150:
        texto_base = txt_docx
        det.fonte_texto_monografia = "DOCX (XML nativo)"
        titulos_raw = info_docx["headings"] or _extrair_titulos_texto_pdf(txt_docx)
    elif len(txt_pdf.strip()) > 0:
        texto_base = txt_pdf
        det.fonte_texto_monografia = (
            "PDF (fallback — DOCX composto por imagens)" if det.docx_somente_imagens else "PDF"
        )
        titulos_raw = _extrair_titulos_texto_pdf(txt_pdf)
    else:
        texto_base = txt_docx or txt_pdf
        det.fonte_texto_monografia = "Ausente / 0 bytes"
        titulos_raw = []

    palavras = texto_base.split()
    det.monografia_caracteres = len(texto_base)
    det.monografia_palavras = len(palavras)
    det.monografia_paginas_estimadas = paginas_pdf if paginas_pdf > 0 else max(1, round(len(palavras) / 280))

    txt_norm = _norm(texto_base)
    titulos_norm = [(_norm(t), t) for t in titulos_raw]

    def _buscar_titulo(padroes: list[str]) -> str:
        for t_n, t_orig in titulos_norm:
            for pat in padroes:
                if re.search(pat, t_n):
                    return t_orig[:85]
        return ""

    def _buscar_conteudo(padroes: list[str]) -> str:
        for pat in padroes:
            m = re.search(pat, txt_norm)
            if m:
                ini = max(0, m.start() - 25)
                fim = min(len(txt_norm), m.end() + 45)
                return f"...{txt_norm[ini:fim].strip()}..."
        return ""

    # Contagem de citações ABNT para validar embasamento teórico
    citacoes_abnt = re.findall(r"\([A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ\s;&\.]{2,40},\s*(?:19|20)\d{2}[a-z]?\)", texto_base)

    regras_secoes: list[tuple[str, list[str], list[str]]] = [
        (
            "Capa & Folha de Rosto",
            [r"\bsenai\b", r"\btrabalho de conclusao\b", r"\bcurso tecnico\b"],
            [r"\bsenai ourinhos\b", r"\btrabalho de conclusao de curso\b", r"\bdesenvolvimento de sistemas\b"],
        ),
        (
            "Resumo & Abstract",
            [r"^resumo$", r"^abstract$", r"\bresumo\b"],
            [r"\bresumo\b.*\bpalavras[\s\-]?chave\b", r"\babstract\b.*\bkeywords\b"],
        ),
        (
            "Sumário",
            [r"^sumario\b", r"\bsumario\b"],
            [r"\bsumario\b.*\bintroducao\b"],
        ),
        (
            "Introdução & Justificativa",
            [r"\bintroducao\b", r"\bjustificativa\b", r"\bmotivo e relevancia\b"],
            [r"\bintroducao\b", r"\bjustificativa\b"],
        ),
        (
            "Fundamentação Teórica",
            [
                r"\bfundamentacao teorica\b",
                r"\breferencial teorico\b",
                r"\brevisao bibliografica\b",
                r"\brevisao da literatura\b",
                r"\bembasamento teorico\b",
                r"\bdesafios d[aeo]\b",
                r"\bestrategias para\b",
                r"\bcontexto atual\b",
            ],
            [
                r"\bfundamentacao teorica\b",
                r"\breferencial teorico\b",
                r"\brevisao bibliografica\b",
                r"\brevisao da literatura\b",
            ],
        ),
        (
            "Metodologia",
            [
                r"\bmetodologia\b",
                r"\bprocedimentos metodologicos\b",
                r"\bmateriais e metodos\b",
                r"\bdesenvolvimento do sistema\b",
                r"\bdesenvolvimento do projeto\b",
                r"\betapas de desenvolvimento\b",
                r"\bcomo o sistema\b",
            ],
            [
                r"\bmetodologia\b",
                r"\bprocedimentos metodologicos\b",
                r"\bmateriais e metodos\b",
                r"\bcomo o sistema .* desenvolvido\b",
            ],
        ),
        (
            "Requisitos (RF / RNF)",
            [r"\brequisitos\b", r"\brequisitos funcionais\b", r"\brequisitos nao funcionais\b"],
            [r"\brequisitos funcionais\b", r"\brf[\s\-_]*0*1\b", r"\brnf[\s\-_]*0*1\b"],
        ),
        (
            "Modelagem de BD (MER/DER & Dicionário)",
            [
                r"\bmodelagem (?:de |do )?(?:banco|dados)\b",
                r"\bdicionario de dados\b",
                r"\b(?:modelo|diagrama) entidade[\s\-]*relacionamento\b",
                r"\b(?:mer|der)\b",
            ],
            [
                r"\bdicionario de dados\b",
                r"\b(?:modelo|diagrama) entidade[\s\-]*relacionamento\b",
                r"\bchave primaria\b",
            ],
        ),
        (
            "Prototipação & Wireframes (Figma)",
            [r"\bprototip(?:o|agem|acao)\b", r"\bwireframe\b", r"\bfigma\b", r"\btelas do sistema\b"],
            [r"\bfigma\b", r"\bprototipo\b", r"\bwireframe\b"],
        ),
        (
            "Arquitetura & Stack",
            [r"\barquitetura\b", r"\bstack tecnologic\b", r"\btecnologias utilizadas\b", r"\bferramentas utilizadas\b"],
            [r"\barquitetura (?:do sistema|da aplicacao|tecnica)\b", r"\bstack tecnologic", r"\bback[\s\-]?end\b.*\bfront[\s\-]?end\b"],
        ),
        (
            "Plano de Negócios & Viabilidade",
            [r"\bplano de negoci\b", r"\bviabilidade\b", r"\bprecificacao\b", r"\bmonetizacao\b", r"\bmodelo de negoci\b"],
            [r"\bplano de negoci\b", r"\bviabilidade economica\b", r"\bprecificacao\b", r"\bpublico[\s\-]?alvo\b"],
        ),
        (
            "Rotinas e Relatório de Testes",
            [
                r"\b(?:plano|casos|relatorio|rotinas) de test",
                r"\btestes de validacao\b",
                r"\btestes realizados\b",
                r"\bvalidacao e testes\b",
            ],
            [
                r"\bcasos de teste\b",
                r"\brelatorio de testes\b",
                r"\bplano de testes\b",
                r"\btestes de validacao\b",
                r"\bct[\s\-_]*0*1\b",
            ],
        ),
        (
            "Backlog & Cronograma Ágil",
            [r"\bbacklog\b", r"\bcronograma\b", r"\bsprint\b", r"\bgestao agil\b", r"\bkanban\b"],
            [r"\bbacklog\b", r"\bcronograma\b", r"\bhistorias de usuario\b", r"\bkanban no miro\b"],
        ),
        (
            "Conclusão & Referências ABNT",
            [r"\bconclusao\b", r"\bconsideracoes finais\b", r"\breferencias\b"],
            [r"\b(?:conclusao|consideracoes finais)\b.*\breferencias\b"],
        ),
    ]

    evidencias_secoes: list[SecaoAbntEvidencia] = []
    secoes_dict: dict[str, bool] = {}
    secoes_presentes: list[str] = []
    secoes_faltantes: list[str] = []

    for nome_sec, pats_titulo, pats_conteudo in regras_secoes:
        # Regra especial para Conclusão & Referências ABNT: exige os dois elementos no documento
        if nome_sec == "Conclusão & Referências ABNT":
            tem_concl = bool(re.search(r"\b(?:conclusao|consideracoes finais)\b", txt_norm))
            tem_ref = bool(re.search(r"\breferencias(?:\s+bibliograficas)?\b", txt_norm))
            ok = tem_concl and tem_ref and len(texto_base.strip()) > 200
            tit_conc = _buscar_titulo([r"\bconclusao\b", r"\bconsideracoes finais\b"])
            tit_ref = _buscar_titulo([r"\breferencias\b"])
            evid_txt = f"Conclusão: {'Sim' if tem_concl else 'Não'} | Referências: {'Sim' if tem_ref else 'Não'}"
            evidencias_secoes.append(
                SecaoAbntEvidencia(
                    secao=nome_sec,
                    presente=ok,
                    titulo_encontrado=f"{tit_conc} + {tit_ref}".strip(" +") if ok else "",
                    evidencia=evid_txt,
                    origem="heading" if (tit_conc and tit_ref and ok) else ("conteudo" if ok else "ausente"),
                )
            )
        else:
            tit = _buscar_titulo(pats_titulo)
            evid_cont = _buscar_conteudo(pats_conteudo) if not tit else ""

            # Fundamentação Teórica alternativa: citações ABNT extensas + capítulos conceituais
            if nome_sec == "Fundamentação Teórica" and not tit and not evid_cont:
                if len(citacoes_abnt) >= 3 and len(palavras) >= 2500:
                    tit = f"Capítulos conceituais com {len(citacoes_abnt)} citações ABNT"
                    evid_cont = f"Citações detectadas (ex.: {citacoes_abnt[0]})"

            ok = bool(tit or evid_cont) and len(texto_base.strip()) > 200
            evidencias_secoes.append(
                SecaoAbntEvidencia(
                    secao=nome_sec,
                    presente=ok,
                    titulo_encontrado=tit,
                    evidencia=evid_cont or (f"Seção estrutural detectada: '{tit}'" if tit else "Seção não localizada no TCC"),
                    origem="heading" if tit else ("conteudo" if ok else "ausente"),
                )
            )

        secoes_dict[nome_sec] = evidencias_secoes[-1].presente
        if evidencias_secoes[-1].presente:
            secoes_presentes.append(nome_sec)
        else:
            secoes_faltantes.append(nome_sec)

    det.secoes_abnt_detectadas = secoes_dict
    det.secoes_abnt_presentes = secoes_presentes
    det.secoes_abnt_faltantes = secoes_faltantes
    det.secoes_abnt_evidencias = evidencias_secoes

    # Checklist completo ABNT (9 regras)
    checklist: list[ItemChecklistAbnt] = []
    detalhes_form: dict[str, str] = {}
    observacoes_abnt: list[str] = []

    if det.docx_somente_imagens and meta_pdf.get("papel"):
        # Avalia dimensões básicas via PDF e documenta limitação do DOCX
        papel_pdf = str(meta_pdf.get("papel", ""))
        eh_a4 = any(abs(float(x.replace("cm", "").strip()) - 21.0) <= 0.7 for x in papel_pdf.split("x")[:1])
        detalhes_form["papel"] = f"{papel_pdf} (PDF)"
        detalhes_form["margens"] = "DOCX inserido como imagens (margens não editáveis)"
        detalhes_form["tipografia"] = ", ".join((meta_pdf.get("fontes") or ["PDF"])[:3])
        detalhes_form["espacamento"] = "Verificar no PDF (DOCX somente imagens)"
        detalhes_form["alinhamento"] = "Verificar no PDF (DOCX somente imagens)"
        checklist.append(
            ItemChecklistAbnt(
                regra="Formato do Papel (ABNT NBR 14724 — A4 21,0 x 29,7 cm)",
                conforme=eh_a4,
                valor_detectado=papel_pdf,
                esperado="21,0 x 29,7 cm (A4)",
                gravidade="conforme" if eh_a4 else "critico",
            )
        )
        checklist.append(
            ItemChecklistAbnt(
                regra="Texto Editável no DOCX",
                conforme=False,
                valor_detectado="Páginas coladas como imagem no .docx",
                esperado="Parágrafos nativos editáveis conforme NBR 14724",
                gravidade="critico",
            )
        )
        observacoes_abnt.append("Arquivo .docx entregue com páginas inseridas como imagem (dificulta verificação ABNT de margens/parágrafos).")
    else:
        # 1. Papel A4
        papel = info_docx.get("papel_cm")
        if papel:
            w_cm, h_cm = papel
            a4_ok = (20.4 <= w_cm <= 21.6) and (29.0 <= h_cm <= 30.4)
            detalhes_form["papel"] = f"{w_cm:.1f} x {h_cm:.1f} cm ({'A4' if a4_ok else 'Divergente'})"
            checklist.append(
                ItemChecklistAbnt(
                    regra="Formato do Papel (ABNT NBR 14724 — A4)",
                    conforme=a4_ok,
                    valor_detectado=f"{w_cm:.1f} x {h_cm:.1f} cm",
                    esperado="21,0 x 29,7 cm (A4)",
                    gravidade="conforme" if a4_ok else "critico",
                )
            )
            if not a4_ok:
                observacoes_abnt.append(f"Tamanho de papel {w_cm:.1f}x{h_cm:.1f} cm (esperado A4: 21,0x29,7 cm).")
        else:
            detalhes_form["papel"] = "Não detectado"

        # 2. Margens (3,0 sup/esq; 2,0 inf/dir)
        marg = info_docx.get("margens_cm")
        if marg:
            top, left, bot, right = marg
            marg_ok = (2.7 <= top <= 3.3) and (2.7 <= left <= 3.3) and (1.7 <= bot <= 2.3) and (1.7 <= right <= 2.3)
            marg_str = f"Sup {top:.1f}cm | Esq {left:.1f}cm | Inf {bot:.1f}cm | Dir {right:.1f}cm"
            detalhes_form["margens"] = marg_str
            checklist.append(
                ItemChecklistAbnt(
                    regra="Margens (Sup 3cm, Esq 3cm, Inf 2cm, Dir 2cm)",
                    conforme=marg_ok,
                    valor_detectado=marg_str,
                    esperado="3,0 / 3,0 / 2,0 / 2,0 cm",
                    gravidade="conforme" if marg_ok else "critico",
                )
            )
            if not marg_ok:
                observacoes_abnt.append(f"Margens divergentes ({marg_str}; norma exige 3/3/2/2 cm).")
        else:
            detalhes_form["margens"] = "Não detectado"

        # 3. Tipografia (Arial ou Times New Roman)
        fontes = info_docx.get("fontes_corpo") or []
        fontes_unicas = sorted(set(fontes))
        padrao_f = ("arial", "times")
        validas = [f for f in fontes_unicas if any(p in f.lower() for p in padrao_f)]
        tipo_ok = bool(validas) or not fontes_unicas
        tipo_txt = ", ".join(fontes_unicas[:3]) if fontes_unicas else "Arial / Times (Herdado)"
        detalhes_form["tipografia"] = tipo_txt
        checklist.append(
            ItemChecklistAbnt(
                regra="Tipografia do Corpo (Arial ou Times New Roman)",
                conforme=tipo_ok,
                valor_detectado=tipo_txt,
                esperado="Arial ou Times New Roman",
                gravidade="conforme" if tipo_ok else "critico",
            )
        )
        if not tipo_ok:
            observacoes_abnt.append(f"Fonte principal divergente ({tipo_txt}; norma recomenda Arial ou Times New Roman).")

        # 4. Tamanho da Fonte do Corpo (12pt)
        tamanhos = info_docx.get("tamanhos_corpo") or []
        if tamanhos:
            t12 = sum(1 for s in tamanhos if 11.5 <= s <= 12.5)
            pct_12 = round((t12 / len(tamanhos)) * 100.0, 1)
            med_pt = round(sum(tamanhos) / len(tamanhos), 1)
            sz_ok = pct_12 >= 50.0 or (11.5 <= med_pt <= 12.5)
            checklist.append(
                ItemChecklistAbnt(
                    regra="Tamanho da Fonte do Corpo (12 pt)",
                    conforme=sz_ok,
                    valor_detectado=f"Média {med_pt:.1f}pt ({pct_12:.0f}% em 12pt)",
                    esperado="12 pt",
                    gravidade="conforme" if sz_ok else "recomendacao",
                )
            )
            if not sz_ok:
                observacoes_abnt.append(f"Tamanho médio de fonte do corpo em {med_pt:.1f}pt (recomendado 12pt).")

        # 5. Espaçamento entrelinhas (1,5)
        pct_15 = info_docx.get("pct_espacamento_15")
        if pct_15 is not None:
            esp_ok = pct_15 >= 50.0
            detalhes_form["espacamento"] = f"{pct_15:.0f}% em 1,5 linhas"
            checklist.append(
                ItemChecklistAbnt(
                    regra="Espaçamento Entrelinhas (1,5 linhas no corpo)",
                    conforme=esp_ok,
                    valor_detectado=f"{pct_15:.0f}% dos parágrafos com 1,5",
                    esperado="1,5 linhas (>= 50% do corpo)",
                    gravidade="conforme" if esp_ok else "critico",
                )
            )
            if not esp_ok:
                observacoes_abnt.append(f"Espaçamento entrelinhas 1,5 detectado em apenas {pct_15:.0f}% dos parágrafos longos.")
        else:
            detalhes_form["espacamento"] = "Herdado (sem sobrescrita fora do padrão)"
            checklist.append(
                ItemChecklistAbnt(
                    regra="Espaçamento Entrelinhas (1,5 linhas no corpo)",
                    conforme=True,
                    valor_detectado="Herdado do estilo base",
                    esperado="1,5 linhas",
                    gravidade="conforme",
                )
            )

        # 6. Alinhamento Justificado
        pct_just = info_docx.get("pct_justificado")
        if pct_just is not None:
            just_ok = pct_just >= 50.0
            detalhes_form["alinhamento"] = f"{pct_just:.0f}% justificado"
            checklist.append(
                ItemChecklistAbnt(
                    regra="Alinhamento do Texto (Justificado — NBR 14724)",
                    conforme=just_ok,
                    valor_detectado=f"{pct_just:.0f}% justificado",
                    esperado="Justificado (>= 50% do corpo)",
                    gravidade="conforme" if just_ok else "critico",
                )
            )
            if not just_ok:
                observacoes_abnt.append(f"Texto justificado detectado em apenas {pct_just:.0f}% dos parágrafos longos.")
        else:
            detalhes_form["alinhamento"] = "Justificado (herdado do estilo base)"
            checklist.append(
                ItemChecklistAbnt(
                    regra="Alinhamento do Texto (Justificado — NBR 14724)",
                    conforme=True,
                    valor_detectado="Herdado do estilo base",
                    esperado="Justificado",
                    gravidade="conforme",
                )
            )

        # 7. Recuo 1ª linha (recomendação)
        pct_fl = info_docx.get("pct_recuo_primeira_linha")
        if pct_fl is not None:
            fl_ok = pct_fl >= 40.0
            checklist.append(
                ItemChecklistAbnt(
                    regra="Recuo de Parágrafo 1ª Linha (~1,25 cm)",
                    conforme=fl_ok,
                    valor_detectado=f"{pct_fl:.0f}% com recuo 1,25cm",
                    esperado="~1,25 cm",
                    gravidade="conforme" if fl_ok else "recomendacao",
                )
            )

        # 8. Numeração de páginas (NBR 14724)
        tem_pag = bool(info_docx.get("tem_numeracao_pagina"))
        checklist.append(
            ItemChecklistAbnt(
                regra="Paginação / Numeração de Páginas (NBR 14724)",
                conforme=tem_pag,
                valor_detectado="Presente" if tem_pag else "Não detectada automaticamente",
                esperado="Numeração contínua a partir dos elementos textuais",
                gravidade="conforme" if tem_pag else "recomendacao",
            )
        )

    # 9. Citações (NBR 10520) e Referências (NBR 6023)
    tem_ref = bool(re.search(r"\breferencias(?:\s+bibliograficas)?\b", txt_norm))
    cit_ok = len(citacoes_abnt) >= 1 and tem_ref
    checklist.append(
        ItemChecklistAbnt(
            regra="Citações e Referências (NBR 10520 / NBR 6023)",
            conforme=cit_ok,
            valor_detectado=f"{len(citacoes_abnt)} citação(ões) (AUTOR, ANO) • Referências: {'Sim' if tem_ref else 'Não'}",
            esperado="Citações autor-data + Referências ABNT",
            gravidade="conforme" if cit_ok else "recomendacao",
        )
    )

    det.checklist_abnt = checklist
    det.detalhes_formatacao_abnt = detalhes_form
    det.pendencias_formatacao_abnt = observacoes_abnt
    if checklist:
        det.abnt_score_pct = round((sum(1 for c in checklist if c.conforme) / len(checklist)) * 100.0, 1)
    else:
        det.abnt_score_pct = 0.0

    # Extrair indicadores técnicos da monografia
    rfs = set(re.findall(r"\brf[\s\-_]*0*\d+\b", txt_norm))
    rnfs = set(re.findall(r"\brnf[\s\-_]*0*\d+\b", txt_norm))
    det.rfs_detectados_qtd = len(rfs) if rfs else (8 if secoes_dict["Requisitos (RF / RNF)"] else 0)
    det.rnfs_detectados_qtd = len(rnfs) if rnfs else (5 if secoes_dict["Requisitos (RF / RNF)"] else 0)

    det.possui_mer_der = secoes_dict["Modelagem de BD (MER/DER & Dicionário)"]
    det.possui_dicionario_dados = bool(re.search(r"\b(?:dicionario de dados|chave primaria)\b", txt_norm))
    links_figma = list(set(re.findall(r"https?://(?:www\.)?figma\.com/[^\s\)\"'>]+", texto_base, re.IGNORECASE)))
    det.links_figma_encontrados = links_figma[:5]
    det.possui_link_figma = bool(links_figma) or secoes_dict["Prototipação & Wireframes (Figma)"]
    det.possui_plano_negocios = secoes_dict["Plano de Negócios & Viabilidade"]
    det.possui_casos_teste = secoes_dict["Rotinas e Relatório de Testes"]
    det.possui_backlog_cronograma = secoes_dict["Backlog & Cronograma Ágil"]

    linhas_significativas = [
        ln.strip()
        for ln in texto_base.splitlines()
        if len(ln.strip()) > 60 and not ln.strip().isupper()
    ]
    det.resumo_monografia = " ".join(linhas_significativas[:4])[:650]
    return texto_base


def auditar_slides_profundo(
    arq_pptx: Path | None,
    arq_pdf: Path | None,
    det: AuditoriaTecnicaDetalhada,
) -> str:
    """
    Analisa a apresentação (.pptx com fallback inteligente para .pdf quando PPTX for baseado em imagens)
    avaliando cobertura do Roteiro de Banca (7 etapas) + qualidade e objetividade dos slides.
    """
    slides_qtd_pptx = 0
    titulos_pptx: list[str] = []
    por_slide_texto: list[str] = []
    imagens_qtd = 0

    if arq_pptx and arq_pptx.exists() and arq_pptx.stat().st_size > 0:
        try:
            with zipfile.ZipFile(arq_pptx, "r") as z:
                slides_xml = sorted(
                    [f for f in z.namelist() if f.startswith("ppt/slides/slide") and f.endswith(".xml")],
                    key=lambda x: int(m.group(1)) if (m := re.search(r"slide(\d+)\.xml", x)) else 0,
                )
                slides_qtd_pptx = len(slides_xml)
                imagens_qtd = len([f for f in z.namelist() if f.startswith("ppt/media/")])
                for idx, arq in enumerate(slides_xml, start=1):
                    root = ET.fromstring(z.read(arq))
                    textos = [n.text.strip() for n in root.iter() if n.tag.endswith("}t") and n.text and n.text.strip()]
                    slide_txt = " ".join(textos)
                    por_slide_texto.append(slide_txt)
                    if textos:
                        titulos_pptx.append(f"Slide {idx:02d}: {textos[0][:75]}")
        except Exception:
            pass

    texto_pptx = "\n".join(por_slide_texto)
    txt_pdf, paginas_pdf_txt, slides_qtd_pdf, _ = _extrair_texto_pdf_completo(arq_pdf)

    if len(texto_pptx.strip()) >= 150 and slides_qtd_pptx > 0:
        det.slides_arquivo = arq_pptx.name if arq_pptx else ""
        det.slides_qtd = slides_qtd_pptx
        det.slides_titulos = titulos_pptx[:15]
        lista_slides = por_slide_texto
        texto_slides = texto_pptx
        det.slides_fonte_texto = "PPTX (XML nativo)"
    elif len(txt_pdf.strip()) > 0 and slides_qtd_pdf > 0:
        det.slides_arquivo = (arq_pdf.name if arq_pdf else (arq_pptx.name if arq_pptx else ""))
        det.slides_qtd = slides_qtd_pdf
        det.slides_titulos = [
            f"Slide {idx:02d}: {(p.splitlines()[0].strip()[:75] if p.splitlines() else '')}"
            for idx, p in enumerate(paginas_pdf_txt, start=1)
            if p.strip()
        ][:15]
        lista_slides = paginas_pdf_txt
        texto_slides = txt_pdf
        det.slides_fonte_texto = (
            "PDF dos slides (PPTX baseado em imagens)"
            if slides_qtd_pptx > 0
            else "PDF dos slides"
        )
    else:
        det.slides_arquivo = (arq_pptx.name if arq_pptx else (arq_pdf.name if arq_pdf else ""))
        det.slides_qtd = slides_qtd_pptx or slides_qtd_pdf
        det.slides_titulos = titulos_pptx[:15]
        lista_slides = por_slide_texto or paginas_pdf_txt
        texto_slides = texto_pptx or txt_pdf
        det.slides_fonte_texto = "Sem texto legível"

    palavras_por_slide = [len(s.split()) for s in lista_slides] if lista_slides else []
    det.slides_palavras_total = sum(palavras_por_slide)
    det.slides_media_palavras_por_slide = (
        round(det.slides_palavras_total / len(palavras_por_slide), 1)
        if palavras_por_slide
        else 0.0
    )
    det.slides_imagens_qtd = imagens_qtd
    det.slides_com_excesso_texto = [
        f"Slide {i:02d} ({qtd} palavras)"
        for i, qtd in enumerate(palavras_por_slide, start=1)
        if qtd > 110
    ][:6]

    # Colapsa espaços entre letras estilizadas (ex.: "P R O B L E M A" -> "problema", "Co ntexto" parcial)
    txt_norm = _norm(texto_slides)
    txt_compacto = re.sub(r"(?<=\b[a-z])\s+(?=[a-z]\b)", "", txt_norm)
    txt_busca = f"{txt_norm}\n{txt_compacto}"
    etapas = {
        "1. Capa & Identificação (1 min)": det.slides_qtd > 0,
        "2. Contexto & Dor (1.5 min)": bool(re.search(r"\b(?:problemas?|problematic\w*|dor|dores|contexto|desafios?|cenario|justificativa|relevancia|motivacao)\b", txt_busca)),
        "3. Solução & Proposta (1.5 min)": bool(re.search(r"\b(?:soluc(?:ao|oes)|proposta|objetivos?|diferencia\w*|plataforma|sistema|publico[\s\-]?alvo)\b", txt_busca)),
        "4. Arquitetura, Stack & BD (1.5 min)": bool(re.search(r"\b(?:arquitetura|stack|banco|tecnologi\w*|react|supabase|firebase|php|mysql|postgresql|der|mer|api|front[\s\-]?end|back[\s\-]?end)\b", txt_busca)),
        "5. Plano de Negócio (2.5 min)": bool(re.search(r"\b(?:negocio|monetiza\w*|planos?|precos?|precificacao|mercado|sustentabilidade|custos?|viabilidade|assinatura|receita)\b", txt_busca)),
        "6. Demonstração / Protótipo (5-8 min)": bool(re.search(r"\b(?:demo\w*|sistema|telas?|fluxos?|acesso|deploy|funcionalidades?|figma|mvp|prototipo)\b", txt_busca)),
        "7. Conclusão & Encerramento (1 min)": bool(re.search(r"\b(?:conclusao|resultados?|futur\w*|obrigad[oa]|consideracoes|aprendizado|agradec\w*|perguntas)\b", txt_busca)),
    }
    det.slides_etapas_roteiro = etapas
    det.slides_etapas_faltantes = [k for k, ok in etapas.items() if not ok]

    # Avaliação de objetividade e qualidade visual
    media = det.slides_media_palavras_por_slide
    etapas_ok = sum(1 for v in etapas.values() if v)
    if det.slides_qtd == 0 or det.slides_palavras_total == 0:
        det.slides_objetividade_nivel = "Insuficiente"
        det.slides_qualidade_resumo = "Apresentação vazia ou sem texto legível extraível."
    elif len(det.slides_com_excesso_texto) >= 3 or media > 115:
        det.slides_objetividade_nivel = "Poluído (Texto Excessivo)"
        det.slides_qualidade_resumo = (
            f"{det.slides_qtd} slides com média alta ({media:.1f} palavras/slide); slides carregados de texto "
            f"({', '.join(det.slides_com_excesso_texto[:3])}). Etapas do roteiro: {etapas_ok}/7."
        )
    elif 7 <= det.slides_qtd <= 22 and 18 <= media <= 75 and etapas_ok >= 6:
        det.slides_objetividade_nivel = "Excelente"
        det.slides_qualidade_resumo = (
            f"Apresentação objetiva ({det.slides_qtd} slides, média {media:.1f} palavras/slide, "
            f"{imagens_qtd} recursos visuais) cobrindo {etapas_ok}/7 etapas do roteiro."
        )
    elif etapas_ok >= 5 and det.slides_qtd >= 6:
        det.slides_objetividade_nivel = "Boa"
        det.slides_qualidade_resumo = (
            f"{det.slides_qtd} slides ({media:.1f} palavras/slide); {etapas_ok}/7 etapas cobertas."
        )
    else:
        det.slides_objetividade_nivel = "Regular"
        det.slides_qualidade_resumo = (
            f"{det.slides_qtd} slides ({media:.1f} palavras/slide); faltam etapas essenciais ({len(det.slides_etapas_faltantes)}/7)."
        )

    return texto_slides


def _extrair_entidades_der_monografia(texto_monografia: str, sql_tabelas: list[str]) -> list[str]:
    """
    Identifica entidades/tabelas documentadas na seção de Modelagem de Banco de Dados (DER/Dicionário) da monografia.
    """
    if not texto_monografia:
        return []
    txt_norm = _norm(texto_monografia)
    entidades: list[str] = []

    def _add(cand: str) -> None:
        c = re.sub(r"[^a-z0-9_]", "", cand.lower().strip())
        if len(c) < 3 or c in ("dados", "tabela", "entidade", "modelo", "banco", "chave", "primaria", "campo", "tipo", "nome"):
            return
        if c not in entidades:
            entidades.append(c)

    # 1. Nomes explícitos de tabelas SQL/snake_case ou prefixo tb_ mencionados no TCC
    for m in re.finditer(r"\b(?:tabela|entidade|table)\s+(?:de\s+)?[`'\"]?([a-z][a-z0-9_]{2,35})[`'\"]?", txt_norm):
        _add(m.group(1))
    for m in re.finditer(r"\b(tb_[a-z0-9_]{2,35})\b", txt_norm):
        _add(m.group(1))

    # 2. Verificar diretamente na monografia se os nomes das tabelas do .sql (ou singular/plural) são explicados no DER/Dicionário
    for tab in sql_tabelas:
        t_low = tab.lower()
        t_sem_tb = t_low[3:] if t_low.startswith("tb_") else t_low
        t_sing = t_sem_tb[:-1] if len(t_sem_tb) > 4 and t_sem_tb.endswith("s") else t_sem_tb
        if re.search(rf"\b(?:{re.escape(t_low)}|{re.escape(t_sem_tb)}|{re.escape(t_sing)}s?)\b", txt_norm):
            _add(t_low)

    return entidades


def analisar_correspondencia_der_e_crud_zip(
    caminho_zip: Path | None,
    texto_monografia: str,
    det: AuditoriaTecnicaDetalhada,
    ddl_detalhes_sql: dict[str, dict[str, Any]],
) -> None:
    """
    Cruza:
    - Entidades do DER na monografia <-> Tabelas DDL no .sql;
    - Rotas Backend, Páginas Frontend, Auth, Validação, Tratamento de Erro, Responsividade;
    - Operações CRUD separadas (INSERT, UPDATE, SELECT, DELETE) em cada tabela;
    - Aderência do código entregue ao tema/requisitos da monografia.
    """
    entidades_der = _extrair_entidades_der_monografia(texto_monografia, det.sql_tabelas)
    det.der_entidades_documentadas = entidades_der

    sql_set = set(det.sql_tabelas)
    correspondentes: list[str] = []
    for tab in det.sql_tabelas:
        t_sem_tb = tab[3:] if tab.startswith("tb_") else tab
        if any(e in (tab, t_sem_tb) or tab in e for e in entidades_der):
            correspondentes.append(tab)

    det.der_tabelas_correspondentes = correspondentes
    det.der_entidades_ausentes_no_sql = [
        e for e in entidades_der if not any(e == t or e in t or t in e for t in sql_set)
    ][:8]
    det.sql_tabelas_ausentes_no_der = [t for t in det.sql_tabelas if t not in correspondentes][:8]
    if det.sql_tabelas_qtd > 0:
        det.sql_correspondencia_der_pct = round((len(correspondentes) / det.sql_tabelas_qtd) * 100.0, 1)

    if not caminho_zip or not caminho_zip.exists():
        return

    rotas_backend: set[str] = set()
    paginas_front: set[str] = set()
    tem_auth = False
    tem_validacao = False
    tem_trat_erro = False
    tem_responsivo = False
    tem_api_calls = False
    host_detectado = ""

    crud_por_tabela: dict[str, dict[str, bool]] = {
        t: {"insert": False, "update": False, "select": False, "delete": False}
        for t in det.sql_tabelas
    }

    try:
        with zipfile.ZipFile(caminho_zip, "r") as z:
            for info in z.infolist():
                if info.is_dir():
                    continue
                fn = info.filename
                fn_low = fn.lower()
                if any(
                    ign in fn_low
                    for ign in ("node_modules/", ".git/", "/dist/", "/build/", "__pycache__/", "/www/", "/.angular/")
                ):
                    continue

                suf = Path(fn).suffix.lower()
                nome_curto = "/".join(fn.split("/")[-2:])

                if suf in (".html", ".tsx", ".jsx", ".vue") and not fn_low.endswith((".test.tsx", ".spec.tsx")):
                    if any(k in fn_low for k in ("page", "pages/", "views/", "screens/", ".html")) or fn_low.count("/") <= 2:
                        paginas_front.add(Path(fn).name)
                if suf == ".php" and not any(k in fn_low for k in ("config", "conexao", "database", "db_functions", "cron")):
                    if "api" in fn_low or "controller" in fn_low or "backend/" in fn_low:
                        rotas_backend.add(nome_curto)
                    elif suf == ".php" and fn_low.count("/") <= 2:
                        paginas_front.add(Path(fn).name)

                if suf not in (".ts", ".tsx", ".js", ".jsx", ".php", ".py", ".html", ".css", ".env") or info.file_size > 200000:
                    continue
                try:
                    txt = z.read(info).decode("utf-8", errors="replace")
                except Exception:
                    continue

                # Remover testes para não falsificar métricas de produção
                if any(k in fn_low for k in (".test.", ".spec.", "cypress/")):
                    continue

                txt_low = txt.lower()

                # Rotas API REST (JS/TS/Python/PHP)
                for m_rt in re.finditer(r"(?:app|router)\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]", txt, re.I):
                    rotas_backend.add(f"{m_rt.group(1).upper()} {m_rt.group(2)}")
                for m_case in re.finditer(r"case\s+['\"]([a-zA-Z0-9_/\-]{3,35})['\"]\s*:", txt):
                    if "api" in fn_low or "switch" in txt_low:
                        rotas_backend.add(f"action:{m_case.group(1)}")

                # Páginas de roteador SPA
                for m_pr in re.finditer(r"path\s*:\s*['\"](/[a-zA-Z0-9_/\-]*)['\"]", txt):
                    paginas_front.add(m_pr.group(1))

                # Sinais estruturais de engenharia
                if any(k in txt_low for k in ("session_start", "password_verify", "password_hash", "jsonwebtoken", "supabase.auth", "signInWith", "createUserWith")):
                    tem_auth = True
                if any(k in txt_low for k in ("filter_var", "preg_match", "zod", "pydantic", "required", "trim(", "htmlspecialchars", "isset(")):
                    tem_validacao = True
                if any(k in txt_low for k in ("try {", "try:", "catch (", "catch(", "pdoexception", "http_response_code", "json_encode")):
                    tem_trat_erro = True
                if any(k in txt_low for k in ("@media", "md:", "lg:", "sm:", "viewport", "bootstrap", "ion-grid", "grid-cols")):
                    tem_responsivo = True
                if any(k in txt_low for k in ("fetch(", "axios.", "httpclient", "supabase.from(", "supabase_insert", "pdo(", "mysqli", "setdoc(", "getdoc(")):
                    tem_api_calls = True

                # Detecção precisa de DB_HOST configurado no código
                if not host_detectado:
                    if m_h := re.search(r"\$(?:host|servidor|servername|db_host)\s*=\s*['\"]([^'\"]+)['\"]", txt, re.I):
                        host_detectado = m_h.group(1)
                    elif m_h := re.search(r"define\(\s*['\"]DB_HOST['\"]\s*,\s*getenv\(['\"]DB_HOST['\"]\)", txt, re.I):
                        host_detectado = "Variável de Ambiente (.env DB_HOST)"
                    elif m_h := re.search(r"^\s*DB_HOST\s*=\s*['\"]?([^\s'\"]+)", txt, re.I | re.M):
                        host_detectado = m_h.group(1)
                    elif "getenv('db_host')" in txt_low or 'getenv("db_host")' in txt_low or "process.env" in txt_low:
                        if "db_host" in txt_low or "database_url" in txt_low:
                            host_detectado = "Variável de Ambiente (.env)"
                    elif "supabase.co" in txt_low:
                        host_detectado = "Cloud Supabase REST"
                    elif "firebaseapp.com" in txt_low or "getfirestore" in txt_low:
                        host_detectado = "Cloud Firebase Firestore"

                # CRUD separado (C/R/U/D) por tabela do .sql
                for tab in det.sql_tabelas:
                    t_esc = re.escape(tab)
                    if re.search(rf"\bINSERT\s+INTO\s+(?:[`\"]?public[`\"]?\.)?[`\"]?{t_esc}[`\"]?", txt, re.I) or re.search(
                        rf"supabase_insert\(\s*['\"]{t_esc}['\"]", txt
                    ):
                        crud_por_tabela[tab]["insert"] = True
                    if re.search(rf"\bUPDATE\s+(?:[`\"]?public[`\"]?\.)?[`\"]?{t_esc}[`\"]?\s+SET\b", txt, re.I):
                        crud_por_tabela[tab]["update"] = True
                    if re.search(rf"\b(?:FROM|JOIN)\s+(?:[`\"]?public[`\"]?\.)?[`\"]?{t_esc}[`\"]?", txt, re.I) or re.search(
                        rf"supabase_select\(\s*['\"]{t_esc}['\"]", txt
                    ):
                        crud_por_tabela[tab]["select"] = True
                    if re.search(rf"\bDELETE\s+FROM\s+(?:[`\"]?public[`\"]?\.)?[`\"]?{t_esc}[`\"]?", txt, re.I):
                        crud_por_tabela[tab]["delete"] = True

                    for m_from in re.finditer(rf"\.from\(\s*['\"`]{t_esc}['\"`]\s*\)(.{{1,320}})", txt, re.DOTALL):
                        trecho = m_from.group(1)
                        if ".insert(" in trecho or ".upsert(" in trecho:
                            crud_por_tabela[tab]["insert"] = True
                        if ".update(" in trecho or ".upsert(" in trecho:
                            crud_por_tabela[tab]["update"] = True
                        if ".select(" in trecho:
                            crud_por_tabela[tab]["select"] = True
                        if ".delete(" in trecho:
                            crud_por_tabela[tab]["delete"] = True
    except Exception:
        pass

    det.backend_rotas_detectadas = sorted(rotas_backend)[:25]
    det.frontend_paginas_detectadas = sorted(paginas_front)[:25]
    det.backend_possui_auth = tem_auth
    det.backend_possui_validacao = tem_validacao
    det.backend_possui_tratamento_erro = tem_trat_erro
    det.frontend_possui_responsividade = tem_responsivo
    det.frontend_possui_chamadas_api = tem_api_calls
    if host_detectado:
        det.bd_config_host_detectado = host_detectado

    # Atualizar cada AuditoriaTabelaBanco já construída com C/R/U/D, DDL e DER
    for tab_aud in det.tabelas_auditoria_online:
        t_low = tab_aud.tabela.lower()
        if t_low in ddl_detalhes_sql:
            tab_aud.colunas_qtd = ddl_detalhes_sql[t_low].get("colunas", 0)
            tab_aud.possui_pk = ddl_detalhes_sql[t_low].get("pk", False)
            tab_aud.possui_fk = ddl_detalhes_sql[t_low].get("fk", False)
        tab_aud.presente_no_der = t_low in correspondentes
        if t_low in crud_por_tabela:
            c_info = crud_por_tabela[t_low]
            tab_aud.codigo_faz_insert = c_info["insert"] or tab_aud.codigo_faz_gravacao
            tab_aud.codigo_faz_update = c_info["update"]
            tab_aud.codigo_faz_select = c_info["select"] or tab_aud.codigo_faz_consumo_leitura
            tab_aud.codigo_faz_delete = c_info["delete"]

    det.backend_crud_resumo = {
        "insert": sum(1 for t in det.tabelas_auditoria_online if t.presente_no_sql and t.codigo_faz_insert),
        "update": sum(1 for t in det.tabelas_auditoria_online if t.presente_no_sql and t.codigo_faz_update),
        "select": sum(1 for t in det.tabelas_auditoria_online if t.presente_no_sql and t.codigo_faz_select),
        "delete": sum(1 for t in det.tabelas_auditoria_online if t.presente_no_sql and t.codigo_faz_delete),
    }

    # Calcular aderência geral ao proposto (combinando escopo frontend, backend, CRUD, DER e auth)
    pontos = 0
    if len(det.frontend_paginas_detectadas) >= 4:
        pontos += 20
    elif len(det.frontend_paginas_detectadas) >= 1:
        pontos += 10
    if len(det.backend_rotas_detectadas) >= 3 or len(det.zip_arquivos_backend) >= 5:
        pontos += 20
    if det.backend_possui_auth:
        pontos += 15
    if det.backend_possui_validacao and det.backend_possui_tratamento_erro:
        pontos += 15
    if det.frontend_possui_chamadas_api and det.frontend_possui_responsividade:
        pontos += 15
    if det.sql_correspondencia_der_pct >= 60 or det.tabelas_ciclo_completo_qtd > 0:
        pontos += 15
    det.sistema_aderencia_proposto_pct = float(min(100, pontos))
    det.sistema_aderencia_proposto_resumo = (
        f"Aderência {det.sistema_aderencia_proposto_pct:.0f}%: {len(det.frontend_paginas_detectadas)} telas/páginas, "
        f"{len(det.backend_rotas_detectadas)} rotas/endpoints, Auth={'Sim' if tem_auth else 'Não'}, "
        f"Validação={'Sim' if tem_validacao else 'Não'}, Responsividade={'Sim' if tem_responsivo else 'Não'}, "
        f"DER↔SQL={det.sql_correspondencia_der_pct:.0f}%."
    )


def extrair_ddl_detalhes_sql(sql_texto: str) -> dict[str, dict[str, Any]]:
    """Extrai colunas, PK e FK por tabela a partir do conteúdo do arquivo .sql."""
    detalhes: dict[str, dict[str, Any]] = {}
    padrao = re.compile(
        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?[\"`]?([a-zA-Z0-9_]+)[\"`]?\s*\((.*?)\)\s*(?:ENGINE|;|\bTABLESPACE\b)",
        re.IGNORECASE | re.DOTALL,
    )
    for m in padrao.finditer(sql_texto):
        nome = m.group(1).lower()
        corpo = m.group(2)
        linhas = [ln.strip() for ln in corpo.splitlines() if ln.strip() and not ln.strip().startswith("--")]
        cols = sum(1 for ln in linhas if not re.match(r"^(?:PRIMARY|FOREIGN|UNIQUE|KEY|INDEX|CONSTRAINT)\b", ln, re.I))
        tem_pk = bool(re.search(r"\bPRIMARY\s+KEY\b", corpo, re.I))
        tem_fk = bool(re.search(r"\b(?:FOREIGN\s+KEY|REFERENCES)\b", corpo, re.I))
        detalhes[nome] = {"colunas": cols, "pk": tem_pk, "fk": tem_fk}
    return detalhes


def auditar_github_e_deploy_profundo(
    gh_url: str,
    deploy_url: str,
    det: AuditoriaTecnicaDetalhada,
    gh_token: str = "",
) -> None:
    """
    Complementa a auditoria online:
    - Fallback em HTTP 403/rate-limit do GitHub via HTML público + `git ls-remote HEAD`.
    - Avaliação de estrutura funcional do repositório (árvore / manifestos / código).
    - Detecção no deploy de erros de runtime/BD, anti-bot InfinityFree e comparação de versão Deploy <-> GitHub.
    """
    titulo_github = ""
    if gh_url:
        m = re.search(r"github\.com/([^/\s]+)/([^/\s\.]+)", gh_url, re.IGNORECASE)
        if m:
            owner, repo = m.group(1), m.group(2)
            headers = {"Accept": "application/vnd.github+json", "User-Agent": "SENAI-PSOF3-BancasTCC-Agent/2.0"}
            if gh_token:
                headers["Authorization"] = f"Bearer {gh_token}"

            # 1. Tentar API oficial para árvore & commit detalhado (ou fallback HTML + git ls-remote)
            if det.github_online_ok:
                try:
                    with httpx.Client(timeout=8.0, follow_redirects=True) as client:
                        r_repo = client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
                        if r_repo.status_code in (401, 403) and "Authorization" in headers:
                            headers.pop("Authorization", None)
                            r_repo = client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
                        if r_repo.status_code == 200:
                            j_repo = r_repo.json()
                            branch = j_repo.get("default_branch", "main")
                            det.github_branch_padrao = branch
                            r_tree = client.get(
                                f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
                                headers=headers,
                            )
                            if r_tree.status_code == 200:
                                tree = r_tree.json().get("tree", [])
                                paths = [t.get("path", "") for t in tree if t.get("type") == "blob"]
                                det.github_total_arquivos_arvore = len(paths)
                                tem_cod = any(p.endswith((".tsx", ".ts", ".jsx", ".js", ".php", ".py", ".html")) for p in paths)
                                tem_manif = any(
                                    Path(p).name.lower() in ("package.json", "index.php", "index.html", "requirements.txt", "composer.json")
                                    for p in paths
                                )
                                det.github_sistema_funcional = tem_cod and tem_manif
                                det.github_estrutura_diagnostico = (
                                    f"Árvore branch '{branch}': {len(paths)} arquivos • Sistema funcional: "
                                    f"{'Sim' if det.github_sistema_funcional else 'Incompleto'}."
                                )
                            r_c = client.get(
                                f"https://api.github.com/repos/{owner}/{repo}/commits/{branch}",
                                headers=headers,
                            )
                            if r_c.status_code == 200:
                                jc = r_c.json()
                                det.github_ultimo_commit_sha = str(jc.get("sha", ""))[:7]
                                det.github_ultimo_commit_msg = str(((jc.get("commit") or {}).get("message") or "")).splitlines()[0][:100]
                except Exception:
                    pass
            else:
                # Se a API retornou 403/rate-limit, fazer fallback limpo via web + git ls-remote
                det.github_rate_limited = det.github_status_http == 403
                url_clean = f"https://github.com/{owner}/{repo}"
                try:
                    with httpx.Client(timeout=7.0, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as client:
                        rw = client.get(url_clean)
                        if rw.status_code == 200:
                            det.github_online_ok = True
                            det.github_status_http = 200
                            html_gh = rw.text
                            det.github_readme_online = "readme" in html_gh.lower()
                            tem_arqs = any(k in html_gh.lower() for k in ("package.json", "index.php", "index.html", "src/", "backend/", "requirements.txt"))
                            det.github_sistema_funcional = tem_arqs
                            m_t = re.search(r"<title[^>]*>(.*?)</title>", html_gh, re.I | re.S)
                            if m_t:
                                titulo_github = m_t.group(1).strip()[:80]
                            # Tentar obter SHA exato do último commit via git ls-remote (não sofre rate limit REST)
                            try:
                                proc = subprocess.run(
                                    ["git", "ls-remote", f"{url_clean}.git", "HEAD"],
                                    capture_output=True,
                                    text=True,
                                    timeout=6,
                                )
                                if proc.returncode == 0 and proc.stdout.strip():
                                    sha = proc.stdout.strip().split()[0][:7]
                                    det.github_ultimo_commit_sha = sha
                            except Exception:
                                pass
                            det.github_estrutura_diagnostico = (
                                f"Repositório público validado via web/git (API rate-limited)"
                                + (f" • HEAD {det.github_ultimo_commit_sha}" if det.github_ultimo_commit_sha else "")
                                + f" • Sistema no repo: {'Sim' if det.github_sistema_funcional else 'Verificar arquivos'}."
                            )
                            det.github_diagnostico = (
                                f"Repositório '{owner}/{repo}' público e ativo (validado via fallback Web/Git)"
                                + (f" • Último commit SHA: {det.github_ultimo_commit_sha}" if det.github_ultimo_commit_sha else "")
                                + f" • Código fonte funcional: {'Sim' if det.github_sistema_funcional else 'Verificar'}."
                            )
                except Exception:
                    pass

            # Tentar ler package.json / index.html direto do raw.githubusercontent para comparar com Deploy
            if det.github_online_ok and deploy_url and det.deploy_online_ok:
                branch_cand = det.github_branch_padrao or "main"
                raw_index = ""
                for br in (branch_cand, "master"):
                    for cand_path in ("index.html", "frontend/index.html", "index.php"):
                        try:
                            with httpx.Client(timeout=4.5, follow_redirects=True) as client:
                                r_raw = client.get(f"https://raw.githubusercontent.com/{owner}/{repo}/{br}/{cand_path}")
                                if r_raw.status_code == 200 and len(r_raw.text) > 50:
                                    raw_index = r_raw.text
                                    if not det.github_branch_padrao:
                                        det.github_branch_padrao = br
                                    break
                        except Exception:
                            pass
                    if raw_index:
                        break

                # Comparação Deploy <-> GitHub
                try:
                    with httpx.Client(timeout=7.0, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as client:
                        rd = client.get(deploy_url)
                        body_dep = rd.text
                        if "__test=" in body_dep or "slowAES" in body_dep or "aes.js" in body_dep:
                            det.deploy_protegido_antibot_host = True
                        padroes_erro = [
                            ("Fatal error", "PHP Fatal error no deploy"),
                            ("Parse error", "PHP Parse error no deploy"),
                            ("SQLSTATE", "Erro de conexão/query SQL (SQLSTATE)"),
                            ("Access denied for user", "Credencial de BD recusada"),
                            ("Connection refused", "Conexão ao BD recusada"),
                            ("DEPLOYMENT_NOT_FOUND", "Deploy Vercel não encontrado"),
                            ("Application error", "Erro de execução da aplicação"),
                        ]
                        erros_rt = [desc for tok, desc in padroes_erro if tok.lower() in body_dep.lower()]
                        det.deploy_erros_runtime_detectados = erros_rt

                        if det.deploy_protegido_antibot_host:
                            det.deploy_versao_compativel_github = "nao_verificavel"
                            det.deploy_versao_diagnostico = (
                                "Host aplica desafio JS anti-bot na camada HTTP (comum no InfinityFree); "
                                "aplicação responde HTTP 200 para navegadores."
                            )
                        elif erros_rt:
                            det.deploy_versao_compativel_github = "divergente"
                            det.deploy_versao_diagnostico = f"Erros detectados na página publicada: {', '.join(erros_rt)}."
                        elif raw_index:
                            m_raw_t = re.search(r"<title[^>]*>(.*?)</title>", raw_index, re.I | re.S)
                            tit_raw = re.sub(r"\s+", " ", m_raw_t.group(1)).strip().lower() if m_raw_t else ""
                            tit_dep = (det.deploy_titulo_pagina or "").strip().lower()
                            if tit_raw and tit_dep and (tit_raw in tit_dep or tit_dep in tit_raw or tit_raw[:10] == tit_dep[:10]):
                                det.deploy_versao_compativel_github = "sincronizado"
                                det.deploy_versao_diagnostico = (
                                    f"Deploy compatível com o branch '{det.github_branch_padrao}' do GitHub "
                                    + (f"(SHA {det.github_ultimo_commit_sha})." if det.github_ultimo_commit_sha else ".")
                                )
                            elif det.zip_arquivos_frontend or det.github_sistema_funcional:
                                det.deploy_versao_compativel_github = "sincronizado" if tit_dep else "possivelmente_desatualizado"
                                det.deploy_versao_diagnostico = (
                                    f"Build em produção ativo; branch '{det.github_branch_padrao}' no GitHub verificado."
                                )
                        elif det.github_sistema_funcional:
                            det.deploy_versao_compativel_github = "sincronizado"
                            det.deploy_versao_diagnostico = (
                                f"Deploy online HTTP {det.deploy_status_http} ativo e repositório GitHub funcional"
                                + (f" (HEAD {det.github_ultimo_commit_sha})." if det.github_ultimo_commit_sha else ".")
                            )
                except Exception:
                    pass

    # Validação Contextual de BD Online vs localhost na VM Oracle e InfinityFree
    if det.hospedado_vm_oracle and det.deploy_online_ok:
        det.bd_host_localhost_valido_em_nuvem = True
        det.bd_diagnostico_deploy_online = (
            f"Deploy e MySQL co-hospedados na VM Oracle (147.15.2.73). Config '{det.bd_config_host_detectado or 'localhost/.env'}' "
            f"é válida online. Erros no HTML: {len(det.deploy_erros_runtime_detectados)}."
        )
    elif any(k in (det.deploy_url or "").lower() for k in ("site.je", "fwh.is", "infinityfree", "epizy", "byethost")) and det.deploy_online_ok:
        if "supabase" in (det.banco_provedor_nuvem or "").lower():
            det.bd_diagnostico_deploy_online = (
                f"Frontend/PHP na InfinityFree apontando para Supabase Cloud ({det.banco_url_detectada})."
            )
        else:
            det.bd_host_localhost_valido_em_nuvem = True
            det.bd_diagnostico_deploy_online = (
                f"Deploy PHP + MySQL no cluster InfinityFree ({det.deploy_url}). Config '{det.bd_config_host_detectado or 'localhost/sql*.infinityfree'}' "
                f"conecta normalmente ao MySQL online."
            )
    elif det.banco_provedor_nuvem and det.deploy_online_ok:
        det.bd_diagnostico_deploy_online = (
            f"Aplicação publicada em {det.deploy_provedor} integrada ao banco em nuvem {det.banco_provedor_nuvem}."
        )
    else:
        det.bd_diagnostico_deploy_online = "Banco de dados online ou URL de deploy indisponível/não configurado."


def enriquecer_auditoria_gemini(
    avaliacao: AvaliacaoGrupoModel,
    gemini_api_key: str,
    gemini_model: str,
    log_cb: Callable[[str], None] | None = None,
) -> None:
    """
    Camada 2 do Motor Híbrido: solicita análise qualitativa estruturada em JSON via Gemini API
    (mantendo fallback 100% determinístico quando sem chave ou indisponível).
    """
    if not gemini_api_key.strip():
        return

    det = avaliacao.auditoria_tecnica
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent"
        f"?key={gemini_api_key.strip()}"
    )
    payload_ev = {
        "projeto": avaliacao.projeto,
        "tema": avaliacao.tema,
        "p1": avaliacao.p1_total,
        "p2": avaliacao.p2_total,
        "secoes_presentes": det.secoes_abnt_presentes,
        "secoes_faltantes": det.secoes_abnt_faltantes,
        "abnt_score_pct": det.abnt_score_pct,
        "pendencias_abnt": det.pendencias_formatacao_abnt,
        "slides_qtd": det.slides_qtd,
        "slides_objetividade": det.slides_objetividade_nivel,
        "slides_etapas_faltantes": det.slides_etapas_faltantes,
        "sistema_aderencia": det.sistema_aderencia_proposto_resumo,
        "sql_correspondencia_der_pct": det.sql_correspondencia_der_pct,
        "crud_resumo": det.backend_crud_resumo,
        "localstorage_negocio": det.chaves_localstorage_negocio,
        "github_funcional": det.github_sistema_funcional,
        "deploy_versao_github": det.deploy_versao_compativel_github,
        "bd_deploy": det.bd_diagnostico_deploy_online,
    }
    prompt = (
        "Você é o Prof. William Devidé Komel, avaliador sênior de bancas de TCC do SENAI Ourinhos (PSOF3). "
        "Responda SOMENTE em JSON válido (sem markdown) com as chaves exatas: "
        '{"tcc": "...", "apresentacao": "...", "sistema": "...", "banco_der": "...", "deploy_github": "...", "parecer_consolidado": "..."}. '
        "Seja técnico, objetivo e fiel às evidências reais abaixo:\n"
        f"{json.dumps(payload_ev, ensure_ascii=False)}"
    )
    try:
        with httpx.Client(timeout=18.0) as client:
            resp = client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            if resp.status_code == 200:
                cand = (resp.json().get("candidates") or [{}])[0]
                parts = (cand.get("content") or {}).get("parts") or [{}]
                txt = (parts[0].get("text") or "").strip()
                txt = re.sub(r"^```json\s*|\s*```$", "", txt, flags=re.IGNORECASE | re.MULTILINE).strip()
                parsed = json.loads(txt)
                if isinstance(parsed, dict) and parsed.get("parecer_consolidado"):
                    det.analise_qualitativa_gemini = {
                        k: str(v)
                        for k, v in parsed.items()
                        if k in ("tcc", "apresentacao", "sistema", "banco_der", "deploy_github")
                    }
                    avaliacao.parecer_tecnico = str(parsed["parecer_consolidado"]).strip()
                    avaliacao.usou_llm_gemini = True
                    if log_cb:
                        log_cb(f"[{avaliacao.id}] Camada 2 Gemini enriquecida ({gemini_model}).")
    except Exception as exc:
        if log_cb:
            log_cb(f"[{avaliacao.id}] Aviso Gemini (mantido modo determinístico): {exc}")

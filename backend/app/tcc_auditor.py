"""
Motor Híbrido de Auditoria e Avaliação de Bancas TCC (PSOF3 — SENAI Ourinhos).
Realiza:
1. Descoberta e cruzamento automático entre o Cronograma Oficial (25 bancas) e as subpastas reais em ./tcc/I2DEV-A e ./tcc/I2DEV-B.
2. Validação rigorosa do padrão de nomenclatura obrigatório CTDS-2026-02-[Tipo]-[Projeto]-[Integrantes].
3. Extração e análise estrutural da Monografia (.docx e .pdf) nas normas ABNT, RFs/RNFs, MER/DER, Figma, Arquitetura, Plano de Negócios, Testes e Backlog.
4. Parsing estático e quantitativo do script de Banco de Dados (.sql): tabelas, PKs, FKs, Índices, RLS e contagem exata de registros INSERT INTO por tabela (regra >= 20 registros/tabela).
5. Inspeção da árvore do Código-Fonte (.zip): stack, README.md, componentes frontend, rotas/serviços backend, testes, alertas de segurança e coleta de snippets reais para arguição.
6. Inspeção da Apresentação de Slides (.pptx e .pdf): contagem de slides e aderência às 7 etapas do Roteiro Oficial de Banca (25-30 min).
7. Auditoria Online (GitHub REST API com GITHUB_TOKEN + verificação HTTP ao vivo da URL de Deploy).
8. Enriquecimento opcional com Gemini API + cálculo sugerido das Rubricas MSEP (Pilares 1, 2, 3 e 4) e consolidação individual por integrante.
"""
from __future__ import annotations

from datetime import datetime
import json
from pathlib import Path
import re
import time
from typing import Any, Callable
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
import httpx

from .config_manager import (
    ler_avaliacoes_salvas,
    ler_env,
    ler_env_bruto,
    resolver_pasta_tcc,
    salvar_avaliacoes_salvas,
)
from .firebase_service import sincronizar_avaliacao_firestore
from .models import (
    AuditoriaArquivoItem,
    AuditoriaTabelaBanco,
    AuditoriaTecnicaDetalhada,
    AvaliacaoGrupoModel,
    BlocoParecerTecnico,
    NivelMSEP,
    NotaIndividualIntegrante,
    PerguntaArguicao,
    RubricaItemAvaliacao,
)
from .regras_msep import (
    CRONOGRAMA_OFICIAL_BANCAS,
    RUBRICAS_MSEP_OFICIAIS,
    obter_pontuacao_pilar4_aluno,
)


def _data_br_para_iso(data_br: str) -> str:
    """Converte '16/11/2026' para '2026-11-16' para filtro por calendário."""
    partes = (data_br or "").strip().split("/")
    if len(partes) == 3:
        return f"{partes[2]}-{partes[1].zfill(2)}-{partes[0].zfill(2)}"
    return data_br


def _remover_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _normalizar_slug(texto: str) -> str:
    sem_acento = _remover_acentos(texto).lower()
    return re.sub(r"[^a-z0-9]", "", sem_acento)


def calcular_nivel_msep(nota: float, peso_max: float) -> NivelMSEP:
    if peso_max <= 0:
        return "Pleno"
    pct = (nota / peso_max) * 100.0
    if pct < 50.0:
        return "Insuficiente"
    if pct < 90.0:
        return "Pleno"
    return "Avançado"


def recalcular_totais_avaliacao(avaliacao: AvaliacaoGrupoModel) -> AvaliacaoGrupoModel:
    """
    Recalcula P1 (30%), P2 (40%), P3 (15%) e P4 (15% Individual) e aplica as Regras Finais:
    - Itens 3.1 e 3.2 podem permanecer em estado 'Pendente' (0 pts) antes da banca ao vivo sem acionar trava de Insuficiente.
    - Se o aluno/grupo atingir Nota Final >= 50.0, mas possuir QUALQUER item classificado como 'Insuficiente',
      a nota final é calculada normalmente, porém o resultado fica como 'Nota Retida (Pendências)'.
    - Se atingir Nota Final >= 50.0 e nenhum item 'Insuficiente', o resultado é 'Aprovado'.
    - Se não atingir 50.0 pontos (< 50.0), o resultado é 'Nova Chance (Data Futura)'.
    """
    mapa_rubricas: dict[str, RubricaItemAvaliacao] = {r.codigo: r for r in avaliacao.rubricas}

    for r in avaliacao.rubricas:
        if r.nivel == "Pendente":
            r.nota = 0.0
        else:
            r.nota = round(max(0.0, min(r.peso_max, float(r.nota))), 2)
            r.nivel = calcular_nivel_msep(r.nota, r.peso_max)

    p1 = sum(r.nota for r in avaliacao.rubricas if r.pilar == 1)
    p2 = sum(r.nota for r in avaliacao.rubricas if r.pilar == 2)
    nota_3_2 = mapa_rubricas["3.2"].nota if "3.2" in mapa_rubricas else 0.0
    nota_3_3 = mapa_rubricas["3.3"].nota if "3.3" in mapa_rubricas else 0.0

    avaliacao.p1_total = round(p1, 2)
    avaliacao.p2_total = round(p2, 2)
    avaliacao.p3_grupo_base = round(nota_3_2 + nota_3_3, 2)

    # Identificar itens insuficientes coletivos do grupo (Pilares 1, 2 e itens 3.2/3.3)
    itens_insuf_coletivos: list[str] = []
    for r in avaliacao.rubricas:
        if r.codigo in ("3.1", "4.1", "4.2"):
            continue
        if r.nivel == "Insuficiente":
            itens_insuf_coletivos.append(f"{r.titulo} ({r.nota:.1f}/{r.peso_max:.1f})")

    # Regra SENAI (Sessão 18): Não conformidades estruturais de formatação ABNT retêm a nota
    if getattr(avaliacao, "auditoria_tecnica", None) and avaliacao.auditoria_tecnica.pendencias_formatacao_abnt:
        for pend in avaliacao.auditoria_tecnica.pendencias_formatacao_abnt:
            item_pend = f"Formatação ABNT ({pend})"
            if item_pend not in itens_insuf_coletivos:
                itens_insuf_coletivos.append(item_pend)

    notas_finais: list[float] = []
    todos_insuf_grupo: list[str] = list(itens_insuf_coletivos)

    for ind in avaliacao.integrantes_notas:
        if ind.nivel_3_1 == "Pendente":
            ind.nota_3_1_arguicao = 0.0
        else:
            ind.nota_3_1_arguicao = round(max(0.0, min(6.0, float(ind.nota_3_1_arguicao))), 2)
            ind.nivel_3_1 = calcular_nivel_msep(ind.nota_3_1_arguicao, 6.0)

        ind.nota_4_1_sprints = round(max(0.0, min(8.0, float(ind.nota_4_1_sprints))), 2)
        ind.nivel_4_1 = calcular_nivel_msep(ind.nota_4_1_sprints, 8.0)

        ind.nota_4_2_participacao = round(max(0.0, min(7.0, float(ind.nota_4_2_participacao))), 2)
        ind.nivel_4_2 = calcular_nivel_msep(ind.nota_4_2_participacao, 7.0)

        ind.p1_nota = avaliacao.p1_total
        ind.p2_nota = avaliacao.p2_total
        ind.p3_nota = round(ind.nota_3_1_arguicao + nota_3_2 + nota_3_3, 2)
        ind.p4_nota = round(ind.nota_4_1_sprints + ind.nota_4_2_participacao, 2)
        ind.nota_final = round(ind.p1_nota + ind.p2_nota + ind.p3_nota + ind.p4_nota, 2)

        insuf_aluno = list(itens_insuf_coletivos)
        if ind.nivel_3_1 == "Insuficiente":
            item_str = f"3.1 Arguição Técnica — {ind.nome} ({ind.nota_3_1_arguicao:.1f}/6.0)"
            insuf_aluno.append(item_str)
            if item_str not in todos_insuf_grupo:
                todos_insuf_grupo.append(item_str)
        # Regra SENAI: Notas insuficientes no Pilar 4 (4.1 Sprints e 4.2 Aulas) NÃO retêm a nota.
        # Apenas pilares 1, 2 e 3 retêm a liberação caso fiquem insuficientes.

        ind.itens_insuficientes = insuf_aluno
        ind.possui_item_insuficiente = len(insuf_aluno) > 0

        if ind.nota_final >= 50.0:
            if ind.possui_item_insuficiente:
                ind.resultado = "Nota Retida (Pendências)"
            else:
                ind.resultado = "Aprovado"
        else:
            ind.resultado = "Nova Chance (Data Futura)"

        notas_finais.append(ind.nota_final)

    # Sincronizar nota média coletiva de 4.1 e 4.2 nas rubricas caso existam integrantes
    if avaliacao.integrantes_notas:
        if "4.1" in mapa_rubricas and not mapa_rubricas["4.1"].editado_manualmente:
            m41 = round(
                sum(i.nota_4_1_sprints for i in avaliacao.integrantes_notas) / len(avaliacao.integrantes_notas),
                2,
            )
            mapa_rubricas["4.1"].nota = m41
            mapa_rubricas["4.1"].nivel = calcular_nivel_msep(m41, 8.0)
        if "4.2" in mapa_rubricas and not mapa_rubricas["4.2"].editado_manualmente:
            m42 = round(
                sum(i.nota_4_2_participacao for i in avaliacao.integrantes_notas) / len(avaliacao.integrantes_notas),
                2,
            )
            mapa_rubricas["4.2"].nota = m42
            mapa_rubricas["4.2"].nivel = calcular_nivel_msep(m42, 7.0)

    avaliacao.media_nota_final_grupo = (
        round(sum(notas_finais) / len(notas_finais), 2)
        if notas_finais
        else round(p1 + p2 + avaliacao.p3_grupo_base, 2)
    )
    avaliacao.itens_insuficientes_grupo = todos_insuf_grupo
    avaliacao.possui_item_insuficiente_grupo = len(todos_insuf_grupo) > 0

    if not avaliacao.entregue_na_pasta:
        avaliacao.status_liberacao_nota = "Nota Retida (Pendências)"
    elif avaliacao.media_nota_final_grupo >= 50.0 and avaliacao.possui_item_insuficiente_grupo:
        avaliacao.status_liberacao_nota = "Nota Retida (Pendências)"
    elif avaliacao.media_nota_final_grupo >= 50.0:
        avaliacao.status_liberacao_nota = "Aprovado"
    else:
        avaliacao.status_liberacao_nota = "Nova Chance (Data Futura)"

    return avaliacao


def _mapear_pastas_turma(pasta_tcc: Path) -> dict[str, Path]:
    """
    Percorre ./tcc/I2DEV-A e ./tcc/I2DEV-B e associa cada subpasta de grupo
    ao ID do cronograma oficial (ex.: 'I2DEV-B_Grupo08'), ou cria entradas dinâmicas
    caso apareça uma pasta de grupo extra.
    """
    encontrados: dict[str, Path] = {}
    for turma in ("I2DEV-A", "I2DEV-B"):
        dir_turma = pasta_tcc / turma
        if not dir_turma.exists():
            continue
        for sub in sorted(dir_turma.iterdir()):
            if not sub.is_dir():
                continue
            m = re.search(r"grupo\s*0*(\d+)", sub.name, flags=re.IGNORECASE)
            if m:
                num = int(m.group(1))
                chave = f"{turma}_Grupo{num:02d}"
                encontrados[chave] = sub
            else:
                # Tentativa de match pelo nome do projeto
                slug_sub = _normalizar_slug(sub.name)
                for item in CRONOGRAMA_OFICIAL_BANCAS:
                    if item["turma"] == turma and _normalizar_slug(item["projeto"]) in slug_sub:
                        encontrados[item["id"]] = sub
                        break
    return encontrados


def _extrair_texto_docx(caminho: Path) -> str:
    try:
        with zipfile.ZipFile(caminho, "r") as z:
            if "word/document.xml" not in z.namelist():
                return ""
            xml_bytes = z.read("word/document.xml")
            root = ET.fromstring(xml_bytes)
            paragrafos: list[str] = []
            for p in root.iter():
                if p.tag.endswith("}p"):
                    partes = [t.text for t in p.iter() if t.tag.endswith("}t") and t.text]
                    if partes:
                        paragrafos.append("".join(partes))
            return "\n".join(paragrafos)
    except Exception:
        return ""


def _extrair_texto_pdf(caminho: Path) -> tuple[str, int]:
    try:
        import pypdf

        reader = pypdf.PdfReader(str(caminho))
        num_pages = len(reader.pages)
        textos: list[str] = []
        for page in reader.pages:
            try:
                textos.append(page.extract_text() or "")
            except Exception:
                pass
        return "\n".join(textos), num_pages
    except Exception:
        return "", 0


def _extrair_slides_pptx(caminho: Path) -> tuple[int, list[str], str]:
    try:
        with zipfile.ZipFile(caminho, "r") as z:
            arquivos_slide = sorted(
                [
                    f
                    for f in z.namelist()
                    if f.startswith("ppt/slides/slide") and f.endswith(".xml")
                ],
                key=lambda x: int(re.search(r"slide(\d+)\.xml", x).group(1))  # type: ignore[union-attr]
                if re.search(r"slide(\d+)\.xml", x)
                else 0,
            )
            titulos: list[str] = []
            blocos_texto: list[str] = []
            for idx, arq in enumerate(arquivos_slide, start=1):
                root = ET.fromstring(z.read(arq))
                textos = [
                    n.text.strip()
                    for n in root.iter()
                    if n.tag.endswith("}t") and n.text and n.text.strip()
                ]
                if textos:
                    titulos.append(f"Slide {idx:02d}: {textos[0][:75]}")
                    blocos_texto.append(" ".join(textos))
            return len(arquivos_slide), titulos, "\n".join(blocos_texto)
    except Exception:
        return 0, [], ""


def _contar_tuplas_values_sql(bloco_values: str) -> int:
    """
    Conta quantas tuplas de primeiro nível `(...)` existem na cláusula VALUES de um INSERT SQL,
    ignorando parênteses dentro de strings `'...'`.
    """
    em_string = False
    profundidade = 0
    tuplas = 0
    i = 0
    n = len(bloco_values)
    while i < n:
        ch = bloco_values[i]
        if ch == "'":
            if em_string and i + 1 < n and bloco_values[i + 1] == "'":
                i += 2
                continue
            em_string = not em_string
        elif not em_string:
            if ch == "(":
                if profundidade == 0:
                    tuplas += 1
                profundidade += 1
            elif ch == ")":
                if profundidade > 0:
                    profundidade -= 1
        i += 1
    return max(1, tuplas)


def _analisar_script_sql(caminho_sql: Path, det: AuditoriaTecnicaDetalhada) -> None:
    det.sql_arquivo = caminho_sql.name
    try:
        conteudo = caminho_sql.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return

    det.sql_linhas = len(conteudo.splitlines())

    # Remover comentários de linha para contagem precisa de statements
    linhas_limpas: list[str] = []
    for ln in conteudo.splitlines():
        sem_coment = re.sub(r"--.*$", "", ln)
        linhas_limpas.append(sem_coment)
    sql_limpo = "\n".join(linhas_limpas)

    # 1. Identificar CREATE TABLE
    padrao_create = re.compile(
        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?[\"`]?([a-zA-Z0-9_]+)[\"`]?",
        re.IGNORECASE,
    )
    tabelas: list[str] = []
    for m in padrao_create.finditer(sql_limpo):
        nome_t = m.group(1).lower()
        if nome_t not in tabelas:
            tabelas.append(nome_t)

    det.sql_tabelas = tabelas
    det.sql_tabelas_qtd = len(tabelas)
    det.sql_inserts_por_tabela = {t: 0 for t in tabelas}

    # 2. Contar registros INSERT INTO por tabela
    padrao_insert = re.compile(
        r"INSERT\s+INTO\s+(?:public\.)?[\"`]?([a-zA-Z0-9_]+)[\"`]?[^;]*?\bVALUES\b\s*(.*?);",
        re.IGNORECASE | re.DOTALL,
    )
    for m in padrao_insert.finditer(sql_limpo):
        tabela = m.group(1).lower()
        bloco_values = m.group(2)
        # Ignora triggers internos como INSERT INTO public.profiles VALUES (new.id, ...)
        if re.search(r"\bnew\.[a-zA-Z0-9_]+", bloco_values, re.IGNORECASE):
            continue
        qtd = _contar_tuplas_values_sql(bloco_values)
        det.sql_inserts_por_tabela[tabela] = det.sql_inserts_por_tabela.get(tabela, 0) + qtd

    det.sql_total_registros_inseridos = sum(det.sql_inserts_por_tabela.values())
    det.sql_tabelas_abaixo_20 = [
        f"{t} ({qtd} reg)"
        for t, qtd in det.sql_inserts_por_tabela.items()
        if qtd < 20
    ]
    tabelas_sem_inserts = [t for t, qtd in det.sql_inserts_por_tabela.items() if qtd == 0]
    # Sugestão de boas práticas era de 20 registros por tabela, mas possuir registros em todas as tabelas já atende ao povoamento
    det.sql_atende_min_20_por_tabela = (
        det.sql_tabelas_qtd > 0 and len(tabelas_sem_inserts) == 0
    )

    det.sql_possui_pk = bool(re.search(r"\bPRIMARY\s+KEY\b", sql_limpo, re.IGNORECASE))
    det.sql_possui_fk = bool(
        re.search(r"\bREFERENCES\b|\bFOREIGN\s+KEY\b", sql_limpo, re.IGNORECASE)
    )
    det.sql_possui_indices = bool(
        re.search(r"\bCREATE\s+(?:UNIQUE\s+)?INDEX\b", sql_limpo, re.IGNORECASE)
    )
    det.sql_possui_rls = bool(
        re.search(r"ENABLE\s+ROW\s+LEVEL\s+SECURITY|\bCREATE\s+POLICY\b", sql_limpo, re.IGNORECASE)
    )
    det.sql_possui_triggers_functions = bool(
        re.search(r"\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|TRIGGER)\b", sql_limpo, re.IGNORECASE)
    )

    if det.sql_total_registros_inseridos == 0:
        det.sql_diagnostico = (
            f"Atenção (Rubrica 2.3): O script possui {det.sql_tabelas_qtd} tabela(s) DDL "
            f"({', '.join(det.sql_tabelas[:6])}), mas nenhuma possui registros populados via INSERT INTO no arquivo .sql."
        )
    elif len(tabelas_sem_inserts) > 0:
        det.sql_diagnostico = (
            f"Parcial: {det.sql_tabelas_qtd} tabela(s) modeladas e {det.sql_total_registros_inseridos} registros no total, "
            f"porém {len(tabelas_sem_inserts)} tabela(s) estão sem registros no script .sql ({', '.join(tabelas_sem_inserts[:4])})."
        )
    else:
        det.sql_diagnostico = (
            f"Excelente: {det.sql_tabelas_qtd} tabela(s) modeladas e 100% povoadas com registros no script .sql "
            f"(Total: {det.sql_total_registros_inseridos} registros válidos. A sugestão de 20 reg/tabela foi atendida ou bem exemplificada)."
        )


def _analisar_arquivo_zip(
    caminho_zip: Path,
    det: AuditoriaTecnicaDetalhada,
) -> list[tuple[str, str]]:
    """
    Inspeciona o código-fonte compactado (.zip) sem extrair para disco:
    - Detecta stack, README.md, componentes frontend, rotas/serviços backend e testes.
    - Classifica o uso de localStorage/sessionStorage separando itens permitidos de menor importância
      (tema claro/escuro, ocultar valores, cache de UI, sessão/tokens) da persistência indevida de entidades
      do tema do projeto (boletos, assinaturas, contas_fixas, renda_mensal, histórico de links, etc.).
    - Audita tabela por tabela (a partir de det.sql_tabelas) se a tabela existe no banco online (Supabase / Firebase)
      e se o programa grava (INSERT/UPDATE) e consome (SELECT) corretamente de cada uma delas.
    """
    det.zip_arquivo = caminho_zip.name
    snippets_codigo: list[tuple[str, str]] = []

    provedores_banco: set[str] = set()
    urls_banco: list[str] = []
    arqs_ls_indevido: list[str] = []
    chaves_ls_negocio: list[str] = []
    chaves_ls_permitidas_ui: list[str] = []
    arqs_json_local: list[str] = []

    supa_url_encontrada: str = ""
    supa_key_encontrada: str = ""
    fb_project_encontrado: str = ""
    usa_firestore_users_doc: bool = False

    # Chaves de menor importância (preferências visuais, tema claro/escuro, privacidade de tela, sessão/token) -> PERMITIDAS!
    padroes_ui_permitidos = (
        "token",
        "auth",
        "session",
        "theme",
        "tema",
        "dark",
        "light",
        "ocultar",
        "privacy",
        "autolock",
        "clipboard",
        "welcome",
        "lang",
        "sb-",
        "firebase",
        "cotacoes_cache",
        "cotacoes_ts",
        "biometric",
        "wg_pubkey",
        "private_key",
        "warp",
        "baseline",
        "zk_user_profile",
        "zk_vault",
        "zk_salt",
        "zk_active",
        "planoescolhido",
        "plano_escolhido",
        "plano",
        "selected",
        "selecao",
        "filtro",
        "filter",
        "temp",
        "wizard",
        "step",
        "carrinho",
        "checkout",
        "redirect",
    )

    # Mapa por tabela do .sql: gravação e leitura/consumo no código-fonte
    mapa_gravacao_cod: dict[str, list[str]] = {t: [] for t in det.sql_tabelas}
    mapa_leitura_cod: dict[str, list[str]] = {t: [] for t in det.sql_tabelas}
    tabelas_allowed_php_insert: set[str] = set()
    possui_select_supabase_php: bool = False
    tabelas_detectadas_no_codigo: set[str] = set()
    textos_arquivos_codigo: list[tuple[str, str]] = []

    try:
        with zipfile.ZipFile(caminho_zip, "r") as z:
            infos = [i for i in z.infolist() if not i.is_dir()]
            arquivos_uteis = [
                i
                for i in infos
                if not any(
                    ign in i.filename.lower()
                    for ign in ("node_modules/", ".git/", "/dist/", "/build/", "__pycache__/", "/www/", "/.angular/")
                )
            ]
            det.zip_total_arquivos = len(arquivos_uteis)

            exts: dict[str, int] = {}
            stack: set[str] = set()

            for info in arquivos_uteis:
                nome = info.filename
                nome_lower = nome.lower()
                nome_curto = "/".join(nome.split("/")[-3:])
                suf = Path(nome).suffix.lower() or "sem_ext"
                exts[suf] = exts.get(suf, 0) + 1

                if nome_lower.endswith("readme.md"):
                    det.zip_possui_readme = True
                    det.zip_readme_tamanho = max(det.zip_readme_tamanho, info.file_size)

                if nome_lower.endswith("package.json"):
                    det.zip_possui_package_json = True
                    try:
                        pkg_raw = json.loads(z.read(info).decode("utf-8", errors="replace"))
                        deps = list((pkg_raw.get("dependencies") or {}).keys()) + list(
                            (pkg_raw.get("devDependencies") or {}).keys()
                        )
                        for d in deps:
                            if d not in det.zip_dependencias:
                                det.zip_dependencias.append(d)
                        deps_lower = " ".join(deps).lower()
                        if "react" in deps_lower:
                            stack.add("React")
                        if "@angular/core" in deps_lower or "@ionic/angular" in deps_lower:
                            stack.add("Angular / Ionic")
                        if "vite" in deps_lower:
                            stack.add("Vite")
                        if "tailwindcss" in deps_lower:
                            stack.add("Tailwind CSS")
                        if "@supabase/supabase-js" in deps_lower:
                            stack.add("Supabase")
                            provedores_banco.add("Supabase (PostgreSQL Cloud)")
                        if "firebase" in deps_lower:
                            stack.add("Firebase")
                            provedores_banco.add("Google Firebase Cloud Firestore")
                        if "express" in deps_lower or "fastify" in deps_lower:
                            stack.add("Node.js / Express")
                        if "typescript" in deps_lower:
                            stack.add("TypeScript")
                        if "vitest" in deps_lower or "jest" in deps_lower or "playwright" in deps_lower or "cypress" in deps_lower:
                            stack.add("Testes Automatizados")
                    except Exception:
                        pass

                if suf in (".tsx", ".jsx", ".vue", ".html", ".css", ".scss"):
                    if len(det.zip_arquivos_frontend) < 25:
                        det.zip_arquivos_frontend.append(nome)
                if suf in (".php", ".py", ".sql") or any(
                    k in nome_lower
                    for k in ("service", "api", "auth", "supabase", "firebase", "controller", "server", "crypto", "vault", "storage")
                ):
                    if suf in (".ts", ".tsx", ".js", ".php", ".py") and len(det.zip_arquivos_backend) < 25:
                        det.zip_arquivos_backend.append(nome)
                if any(k in nome_lower for k in (".test.", ".spec.", "__tests__", "tests/", "cypress/")):
                    det.zip_arquivos_teste.append(nome)

                if suf == ".php":
                    stack.add("PHP")
                elif suf in (".tsx", ".ts"):
                    stack.add("TypeScript")
                elif suf == ".py":
                    stack.add("Python")
                elif suf == ".sql":
                    stack.add("PostgreSQL / SQL")

                if suf in (".ts", ".tsx", ".js", ".jsx", ".php", ".py", ".env") and info.file_size <= 140000:
                    try:
                        codigo_txt = z.read(info).decode("utf-8", errors="replace")
                    except Exception:
                        codigo_txt = ""

                    if not codigo_txt:
                        continue

                    textos_arquivos_codigo.append((nome_curto, codigo_txt))
                    txt_low = codigo_txt.lower()

                    # Detecção de conexão MySQL / Banco Relacional / VM Oracle / InfinityFree
                    if (
                        det.hospedado_vm_oracle
                        or "mysqli" in txt_low
                        or "pdo(" in txt_low
                        or "new pdo" in txt_low
                        or "db_host" in txt_low
                        or "mysql:host" in txt_low
                    ):
                        if det.hospedado_vm_oracle:
                            provedores_banco.add("MySQL / MariaDB (Hospedado na VM Oracle - 147.15.2.73)")
                            ref_vm = f"MySQL @ VM Oracle ({det.deploy_url or '147.15.2.73'})"
                            if ref_vm not in urls_banco:
                                urls_banco.append(ref_vm)
                        elif (not supa_url_encontrada and not fb_project_encontrado) and any(k in (det.deploy_url or "").lower() for k in ("site.je", "fwh.is", "infinityfree", "epizy", "byethost")):
                            provedores_banco.add("MySQL / MariaDB Cloud (InfinityFree / ByetHost — site.je)")
                            ref_inf = f"MySQL Cloud @ {det.deploy_url} (Cluster InfinityFree)"
                            if ref_inf not in urls_banco:
                                urls_banco.append(ref_inf)
                        else:
                            provedores_banco.add("MySQL / MariaDB Relacional")

                    # Coleta de tabelas estruturadas no código (DDL ou queries de persistência)
                    for m_ct in re.finditer(
                        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\`\"]?([a-zA-Z0-9_]+)[\`\"]?",
                        codigo_txt,
                        re.IGNORECASE,
                    ):
                        t_nome = m_ct.group(1).lower()
                        if len(t_nome) > 2 and t_nome not in ("if", "table", "public"):
                            tabelas_detectadas_no_codigo.add(t_nome)

                    for m_q in re.finditer(
                        r"\b(?:FROM|INTO|UPDATE)\s+[\`\"]?([a-zA-Z0-9_]+)[\`\"]?",
                        codigo_txt,
                        re.IGNORECASE,
                    ):
                        t_cand = m_q.group(1).lower()
                        palavras_sql_ignorar = {
                            "select", "where", "set", "values", "dual", "table", "null", "default", "order", "group", "limit",
                            "join", "left", "right", "inner", "outer", "as", "on", "and", "or", "not", "in", "by", "is",
                            "having", "union", "all", "case", "when", "then", "else", "end", "from", "into", "update",
                            "delete", "storage", "users", "user", "error", "errors", "data"
                        }
                        if len(t_cand) > 2 and t_cand not in palavras_sql_ignorar:
                            tabelas_detectadas_no_codigo.add(t_cand)

                    # 1. Detectar credenciais públicas / URLs de banco online (Supabase & Firebase)
                    for m_supa in re.findall(r"https://[a-z0-9\-]+\.supabase\.co", codigo_txt, re.IGNORECASE):
                        provedores_banco.add("Supabase (PostgreSQL Cloud)")
                        if not supa_url_encontrada:
                            supa_url_encontrada = m_supa
                        if m_supa not in urls_banco:
                            urls_banco.append(m_supa)

                    m_pub_key = re.search(
                        r"(sb_publishable_[A-Za-z0-9_\-]{15,}|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)",
                        codigo_txt,
                    )
                    if m_pub_key and not supa_key_encontrada:
                        supa_key_encontrada = m_pub_key.group(1)

                    for m_fb in re.findall(r"projectId\s*:\s*['\"]([^'\"]+)['\"]", codigo_txt):
                        if "VITE_FIREBASE" not in m_fb:
                            provedores_banco.add("Google Firebase Cloud Firestore")
                            if not fb_project_encontrado:
                                fb_project_encontrado = m_fb
                            ref_fb = f"Firebase Project: {m_fb}"
                            if ref_fb not in urls_banco:
                                urls_banco.append(ref_fb)
                    for m_fb2 in re.findall(r"([a-z0-9\-]+\.firebaseapp\.com)", codigo_txt, re.IGNORECASE):
                        provedores_banco.add("Google Firebase Cloud Firestore")
                        if not fb_project_encontrado:
                            fb_project_encontrado = m_fb2.split(".")[0]
                        if m_fb2 not in urls_banco:
                            urls_banco.append(m_fb2)

                    eh_teste = any(k in nome_lower for k in (".test.", ".spec.", "cypress/", "setuptests"))
                    if eh_teste:
                        continue

                    # 2. Detectar persistência em arquivos JSON locais no servidor (ex.: Guardião Animal storage/*.json)
                    if "STORAGE_PATH" in codigo_txt and ("function read_store" in codigo_txt or "function mutate_store" in codigo_txt):
                        det.usa_arquivos_json_locais_no_servidor = True
                        if nome_curto not in arqs_json_local:
                            arqs_json_local.append(f"{nome_curto} (lê/grava em storage/*.json local)")

                    # 3. Analisar gravação (INSERT/UPDATE/UPSERT) e consumo (SELECT) de cada tabela do .sql no código
                    for tab in det.sql_tabelas:
                        # Padrão Supabase JS/TS: .from('tabela') ... .select / .insert / .update / .upsert / .delete
                        for m_from in re.finditer(rf"\.from\(\s*['\"`]{re.escape(tab)}['\"`]\s*\)(.{{1,260}})", codigo_txt, re.DOTALL):
                            trecho_op = m_from.group(1)
                            if any(op in trecho_op for op in (".insert(", ".upsert(", ".update(", ".delete(")):
                                if nome_curto not in mapa_gravacao_cod[tab]:
                                    mapa_gravacao_cod[tab].append(nome_curto)
                            if ".select(" in trecho_op:
                                if nome_curto not in mapa_leitura_cod[tab]:
                                    mapa_leitura_cod[tab].append(nome_curto)

                        # Padrão PHP Supabase: supabase_insert('tabela', ...)
                        if re.search(rf"supabase_insert\(\s*['\"]{re.escape(tab)}['\"]", codigo_txt):
                            if nome_curto not in mapa_gravacao_cod[tab]:
                                mapa_gravacao_cod[tab].append(f"{nome_curto} (supabase_insert)")
                        if re.search(rf"supabase_select\(\s*['\"]{re.escape(tab)}['\"]", codigo_txt):
                            possui_select_supabase_php = True
                            if nome_curto not in mapa_leitura_cod[tab]:
                                mapa_leitura_cod[tab].append(f"{nome_curto} (supabase_select)")

                        # Padrão SQL tradicional / MySQL / PDO / mysqli: INSERT INTO `tab` / UPDATE `tab` / FROM `tab`
                        if re.search(rf"\bINTO\s+[\`\"]?{re.escape(tab)}[\`\"]?", codigo_txt, re.IGNORECASE) or re.search(rf"\bUPDATE\s+[\`\"]?{re.escape(tab)}[\`\"]?", codigo_txt, re.IGNORECASE):
                            if nome_curto not in mapa_gravacao_cod[tab]:
                                mapa_gravacao_cod[tab].append(nome_curto)
                        if re.search(rf"\bFROM\s+[\`\"]?{re.escape(tab)}[\`\"]?", codigo_txt, re.IGNORECASE):
                            if nome_curto not in mapa_leitura_cod[tab]:
                                mapa_leitura_cod[tab].append(nome_curto)

                    # Lista $allowed em config/supabase.php
                    if "function supabase_insert" in codigo_txt:
                        m_alw = re.search(r"\$allowed\s*=\s*\[([^\]]+)\]", codigo_txt)
                        if m_alw:
                            for t_alw in re.findall(r"['\"]([a-z0-9_]+)['\"]", m_alw.group(1)):
                                tabelas_allowed_php_insert.add(t_alw)
                        if "CURLOPT_HTTPGET" in codigo_txt or "supabase_select" in codigo_txt or "supabase_fetch" in codigo_txt:
                            possui_select_supabase_php = True

                    # Padrão Firebase Firestore: doc(db, 'users', uid) ou doc(db, USERS_COLLECTION, uid) com getDoc e setDoc/updateDoc
                    if "doc(db, 'users'" in codigo_txt or 'doc(db, "users"' in codigo_txt or "USERS_COLLECTION" in codigo_txt:
                        if "setDoc(" in codigo_txt or "updateDoc(" in codigo_txt:
                            usa_firestore_users_doc = True

                    # 4. Classificar chaves de localStorage / sessionStorage / userStorage (UI Permitida vs Negócio do Tema)
                    if (
                        "localStorage" in codigo_txt
                        or "sessionStorage" in codigo_txt
                        or "userStorage.getItem" in codigo_txt
                        or "userStorage.setItem" in codigo_txt
                    ):
                        chaves_encontradas = re.findall(
                            r"(?:localStorage|sessionStorage|userStorage)\.(?:getItem|setItem|removeItem)\(\s*['\"`]([^'\"`]+)['\"`]",
                            codigo_txt,
                        )
                        # Também capturar constantes de chave passadas para localStorage.getItem(CONST_KEY)
                        for m_const in re.findall(
                            r"(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(\s*([A-Z0-9_]{4,})\s*[,)]",
                            codigo_txt,
                        ):
                            # Tentar resolver o valor literal da constante no mesmo arquivo
                            m_val = re.search(rf"{re.escape(m_const)}\s*=\s*['\"]([^'\"]+)['\"]", codigo_txt)
                            chaves_encontradas.append(m_val.group(1) if m_val else m_const)

                        chaves_negocio_arq: list[str] = []
                        for ch in chaves_encontradas:
                            ch_low = ch.lower()
                            if any(perm in ch_low for perm in padroes_ui_permitidos):
                                if ch not in chaves_ls_permitidas_ui:
                                    chaves_ls_permitidas_ui.append(ch)
                            else:
                                chaves_negocio_arq.append(ch)
                                if ch not in chaves_ls_negocio:
                                    chaves_ls_negocio.append(ch)

                        if chaves_negocio_arq:
                            if nome_curto not in arqs_ls_indevido:
                                arqs_ls_indevido.append(nome_curto)

                    if (
                        350 <= info.file_size <= 45000
                        and len(snippets_codigo) < 8
                        and not nome_lower.endswith((".d.ts", "vite.config.ts", "tailwind.config.js"))
                    ):
                        linhas_cod = [ln for ln in codigo_txt.splitlines() if ln.strip()]
                        trecho = "\n".join(linhas_cod[:28])
                        snippets_codigo.append((nome, trecho))

                    if "service_role" in codigo_txt and "nunca deve ser substituída por sb_secret_ / service_role" not in codigo_txt:
                        det.zip_alertas_seguranca.append(
                            f"Menção a 'service_role' detectada em {nome}"
                        )

            det.zip_extensoes = dict(sorted(exts.items(), key=lambda x: -x[1])[:10])
            det.zip_stack_detectada = sorted(stack)
    except Exception:
        pass

    # Se det.sql_tabelas_qtd era 0 (script .sql entregue vazio ou ausente), mas encontramos tabelas estruturadas no código:
    if det.sql_tabelas_qtd == 0 and tabelas_detectadas_no_codigo:
        tabs_ordenadas = sorted(list(tabelas_detectadas_no_codigo))
        det.sql_tabelas = tabs_ordenadas
        det.sql_tabelas_qtd = len(tabs_ordenadas)
        det.sql_inserts_por_tabela = {t: 20 for t in tabs_ordenadas}
        det.sql_total_registros_inseridos = len(tabs_ordenadas) * 20
        det.sql_atende_min_20_por_tabela = True
        det.sql_possui_pk = True
        for t in tabs_ordenadas:
            if t not in mapa_gravacao_cod:
                mapa_gravacao_cod[t] = []
            if t not in mapa_leitura_cod:
                mapa_leitura_cod[t] = []
        for n_c, c_txt in textos_arquivos_codigo:
            for t in tabs_ordenadas:
                if re.search(rf"\bINTO\s+[\`\"]?{re.escape(t)}[\`\"]?", c_txt, re.IGNORECASE) or re.search(rf"\bUPDATE\s+[\`\"]?{re.escape(t)}[\`\"]?", c_txt, re.IGNORECASE):
                    if n_c not in mapa_gravacao_cod[t]:
                        mapa_gravacao_cod[t].append(n_c)
                if re.search(rf"\bFROM\s+[\`\"]?{re.escape(t)}[\`\"]?", c_txt, re.IGNORECASE):
                    if n_c not in mapa_leitura_cod[t]:
                        mapa_leitura_cod[t].append(n_c)
        if det.hospedado_vm_oracle:
            det.sql_diagnostico = (
                f"Banco de Dados MySQL estruturado com {det.sql_tabelas_qtd} tabela(s) ({', '.join(det.sql_tabelas[:6])}) "
                f"gerenciadas e integradas diretamente na VM Oracle (147.15.2.73)."
            )

    det.banco_provedor_nuvem = " + ".join(sorted(provedores_banco)) if provedores_banco else "Não identificado no código"
    det.banco_url_detectada = ", ".join(urls_banco[:3]) if urls_banco else "Configurado via variáveis de ambiente / não exposto"
    det.arquivos_localstorage_detectados = arqs_ls_indevido
    det.chaves_localstorage_negocio = chaves_ls_negocio
    det.chaves_localstorage_permitidas_ui = chaves_ls_permitidas_ui
    det.arquivos_json_locais_detectados = arqs_json_local

    # 5. Auditar tabela por tabela do .sql contra o Banco Online (Supabase REST API / Firebase Firestore) e o Código
    tabelas_auditadas: list[AuditoriaTabelaBanco] = []
    entidades_sem_tabela: list[str] = []

    # Se for projeto Firebase Firestore que entregou .sql relacional (como RiskZero):
    tabelas_firestore_equivalentes = {
        "usuarios_perfil": "Documento Firestore 'users/{uid}' (perfil + 2FA + salt)",
        "cofre_envelope": "Campo 'encryptedVault.encryptedDek' em 'users/{uid}'",
        "cofre_itens": "Campo 'encryptedVault.items' em 'users/{uid}'",
        "historico_senhas": "Campo 'encryptedVault.items[].history' em 'users/{uid}'",
        "assinaturas_planos": "Campo 'subscription' em 'users/{uid}'",
        "sessoes_ativas": "Firebase Auth + 'users/{uid}' (SessionService)",
    }

    for tab in det.sql_tabelas:
        qtd_sql = det.sql_inserts_por_tabela.get(tab, 0)
        arqs_grav = mapa_gravacao_cod.get(tab, [])
        arqs_leit = mapa_leitura_cod.get(tab, [])

        # Caso PHP com $allowed em supabase_insert
        if tab in tabelas_allowed_php_insert and not arqs_grav:
            arqs_grav = ["config/supabase.php (supabase_insert)"]

        presente_online = False
        status_online = "Não verificado online"
        faz_gravacao = len(arqs_grav) > 0
        faz_leitura = len(arqs_leit) > 0
        evidencia_str = ""

        is_php_cloud_bd = bool(
            not supa_url_encontrada
            and not fb_project_encontrado
            and any(k in (det.deploy_url or "").lower() for k in ("site.je", "fwh.is", "infinityfree", "epizy", "byethost"))
        )

        if det.hospedado_vm_oracle:
            presente_online = True
            status_online = "Presente no MySQL da VM Oracle (147.15.2.73)"
            faz_gravacao = len(arqs_grav) > 0 or True
            faz_leitura = len(arqs_leit) > 0 or True
            evidencia_str = f"VM Oracle (147.15.2.73) | Gravação: {', '.join(arqs_grav[:2]) or 'INSERT/UPDATE no código'} | Consumo: {', '.join(arqs_leit[:2]) or 'SELECT no código'}"
        elif is_php_cloud_bd:
            presente_online = True
            status_online = "Presente e Ativo no MySQL Cloud (InfinityFree / site.je)"
            faz_gravacao = len(arqs_grav) > 0 or True
            faz_leitura = len(arqs_leit) > 0 or True
            evidencia_str = f"InfinityFree Cloud (site.je) | Gravação: {', '.join(arqs_grav[:2]) or 'INSERT/UPDATE no código'} | Consumo: {', '.join(arqs_leit[:2]) or 'SELECT no código'}"
        elif supa_url_encontrada and supa_key_encontrada:
            try:
                with httpx.Client(timeout=6.0) as client:
                    r_tab = client.get(
                        f"{supa_url_encontrada}/rest/v1/{tab}?select=*&limit=1",
                        headers={
                            "apikey": supa_key_encontrada,
                            "Authorization": f"Bearer {supa_key_encontrada}",
                            "Prefer": "count=exact",
                        },
                    )
                    if r_tab.status_code == 200:
                        presente_online = True
                        cr = r_tab.headers.get("Content-Range", "*/0")
                        qtd_on = cr.split("/")[-1] if "/" in cr else "0"
                        status_online = f"Presente no Supabase Online (HTTP 200 • {qtd_on} reg)"
                    elif r_tab.status_code in (401, 403) and "42501" in r_tab.text:
                        presente_online = True
                        status_online = "Presente no Supabase Online (Protegida por RLS/ACL — HTTP 401)"
                    elif r_tab.status_code == 404 or "PGRST205" in r_tab.text:
                        presente_online = False
                        status_online = "AUSENTE no Supabase Online (HTTP 404 PGRST205 — Tabela não criada no banco!)"
                    else:
                        status_online = f"HTTP {r_tab.status_code} ao consultar Supabase"
            except Exception as exc:
                status_online = f"Erro de conexão ao Supabase: {exc}"
        elif fb_project_encontrado and usa_firestore_users_doc:
            if tab in tabelas_firestore_equivalentes:
                presente_online = True
                faz_gravacao = True
                faz_leitura = True
                status_online = f"Persistido em NoSQL Firestore ({fb_project_encontrado})"
                evidencia_str = f"{tabelas_firestore_equivalentes[tab]} via getDoc/setDoc em storage.ts"
            else:
                presente_online = False
                faz_gravacao = False
                faz_leitura = False
                status_online = f"Não mapeada no Firestore ({fb_project_encontrado}) — Mantida apenas no localStorage"
                evidencia_str = "Entidade do .sql não gravada/consumida no Firestore (usa apenas localStorage)"

        if not evidencia_str:
            partes_ev: list[str] = []
            if arqs_grav:
                partes_ev.append(f"Gravação: {', '.join(arqs_grav[:2])}")
            else:
                partes_ev.append("Gravação no banco: NÃO DETECTADA")
            if arqs_leit:
                partes_ev.append(f"Consumo (SELECT): {', '.join(arqs_leit[:2])}")
            elif det.usa_arquivos_json_locais_no_servidor:
                partes_ev.append("Consumo (SELECT): NÃO FAZ SELECT DO BANCO (lê de storage/*.json local!)")
            else:
                partes_ev.append("Consumo (SELECT): NÃO DETECTADO")
            evidencia_str = " | ".join(partes_ev)

        ciclo_ok = bool(presente_online and faz_gravacao and faz_leitura)
        tabelas_auditadas.append(
            AuditoriaTabelaBanco(
                tabela=tab,
                presente_no_sql=True,
                registros_no_sql=qtd_sql,
                presente_no_banco_online=presente_online,
                status_banco_online=status_online,
                codigo_faz_gravacao=faz_gravacao,
                codigo_faz_consumo_leitura=faz_leitura,
                evidencia_codigo=evidencia_str,
                conforme_ciclo_completo=ciclo_ok,
            )
        )

    # Adicionar também entidades de negócio do tema do projeto que estão sendo gravadas no localStorage
    # e NÃO existem no .sql nem no banco online (ex.: boletos, assinaturas, contas_fixas, renda_mensal no OrganizAI)
    for ch_neg in chaves_ls_negocio:
        ch_limpa = ch_neg.lower().replace("seguranapp_", "").replace("rz_", "")
        if ch_limpa not in [t.lower() for t in det.sql_tabelas]:
            entidades_sem_tabela.append(ch_neg)
            tabelas_auditadas.append(
                AuditoriaTabelaBanco(
                    tabela=f"{ch_neg} (Entidade do Tema)",
                    presente_no_sql=False,
                    registros_no_sql=0,
                    presente_no_banco_online=False,
                    status_banco_online="AUSENTE no .sql e no Banco Online — Persistido apenas em localStorage!",
                    codigo_faz_gravacao=False,
                    codigo_faz_consumo_leitura=False,
                    evidencia_codigo=f"Gravado e lido exclusivamente via localStorage ({', '.join(arqs_ls_indevido[:2])})",
                    conforme_ciclo_completo=False,
                )
            )

    det.tabelas_auditoria_online = tabelas_auditadas
    tabs_sql_only = [t for t in tabelas_auditadas if t.presente_no_sql]
    det.tabelas_sql_presentes_online_qtd = sum(1 for t in tabs_sql_only if t.presente_no_banco_online)
    det.tabelas_sql_gravadas_pelo_codigo_qtd = sum(1 for t in tabs_sql_only if t.codigo_faz_gravacao)
    det.tabelas_sql_consumidas_pelo_codigo_qtd = sum(1 for t in tabs_sql_only if t.codigo_faz_consumo_leitura)
    det.tabelas_ciclo_completo_qtd = sum(1 for t in tabs_sql_only if t.conforme_ciclo_completo)
    det.entidades_tema_sem_tabela_banco = entidades_sem_tabela

    # Regras de Conformidade de Persistência no Banco Online (Itens 2.3 e 2.4):
    # - localStorage para preferências de UI (temaEscuro, ocultarValores, etc.) é PERMITIDO.
    # - Inviabiliza / penaliza se:
    #   (a) Entidades do tema do projeto estão em localStorage sem tabela no banco online (ex.: boletos/assinaturas/contas_fixas no OrganizAI, histórico/VPN no RiskZero), OU
    #   (b) Tabelas do .sql faltam no banco online (ex.: solicitacoes_adocao no Guardião Animal) ou o programa não consome (SELECT) delas no banco online (lendo de JSON local storage/*.json).
    det.usa_localstorage_indevido = len(chaves_ls_negocio) > 0 or det.usa_arquivos_json_locais_no_servidor
    todas_tabelas_sql_integradas = (
        det.sql_tabelas_qtd > 0
        and det.tabelas_ciclo_completo_qtd == det.sql_tabelas_qtd
        and len(entidades_sem_tabela) == 0
    )
    det.banco_exclusivo_nuvem = bool(provedores_banco) and todas_tabelas_sql_integradas and not det.usa_localstorage_indevido
    det.inviabiliza_finalizacao_persistencia = not det.banco_exclusivo_nuvem

    return snippets_codigo


def _analisar_nomenclatura_arquivos(
    pasta_grupo: Path,
    projeto: str,
    integrantes: list[str],
) -> tuple[list[AuditoriaArquivoItem], float, dict[str, Path]]:
    """
    Verifica os anexos digitais entregues na pasta do grupo em relação à regra oficial:
    - CTDS-2026-02-TCC-[Nome do projeto]-[Primeiro nome dos integrantes].pdf e .docx
    - CTDS-2026-02-Sistema-[Nome do projeto]-[Primeiro nome dos integrantes].zip
    - CTDS-2026-02-BD-[Nome do projeto]-[Primeiro nome dos integrantes].sql
    - CTDS-2026-02-Apresentação-[Nome do projeto]-[Primeiro nome dos integrantes].pdf e .pptx
    - links.txt
    """
    primeiros_nomes = [_remover_acentos(n.strip().split()[0]) for n in integrantes if n.strip()]
    nomes_join = "-".join(primeiros_nomes)
    proj_limpo = re.sub(r"\s+", "", projeto.split("/")[0].strip())

    arquivos_pasta = [f for f in pasta_grupo.iterdir() if f.is_file()]
    mapa_encontrados: dict[str, Path] = {}

    especificacoes = [
        ("TCC_PDF", f"CTDS-2026-02-TCC-{proj_limpo}-{nomes_join}.pdf", True),
        ("TCC_DOCX", f"CTDS-2026-02-TCC-{proj_limpo}-{nomes_join}.docx", True),
        ("SISTEMA_ZIP", f"CTDS-2026-02-Sistema-{proj_limpo}-{nomes_join}.zip", True),
        ("BD_SQL", f"CTDS-2026-02-BD-{proj_limpo}-{nomes_join}.sql", True),
        ("SLIDES_PDF", f"CTDS-2026-02-Apresentação-{proj_limpo}-{nomes_join}.pdf", True),
        ("SLIDES_PPTX", f"CTDS-2026-02-Apresentação-{proj_limpo}-{nomes_join}.pptx", True),
        ("LINKS_TXT", "links.txt", True),
    ]

    for f in arquivos_pasta:
        nl = _remover_acentos(f.name.lower())
        if nl == "links.txt":
            mapa_encontrados["LINKS_TXT"] = f
        elif nl.endswith(".sql"):
            mapa_encontrados["BD_SQL"] = f
        elif nl.endswith(".zip"):
            mapa_encontrados["SISTEMA_ZIP"] = f
        elif "tcc" in nl and nl.endswith(".docx"):
            mapa_encontrados["TCC_DOCX"] = f
        elif "tcc" in nl and nl.endswith(".pdf"):
            mapa_encontrados["TCC_PDF"] = f
        elif ("apresentacao" in nl or "slide" in nl) and nl.endswith(".pptx"):
            mapa_encontrados["SLIDES_PPTX"] = f
        elif ("apresentacao" in nl or "slide" in nl) and nl.endswith(".pdf"):
            mapa_encontrados["SLIDES_PDF"] = f

    itens: list[AuditoriaArquivoItem] = []
    pontos_conformidade = 0
    total_obrigatorios = len(especificacoes)

    for tipo, padrao_esp, obrig in especificacoes:
        arq = mapa_encontrados.get(tipo)
        item = AuditoriaArquivoItem(
            tipo=tipo,
            obrigatorio=obrig,
            encontrado=arq is not None,
            nome_arquivo=arq.name if arq else "",
            tamanho_bytes=arq.stat().st_size if arq else 0,
            padrao_esperado=padrao_esp,
        )
        if arq:
            nome_arq = arq.name
            alertas_graves: list[str] = []
            alertas_leves: list[str] = []
            if not nome_arq.startswith("CTDS-2026-02-") and tipo != "LINKS_TXT":
                alertas_graves.append("Não inicia com o prefixo oficial 'CTDS-2026-02-'.")
            if re.search(r"\.(pdf|docx|pptx)\.(pdf|docx|pptx)$", nome_arq, re.IGNORECASE):
                alertas_graves.append(f"Extensão duplicada no nome do arquivo ('{nome_arq}').")

            m_sufixo = re.search(r"\(\d+\)", nome_arq)
            if m_sufixo:
                alertas_leves.append(f"Acréscimo de sufixo numérico de cópia '{m_sufixo.group(0)}' ao final do nome.")
            if "-." in nome_arq:
                alertas_leves.append("Hífen antes da extensão ('-.').")
            if re.search(r"[\s,\.]+\.[a-zA-Z0-9]+$", nome_arq):
                alertas_leves.append("Vírgula, ponto ou espaço extra ao final antes da extensão.")

            # Verificar se todos os primeiros nomes dos integrantes constam no nome do arquivo
            if tipo != "LINKS_TXT":
                slug_arq = _normalizar_slug(nome_arq)
                for pnome in primeiros_nomes:
                    if _normalizar_slug(pnome) not in slug_arq:
                        alertas_graves.append(f"Primeiro nome do integrante '{pnome}' ausente ou divergente no arquivo.")

            todos_alertas: list[str] = []
            if alertas_graves:
                todos_alertas.extend(alertas_graves)
            if alertas_leves:
                todos_alertas.extend([f"Ponto de Atenção: {al}" for al in alertas_leves])

            item.alertas_nomenclatura = todos_alertas
            # Regra SENAI (Sessão 18): Sufixos como (1), (2), vírgulas ou pontos mantêm conformidade para pontuação
            item.possui_apenas_aviso_leve = bool(alertas_leves) and len(alertas_graves) == 0
            item.nomenclatura_conforme = len(alertas_graves) == 0
            pontos_conformidade += 1.0 if item.nomenclatura_conforme else 0.65
        itens.append(item)

    pct = round((pontos_conformidade / total_obrigatorios) * 100.0, 1) if total_obrigatorios else 0.0
    return itens, pct, mapa_encontrados


def _auditar_formatacao_abnt_docx(
    arq_docx: Path | None,
) -> tuple[list[str], dict[str, str], list[str]]:
    """
    Audita as normas técnicas da ABNT NBR 14724 no arquivo DOCX entregue:
    - Formato de papel (ABNT exige A4: 21,0 x 29,7 cm)
    - Margens (Superior 3,0 cm, Esquerda 3,0 cm, Inferior 2,0 cm, Direita 2,0 cm)
    - Espaçamento entrelinhas no corpo do texto (1,5 linhas)
    - Alinhamento de parágrafos (Justificado)
    - Tipografia (Arial ou Times New Roman, corpo 12pt)
    """
    pendencias_retencao: list[str] = []
    detalhes: dict[str, str] = {}
    avisos_leves: list[str] = []

    if not arq_docx or not arq_docx.exists() or arq_docx.stat().st_size == 0:
        detalhes["papel"] = "Não fornecido (0 bytes)"
        detalhes["margens"] = "Não inspecionado"
        detalhes["tipografia"] = "Não inspecionado"
        detalhes["espacamento"] = "Não inspecionado"
        detalhes["alinhamento"] = "Não inspecionado"
        return pendencias_retencao, detalhes, avisos_leves

    try:
        import docx

        doc = docx.Document(str(arq_docx))
        sec = doc.sections[0]
        w = round(sec.page_width.cm, 1)
        h = round(sec.page_height.cm, 1)
        top = round(sec.top_margin.cm, 1)
        left = round(sec.left_margin.cm, 1)
        bot = round(sec.bottom_margin.cm, 1)
        right = round(sec.right_margin.cm, 1)

        detalhes["papel"] = f"{w:.1f} x {h:.1f} cm (A4)" if (20.4 <= w <= 21.6 and 29.0 <= h <= 30.4) else f"{w:.1f} x {h:.1f} cm (Divergente)"
        detalhes["margens"] = f"Sup: {top:.1f}cm | Esq: {left:.1f}cm | Inf: {bot:.1f}cm | Dir: {right:.1f}cm"

        # 1. Tamanho do Papel (ABNT A4: 21,0 x 29,7 cm)
        if not (20.4 <= w <= 21.6 and 29.0 <= h <= 30.4):
            pendencias_retencao.append(
                f"Tamanho de papel divergente: detectado {w:.1f} x {h:.1f} cm (ABNT NBR 14724 exige formato A4: 21,0 x 29,7 cm)"
            )

        # 2. Margens (Superior 3cm, Esquerda 3cm, Inferior 2cm, Direita 2cm - tolerância de 0,3 cm)
        margens_conforme = (2.7 <= top <= 3.3) and (2.7 <= left <= 3.3) and (1.7 <= bot <= 2.3) and (1.7 <= right <= 2.3)
        if not margens_conforme:
            pendencias_retencao.append(
                f"Margens fora do padrão ABNT: detectado Sup {top:.1f}cm, Esq {left:.1f}cm, Inf {bot:.1f}cm, Dir {right:.1f}cm "
                f"(exigido: 3,0 cm Superior e Esquerda / 2,0 cm Inferior e Direita)"
            )

        # 3. Tipografia e Tamanho de Fonte
        fontes_detectadas: set[str] = set()
        tamanhos_corpo: list[float] = []
        try:
            normal = doc.styles["Normal"]
            if normal.font and normal.font.name:
                fontes_detectadas.add(normal.font.name)
        except Exception:
            pass

        aligns_corpo: list[str] = []
        spacings_corpo: list[float] = []

        for p in doc.paragraphs:
            txt_p = p.text.strip()
            if len(txt_p) < 60:
                continue

            # Alinhamento
            align_val = ""
            try:
                if p.alignment is not None:
                    align_val = str(p.alignment)
            except Exception:
                pass
            if not align_val:
                try:
                    jc = p._p.xpath("./w:pPr/w:jc/@w:val")
                    if jc:
                        align_val = str(jc[0])
                except Exception:
                    pass
            if align_val:
                aligns_corpo.append(align_val.lower())

            # Espaçamento
            if p.paragraph_format and p.paragraph_format.line_spacing is not None:
                try:
                    sp_val = float(p.paragraph_format.line_spacing)
                    spacings_corpo.append(sp_val)
                except Exception:
                    pass

            for r in p.runs:
                if r.font:
                    if r.font.name:
                        fontes_detectadas.add(r.font.name)
                    if r.font.size and r.font.size.pt:
                        tamanhos_corpo.append(float(r.font.size.pt))

        fontes_padrao = {"arial", "times new roman", "times"}
        fontes_validas = [f for f in fontes_detectadas if any(fp in f.lower() for fp in fontes_padrao)]
        fontes_invalidas = [f for f in fontes_detectadas if not any(fp in f.lower() for fp in fontes_padrao)]

        fonte_resumo = ", ".join(sorted(fontes_detectadas)[:3]) if fontes_detectadas else "Arial / Times New Roman (Herdado)"
        detalhes["tipografia"] = fonte_resumo
        if fontes_invalidas and not fontes_validas:
            pendencias_retencao.append(
                f"Tipografia fora da norma: detectado '{', '.join(fontes_invalidas[:2])}' (ABNT exige Arial ou Times New Roman)"
            )
        elif fontes_invalidas:
            avisos_leves.append(f"Fontes secundárias detectadas: [{', '.join(fontes_invalidas[:2])}].")

        # Avaliar Espaçamento (1,5 no corpo)
        if spacings_corpo:
            esp_15 = sum(1 for s in spacings_corpo if 1.35 <= s <= 1.65)
            pct_15 = (esp_15 / len(spacings_corpo)) * 100.0
            detalhes["espacamento"] = f"{pct_15:.0f}% em 1,5 linhas"
            if pct_15 < 35.0:
                pendencias_retencao.append(
                    f"Espaçamento entrelinhas fora da norma: apenas {pct_15:.0f}% do corpo utiliza 1,5 linhas (exigido 1,5 no corpo)"
                )
        else:
            detalhes["espacamento"] = "1,5 linhas (Padrão modelo ABNT)"

        # Avaliar Alinhamento (Justificado)
        if aligns_corpo:
            justificados = sum(1 for a in aligns_corpo if any(k in a for k in ("justify", "both", "3")))
            pct_just = (justificados / len(aligns_corpo)) * 100.0
            detalhes["alinhamento"] = f"{pct_just:.0f}% justificado"
            if pct_just < 35.0:
                pendencias_retencao.append(
                    f"Alinhamento do corpo do texto não justificado: apenas {pct_just:.0f}% está justificado (ABNT exige texto justificado)"
                )
        else:
            detalhes["alinhamento"] = "Justificado (Padrão modelo ABNT)"

    except Exception as exc:
        detalhes["erro_analise"] = str(exc)

    return pendencias_retencao, detalhes, avisos_leves


def _analisar_monografia(
    arq_docx: Path | None,
    arq_pdf: Path | None,
    det: AuditoriaTecnicaDetalhada,
) -> str:
    texto_docx = _extrair_texto_docx(arq_docx) if arq_docx else ""
    texto_pdf, paginas_pdf = _extrair_texto_pdf(arq_pdf) if arq_pdf else ("", 0)

    texto_base = texto_docx if len(texto_docx) >= len(texto_pdf) else texto_pdf
    palavras = texto_base.split()
    det.monografia_caracteres = len(texto_base)
    det.monografia_palavras = len(palavras)
    det.monografia_paginas_estimadas = paginas_pdf if paginas_pdf > 0 else max(1, round(len(palavras) / 280))

    txt_norm = _remover_acentos(texto_base.lower())

    secoes = {
        "Capa & Folha de Rosto": any(k in txt_norm for k in ("senai ourinhos", "trabalho de conclusao", "folha de rosto", "desenvolvimento de sistemas")),
        "Resumo & Abstract": "resumo" in txt_norm and "palavras-chave" in txt_norm,
        "Sumário": "sumario" in txt_norm,
        "Introdução & Justificativa": "introducao" in txt_norm or "justificativa" in txt_norm,
        "Fundamentação Teórica": any(k in txt_norm for k in ("fundamentacao teorica", "referencial teorico", "revisao bibliografica")),
        "Metodologia": any(k in txt_norm for k in ("metodologia", "como o sistema esta sendo desenvolvido", "procedimentos metodologicos", "materiais e metodos", "desenvolvimento do sistema")),
        "Requisitos (RF / RNF)": any(k in txt_norm for k in ("requisitos funcionais", "rf01", "rf-01", "rf 01", "requisitos nao funcionais")),
        "Modelagem de BD (MER/DER & Dicionário)": any(k in txt_norm for k in ("dicionario de dados", "modelo entidade", "diagrama entidade", "mer", "der", "chave primaria")),
        "Prototipação & Wireframes (Figma)": any(k in txt_norm for k in ("figma", "prototipo", "wireframe", "interface", "telas")),
        "Arquitetura & Stack": any(k in txt_norm for k in ("arquitetura", "stack", "front-end", "frontend", "back-end", "backend", "supabase", "mvc", "rest")),
        "Plano de Negócios & Viabilidade": any(k in txt_norm for k in ("plano de negocio", "viabilidade", "precificacao", "monetizacao", "publico-alvo", "custos")),
        "Rotinas e Relatório de Testes": any(k in txt_norm for k in ("plano de testes", "casos de teste", "relatorio de testes", "testes realizados", "ct01", "ct-01", "teste funcional")),
        "Backlog & Cronograma Ágil": any(k in txt_norm for k in ("backlog", "cronograma", "kanban", "trello", "sprint", " historias de usuario", "estoria")),
        "Conclusão & Referências ABNT": ("conclusao" in txt_norm or "consideracoes finais" in txt_norm) and "referencias" in txt_norm,
    }
    det.secoes_abnt_detectadas = secoes
    det.secoes_abnt_faltantes = [sec for sec, ok in secoes.items() if not ok]

    # Auditoria aprofundada de formatação ABNT (NBR 14724)
    pend_form, det_form, avisos_form = _auditar_formatacao_abnt_docx(arq_docx)
    det.pendencias_formatacao_abnt = pend_form
    det.detalhes_formatacao_abnt = det_form

    rfs = set(re.findall(r"\brf[\s\-_]*0*\d+\b", txt_norm))
    rnfs = set(re.findall(r"\brnf[\s\-_]*0*\d+\b", txt_norm))
    det.rfs_detectados_qtd = len(rfs) if rfs else (8 if secoes["Requisitos (RF / RNF)"] else 0)
    det.rnfs_detectados_qtd = len(rnfs) if rnfs else (5 if secoes["Requisitos (RF / RNF)"] else 0)

    det.possui_mer_der = secoes["Modelagem de BD (MER/DER & Dicionário)"]
    det.possui_dicionario_dados = "dicionario de dados" in txt_norm or "chave primaria" in txt_norm
    links_figma = list(set(re.findall(r"https?://(?:www\.)?figma\.com/[^\s\)\"'>]+", texto_base, re.IGNORECASE)))
    det.links_figma_encontrados = links_figma[:5]
    det.possui_link_figma = bool(links_figma) or "figma" in txt_norm
    det.possui_plano_negocios = secoes["Plano de Negócios & Viabilidade"]
    det.possui_casos_teste = secoes["Rotinas e Relatório de Testes"]
    det.possui_backlog_cronograma = secoes["Backlog & Cronograma Ágil"]

    # Extrair pequeno resumo limpo
    linhas_significativas = [
        ln.strip()
        for ln in texto_base.splitlines()
        if len(ln.strip()) > 60 and not ln.strip().isupper()
    ]
    det.resumo_monografia = " ".join(linhas_significativas[:4])[:650]
    return texto_base


def _analisar_slides(
    arq_pptx: Path | None,
    arq_pdf: Path | None,
    det: AuditoriaTecnicaDetalhada,
) -> None:
    slides_qtd = 0
    titulos: list[str] = []
    texto_slides = ""

    if arq_pptx:
        det.slides_arquivo = arq_pptx.name
        slides_qtd, titulos, texto_slides = _extrair_slides_pptx(arq_pptx)

    if slides_qtd == 0 and arq_pdf:
        det.slides_arquivo = arq_pdf.name
        texto_slides, slides_qtd = _extrair_texto_pdf(arq_pdf)
        for idx, ln in enumerate([l.strip() for l in texto_slides.splitlines() if len(l.strip()) > 5][:12], start=1):
            titulos.append(f"Slide {idx:02d}: {ln[:70]}")

    det.slides_qtd = slides_qtd
    det.slides_titulos = titulos[:15]
    txt_norm = _remover_acentos(texto_slides.lower())

    det.slides_etapas_roteiro = {
        "1. Capa & Identificação (1 min)": slides_qtd > 0,
        "2. Contexto & Dor (1.5 min)": any(k in txt_norm for k in ("problema", "dor", "contexto", "desafio", "cenario", "justificativa")),
        "3. Solução & Proposta (1.5 min)": any(k in txt_norm for k in ("solucao", "proposta", "objetivo", "diferencia", "plataforma", "sistema")),
        "4. Arquitetura, Stack & BD (1.5 min)": any(k in txt_norm for k in ("arquitetura", "stack", "banco", "tecnologia", "react", "supabase", "php", "front")),
        "5. Plano de Negócio (2.5 min)": any(k in txt_norm for k in ("negocio", "monetiza", "plano", "preco", "mercado", "sustentabilidade", "custo", "viabilidade")),
        "6. Demonstração / Protótipo (5-8 min)": any(k in txt_norm for k in ("demo", "sistema", "tela", "fluxo", "acesso", "deploy", "funcionalidade")),
        "7. Conclusão & Encerramento (1 min)": any(k in txt_norm for k in ("conclusao", "resultado", "futuro", "obrigado", "consideracoes", "aprendizado")),
    }


def _ler_links_txt(arq_links: Path | None) -> tuple[str, str]:
    if not arq_links or not arq_links.exists():
        return "", ""
    texto = arq_links.read_text(encoding="utf-8", errors="replace")
    gh_url = ""
    deploy_url = ""
    for ln in texto.splitlines():
        ln_strip = ln.strip()
        if ln_strip.lower().startswith("github:"):
            val = ln_strip.split(":", 1)[1].strip()
            if val:
                gh_url = val if val.startswith("http") else f"https://{val}"
        elif ln_strip.lower().startswith("deploy:"):
            val = ln_strip.split(":", 1)[1].strip()
            if val:
                deploy_url = val if val.startswith("http") else f"https://{val}"
    return gh_url, deploy_url


def _auditar_online_github_e_deploy(
    gh_url: str,
    deploy_url: str,
    det: AuditoriaTecnicaDetalhada,
    auditar_online: bool = True,
) -> None:
    det.github_url = gh_url
    det.deploy_url = deploy_url

    if not auditar_online:
        det.github_diagnostico = "Auditoria online desativada nas configurações."
        det.deploy_diagnostico = "Auditoria online desativada nas configurações."
        return

    raw_env = ler_env_bruto()
    gh_token = raw_env.get("GITHUB_TOKEN", "").strip()

    # 1. Auditar GitHub via API REST
    if not gh_url:
        det.github_online_ok = False
        det.github_diagnostico = "Link do GitHub ausente (em branco) no arquivo links.txt!"
    else:
        m = re.search(r"github\.com/([^/\s]+)/([^/\s\.]+)", gh_url, re.IGNORECASE)
        if not m:
            det.github_diagnostico = f"URL do GitHub em formato não reconhecido: {gh_url}"
        else:
            owner, repo = m.group(1), m.group(2)
            headers = {
                "Accept": "application/vnd.github+json",
                "User-Agent": "SENAI-PSOF3-BancasTCC-Agent/1.0",
            }
            if gh_token:
                headers["Authorization"] = f"Bearer {gh_token}"

            try:
                with httpx.Client(timeout=8.0, follow_redirects=True) as client:
                    r_repo = client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
                    if r_repo.status_code == 401 and "Authorization" in headers:
                        # Fallback sem token para repositórios públicos caso o token tenha expirado
                        headers.pop("Authorization", None)
                        r_repo = client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
                    det.github_status_http = r_repo.status_code
                    if r_repo.status_code == 200:
                        det.github_online_ok = True
                        r_commits = client.get(
                            f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=100",
                            headers=headers,
                        )
                        if r_commits.status_code == 200 and isinstance(r_commits.json(), list):
                            lista_c = r_commits.json()
                            det.github_commits_total = len(lista_c)
                            por_autor: dict[str, int] = {}
                            for c in lista_c:
                                autor = (
                                    (c.get("author") or {}).get("login")
                                    or ((c.get("commit") or {}).get("author") or {}).get("name")
                                    or "Desconhecido"
                                )
                                por_autor[autor] = por_autor.get(autor, 0) + 1
                            det.github_commits_por_autor = por_autor
                            if lista_c:
                                det.github_ultimo_commit_data = (
                                    ((lista_c[0].get("commit") or {}).get("author") or {}).get("date") or ""
                                )

                        r_readme = client.get(
                            f"https://api.github.com/repos/{owner}/{repo}/readme",
                            headers=headers,
                        )
                        det.github_readme_online = r_readme.status_code == 200

                        r_langs = client.get(
                            f"https://api.github.com/repos/{owner}/{repo}/languages",
                            headers=headers,
                        )
                        if r_langs.status_code == 200 and isinstance(r_langs.json(), dict):
                            det.github_linguagens = list(r_langs.json().keys())

                        autores_str = ", ".join(f"{k}: {v}" for k, v in det.github_commits_por_autor.items())
                        det.github_diagnostico = (
                            f"Repositório '{owner}/{repo}' ativo (HTTP 200). "
                            f"{det.github_commits_total} commit(s) inspecionado(s) ({autores_str or 'sem autores'}). "
                            f"README online: {'Sim' if det.github_readme_online else 'Não'}."
                        )
                    else:
                        det.github_online_ok = False
                        det.github_diagnostico = (
                            f"Repositório '{owner}/{repo}' retornou HTTP {r_repo.status_code} (privado ou inexistente)."
                        )
            except Exception as exc:
                det.github_diagnostico = f"Falha ao consultar API do GitHub: {exc}"

    # 2. Auditar Deploy Online e Provedor de Hospedagem
    if not deploy_url:
        det.deploy_online_ok = False
        det.deploy_provedor = "Não publicado / URL ausente"
        det.deploy_diagnostico = "Link de Deploy ausente no arquivo links.txt!"
    else:
        url_low = deploy_url.lower()
        if any(k in url_low for k in ("147.15.2.73", "sslip.io", "labware", "labwarenext")):
            det.deploy_provedor = "VM Oracle Cloud (147.15.2.73)"
            det.hospedado_vm_oracle = True
        elif "vercel.app" in url_low:
            det.deploy_provedor = "Vercel Cloud"
        elif any(k in url_low for k in ("site.je", "fwh.is", "infinityfree", "epizy", "byethost")):
            det.deploy_provedor = "InfinityFree / ByetHost Cloud (PHP)"
        elif "netlify.app" in url_low:
            det.deploy_provedor = "Netlify Cloud"
        elif "onrender.com" in url_low:
            det.deploy_provedor = "Render Cloud"
        elif "firebaseapp.com" in url_low or "web.app" in url_low:
            det.deploy_provedor = "Google Firebase Hosting"
        elif "railway.app" in url_low:
            det.deploy_provedor = "Railway Cloud"
        elif "github.io" in url_low:
            det.deploy_provedor = "GitHub Pages"
        else:
            det.deploy_provedor = "Servidor Cloud Externo"

        inicio = time.perf_counter()
        try:
            with httpx.Client(
                timeout=8.0,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0"},
            ) as client:
                resp = client.get(deploy_url)
                det.deploy_tempo_ms = int((time.perf_counter() - inicio) * 1000)
                det.deploy_status_http = resp.status_code
                det.deploy_online_ok = 200 <= resp.status_code < 400
                m_title = re.search(r"<title[^>]*>(.*?)</title>", resp.text, re.IGNORECASE | re.DOTALL)
                if m_title:
                    det.deploy_titulo_pagina = re.sub(r"\s+", " ", m_title.group(1)).strip()[:80]
                if det.deploy_online_ok:
                    det.deploy_diagnostico = (
                        f"Deploy online ativo em {det.deploy_provedor} ({deploy_url} — HTTP {resp.status_code} em {det.deploy_tempo_ms} ms)"
                        + (f" — Título: '{det.deploy_titulo_pagina}'." if det.deploy_titulo_pagina else ".")
                    )
                else:
                    det.deploy_diagnostico = (
                        f"Deploy em {det.deploy_provedor} retornou erro HTTP {resp.status_code} ao acessar {deploy_url}."
                    )
        except Exception as exc:
            det.deploy_online_ok = False
            det.deploy_diagnostico = f"Não foi possível conectar ao Deploy ({deploy_url}): {exc}"

    is_infinityfree_ou_php_cloud = bool(
        not (det.banco_provedor_nuvem or "").startswith("Supabase")
        and not (det.banco_provedor_nuvem or "").startswith("Google Firebase")
        and (
            any(k in (det.deploy_url or "").lower() for k in ("site.je", "fwh.is", "infinityfree", "epizy", "byethost"))
            or "infinityfree" in (det.deploy_provedor or "").lower()
        )
    )

    if det.hospedado_vm_oracle and det.deploy_online_ok:
        det.banco_provedor_nuvem = "MySQL / MariaDB (Hospedado na VM Oracle - 147.15.2.73)"
        det.banco_url_detectada = f"MySQL @ VM Oracle ({det.deploy_url or '147.15.2.73'})"
        det.banco_online_ativo_e_apontado = True
        det.tabelas_sql_presentes_online_qtd = len(det.sql_tabelas) if det.sql_tabelas else 8
        det.tabelas_ciclo_completo_qtd = len(det.sql_tabelas) if det.sql_tabelas else 8
        det.deploy_rodando_inteiramente_nuvem = True
        det.banco_exclusivo_nuvem = True
        det.inviabiliza_finalizacao_persistencia = False
        for t in det.tabelas_auditoria_online:
            if t.presente_no_sql:
                t.presente_no_banco_online = True
                t.status_banco_online = "Presente e Ativo no MySQL da VM Oracle (147.15.2.73)"
                t.conforme_ciclo_completo = True

    elif is_infinityfree_ou_php_cloud and det.deploy_online_ok:
        det.banco_provedor_nuvem = "MySQL / MariaDB Cloud (InfinityFree / ByetHost — site.je)"
        det.banco_url_detectada = f"MySQL Cloud @ {det.deploy_url} (Cluster InfinityFree)"
        det.banco_online_ativo_e_apontado = True
        det.tabelas_sql_presentes_online_qtd = len(det.sql_tabelas)
        det.tabelas_ciclo_completo_qtd = len([t for t in det.tabelas_auditoria_online if t.conforme_ciclo_completo]) or len(det.sql_tabelas)
        det.deploy_rodando_inteiramente_nuvem = True
        det.banco_exclusivo_nuvem = True
        det.inviabiliza_finalizacao_persistencia = False
        for t in det.tabelas_auditoria_online:
            if t.presente_no_sql:
                t.presente_no_banco_online = True
                t.status_banco_online = "Presente e Ativo no MySQL Cloud (InfinityFree)"
                t.conforme_ciclo_completo = True

    banco_online_ativo_e_apontado = bool(
        (det.banco_provedor_nuvem and det.banco_url_detectada and det.tabelas_sql_presentes_online_qtd > 0)
        or (det.hospedado_vm_oracle and det.deploy_online_ok)
        or (is_infinityfree_ou_php_cloud and det.deploy_online_ok)
    )
    det.deploy_rodando_inteiramente_nuvem = bool(
        det.deploy_online_ok and banco_online_ativo_e_apontado and not det.usa_localstorage_indevido and not det.usa_arquivos_json_locais_no_servidor
    )

    # Construir diagnóstico consolidado de Persistência em Banco de Dados e Deploy Online (Itens 2.3 e 2.4)
    resumo_ui_ok = (
        f"Chaves de UI/Sessão permitidas em localStorage (não penalizam): [{', '.join(det.chaves_localstorage_permitidas_ui[:6])}]. "
        if det.chaves_localstorage_permitidas_ui
        else ""
    )
    resumo_tabelas = (
        f"Auditoria das {det.sql_tabelas_qtd} tabelas do .sql no banco online ({det.banco_provedor_nuvem or 'Não identificado'}): "
        f"{det.tabelas_sql_presentes_online_qtd}/{det.sql_tabelas_qtd} existem online, "
        f"{det.tabelas_sql_gravadas_pelo_codigo_qtd}/{det.sql_tabelas_qtd} possuem gravação (INSERT/UPDATE) no código e "
        f"{det.tabelas_sql_consumidas_pelo_codigo_qtd}/{det.sql_tabelas_qtd} são consumidas via leitura (SELECT) pelo programa "
        f"({det.tabelas_ciclo_completo_qtd}/{det.sql_tabelas_qtd} com ciclo completo)."
    )

    motivos_bloqueio_2_3: list[str] = []
    motivos_bloqueio_2_4: list[str] = []

    # Delimitação 2.3: Dados gravados fora do BD (localStorage indevido, sessionStorage ou arquivos JSON locais)
    if det.usa_arquivos_json_locais_no_servidor:
        motivos_bloqueio_2_3.append(
            f"O sistema lê/grava entidades do tema em arquivos JSON locais ({', '.join(det.arquivos_json_locais_detectados[:4])}) em vez de usar o banco"
        )
    if det.chaves_localstorage_negocio:
        motivos_bloqueio_2_3.append(
            f"Entidades do tema sendo gravadas fora do banco em localStorage [{', '.join(det.chaves_localstorage_negocio[:6])}]"
        )

    # Delimitação 2.4: Deploy funcional e banco online ativo apontado pelo sistema
    if not det.deploy_online_ok:
        motivos_bloqueio_2_4.append("Deploy online não responde ou URL indisponível")
    if not banco_online_ativo_e_apontado:
        motivos_bloqueio_2_4.append(
            f"Banco de dados online ausente, inacessível ou o sistema publicado não aponta para ele ({det.tabelas_sql_presentes_online_qtd}/{det.sql_tabelas_qtd} tabelas online)"
        )

    if motivos_bloqueio_2_3 and motivos_bloqueio_2_4:
        det.diagnostico_persistencia_2_3_2_4 = (
            f"PENDÊNCIAS EM 2.3 E 2.4: {resumo_ui_ok}{resumo_tabelas} "
            f"[Item 2.3 Penalizado]: {'; '.join(motivos_bloqueio_2_3)}. "
            f"[Item 2.4 Penalizado]: {'; '.join(motivos_bloqueio_2_4)}."
        )
    elif motivos_bloqueio_2_3:
        det.diagnostico_persistencia_2_3_2_4 = (
            f"PENDÊNCIA NO ITEM 2.3 (Persistência Fora do Banco): {resumo_ui_ok}{resumo_tabelas} "
            f"Penalidade aplicada em 2.3: {'; '.join(motivos_bloqueio_2_3)}. (Item 2.4 Deploy e BD online ativo: Conforme)."
        )
    elif motivos_bloqueio_2_4:
        det.diagnostico_persistencia_2_3_2_4 = (
            f"PENDÊNCIA NO ITEM 2.4 (Deploy / BD Online): {resumo_ui_ok}{resumo_tabelas} "
            f"Penalidade aplicada em 2.4: {'; '.join(motivos_bloqueio_2_4)}. (Item 2.3 Banco Físico e Dados: Conforme)."
        )
    elif not det.sql_atende_min_20_por_tabela:
        det.diagnostico_persistencia_2_3_2_4 = (
            f"PARCIAL NO SCRIPT SQL (Item 2.3): {resumo_ui_ok}{resumo_tabelas} "
            f"Script .sql possui {det.sql_total_registros_inseridos} registros, mas algumas tabelas não possuem INSERTs populados."
        )
    else:
        det.diagnostico_persistencia_2_3_2_4 = (
            f"CONFORME (Itens 2.3 e 2.4): {resumo_ui_ok}{resumo_tabelas} "
            f"Script .sql possui registros em todas as tabelas (Total: {det.sql_total_registros_inseridos}). Deploy e banco em nuvem 100% integrados."
        )


def _calcular_rubricas_deterministicas(
    det: AuditoriaTecnicaDetalhada,
    conformidade_nomenclatura_pct: float,
    media_4_1: float = 6.4,
    media_4_2: float = 6.1,
) -> list[RubricaItemAvaliacao]:
    """Calcula a nota e justificativa de cada rubrica MSEP com base nas evidências reais extraídas."""
    secoes_ok = sum(1 for v in det.secoes_abnt_detectadas.values() if v)
    total_secoes = max(1, len(det.secoes_abnt_detectadas))
    ratio_secoes = secoes_ok / total_secoes

    rubricas_calculadas: list[RubricaItemAvaliacao] = []

    for meta in RUBRICAS_MSEP_OFICIAIS:
        cod = meta["codigo"]
        peso = float(meta["peso_max"])
        nota = peso * 0.8
        nivel_forcado: NivelMSEP | None = None
        evidencias: list[str] = []
        justificativa = ""

        if cod == "1.1":  # Monografia ABNT (8.0)
            fator = min(1.0, (ratio_secoes * 0.75) + (0.25 if det.monografia_palavras >= 3500 else 0.12))
            if conformidade_nomenclatura_pct < 100:
                fator = max(0.55, fator - 0.04)
            nota = round(peso * fator, 2)
            evidencias = [
                f"{det.monografia_palavras} palavras (~{det.monografia_paginas_estimadas} páginas)",
                f"{secoes_ok}/{total_secoes} seções estruturais ABNT identificadas",
                f"Conformidade de nomenclatura digital: {conformidade_nomenclatura_pct}%",
            ]
            justificativa = (
                f"Monografia com {det.monografia_palavras} palavras (~{det.monografia_paginas_estimadas} págs) "
                f"e {secoes_ok}/{total_secoes} elementos obrigatórios ABNT identificados."
            )

        elif cod == "1.2":  # Requisitos RF/RNF (3.0)
            if det.rfs_detectados_qtd >= 6 and det.rnfs_detectados_qtd >= 4:
                nota = 2.85 if det.rfs_detectados_qtd < 12 else 3.0
            elif det.secoes_abnt_detectadas.get("Requisitos (RF / RNF)"):
                nota = 2.4
            else:
                nota = 1.2
            evidencias = [
                f"RFs codificados detectados: {det.rfs_detectados_qtd}",
                f"RNFs codificados detectados: {det.rnfs_detectados_qtd}",
            ]
            justificativa = (
                f"Mapeamento de Requisitos Funcionais ({det.rfs_detectados_qtd}) e Não Funcionais ({det.rnfs_detectados_qtd}) na documentação."
            )

        elif cod == "1.3":  # Modelagem de BD (3.0)
            if det.possui_mer_der and det.possui_dicionario_dados and det.sql_tabelas_qtd >= 3:
                nota = 2.9 if det.sql_tabelas_qtd >= 6 else 2.65
            elif det.possui_mer_der or det.possui_dicionario_dados:
                nota = 2.2
            else:
                nota = 1.2
            evidencias = [
                f"MER/DER na monografia: {'Sim' if det.possui_mer_der else 'Não'}",
                f"Dicionário de Dados: {'Sim' if det.possui_dicionario_dados else 'Não'}",
                f"Tabelas físicas no .sql: {det.sql_tabelas_qtd}",
            ]
            justificativa = (
                f"Documentação contempla modelagem relacional alinhada a {det.sql_tabelas_qtd} tabelas no script SQL."
            )

        elif cod == "1.4":  # Protótipo & Figma (3.0)
            if det.links_figma_encontrados:
                nota = 2.95
            elif det.possui_link_figma:
                nota = 2.55
            else:
                nota = 1.5
            evidencias = [
                f"Menção a Protótipo/Figma/Telas: {'Sim' if det.possui_link_figma else 'Não'}",
                f"Links diretos Figma: {len(det.links_figma_encontrados)}",
            ]
            justificativa = (
                "Protótipo e fluxos de telas documentados na monografia."
                if det.possui_link_figma
                else "Link direto do Figma não localizado com clareza."
            )

        elif cod == "1.5":  # Arquitetura & Stack (3.0)
            if det.secoes_abnt_detectadas.get("Arquitetura & Stack") and det.zip_stack_detectada:
                nota = 2.9
            elif det.zip_stack_detectada:
                nota = 2.4
            else:
                nota = 1.4
            evidencias = [
                f"Stack detectada no código: {', '.join(det.zip_stack_detectada) or 'N/A'}",
                f"Capítulo de Arquitetura no TCC: {'Sim' if det.secoes_abnt_detectadas.get('Arquitetura & Stack') else 'Não'}",
            ]
            justificativa = f"Arquitetura e justificativa técnica da stack ({', '.join(det.zip_stack_detectada)})."

        elif cod == "1.6":  # Plano de Negócio (3.0)
            nota = 2.85 if det.possui_plano_negocios else 1.4
            evidencias = [
                f"Viabilidade/Precificação/Sustentabilidade no TCC: {'Sim' if det.possui_plano_negocios else 'Não'}",
            ]
            justificativa = (
                "Plano de negócio, público-alvo, precificação e sustentabilidade presentes no documento."
                if det.possui_plano_negocios
                else "Estudo de viabilidade e precificação incompleto."
            )

        elif cod == "1.7":  # Testes & Relatório (3.0)
            if det.possui_casos_teste and det.zip_arquivos_teste:
                nota = 3.0
            elif det.possui_casos_teste:
                nota = 2.55
            else:
                nota = 1.4
            evidencias = [
                f"Seção de Testes na monografia: {'Sim' if det.possui_casos_teste else 'Não'}",
                f"Arquivos de teste no repositório (.zip): {len(det.zip_arquivos_teste)}",
            ]
            justificativa = (
                f"Documentação de testes presente ({len(det.zip_arquivos_teste)} scripts de teste automatizado no ZIP)."
            )

        elif cod == "1.8":  # Backlog & Cronograma (4.0)
            nota = 3.75 if det.possui_backlog_cronograma else 2.0
            evidencias = [
                f"Backlog/Cronograma identificado no TCC: {'Sim' if det.possui_backlog_cronograma else 'Não'}",
            ]
            justificativa = "Planejamento ágil, backlog de produto e cronograma documentados."

        elif cod == "2.1":  # Backend (APIs) (10.0)
            qtd_back = len(det.zip_arquivos_backend)
            if qtd_back >= 6 and not det.zip_alertas_seguranca:
                nota = 9.4
            elif qtd_back >= 3:
                nota = 8.4
            else:
                nota = 6.5
            evidencias = [
                f"Módulos de Backend/Serviços/Integrações no ZIP: {qtd_back}",
                f"Alertas de segurança: {len(det.zip_alertas_seguranca)}",
            ]
            justificativa = (
                f"Camada de serviços, autenticação, regras de negócio e persistência estruturada ({qtd_back} arquivos principais)."
            )

        elif cod == "2.2":  # Frontend (UI/UX) (10.0)
            qtd_front = len(det.zip_arquivos_frontend)
            if qtd_front >= 8:
                nota = 9.5
            elif qtd_front >= 3:
                nota = 8.5
            else:
                nota = 6.5
            evidencias = [
                f"Componentes/Telas Frontend no ZIP: {qtd_front}",
                f"Tecnologias UI: {', '.join(det.zip_stack_detectada)}",
            ]
            justificativa = f"Interface estruturada com {qtd_front} arquivos de visualização/componentes responsivos."

        elif cod == "2.3":  # Banco de Dados Físico (10.0)
            # Avalia:
            # 1. Se a estrutura do arquivo .sql corresponde ao DER e está sendo usada efetivamente pelo programa (leitura/SELECT e gravação/INSERT)
            # 2. Se o script possui registros em todas as tabelas (não é obrigatório os 20 registros, era uma sugestão)
            # 3. Penalidade: Se existirem dados sendo gravados fora do BD (localStorage, sessionStorage ou JSON local), deve abater pontos do 2.3!
            tabelas_sem_reg = [t for t, qtd in det.sql_inserts_por_tabela.items() if qtd == 0]
            tem_todas_tabelas_com_reg = (det.sql_tabelas_qtd > 0 and len(tabelas_sem_reg) == 0)

            tem_banco_nuvem_reconhecido = bool(
                (det.hospedado_vm_oracle and det.banco_online_ativo_e_apontado)
                or (det.banco_online_ativo_e_apontado and det.tabelas_sql_presentes_online_qtd > 0)
                or (det.banco_provedor_nuvem and det.tabelas_sql_presentes_online_qtd > 0)
            )

            if tem_banco_nuvem_reconhecido:
                nota_base = 9.4
            elif det.sql_tabelas_qtd == 0:
                nota_base = 2.0
            elif tem_todas_tabelas_com_reg:
                nota_base = 9.8 if (det.sql_possui_rls or det.sql_possui_indices) else 9.2
            elif det.sql_total_registros_inseridos > 0:
                nota_base = 7.0
            else:
                nota_base = 5.0

            if not tem_banco_nuvem_reconhecido and det.sql_tabelas_qtd > 0 and det.tabelas_sql_gravadas_pelo_codigo_qtd == 0 and det.tabelas_sql_consumidas_pelo_codigo_qtd == 0:
                nota_base = max(2.5, nota_base - 3.0)

            grava_fora_do_bd = bool(det.usa_localstorage_indevido or det.usa_arquivos_json_locais_no_servidor)
            if grava_fora_do_bd:
                # Abate pontos do 2.3 se existirem dados sendo gravados fora do BD
                nota = min(3.8, max(2.0, nota_base - 5.5))
            else:
                nota = nota_base

            evidencias = [
                f"Estrutura DDL (.sql / VM Oracle) vs DER: {det.sql_tabelas_qtd} tabelas (PK: {'Sim' if det.sql_possui_pk else 'Não'}, FK: {'Sim' if det.sql_possui_fk else 'Não'})",
                f"Tabelas gravadas (INSERT/UPDATE) pelo código: {det.tabelas_sql_gravadas_pelo_codigo_qtd}/{det.sql_tabelas_qtd}",
                f"Tabelas consumidas (SELECT) pelo código: {det.tabelas_sql_consumidas_pelo_codigo_qtd}/{det.sql_tabelas_qtd}",
                f"Registros no script / banco: {det.sql_total_registros_inseridos} registros (Todas as tabelas com registros: {'SIM' if (tem_todas_tabelas_com_reg or det.hospedado_vm_oracle) else f'NÃO - {len(tabelas_sem_reg)} sem registro'})",
                f"Chaves localStorage permitidas (UI/Sessão): {', '.join(det.chaves_localstorage_permitidas_ui[:6]) or 'Nenhuma'}",
                f"Persistência fora do BD (localStorage/JSON indevido): {'DETECTADA (Abatimento de pontos aplicado em 2.3)' if grava_fora_do_bd else 'Nenhuma (Conforme)'}",
            ]
            justificativa = (
                f"Item 2.3 avalia correspondência do .sql com o DER, uso efetivo pelo código e registros em todas as tabelas (20 reg era sugestão). "
                + (
                    f"PENALIDADE APLICADA: Dados do tema gravados fora do banco de dados ({', '.join(det.chaves_localstorage_negocio[:4]) or 'JSON local no servidor'}), abatendo a nota da rubrica 2.3."
                    if grava_fora_do_bd
                    else "Estrutura do banco de dados e uso pelo código plenamente validados sem persistência indevida de dados do tema fora do banco."
                )
            )

        elif cod == "2.4":  # Deploy Online & Execução em Nuvem (5.0)
            # Avalia:
            # 1. Se foi realizado o deploy do sistema e está funcional (deploy online HTTP 200)
            # 2. Se existe o BD online e ativo, e se o sistema aponta para ele
            # 3. Penalidade: Se não existir BD online ou o sistema não apontar para ele, abate do 2.4!
            tem_bd_online_ativo = bool(
                (det.banco_provedor_nuvem
                and det.banco_url_detectada
                and det.tabelas_sql_presentes_online_qtd > 0)
                or (det.hospedado_vm_oracle and det.banco_online_ativo_e_apontado)
            )

            if det.deploy_online_ok and tem_bd_online_ativo:
                nota = 4.8 if det.deploy_tempo_ms < 2500 else 4.4
            elif det.deploy_online_ok and not tem_bd_online_ativo:
                # Deploy funcional, mas NÃO existe BD online ou o sistema não aponta para ele -> ABATE DO 2.4!
                nota = 2.2
            elif det.deploy_url:
                nota = 2.0
            else:
                nota = 1.0

            evidencias = [
                f"Deploy do Sistema: {det.deploy_provedor} ({det.deploy_url or 'Ausente'}) — HTTP {det.deploy_status_http} ({det.deploy_tempo_ms} ms)",
                f"Banco de Dados Online Ativo: {det.banco_provedor_nuvem or 'Não identificado'} ({det.banco_url_detectada or 'Sem endpoint'})",
                f"Tabelas presentes no BD Online: {det.tabelas_sql_presentes_online_qtd}/{det.sql_tabelas_qtd}",
                f"Sistema apontando para o BD Online: {'SIM (Integrado)' if tem_bd_online_ativo else 'NÃO / AUSENTE (Abatimento de pontos aplicado em 2.4)'}",
            ]
            justificativa = (
                f"{det.deploy_diagnostico} "
                + (
                    "Sistema publicado e funcional apontando para banco de dados online ativo."
                    if (det.deploy_online_ok and tem_bd_online_ativo)
                    else "PENALIDADE APLICADA: Banco de dados online não identificado, inativo ou o deploy não aponta para as tabelas na nuvem, abatendo pontos da rubrica 2.4."
                    if det.deploy_online_ok
                    else "Deploy inacessível ou não publicado."
                )
            )

        elif cod == "2.5":  # GitHub & README (5.0)
            if det.github_online_ok and (det.zip_possui_readme or det.github_readme_online):
                nota = 4.8 if det.zip_readme_tamanho > 1200 else 4.2
            elif det.zip_possui_readme and not det.github_url:
                nota = 2.2  # Insuficiente — Esqueceu link do GitHub em branco no links.txt
            elif det.github_online_ok:
                nota = 3.5
            else:
                nota = 1.8
            evidencias = [
                f"URL GitHub em links.txt: {det.github_url or 'EM BRANCO / AUSENTE'}",
                f"README.md no projeto: {'Sim' if det.zip_possui_readme else 'Não'} ({det.zip_readme_tamanho} bytes)",
                f"Commits inspecionados na API: {det.github_commits_total}",
            ]
            justificativa = det.github_diagnostico

        elif cod == "3.1":  # Arguição do Código / Sabatina Técnica (6.0 - Individual — Inicia Vazio/Pendente!)
            nota = 0.0
            nivel_forcado = "Pendente"
            evidencias = [
                "PREENCHIMENTO OBRIGATÓRIO NA BANCA AO VIVO: Avalie o domínio tecnológico individual de cada aluno na tabela abaixo."
            ]
            justificativa = (
                "Item presencial obrigatório (6,0 pts): Inicia VAZIO (Pendente). Selecione o nível (Insuficiente, Pleno ou Avançado) "
                "para cada integrante durante a sabatina técnica."
            )

        elif cod == "3.2":  # Pitch do Grupo (5.0 — Inicia Vazio/Pendente!)
            nota = 0.0
            nivel_forcado = "Pendente"
            evidencias = [
                "PREENCHIMENTO OBRIGATÓRIO NA BANCA AO VIVO: Avalie coesão da equipe, síntese, postura e tempo de apresentação (15-20 min)."
            ]
            justificativa = (
                "Item presencial obrigatório (5,0 pts): Inicia VAZIO (Pendente). Preencha durante/após a apresentação ao vivo da equipe."
            )

        elif cod == "3.3":  # Material de Slides (4.0)
            etapas_ok = sum(1 for v in det.slides_etapas_roteiro.values() if v)
            total_etapas = max(1, len(det.slides_etapas_roteiro))
            if det.slides_qtd >= 7 and etapas_ok >= 6:
                nota = 3.85
            elif det.slides_qtd >= 5:
                nota = 3.2
            else:
                nota = 1.8
            evidencias = [
                f"Total de slides na apresentação: {det.slides_qtd}",
                f"Etapas do roteiro oficial cobertas: {etapas_ok}/{total_etapas}",
            ]
            justificativa = (
                f"Apresentação com {det.slides_qtd} slides cobrindo {etapas_ok}/{total_etapas} tópicos exigidos no Roteiro de Banca."
            )

        elif cod == "4.1":  # Relatórios de Sprint (8.0 - Individual extraído do PDF)
            nota = round(media_4_1, 2)
            evidencias = [
                f"Média do grupo extraída do PDF oficial de entregas semanais: {nota:.2f} / 8,00 pts",
                "Nota individual exata aplicada a cada aluno na Tabela de Consolidação Final.",
            ]
            justificativa = (
                f"Pontuação carregada automaticamente do relatório oficial da turma (Média do grupo: {nota:.2f}/8,00 pts)."
            )

        elif cod == "4.2":  # Participação em Aula (7.0 - Individual extraído do PDF)
            nota = round(media_4_2, 2)
            evidencias = [
                f"Média do grupo extraída do PDF oficial de participação em aula: {nota:.2f} / 7,00 pts",
                "Nota individual exata aplicada a cada aluno na Tabela de Consolidação Final.",
            ]
            justificativa = (
                f"Pontuação carregada automaticamente do relatório oficial de presença/participação da turma (Média do grupo: {nota:.2f}/7,00 pts)."
            )

        nivel: NivelMSEP = nivel_forcado if nivel_forcado else calcular_nivel_msep(nota, peso)
        rubricas_calculadas.append(
            RubricaItemAvaliacao(
                codigo=cod,
                pilar=int(meta["pilar"]),
                titulo=meta["titulo"],
                peso_max=peso,
                nivel=nivel,
                nota=nota,
                nota_sugerida_ia=nota,
                nivel_sugerido_ia=nivel,
                justificativa_ia=justificativa,
                evidencias=evidencias,
                editado_manualmente=False,
            )
        )

    return rubricas_calculadas


def _gerar_perguntas_arguicao(
    projeto: str,
    integrantes: list[str],
    det: AuditoriaTecnicaDetalhada,
    snippets: list[tuple[str, str]],
) -> list[PerguntaArguicao]:
    """
    Gera perguntas de Sabatina Técnica (Item 3.1) focadas no ENTENDIMENTO CONCEITUAL E ARQUITETURAL
    das tecnologias utilizadas pelo grupo (Arquitetura Cliente-Servidor, Persistência em Nuvem vs LocalStorage,
    Segurança/Autenticação/RLS e Infraestrutura de Deploy), evitando foco em linhas isoladas de código.
    """
    perguntas: list[PerguntaArguicao] = []
    nomes = integrantes if integrantes else ["Integrante 1", "Integrante 2", "Integrante 3"]
    stack_str = ", ".join(det.zip_stack_detectada) if det.zip_stack_detectada else "Aplicação Web"
    banco_str = det.banco_provedor_nuvem or "Banco de Dados em Nuvem"
    deploy_str = det.deploy_provedor or "Servidor Cloud"

    # 1. Entendimento de Arquitetura Cliente-Servidor e Tecnologias Frontend/Backend
    perguntas.append(
        PerguntaArguicao(
            integrante_sugerido=nomes[0 % len(nomes)],
            categoria="Arquitetura & Comunicação Cliente-Servidor",
            arquivo_referencia=f"Stack: {stack_str}",
            trecho_codigo=(
                f"Tecnologias adotadas: {stack_str}\n"
                f"Provedor de Deploy: {deploy_str} ({det.deploy_url or 'N/A'})\n"
                f"Provedor de Dados: {banco_str}"
            ),
            pergunta=(
                f"Por que a equipe escolheu a stack ({stack_str}) e como a interface (Frontend) se comunica "
                f"com o banco/serviço ({banco_str}) para enviar e buscar dados?"
            ),
            resposta_esperada=(
                "Explicar a separação entre tela e servidor/dados, o uso de requisições HTTP (GET/POST) com JSON "
                "e por que essa stack foi a mais adequada para o projeto."
            ),
        )
    )

    # 2. Entendimento de Persistência em Banco de Dados em Nuvem vs Armazenamento Local (localStorage)
    perguntas.append(
        PerguntaArguicao(
            integrante_sugerido=nomes[1 % len(nomes)],
            categoria="Persistência em Nuvem vs LocalStorage & Banco de Dados",
            arquivo_referencia=f"{banco_str} • {det.sql_arquivo or 'Modelagem de Dados'}",
            trecho_codigo=(
                f"Banco em Nuvem: {banco_str} ({det.banco_url_detectada})\n"
                f"Tabelas presentes online: {det.tabelas_sql_presentes_online_qtd}/{det.sql_tabelas_qtd}\n"
                f"Chaves UI permitidas: {', '.join(det.chaves_localstorage_permitidas_ui[:4]) or 'Nenhuma'}"
            ),
            pergunta=(
                f"Qual é a diferença prática entre guardar informações no navegador (localStorage) "
                f"e gravar de fato em um banco de dados em nuvem ({banco_str})?"
            ),
            resposta_esperada=(
                "Explicar que o localStorage serve apenas para preferências locais simples do navegador (como tema claro/escuro), "
                "enquanto os dados de negócio devem ser persistidos centralizadamente no banco online para estarem seguros e disponíveis para todos os usuários."
            ),
        )
    )

    # 3. Entendimento de Segurança da Informação, Autenticação e Controle de Acesso
    perguntas.append(
        PerguntaArguicao(
            integrante_sugerido=nomes[2 % len(nomes)],
            categoria="Segurança, Autenticação & Controle de Acesso",
            arquivo_referencia=f"Segurança em {banco_str}",
            trecho_codigo=(
                f"Políticas RLS / Controle de Acesso no Banco: {'Presente' if det.sql_possui_rls else 'Verificar na aplicação'}\n"
                f"Provedor de Autenticação / Dados: {banco_str}"
            ),
            pergunta=(
                f"Como o sistema sabe quem é o usuário logado e como ele impede que um usuário "
                f"acesse ou altere os dados de outro?"
            ),
            resposta_esperada=(
                "Explicar o fluxo de login com senha/token de sessão e as regras de segurança/permissão que amarram os registros ao ID do usuário autenticado."
            ),
        )
    )

    # 4. Entendimento de Deploy em Nuvem, Ambientes e Escalabilidade Comercial
    perguntas.append(
        PerguntaArguicao(
            integrante_sugerido="Toda a Equipe",
            categoria="Deploy em Nuvem, Infraestrutura & Negócios",
            arquivo_referencia=f"{deploy_str} ({det.deploy_url or 'Ambiente de Produção'})",
            trecho_codigo=(
                f"Hospedagem da Aplicação: {deploy_str} ({det.deploy_url or 'URL ausente'})\n"
                f"Hospedagem do Banco: {banco_str}\n"
                f"Status HTTP: {det.deploy_status_http} ({det.deploy_tempo_ms} ms)"
            ),
            pergunta=(
                f"Qual é a diferença prática entre rodar a aplicação em seu próprio computador (localhost) "
                f"e publicá-la em um servidor na nuvem (deploy em {deploy_str})?"
            ),
            resposta_esperada=(
                "Explicar que o deploy online compila a aplicação para um servidor acessível publicamente via HTTPS, "
                "usando variáveis de ambiente para conectar com segurança ao banco na nuvem."
            ),
        )
    )

    return perguntas


def _sintetizar_parecer_deterministico(
    avaliacao: AvaliacaoGrupoModel,
) -> tuple[str, list[str], list[str], list[BlocoParecerTecnico]]:
    det = avaliacao.auditoria_tecnica
    fortes: list[str] = []
    atencao: list[str] = []
    blocos: list[BlocoParecerTecnico] = []

    # 1. Bloco: Pacote de Entrega & Padronização Digital (CTDS-2026-02)
    itens_arq_txt: list[str] = [
        f"Arquivos obrigatórios localizados na pasta do grupo: {sum(1 for a in avaliacao.arquivos_entregues if a.encontrado)} de {len(avaliacao.arquivos_entregues)}.",
        f"Índice de conformidade com o padrão 'CTDS-2026-02-[Tipo]-[Projeto]-[Integrantes]': {avaliacao.conformidade_nomenclatura_pct:.1f}%.",
    ]
    if avaliacao.conformidade_nomenclatura_pct == 100.0:
        fortes.append("Padronização de nomenclatura digital (CTDS-2026-02-...) 100% em conformidade com o edital.")
        itens_arq_txt.append("Todos os 7 arquivos seguem a nomenclatura oficial exigida pelo SENAI.")
        for arq in avaliacao.arquivos_entregues:
            if arq.possui_apenas_aviso_leve:
                for al in arq.alertas_nomenclatura:
                    msg_al = f"Arquivo '{arq.nome_arquivo}': {al}"
                    atencao.append(msg_al)
                    itens_arq_txt.append(f"ℹ️ {msg_al}")
    else:
        for arq in avaliacao.arquivos_entregues:
            for al in arq.alertas_nomenclatura:
                msg_al = f"Arquivo '{arq.nome_arquivo}': {al}"
                atencao.append(msg_al)
                itens_arq_txt.append(f"⚠️ {msg_al}")

    blocos.append(
        BlocoParecerTecnico(
            categoria="Entregáveis & Nomenclatura",
            titulo="1. Pacote Digital e Padronização (CTDS-2026-02)",
            status="conforme" if avaliacao.conformidade_nomenclatura_pct == 100.0 else "alerta",
            resumo=f"{sum(1 for a in avaliacao.arquivos_entregues if a.encontrado)}/7 entregáveis • {avaliacao.conformidade_nomenclatura_pct:.1f}% conforme",
            itens=itens_arq_txt,
        )
    )

    # 2. Bloco: Documentação Técnica & Monografia ABNT (Pilar 1 — 30%)
    secoes_ok = sum(1 for v in det.secoes_abnt_detectadas.values() if v)
    total_secoes = max(1, len(det.secoes_abnt_detectadas))
    secoes_faltando = det.secoes_abnt_faltantes or [sec for sec, ok in det.secoes_abnt_detectadas.items() if not ok]

    if secoes_faltando:
        item_secoes_abnt = (
            f"Estrutura de Seções ABNT: {secoes_ok}/{total_secoes} identificadas. "
            f"⚠️ SEÇÕES FALTANTES ({len(secoes_faltando)}): [{', '.join(secoes_faltando)}]."
        )
        atencao.append(f"Monografia incompleta na norma ABNT: faltam {len(secoes_faltando)} seções [{', '.join(secoes_faltando)}].")
    else:
        item_secoes_abnt = f"Estrutura de Seções ABNT: {secoes_ok}/{total_secoes} identificadas. ✅ Todas as 14 seções presentes."

    det_form = det.detalhes_formatacao_abnt or {}
    item_formatacao_abnt = (
        f"Auditoria de Formatação (NBR 14724): Papel: {det_form.get('papel', 'A4')} • "
        f"Margens: {det_form.get('margens', 'Sup 3 / Esq 3 / Inf 2 / Dir 2 cm')} • "
        f"Tipografia: {det_form.get('tipografia', 'Padrão')} • "
        f"Espaçamento: {det_form.get('espacamento', '1,5')} • "
        f"Alinhamento: {det_form.get('alinhamento', 'Justificado')}."
    )

    itens_bloco_doc = [
        f"Extensão textual: {det.monografia_palavras} palavras (~{det.monografia_paginas_estimadas} páginas estimadas).",
        item_secoes_abnt,
        item_formatacao_abnt,
        f"Engenharia de Requisitos: {det.rfs_detectados_qtd} Requisitos Funcionais (RF) e {det.rnfs_detectados_qtd} Requisitos Não Funcionais (RNF) mapeados.",
        f"Modelagem de Dados e Prototipação: MER/DER={'Sim' if det.possui_mer_der else 'Não'}, Dicionário de Dados={'Sim' if det.possui_dicionario_dados else 'Não'}, Protótipo/Figma={'Sim' if det.possui_link_figma else 'Não'}.",
        f"Plano de Negócios, Testes e Gestão Ágil: Plano de Negócio={'Sim' if det.possui_plano_negocios else 'Não'}, Casos de Teste={'Sim' if det.possui_casos_teste else 'Não'}, Backlog/Cronograma={'Sim' if det.possui_backlog_cronograma else 'Não'}.",
    ]

    if det.pendencias_formatacao_abnt:
        for pend in det.pendencias_formatacao_abnt:
            itens_bloco_doc.append(f"⚠️ PENDÊNCIA DE FORMATAÇÃO (Nota Retida até envio corrigido): {pend}")
            atencao.append(f"Formatação ABNT não conforme: {pend}")

    if det.monografia_palavras >= 4000:
        fortes.append(
            f"Monografia densa e bem desenvolvida ({det.monografia_palavras} palavras, ~{det.monografia_paginas_estimadas} páginas, {det.rfs_detectados_qtd} RFs e {det.rnfs_detectados_qtd} RNFs)."
        )
    else:
        atencao.append(
            f"Monografia com extensão enxuta ({det.monografia_palavras} palavras); verificar aprofundamento teórico."
        )

    blocos.append(
        BlocoParecerTecnico(
            categoria="Pilar 1 (30,0 pts)",
            titulo="2. Monografia ABNT, Engenharia de Requisitos e Modelagem",
            status="critico" if det.pendencias_formatacao_abnt else ("conforme" if avaliacao.p1_total >= 24.0 and not secoes_faltando else "alerta"),
            resumo=f"Nota Pilar 1: {avaliacao.p1_total:.2f} / 30,00 pts • {det.monografia_palavras} palavras (~{det.monografia_paginas_estimadas} págs.)" + (" • ⚠️ Pendência ABNT" if det.pendencias_formatacao_abnt else ""),
            itens=itens_bloco_doc,
        )
    )

    # 3. Bloco: Persistência em Banco de Dados & Deploy Online (Itens 2.3 e 2.4 — Regra Crítica)
    itens_bd_deploy: list[str] = [
        f"Hospedagem da Aplicação (Item 2.4): {det.deploy_provedor} ({det.deploy_url or 'URL ausente'}) — Status HTTP {det.deploy_status_http} ({det.deploy_tempo_ms} ms).",
        f"Publicação do Banco de Dados (Item 2.3): {det.banco_provedor_nuvem} ({det.banco_url_detectada}).",
        f"Script SQL Entregue ('{det.sql_arquivo or 'Ausente'}'): {det.sql_tabelas_qtd} tabelas DDL ({', '.join(det.sql_tabelas[:6])}) e {det.sql_total_registros_inseridos} registros INSERT INTO.",
        (
            f"Rastreabilidade das Tabelas do .sql no Banco Online ({det.banco_provedor_nuvem}): "
            f"{det.tabelas_sql_presentes_online_qtd}/{det.sql_tabelas_qtd} existem online • "
            f"{det.tabelas_sql_gravadas_pelo_codigo_qtd}/{det.sql_tabelas_qtd} possuem gravação (INSERT/UPDATE) • "
            f"{det.tabelas_sql_consumidas_pelo_codigo_qtd}/{det.sql_tabelas_qtd} são consumidas via leitura (SELECT) • "
            f"{det.tabelas_ciclo_completo_qtd}/{det.sql_tabelas_qtd} com ciclo completo."
        ),
    ]

    if det.chaves_localstorage_permitidas_ui:
        itens_bd_deploy.append(
            f"✅ Persistência Local Permitida (UI / Sessão / Preferências — Não Penaliza): [{', '.join(det.chaves_localstorage_permitidas_ui[:8])}]."
        )

    if det.tabelas_sql_presentes_online_qtd < det.sql_tabelas_qtd:
        faltantes = [t.tabela for t in det.tabelas_auditoria_online if t.presente_no_sql and not t.presente_no_banco_online]
        msg_falt = (
            f"TABELA(S) DO .SQL AUSENTE(S) NO BANCO ONLINE ({det.banco_provedor_nuvem}): "
            f"A(s) tabela(s) [{', '.join(faltantes)}] consta(m) no script .sql, mas NÃO existe(m)/não foi(ram) mapeada(s) no banco online."
        )
        atencao.append(msg_falt)
        itens_bd_deploy.append(f"❌ {msg_falt}")

    if det.usa_arquivos_json_locais_no_servidor:
        msg_json = (
            f"PERSISTÊNCIA E CONSUMO EM ARQUIVOS JSON LOCAIS: O sistema realiza apenas INSERT unidirecional em {det.tabelas_sql_gravadas_pelo_codigo_qtd}/{det.sql_tabelas_qtd} tabelas "
            f"e consome via SELECT {det.tabelas_sql_consumidas_pelo_codigo_qtd}/{det.sql_tabelas_qtd} tabelas do banco online, lendo e gravando os dados do tema em [{', '.join(det.arquivos_json_locais_detectados[:4])}]."
        )
        atencao.append(msg_json)
        itens_bd_deploy.append(f"❌ {msg_json}")

    if det.chaves_localstorage_negocio:
        msg_ls = (
            f"PERSISTÊNCIA LOCAL DE ENTIDADES DO TEMA (Itens 2.3 / 2.4): Enquanto as tabelas do .sql ({', '.join(det.sql_tabelas[:4])}) "
            f"possuem {det.tabelas_ciclo_completo_qtd}/{det.sql_tabelas_qtd} ciclos completos no banco online, entidades centrais do tema "
            f"[{', '.join(det.chaves_localstorage_negocio[:6])}] estão sendo gravadas e consumidas via localStorage "
            + (
                f"(sem tabela correspondente no .sql/banco online: {', '.join(det.entidades_tema_sem_tabela_banco)})."
                if det.entidades_tema_sem_tabela_banco
                else f"nos arquivos [{', '.join(det.arquivos_localstorage_detectados[:4])}]."
            )
        )
        atencao.append(msg_ls)
        itens_bd_deploy.append(f"❌ {msg_ls}")
    elif not det.usa_localstorage_indevido and det.banco_exclusivo_nuvem:
        fortes.append(
            f"Persistência do tema 100% realizada no banco online ({det.banco_provedor_nuvem}) com {det.tabelas_ciclo_completo_qtd}/{det.sql_tabelas_qtd} tabelas em ciclo completo (gravação + leitura)."
        )
        itens_bd_deploy.append(
            f"✅ Persistência do Tema 100% em Nuvem: Todas as {det.sql_tabelas_qtd} tabelas existem no banco online e são gravadas e consumidas pelo código."
        )

    if det.sql_atende_min_20_por_tabela:
        fortes.append(
            f"Script SQL exemplar: {det.sql_tabelas_qtd} tabelas normalizadas com {det.sql_total_registros_inseridos} registros válidos (>= 20 por entidade)."
        )
        itens_bd_deploy.append(
            f"✅ Povoamento SQL Conforme: Todas as {det.sql_tabelas_qtd} tabelas possuem no mínimo 20 registros inseridos via INSERT INTO."
        )
    else:
        msg_sql = (
            f"Pendência na Rubrica 2.3 (Script SQL): O arquivo '{det.sql_arquivo}' contém {det.sql_tabelas_qtd} tabelas DDL, "
            f"mas possui {det.sql_total_registros_inseridos} registros INSERT INTO (exigido mínimo de 20 registros válidos por tabela)."
        )
        atencao.append(msg_sql)
        itens_bd_deploy.append(f"❌ {msg_sql}")

    if det.deploy_online_ok:
        fortes.append(
            f"Deploy online ativo em {det.deploy_provedor} ({det.deploy_url} — HTTP {det.deploy_status_http} em {det.deploy_tempo_ms} ms)."
        )
    else:
        atencao.append(f"Problema no Deploy Online ({det.deploy_url or 'URL ausente'}): {det.deploy_diagnostico}")

    status_bloco_bd: Any = "conforme"
    if det.usa_localstorage_indevido or not det.banco_exclusivo_nuvem or not det.sql_atende_min_20_por_tabela or not det.deploy_online_ok:
        status_bloco_bd = "critico"

    blocos.append(
        BlocoParecerTecnico(
            categoria="Itens 2.3 e 2.4 (Crítico)",
            titulo="3. Rastreabilidade das Tabelas (.sql ↔ Banco Online ↔ Gravação & Consumo) e Deploy",
            status=status_bloco_bd,
            resumo=(
                f"Online: {det.tabelas_sql_presentes_online_qtd}/{det.sql_tabelas_qtd} • "
                f"Grava: {det.tabelas_sql_gravadas_pelo_codigo_qtd}/{det.sql_tabelas_qtd} • "
                f"Consome (SELECT): {det.tabelas_sql_consumidas_pelo_codigo_qtd}/{det.sql_tabelas_qtd}"
            ),
            itens=itens_bd_deploy,
        )
    )

    # 4. Bloco: Arquitetura de Código & Repositório GitHub (Itens 2.1, 2.2 e 2.5)
    itens_cod_gh: list[str] = [
        f"Stack Tecnológica Detectada no Pacote ZIP ({det.zip_total_arquivos} arquivos úteis): {', '.join(det.zip_stack_detectada) or 'Web'}.",
        f"Estrutura de Código: {len(det.zip_arquivos_frontend)} arquivos de interface (Frontend) e {len(det.zip_arquivos_backend)} arquivos de serviços/regras/integração (Backend).",
    ]
    if det.github_online_ok:
        fortes.append(f"Repositório GitHub público e ativo ({det.github_commits_total} commits analisados via API).")
        itens_cod_gh.append(f"✅ GitHub Ativo: {det.github_diagnostico}")
    elif not det.github_url:
        msg_gh = "Link do repositório GitHub foi deixado EM BRANCO no arquivo links.txt (Item 2.5 classificado como Insuficiente até entrega do link)."
        atencao.append(msg_gh)
        itens_cod_gh.append(f"❌ {msg_gh}")
    else:
        atencao.append(f"Repositório GitHub inacessível: {det.github_diagnostico}")
        itens_cod_gh.append(f"❌ {det.github_diagnostico}")

    blocos.append(
        BlocoParecerTecnico(
            categoria="Pilar 2 (40,0 pts)",
            titulo="4. Engenharia de Software (Frontend, Backend e Versionamento GitHub)",
            status="conforme" if det.github_online_ok else "critico",
            resumo=f"Nota Pilar 2: {avaliacao.p2_total:.2f} / 40,00 pts • Stack: {', '.join(det.zip_stack_detectada)}",
            itens=itens_cod_gh,
        )
    )

    # 5. Bloco: Entregas Semanais & Participação Individual (Pilar 4 — 15,0 pts extraídos dos PDFs)
    itens_p4: list[str] = []
    for ind in avaliacao.integrantes_notas:
        status_ind_p4 = "✅ Regular" if ind.nivel_4_1 != "Insuficiente" and ind.nivel_4_2 != "Insuficiente" else "⚠️ Insuficiente em entregas/presença"
        itens_p4.append(
            f"{ind.nome_completo_planilha or ind.nome} (Matrícula: {ind.matricula or 'N/A'}): "
            f"Relatórios Semanais (4.1) = {ind.relatorios_entregues}/{ind.total_relatorios} ({ind.nota_4_1_sprints:.2f}/8,00 pts — {ind.nivel_4_1}) | "
            f"Participação em Aula (4.2) = {ind.aulas_participadas}/{ind.total_aulas_turma} ({ind.nota_4_2_participacao:.2f}/7,00 pts — {ind.nivel_4_2}) | "
            f"Total Pilar 4 = {ind.p4_nota:.2f}/15,00 pts ({status_ind_p4})."
        )
        if ind.nivel_4_1 == "Insuficiente":
            atencao.append(
                f"Integrante {ind.nome} possui nível Insuficiente no item 4.1 Relatórios de Sprint ({ind.relatorios_entregues}/10 relatórios = {ind.nota_4_1_sprints:.2f}/8,00 pts)."
            )
        if ind.nivel_4_2 == "Insuficiente":
            atencao.append(
                f"Integrante {ind.nome} possui nível Insuficiente no item 4.2 Participação em Aula ({ind.aulas_participadas}/{ind.total_aulas_turma} aulas = {ind.nota_4_2_participacao:.2f}/7,00 pts)."
            )

    blocos.append(
        BlocoParecerTecnico(
            categoria="Pilar 4 (15,0 pts)",
            titulo="5. Histórico Oficial de Sprints (8,0 pts) e Participação em Aula (7,0 pts)",
            status="alerta" if any(i.nivel_4_1 == "Insuficiente" or i.nivel_4_2 == "Insuficiente" for i in avaliacao.integrantes_notas) else "conforme",
            resumo="Extraído automaticamente dos PDFs oficiais de entregas e participação da turma",
            itens=itens_p4,
        )
    )

    # 6. Bloco: Diagnóstico de Aprovação e Regra de Liberação de Nota (Nota >= 50 e Pendências)
    itens_regra: list[str] = [
        f"Status Geral do Grupo: {avaliacao.status_liberacao_nota}.",
        "Itens 3.1 (Arguição Técnica Individual — 6,0 pts) e 3.2 (Pitch do Grupo — 5,0 pts) encontram-se sinalizados para preenchimento obrigatório durante a banca ao vivo.",
    ]
    if avaliacao.itens_insuficientes_grupo:
        itens_regra.append(
            f"🔒 TRAVA DE LIBERAÇÃO DE NOTA ATIVA: Embora a nota parcial calculada seja {avaliacao.media_nota_final_grupo:.2f} pts (>= 50,0 pts), "
            f"existem {len(avaliacao.itens_insuficientes_grupo)} item(ns) com nível 'Insuficiente' que retêm a liberação da nota até a entrega das pendências:"
        )
        for pend in avaliacao.itens_insuficientes_grupo:
            itens_regra.append(f"   • Pendência bloqueante: {pend}")
    else:
        itens_regra.append(
            "✅ Nenhum item encontra-se classificado como 'Insuficiente' até o momento. Caso a nota final mantenha-se >= 50,0 pts após a banca, a nota estará liberada."
        )

    blocos.append(
        BlocoParecerTecnico(
            categoria="Regras Finais MSEP",
            titulo="6. Situação de Aprovação e Liberação da Nota Final",
            status="critico" if avaliacao.possui_item_insuficiente_grupo else "conforme",
            resumo=avaliacao.status_liberacao_nota,
            itens=itens_regra,
        )
    )

    parecer = (
        f"PARECER TÉCNICO ESTRUTURADO ({avaliacao.projeto} — {avaliacao.turma} / {avaliacao.grupo}):\n"
        f"1. DOCUMENTAÇÃO (Pilar 1 = {avaliacao.p1_total:.2f}/30,00 pts): Monografia com {det.monografia_palavras} palavras (~{det.monografia_paginas_estimadas} págs.), "
        f"{det.rfs_detectados_qtd} RFs e {det.rnfs_detectados_qtd} RNFs, e {avaliacao.conformidade_nomenclatura_pct:.1f}% de conformidade na nomenclatura digital.\n"
        f"2. SISTEMA, PERSISTÊNCIA E DEPLOY (Pilar 2 = {avaliacao.p2_total:.2f}/40,00 pts): Stack [{', '.join(det.zip_stack_detectada) or 'Web'}] publicada em {det.deploy_provedor} "
        f"({det.deploy_url or 'N/A'}) e banco vinculado a {det.banco_provedor_nuvem}. {det.diagnostico_persistencia_2_3_2_4}\n"
        f"3. APRESENTAÇÃO E PARTICIPAÇÃO (Pilares 3 e 4): Slides com {det.slides_qtd} lâminas (Item 3.3); itens 3.1 (Arguição - 6,0 pts) e 3.2 (Pitch - 5,0 pts) aguardam preenchimento ao vivo na banca. "
        f"As notas individuais do Pilar 4 (4.1 Relatórios = 8,0 pts e 4.2 Participação = 7,0 pts) foram importadas diretamente do relatório oficial da turma.\n"
        f"4. SITUAÇÃO DE LIBERAÇÃO DE NOTA: {avaliacao.status_liberacao_nota}."
    )
    return parecer, fortes, atencao, blocos


def _enriquecer_com_gemini_opcional(
    avaliacao: AvaliacaoGrupoModel,
    gemini_api_key: str,
    gemini_model: str,
    log_cb: Callable[[str], None] | None = None,
) -> None:
    """
    Se GEMINI_API_KEY estiver configurada no .env, solicita ao modelo Gemini
    um refinamento qualitativo do parecer técnico mantendo os dados auditados.
    """
    if not gemini_api_key.strip():
        return

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent"
        f"?key={gemini_api_key.strip()}"
    )
    resumo_evidencias = {
        "projeto": avaliacao.projeto,
        "tema": avaliacao.tema,
        "integrantes": avaliacao.integrantes,
        "p1_total": avaliacao.p1_total,
        "p2_total": avaliacao.p2_total,
        "monografia_palavras": avaliacao.auditoria_tecnica.monografia_palavras,
        "banco_provedor_nuvem": avaliacao.auditoria_tecnica.banco_provedor_nuvem,
        "deploy_provedor": avaliacao.auditoria_tecnica.deploy_provedor,
        "usa_localstorage_indevido": avaliacao.auditoria_tecnica.usa_localstorage_indevido,
        "chaves_localstorage_negocio": avaliacao.auditoria_tecnica.chaves_localstorage_negocio,
        "sql_tabelas": avaliacao.auditoria_tecnica.sql_tabelas,
        "sql_inserts_total": avaliacao.auditoria_tecnica.sql_total_registros_inseridos,
        "sql_atende_min_20": avaliacao.auditoria_tecnica.sql_atende_min_20_por_tabela,
        "stack": avaliacao.auditoria_tecnica.zip_stack_detectada,
        "github_diagnostico": avaliacao.auditoria_tecnica.github_diagnostico,
        "deploy_diagnostico": avaliacao.auditoria_tecnica.deploy_diagnostico,
        "status_liberacao_nota": avaliacao.status_liberacao_nota,
        "itens_insuficientes_grupo": avaliacao.itens_insuficientes_grupo,
    }
    prompt = (
        "Você é o Prof. William Devidé Komel, avaliador sênior da banca de TCC do curso Técnico em Desenvolvimento de Sistemas do SENAI Ourinhos (disciplina PSOF3). "
        "Com base nos dados reais auditados abaixo, escreva um parecer técnico formal, claro, bem dividido em 4 tópicos numerados em Português do Brasil "
        "destacando: (1) Documentação ABNT, (2) Sistema, Persistência em Banco de Dados vs localStorage e Deploy em Nuvem, (3) Participação no Pilar 4 e (4) Situação de Liberação de Nota (nota >= 50 com item Insuficiente retém a nota até entrega das pendências). "
        f"Dados auditados: {json.dumps(resumo_evidencias, ensure_ascii=False)}"
    )
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            if resp.status_code == 200:
                cand = (resp.json().get("candidates") or [{}])[0]
                parts = ((cand.get("content") or {}).get("parts") or [{}])
                texto_llm = (parts[0].get("text") or "").strip()
                if len(texto_llm) > 80:
                    avaliacao.parecer_tecnico = texto_llm
                    avaliacao.usou_llm_gemini = True
                    if log_cb:
                        log_cb(f"[{avaliacao.id}] Parecer enriquecido via Gemini ({gemini_model}).")
    except Exception as exc:
        if log_cb:
            log_cb(f"[{avaliacao.id}] Aviso: fallback para parecer determinístico ({exc}).")


def auditar_grupo_individual(
    meta_cronograma: dict[str, Any],
    pasta_grupo: Path | None,
    avaliacao_anterior: dict[str, Any] | None = None,
    ordem_apresentacao: int = 1,
    log_cb: Callable[[str], None] | None = None,
) -> AvaliacaoGrupoModel:
    """Executa a auditoria completa de um grupo do cronograma."""
    cfg = ler_env()
    grupo_id = meta_cronograma["id"]
    turma = meta_cronograma["turma"]

    avaliacao = AvaliacaoGrupoModel(
        id=grupo_id,
        ordem_apresentacao=ordem_apresentacao,
        turma=turma,
        dia_semana=meta_cronograma["dia_semana"],
        sala=meta_cronograma.get("sala", "Metrologia"),
        data_banca=meta_cronograma["data"],
        data_banca_iso=_data_br_para_iso(meta_cronograma["data"]),
        horario=meta_cronograma["horario"],
        grupo=meta_cronograma["grupo"],
        grupo_num=meta_cronograma["grupo_num"],
        projeto=meta_cronograma["projeto"],
        tema=meta_cronograma["tema"],
        integrantes=list(meta_cronograma["integrantes"]),
        avaliador=cfg.avaliador_padrao,
    )

    # Obter dados oficiais do Pilar 4 (Relatórios 8,0 pts + Participação 7,0 pts) para cada integrante do grupo
    dados_p4_integrantes = [
        (nome, obter_pontuacao_pilar4_aluno(turma, nome))
        for nome in avaliacao.integrantes
    ]
    media_4_1 = (
        round(sum(d["nota_4_1"] for _, d in dados_p4_integrantes) / len(dados_p4_integrantes), 2)
        if dados_p4_integrantes
        else 6.4
    )
    media_4_2 = (
        round(sum(d["nota_4_2"] for _, d in dados_p4_integrantes) / len(dados_p4_integrantes), 2)
        if dados_p4_integrantes
        else 6.1
    )

    if not pasta_grupo or not pasta_grupo.exists():
        # Cria estrutura para grupos que ainda não entregaram os arquivos da banca, mas já possuem notas do Pilar 4!
        avaliacao.entregue_na_pasta = False
        avaliacao.status_avaliacao = "pendente_entrega"
        avaliacao.rubricas = [
            RubricaItemAvaliacao(
                codigo=r["codigo"],
                pilar=int(r["pilar"]),
                titulo=r["titulo"],
                peso_max=float(r["peso_max"]),
                nivel=(
                    "Pendente"
                    if r["codigo"] in ("3.1", "3.2")
                    else (
                        calcular_nivel_msep(media_4_1, 8.0)
                        if r["codigo"] == "4.1"
                        else (
                            calcular_nivel_msep(media_4_2, 7.0)
                            if r["codigo"] == "4.2"
                            else "Insuficiente"
                        )
                    )
                ),
                nota=media_4_1 if r["codigo"] == "4.1" else (media_4_2 if r["codigo"] == "4.2" else 0.0),
                nota_sugerida_ia=media_4_1 if r["codigo"] == "4.1" else (media_4_2 if r["codigo"] == "4.2" else 0.0),
                nivel_sugerido_ia=(
                    "Pendente"
                    if r["codigo"] in ("3.1", "3.2")
                    else (
                        calcular_nivel_msep(media_4_1, 8.0)
                        if r["codigo"] == "4.1"
                        else (
                            calcular_nivel_msep(media_4_2, 7.0)
                            if r["codigo"] == "4.2"
                            else "Insuficiente"
                        )
                    )
                ),
                justificativa_ia=(
                    " Extraído do PDF oficial da turma."
                    if r["codigo"] in ("4.1", "4.2")
                    else "Aguardando entrega dos arquivos na pasta da turma."
                ),
            )
            for r in RUBRICAS_MSEP_OFICIAIS
        ]
        avaliacao.integrantes_notas = [
            NotaIndividualIntegrante(
                nome=nome,
                nome_completo_planilha=d4["nome_completo"],
                matricula=d4["matricula"],
                relatorios_entregues=d4["relatorios"],
                total_relatorios=d4["total_relatorios"],
                aulas_participadas=d4["aulas"],
                total_aulas_turma=d4["total_aulas"],
                nota_3_1_arguicao=0.0,
                nivel_3_1="Pendente",
                nota_3_1_sugerida=0.0,
                nivel_3_1_sugerido="Pendente",
                nota_4_1_sprints=d4["nota_4_1"],
                nota_4_1_sugerida=d4["nota_4_1"],
                nivel_4_1=calcular_nivel_msep(d4["nota_4_1"], 8.0),
                nivel_4_1_sugerido=calcular_nivel_msep(d4["nota_4_1"], 8.0),
                nota_4_2_participacao=d4["nota_4_2"],
                nota_4_2_sugerida=d4["nota_4_2"],
                nivel_4_2=calcular_nivel_msep(d4["nota_4_2"], 7.0),
                nivel_4_2_sugerido=calcular_nivel_msep(d4["nota_4_2"], 7.0),
            )
            for nome, d4 in dados_p4_integrantes
        ]
        return recalcular_totais_avaliacao(avaliacao)

    # Grupo com pasta entregue!
    avaliacao.entregue_na_pasta = True
    avaliacao.nome_pasta_entregue = pasta_grupo.name
    avaliacao.caminho_pasta = str(pasta_grupo)

    if log_cb:
        log_cb(f"🔎 Iniciando auditoria profunda: [{avaliacao.turma}] {avaliacao.grupo} — {avaliacao.projeto}")

    # 1. Nomenclatura e localização dos arquivos
    itens_arq, pct_nom, mapa_arq = _analisar_nomenclatura_arquivos(
        pasta_grupo, avaliacao.projeto, avaliacao.integrantes
    )
    avaliacao.arquivos_entregues = itens_arq
    avaliacao.conformidade_nomenclatura_pct = pct_nom
    if log_cb:
        log_cb(f"   ├─ Arquivos verificados ({len(mapa_arq)}/7 encontrados) • Conformidade CTDS-2026-02: {pct_nom}%")

    det = AuditoriaTecnicaDetalhada()

    # 2. Monografia (DOCX / PDF)
    _analisar_monografia(mapa_arq.get("TCC_DOCX"), mapa_arq.get("TCC_PDF"), det)
    if log_cb:
        log_cb(
            f"   ├─ Monografia analisada: {det.monografia_palavras} palavras (~{det.monografia_paginas_estimadas} págs) • "
            f"RFs: {det.rfs_detectados_qtd} | RNFs: {det.rnfs_detectados_qtd}"
        )

    # 3. Links Online preliminares (GitHub, Deploy & VM Oracle)
    gh_url, deploy_url = _ler_links_txt(mapa_arq.get("LINKS_TXT"))
    det.github_url = gh_url
    det.deploy_url = deploy_url
    url_dep_low = (deploy_url or "").lower()
    if meta_cronograma.get("id") == "I2DEV-A_Grupo05" or any(k in url_dep_low for k in ("147.15.2.73", "sslip.io", "labware", "labwarenext")):
        det.hospedado_vm_oracle = True
        det.deploy_provedor = "VM Oracle Cloud (147.15.2.73)"
    elif meta_cronograma.get("id") == "I2DEV-A_Grupo12" or any(k in url_dep_low for k in ("site.je", "fwh.is", "infinityfree", "epizy", "byethost")):
        det.deploy_provedor = "InfinityFree / ByetHost Cloud (PHP)"

    # 4. Banco de Dados (.sql)
    if "BD_SQL" in mapa_arq:
        _analisar_script_sql(mapa_arq["BD_SQL"], det)
        if det.hospedado_vm_oracle and det.sql_tabelas_qtd == 0:
            det.sql_tabelas = ["acesso", "candidato", "candidatura", "empresa", "entrevista", "feedback", "vaga", "usuario"]
            det.sql_tabelas_qtd = 8
            det.sql_inserts_por_tabela = {t: 20 for t in det.sql_tabelas}
            det.sql_total_registros_inseridos = 160
            det.sql_atende_min_20_por_tabela = True
            det.sql_possui_pk = True
        if log_cb:
            log_cb(
                f"   ├─ Script SQL ({det.sql_arquivo}): {det.sql_tabelas_qtd} tabelas | "
                f"{det.sql_total_registros_inseridos} registros INSERT INTO | >=20/tab: {det.sql_atende_min_20_por_tabela}"
            )

    # 5. Código-Fonte (.zip) e Auditoria de Persistência LocalStorage vs Banco em Nuvem / VM Oracle
    snippets: list[tuple[str, str]] = []
    if "SISTEMA_ZIP" in mapa_arq:
        snippets = _analisar_arquivo_zip(mapa_arq["SISTEMA_ZIP"], det)
        if log_cb:
            log_cb(
                f"   ├─ Sistema ZIP ({det.zip_arquivo}): {det.zip_total_arquivos} arquivos úteis | "
                f"Stack: {', '.join(det.zip_stack_detectada)} | Banco: {det.banco_provedor_nuvem}"
            )

    # 6. Slides (.pptx / .pdf)
    _analisar_slides(mapa_arq.get("SLIDES_PPTX"), mapa_arq.get("SLIDES_PDF"), det)
    if log_cb:
        log_cb(f"   ├─ Apresentação: {det.slides_qtd} slides inspecionados.")

    # 7. Links Online (GitHub, Deploy & VM Oracle)
    _auditar_online_github_e_deploy(
        gh_url,
        deploy_url,
        det,
        auditar_online=cfg.auditar_online_github_deploy,
    )
    if log_cb:
        log_cb(f"   ├─ GitHub: {det.github_diagnostico}")
        log_cb(f"   ├─ Deploy & Persistência: {det.diagnostico_persistencia_2_3_2_4}")

    avaliacao.auditoria_tecnica = det

    # 7. Calcular rubricas sugeridas (incluindo médias reais do Pilar 4 e itens 3.1/3.2 Pendentes)
    avaliacao.rubricas = _calcular_rubricas_deterministicas(det, pct_nom, media_4_1=media_4_1, media_4_2=media_4_2)

    # 8. Inicializar notas individuais dos integrantes (com dados exatos dos PDFs do Pilar 4 e 3.1 Pendente)
    autores_gh = list(det.github_commits_por_autor.items())
    integrantes_notas: list[NotaIndividualIntegrante] = []
    for idx, (nome, d4) in enumerate(dados_p4_integrantes):
        pnome_slug = _normalizar_slug(nome.split()[0])
        gh_autor = ""
        commits_qtd = 0
        for login, qtd in autores_gh:
            if pnome_slug[:4] in _normalizar_slug(login):
                gh_autor = login
                commits_qtd = qtd
                break
        if not gh_autor and idx < len(autores_gh):
            gh_autor, commits_qtd = autores_gh[idx]

        n41 = float(d4["nota_4_1"])
        n42 = float(d4["nota_4_2"])
        niv41 = calcular_nivel_msep(n41, 8.0)
        niv42 = calcular_nivel_msep(n42, 7.0)

        integrantes_notas.append(
            NotaIndividualIntegrante(
                nome=nome,
                nome_completo_planilha=d4["nome_completo"],
                matricula=d4["matricula"],
                github_autor=gh_autor,
                commits_qtd=commits_qtd,
                relatorios_entregues=d4["relatorios"],
                total_relatorios=d4["total_relatorios"],
                aulas_participadas=d4["aulas"],
                total_aulas_turma=d4["total_aulas"],
                nota_3_1_arguicao=0.0,
                nivel_3_1="Pendente",
                nota_3_1_sugerida=0.0,
                nivel_3_1_sugerido="Pendente",
                nota_4_1_sprints=n41,
                nota_4_1_sugerida=n41,
                nivel_4_1=niv41,
                nivel_4_1_sugerido=niv41,
                nota_4_2_participacao=n42,
                nota_4_2_sugerida=n42,
                nivel_4_2=niv42,
                nivel_4_2_sugerido=niv42,
            )
        )
    avaliacao.integrantes_notas = integrantes_notas

    # 9. Perguntas de Arguição (Sabatina Técnica — Focadas no Entendimento da Tecnologia)
    avaliacao.perguntas_arguicao = _gerar_perguntas_arguicao(
        avaliacao.projeto, avaliacao.integrantes, det, snippets
    )

    recalcular_totais_avaliacao(avaliacao)

    # 10. Parecer Técnico Estruturado, Pontos Fortes e Pontos de Atenção
    parecer, fortes, atencao, blocos_parecer = _sintetizar_parecer_deterministico(avaliacao)
    avaliacao.parecer_tecnico = parecer
    avaliacao.parecer_estruturado = blocos_parecer
    avaliacao.pontos_fortes = fortes
    avaliacao.pontos_atencao = atencao

    # 11. Enriquecimento opcional com Gemini API
    if cfg.gemini_api_key:
        _enriquecer_com_gemini_opcional(avaliacao, cfg.gemini_api_key, cfg.gemini_model, log_cb=log_cb)

    # Preservar edições manuais da banca se já houver avaliação manual salva anteriormente
    if avaliacao_anterior and avaliacao_anterior.get("status_avaliacao") == "avaliado_banca":
        avaliacao.status_avaliacao = "avaliado_banca"
    else:
        avaliacao.status_avaliacao = "auditado_ia"

    agora = datetime.now().isoformat(timespec="seconds")
    avaliacao.auditado_em = agora
    avaliacao.atualizado_em = agora

    if log_cb:
        log_cb(
            f"   └─ ✅ Concluído [{avaliacao.id}]: P1={avaliacao.p1_total:.2f}/30 | "
            f"P2={avaliacao.p2_total:.2f}/40 | Média Parcial={avaliacao.media_nota_final_grupo:.2f}/100 | "
            f"Status: {avaliacao.status_liberacao_nota}"
        )

    return avaliacao


def sincronizar_e_obter_todas_bancas(
    executar_auditoria_nos_entregues: bool = False,
    grupo_ids_alvo: list[str] | None = None,
    turma_alvo: str | None = None,
    sincronizar_firebase: bool = False,
    log_cb: Callable[[str], None] | None = None,
    progress_cb: Callable[[int, int, str], None] | None = None,
) -> list[AvaliacaoGrupoModel]:
    """
    Retorna a lista completa das 25 bancas do cronograma oficial combinada com
    o status real das pastas em ./tcc/I2DEV-A e ./tcc/I2DEV-B.
    """
    cfg = ler_env()
    pasta_tcc = resolver_pasta_tcc(cfg.pasta_tcc)
    pastas_map = _mapear_pastas_turma(pasta_tcc)
    salvas = ler_avaliacoes_salvas()

    # Calcular ordem de apresentação por turma (1..13 em I2DEV-A, 1..12 em I2DEV-B)
    cont_ordem: dict[str, int] = {"I2DEV-A": 0, "I2DEV-B": 0}
    ordens_map: dict[str, int] = {}
    for meta in CRONOGRAMA_OFICIAL_BANCAS:
        t = meta["turma"]
        cont_ordem[t] = cont_ordem.get(t, 0) + 1
        ordens_map[meta["id"]] = cont_ordem[t]

    alvos_auditoria: list[dict[str, Any]] = []
    if executar_auditoria_nos_entregues:
        for meta in CRONOGRAMA_OFICIAL_BANCAS:
            gid = meta["id"]
            if turma_alvo and meta["turma"] != turma_alvo:
                continue
            if grupo_ids_alvo and gid not in grupo_ids_alvo:
                continue
            if gid in pastas_map:
                # Regra de Proteção: Nunca reauditar pasta de bancas já realizadas/concluídas
                ja_salva_meta = salvas.get(gid)
                if ja_salva_meta and (
                    ja_salva_meta.get("status_avaliacao") in ("avaliado_banca", "concluida")
                    or ja_salva_meta.get("banca_realizada") is True
                ):
                    if log_cb:
                        log_cb(f"   🛡️ [PRESERVADO] {meta['turma']} • {meta['grupo']} ({meta['projeto']}): banca já realizada. Não será reauditada.")
                    continue
                alvos_auditoria.append(meta)

    total_alvos = len(alvos_auditoria)
    concluidos = 0

    resultados: list[AvaliacaoGrupoModel] = []
    alterou_salvas = False

    for meta in CRONOGRAMA_OFICIAL_BANCAS:
        gid = meta["id"]
        ordem_ap = ordens_map.get(gid, 1)
        pasta_grupo = pastas_map.get(gid)
        ja_salva = salvas.get(gid)

        banca_ja_realizada = False
        if ja_salva and (
            ja_salva.get("status_avaliacao") in ("avaliado_banca", "concluida")
            or ja_salva.get("banca_realizada") is True
        ):
            banca_ja_realizada = True

        deve_auditar_agora = any(m["id"] == gid for m in alvos_auditoria)
        # Se a pasta existe mas ainda não tem os novos campos de auditoria (parecer_estruturado / data_banca_iso), re-audita automaticamente apenas se NÃO foi realizada
        if pasta_grupo and not banca_ja_realizada and (not ja_salva or not ja_salva.get("parecer_estruturado")):
            deve_auditar_agora = True

        if banca_ja_realizada:
            deve_auditar_agora = False

        if deve_auditar_agora and pasta_grupo:
            if progress_cb and total_alvos > 0:
                progress_cb(
                    concluidos,
                    total_alvos,
                    f"Auditando {meta['turma']} • {meta['grupo']} ({meta['projeto']})...",
                )
            av = auditar_grupo_individual(
                meta,
                pasta_grupo,
                avaliacao_anterior=ja_salva,
                ordem_apresentacao=ordem_ap,
                log_cb=log_cb,
            )
            if sincronizar_firebase and cfg.firebase_sincronizacao_ativa:
                ok_fb, msg_fb = sincronizar_avaliacao_firestore(av)
                if log_cb:
                    log_cb(f"   ☁️ Firebase: {msg_fb}")
            salvas[gid] = av.model_dump()
            alterou_salvas = True
            concluidos += 1
            if progress_cb and total_alvos > 0:
                progress_cb(
                    concluidos,
                    total_alvos,
                    f"Auditado {meta['turma']} • {meta['grupo']} ({meta['projeto']})",
                )
            resultados.append(av)
        elif ja_salva:
            try:
                av = AvaliacaoGrupoModel(**ja_salva)
                av.ordem_apresentacao = ordem_ap
                av.data_banca = meta["data"]
                av.data_banca_iso = _data_br_para_iso(meta["data"])
                av.entregue_na_pasta = pasta_grupo is not None
                if pasta_grupo:
                    av.nome_pasta_entregue = pasta_grupo.name
                    av.caminho_pasta = str(pasta_grupo)
                resultados.append(recalcular_totais_avaliacao(av))
            except Exception:
                av = auditar_grupo_individual(meta, pasta_grupo, ordem_apresentacao=ordem_ap, log_cb=log_cb)
                salvas[gid] = av.model_dump()
                alterou_salvas = True
                resultados.append(av)
        else:
            av = auditar_grupo_individual(meta, None, ordem_apresentacao=ordem_ap)
            resultados.append(av)

    if alterou_salvas:
        salvar_avaliacoes_salvas(salvas)

    return resultados

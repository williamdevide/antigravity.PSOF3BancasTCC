"""
Gerador de Relatórios Oficiais do Agente Avaliador de Bancas TCC (PSOF3 — SENAI Ourinhos):
1. Ficha Oficial de Avaliação da Banca TCC — Rubricas MSEP em PDF (2 páginas A4, layout fiel a PSOF3_Formulario_Rubricas_MSEP_Banca.pdf).
2. Dossiê / Relatório Analítico Detalhado da Auditoria em Markdown (.md) e PDF (.pdf).
3. Planilha Consolidada da Turma / Geral em Excel (.xlsx) com abas de Notas Individuais, Resumo por Banca e Auditoria Técnica.
"""
from __future__ import annotations

from datetime import datetime
import html
from pathlib import Path
import re
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from .config_manager import ler_env, resolver_pasta_destino
from .models import AvaliacaoGrupoModel
from .regras_msep import RUBRICAS_MSEP_OFICIAIS


def _sanitizar_nome_arquivo(texto: str) -> str:
    limpo = re.sub(r"[^\w\-]+", "_", texto.strip(), flags=UnicodeWarning if False else 0)
    return re.sub(r"_+", "_", limpo).strip("_")


def _renderizar_html_para_pdf(html_str: str, caminho_pdf: Path) -> Path:
    """Usa o Playwright Chromium headless para renderizar HTML/CSS de alta precisão em PDF A4."""
    from playwright.sync_api import sync_playwright

    caminho_pdf.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.set_content(html_str, wait_until="load")
            page.pdf(
                path=str(caminho_pdf),
                format="A4",
                print_background=True,
                margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"},
            )
        finally:
            browser.close()
    return caminho_pdf


def gerar_html_ficha_msep(av: AvaliacaoGrupoModel) -> str:
    """
    Constrói o HTML fiel ao documento oficial `PSOF3_Formulario_Rubricas_MSEP_Banca.pdf`
    (Escola SENAI Ourinhos — Unidade 7.94), preenchido com as notas e parecer da avaliação.
    """
    mapa_rub = {r.codigo: r for r in av.rubricas}
    meta_map = {m["codigo"]: m for m in RUBRICAS_MSEP_OFICIAIS}

    aprovados_todos = all(i.resultado == "Aprovado" for i in av.integrantes_notas) if av.integrantes_notas else False
    tem_retida = any(i.resultado == "Nota Retida (Pendências)" for i in av.integrantes_notas)
    if not av.entregue_na_pasta:
        resultado_topo = "PENDENTE"
    elif aprovados_todos:
        resultado_topo = f"{av.media_nota_final_grupo:.1f} pts (APROVADO)"
    elif tem_retida:
        resultado_topo = f"{av.media_nota_final_grupo:.1f} pts (NOTA RETIDA)"
    else:
        resultado_topo = f"{av.media_nota_final_grupo:.1f} pts (NOVA CHANCE)"

    turma_a_chk = "X" if av.turma == "I2DEV-A" else "__"
    turma_b_chk = "X" if av.turma == "I2DEV-B" else "__"

    int_1 = html.escape(av.integrantes[0]) if len(av.integrantes) > 0 else "____________________"
    int_2 = html.escape(av.integrantes[1]) if len(av.integrantes) > 1 else "____________________"
    int_3 = html.escape(av.integrantes[2]) if len(av.integrantes) > 2 else "____________________"

    def _linhas_pilar(pilar_num: int) -> str:
        rows_html: list[str] = []
        for meta in [m for m in RUBRICAS_MSEP_OFICIAIS if m["pilar"] == pilar_num]:
            cod = meta["codigo"]
            r = mapa_rub.get(cod)
            nota_val = f"{r.nota:.2f}".replace(".", ",") if r else "0,00"
            if r and r.nivel == "Pendente":
                nivel_sigla = "PEND."
            elif r and r.nivel == "Avançado":
                nivel_sigla = "A"
            elif r and r.nivel == "Pleno":
                nivel_sigla = "P"
            else:
                nivel_sigla = "I"
            peso_str = f"{meta['peso_max']:.2f}".replace(".", ",")
            if meta.get("individual") and pilar_num == 4:
                check_col = f"<strong>Individual</strong><br/><span style='font-size:8.5px;color:#475569;'>(Média {nota_val})</span>"
            elif r and r.nivel == "Pendente":
                check_col = "<span style='color:#d97706;font-weight:bold;font-size:9px;'>[ &nbsp; ] Preencher Ao Vivo</span>"
            else:
                check_col = f"<span class='chk-box'>[{nivel_sigla}]</span> <strong>{nota_val}</strong>"
            rows_html.append(
                f"""
                <tr>
                    <td class="col-crit"><strong>{html.escape(meta['titulo'])}</strong></td>
                    <td class="col-desc">{html.escape(meta['descricao'])}</td>
                    <td class="col-niveis">
                        <div><strong>{html.escape(meta['insuficiente'].split(':')[0])}:</strong>{html.escape(':'.join(meta['insuficiente'].split(':')[1:]))}</div>
                        <div><strong>{html.escape(meta['pleno'].split(':')[0])}:</strong>{html.escape(':'.join(meta['pleno'].split(':')[1:]))}</div>
                        <div><strong>{html.escape(meta['avancado'].split(':')[0])}:</strong>{html.escape(':'.join(meta['avancado'].split(':')[1:]))}</div>
                    </td>
                    <td class="col-peso">{peso_str}</td>
                    <td class="col-nota">{check_col}</td>
                </tr>
                """
            )
        return "\n".join(rows_html)

    linhas_integrantes: list[str] = []
    for idx in range(3):
        if idx < len(av.integrantes_notas):
            ind = av.integrantes_notas[idx]
            if ind.resultado == "Aprovado":
                chk_ap = "<span style='color:#047857;font-weight:bold;'>[X] Aprovado (Nota Liberada)</span>"
            elif ind.resultado == "Nota Retida (Pendências)":
                chk_ap = f"<span style='color:#b45309;font-weight:bold;'>[!] Nota Retida ({', '.join(ind.itens_insuficientes)})</span>"
            else:
                chk_ap = "<span style='color:#b91c1c;font-weight:bold;'>[X] Nova Chance (Data Futura)</span>"
            linhas_integrantes.append(
                f"""
                <tr>
                    <td><strong>{idx + 1}. {html.escape(ind.nome)}</strong><br/><span style='font-size:8.5px;color:#64748b;'>Rel: {ind.relatorios_entregues}/{ind.total_relatorios} ({ind.nota_4_1_sprints:.1f}) • Aulas: {ind.aulas_participadas}/{ind.total_aulas_turma} ({ind.nota_4_2_participacao:.1f})</span></td>
                    <td class="center">{ind.p1_nota:.2f}</td>
                    <td class="center">{ind.p2_nota:.2f}</td>
                    <td class="center">{ind.p3_nota:.2f}</td>
                    <td class="center">{ind.p4_nota:.2f}</td>
                    <td class="center"><strong>{ind.nota_final:.2f}%</strong></td>
                    <td class="center">{chk_ap}</td>
                </tr>
                """
            )
        else:
            linhas_integrantes.append(
                f"""
                <tr>
                    <td><strong>{idx + 1}. —</strong></td>
                    <td class="center">—</td>
                    <td class="center">—</td>
                    <td class="center">—</td>
                    <td class="center">—</td>
                    <td class="center">—</td>
                    <td class="center">[ ] Aprovado &nbsp; [ ] Reavaliar</td>
                </tr>
                """
            )

    if av.parecer_estruturado:
        parecer_html = "".join(
            f"<div style='margin-bottom:6px;'><strong style='color:#0f294a;'>• {html.escape(b.titulo)}:</strong> {html.escape(b.resumo)}</div>"
            for b in av.parecer_estruturado
        )
    else:
        parecer_html = html.escape(av.parecer_tecnico or "Sem observações adicionais.").replace("\n", "<br/>")
    fortes_html = "".join(f"<li>{html.escape(p)}</li>" for p in av.pontos_fortes)
    atencao_html = "".join(f"<li>{html.escape(p)}</li>" for p in av.pontos_atencao)

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Ficha de Avaliação MSEP — {html.escape(av.projeto)}</title>
<style>
  @page {{ size: A4; margin: 10mm; }}
  * {{ box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }}
  body {{ margin: 0; padding: 0; color: #111827; font-size: 10.5px; line-height: 1.32; }}
  .header-table {{ width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1.5px solid #0f294a; }}
  .senai-logo {{ width: 18%; background: #e30613; color: #fff; font-weight: 900; font-size: 22px; text-align: center; letter-spacing: 1px; vertical-align: middle; padding: 10px 6px; }}
  .senai-info {{ width: 60%; background: #0f294a; color: #fff; padding: 7px 12px; vertical-align: middle; }}
  .senai-info .escola {{ font-size: 12.5px; font-weight: bold; }}
  .senai-info .curso {{ font-size: 9.5px; color: #facc15; font-weight: bold; margin-top: 2px; }}
  .senai-info .uc {{ font-size: 10.5px; font-weight: bold; margin-top: 2px; }}
  .senai-info .docente {{ font-size: 9px; color: #e2e8f0; margin-top: 2px; }}
  .resultado-box {{ width: 22%; background: #fff; color: #0f294a; text-align: center; vertical-align: middle; padding: 6px; border-left: 1.5px solid #0f294a; }}
  .resultado-box .lbl {{ font-size: 11px; font-weight: bold; }}
  .resultado-box .val {{ font-size: 12px; font-weight: 900; color: #b91c1c; margin-top: 4px; }}
  .doc-title {{ text-align: center; margin: 6px 0 8px 0; }}
  .doc-title h1 {{ font-size: 13.5px; margin: 0; color: #0f172a; letter-spacing: 0.3px; }}
  .doc-title p {{ font-size: 10px; margin: 2px 0 0 0; color: #475569; }}
  .meta-box {{ width: 100%; border-collapse: collapse; margin-bottom: 8px; background: #e2e8f0; border: 1px solid #cbd5e1; }}
  .meta-box td {{ padding: 4px 8px; font-size: 10.5px; border-bottom: 1px solid #cbd5e1; }}
  .tbl {{ width: 100%; border-collapse: collapse; margin-bottom: 9px; }}
  .tbl th, .tbl td {{ border: 1px solid #cbd5e1; padding: 4px 6px; vertical-align: middle; }}
  .pilar-hdr {{ background: #0f294a; color: #fff; font-weight: bold; font-size: 11px; text-align: left; padding: 5px 8px; }}
  .sub-hdr th {{ background: #1e293b; color: #fff; font-size: 9.8px; text-align: left; }}
  .col-crit {{ width: 19%; }}
  .col-desc {{ width: 32%; color: #334155; font-size: 9.6px; }}
  .col-niveis {{ width: 29%; font-size: 9px; color: #1e293b; }}
  .col-peso {{ width: 8%; text-align: center; font-weight: bold; }}
  .col-nota {{ width: 12%; text-align: center; font-size: 10.5px; }}
  .chk-box {{ font-family: monospace; color: #0f294a; font-weight: bold; }}
  .total-row td {{ background: #0f294a; color: #fff; font-weight: bold; text-align: right; padding: 4px 8px; }}
  .center {{ text-align: center; }}
  .page-break {{ page-break-before: always; }}
  .parecer-container {{ border: 1px solid #94a3b8; border-radius: 4px; padding: 8px 10px; background: #f8fafc; margin-top: 6px; font-size: 10px; }}
  .parecer-grid {{ display: flex; gap: 12px; margin-top: 6px; }}
  .parecer-col {{ flex: 1; background: #fff; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 4px; }}
  .parecer-col h4 {{ margin: 0 0 4px 0; font-size: 10px; }}
  .parecer-col ul {{ margin: 0; padding-left: 14px; font-size: 9.2px; }}
  .assinaturas {{ width: 100%; margin-top: 18px; border-collapse: collapse; }}
  .assinaturas td {{ width: 33.3%; text-align: center; padding-top: 22px; font-size: 9.5px; color: #334155; }}
  .footer-bar {{ margin-top: 8px; text-align: center; font-size: 8.5px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; }}
</style>
</head>
<body>

<!-- PÁGINA 1 -->
<table class="header-table">
  <tr>
    <td class="senai-logo">SENAI</td>
    <td class="senai-info">
      <div class="escola">Escola SENAI Ourinhos (Unidade 7.94)</div>
      <div class="curso">TECNOLOGIA DE INFORMAÇÃO E COMUNICAÇÃO | TÉCNICO EM DESENVOLVIMENTO DE SISTEMAS</div>
      <div class="uc">MÓDULO ESPECÍFICO II: PROJETOS DE SOFTWARE III (PSOF3)</div>
      <div class="docente">Docente Responsável: Prof. William Devidé Komel (william.komel@docente.senai.br)</div>
    </td>
    <td class="resultado-box">
      <div class="lbl">Resultado:</div>
      <div class="val">{html.escape(resultado_topo)}</div>
    </td>
  </tr>
</table>

<div class="doc-title">
  <h1>FICHA DE AVALIAÇÃO DA BANCA TCC — RUBRICAS MSEP</h1>
  <p>Projetos de Software III (PSOF3) — Formato de Avaliação do 4º Semestre (100% da UC)</p>
</div>

<table class="meta-box">
  <tr>
    <td colspan="2"><strong>Projeto:</strong> {html.escape(av.projeto)} ({html.escape(av.grupo)})</td>
    <td><strong>Data:</strong> {html.escape(av.data_banca)} ({html.escape(av.horario)})</td>
  </tr>
  <tr>
    <td colspan="2"><strong>Turma:</strong> ({turma_a_chk}) I2DEV-A / ({turma_b_chk}) I2DEV-B</td>
    <td><strong>Avaliador:</strong> {html.escape(av.avaliador)}</td>
  </tr>
  <tr>
    <td><strong>Integrantes: 1.</strong> {int_1}</td>
    <td><strong>2.</strong> {int_2}</td>
    <td><strong>3.</strong> {int_3}</td>
  </tr>
</table>

<table class="tbl">
  <tr class="sub-hdr">
    <th style="width:26%">Pilar de Avaliação (100% da UC)</th>
    <th style="width:62%">Entregáveis Principais Avaliados</th>
    <th style="width:12%; text-align:center;">Peso</th>
  </tr>
  <tr>
    <td><strong>1. Documentação Técnica / TCC</strong></td>
    <td>Monografia ABNT, Requisitos, BD, Wireframes/Protótipo, Arquitetura, Plano de Negócios, Testes, Backlog/Cronograma</td>
    <td class="center"><strong>30,0%</strong></td>
  </tr>
  <tr>
    <td><strong>2. Sistema e Aplicação</strong></td>
    <td>Backend (APIs/REST), Frontend (UI/UX Responsivo), Banco de Dados Físico/Nuvem (mín. 20 reg/entidade), Deploy Online, GitHub/README</td>
    <td class="center"><strong>40,0%</strong></td>
  </tr>
  <tr>
    <td><strong>3. Apresentação e Banca</strong></td>
    <td>Arguição Individual do Código, Pitch Coletivo da Equipe, Material Visual de Slides (.pptx/.pdf)</td>
    <td class="center"><strong>15,0%</strong></td>
  </tr>
  <tr>
    <td><strong>4. Participação e Acompanhamento</strong></td>
    <td>Relatórios Semanais de Sprint (Forms/GitHub), Participação, Proatividade e Comportamento nas Aulas</td>
    <td class="center"><strong>15,0%</strong></td>
  </tr>
</table>

<!-- PILAR 1 -->
<table class="tbl">
  <tr><td colspan="5" class="pilar-hdr">1. Pilar Documentação Técnica / TCC (Peso: 30,0%)</td></tr>
  <tr class="sub-hdr">
    <th>Critério / Item</th>
    <th>Descrição do Entregável</th>
    <th>Níveis de Desempenho (MSEP)</th>
    <th class="center">Peso Máx</th>
    <th class="center">Check / Nota</th>
  </tr>
  {_linhas_pilar(1)}
  <tr class="total-row">
    <td colspan="4">Total Pilar 1 (Máx 30,00):</td>
    <td class="center">{av.p1_total:.2f}</td>
  </tr>
</table>

<!-- PILAR 2 -->
<table class="tbl">
  <tr><td colspan="5" class="pilar-hdr">2. Pilar Sistema e Aplicação Desenvolvida (Peso: 40,0%)</td></tr>
  <tr class="sub-hdr">
    <th>Critério / Item</th>
    <th>Descrição do Entregável</th>
    <th>Níveis de Desempenho (MSEP)</th>
    <th class="center">Peso Máx</th>
    <th class="center">Check / Nota</th>
  </tr>
  {_linhas_pilar(2)}
  <tr class="total-row">
    <td colspan="4">Total Pilar 2 (Máx 40,00):</td>
    <td class="center">{av.p2_total:.2f}</td>
  </tr>
</table>

<div class="footer-bar">
  R VITORIO CHRISTONI, 1.500 - Vila São Luiz - Ourinhos - SP - 19911-200 - Fone: (14) 3302-1250 - Página 1 de 2
</div>

<!-- PÁGINA 2 -->
<div class="page-break"></div>

<div class="footer-bar" style="border-top:none; border-bottom:1px solid #e2e8f0; margin-bottom:8px; padding-bottom:4px;">
  R VITORIO CHRISTONI, 1.500 - Vila São Luiz - Ourinhos - SP - 19911-200 - Fone: (14) 3302-1250 - Página 2 de 2
</div>

<!-- PILAR 3 -->
<table class="tbl">
  <tr><td colspan="5" class="pilar-hdr">3. Pilar Apresentação e Defesa para a Banca (Peso: 15,0%)</td></tr>
  <tr class="sub-hdr">
    <th>Critério / Item</th>
    <th>Descrição do Entregável</th>
    <th>Níveis de Desempenho (MSEP)</th>
    <th class="center">Peso Máx</th>
    <th class="center">Check / Nota</th>
  </tr>
  {_linhas_pilar(3)}
  <tr class="total-row">
    <td colspan="4">Total Base Grupo (3.2 + 3.3) + 3.1 Individual:</td>
    <td class="center">Base {av.p3_grupo_base:.2f} + Ind.</td>
  </tr>
</table>

<!-- PILAR 4 -->
<table class="tbl">
  <tr><td colspan="5" class="pilar-hdr">4. Pilar Participação e Acompanhamento Contínuo (Peso: 15,0%)</td></tr>
  <tr class="sub-hdr">
    <th>Critério / Item</th>
    <th>Descrição do Entregável</th>
    <th>Níveis de Desempenho (MSEP)</th>
    <th class="center">Peso Máx</th>
    <th class="center">Check / Nota</th>
  </tr>
  {_linhas_pilar(4)}
  <tr class="total-row">
    <td colspan="4">Total Pilar 4 (Máx 15,00):</td>
    <td class="center">Individual</td>
  </tr>
</table>

<!-- CONSOLIDAÇÃO FINAL -->
<table class="tbl" style="margin-top: 10px;">
  <tr><td colspan="7" class="pilar-hdr" style="background:#0f172a;">CONSOLIDAÇÃO FINAL DAS NOTAS INDIVIDUAIS DOS INTEGRANTES</td></tr>
  <tr class="sub-hdr">
    <th style="width:28%">Nome do Aluno / Integrante</th>
    <th class="center" style="width:10%">P1 (30%)</th>
    <th class="center" style="width:10%">P2 (40%)</th>
    <th class="center" style="width:10%">P3 (15%)</th>
    <th class="center" style="width:10%">P4 (15%)</th>
    <th class="center" style="width:12%">Nota Final (100%)</th>
    <th class="center" style="width:20%">Resultado</th>
  </tr>
  {"".join(linhas_integrantes)}
</table>

<!-- PARECER TÉCNICO -->
<div class="parecer-container">
  <div style="font-weight:bold; color:#0f294a; margin-bottom:4px;">
    PARECER TÉCNICO E OBSERVAÇÕES DA BANCA EXAMINADORA:
  </div>
  <div style="text-align:justify; color:#1e293b;">
    {parecer_html}
  </div>
  <div class="parecer-grid">
    <div class="parecer-col">
      <h4 style="color:#047857;">✓ Pontos Fortes Verificados</h4>
      <ul>{fortes_html or '<li>Entregáveis recebidos na pasta da turma.</li>'}</ul>
    </div>
    <div class="parecer-col">
      <h4 style="color:#b91c1c;">⚠ Pontos de Atenção / Cobrança em Banca</h4>
      <ul>{atencao_html or '<li>Nenhuma pendência crítica de estrutura.</li>'}</ul>
    </div>
  </div>
</div>

<table class="assinaturas">
  <tr>
    <td>________________________________________<br/><strong>Prof. William Devidé Komel</strong><br/>Docente Orientador — PSOF3</td>
    <td>________________________________________<br/><strong>Avaliador Convidado 02</strong><br/>Banca Examinadora SENAI</td>
    <td>________________________________________<br/><strong>Avaliador Convidado 03</strong><br/>Banca Examinadora SENAI</td>
  </tr>
</table>

<div class="footer-bar" style="margin-top: 14px;">
  Gerado pelo Agente Avaliador de Bancas TCC — Central de Agentes Inteligentes SENAI Ourinhos • {datetime.now().strftime('%d/%m/%Y %H:%M')}
</div>

</body>
</html>
"""


def gerar_markdown_dossie_analitico(av: AvaliacaoGrupoModel) -> str:
    """Gera o Dossiê Técnico Analítico Completo em Markdown (.md)."""
    det = av.auditoria_tecnica
    linhas = [
        f"# 📊 Dossiê Técnico de Auditoria TCC — {av.projeto}",
        f"**Escola SENAI Ourinhos (Unidade 7.94) • Técnico em Desenvolvimento de Sistemas — PSOF3**",
        "",
        f"- **Turma / Grupo:** `{av.turma}` — `{av.grupo}` ({av.dia_semana})",
        f"- **Data / Horário da Banca:** `{av.data_banca}` • `{av.horario}` (Sala: {av.sala})",
        f"- **Integrantes:** {', '.join(av.integrantes)}",
        f"- **Tema Oficial:** {av.tema}",
        f"- **Avaliador Responsável:** {av.avaliador}",
        f"- **Auditado em:** `{av.auditado_em or datetime.now().isoformat(timespec='seconds')}`",
        "",
        "---",
        "",
        "## 1. Resumo das Notas MSEP (4 Pilares = 100%)",
        "",
        f"- **Pilar 1 — Documentação Técnica / TCC (30%):** `{av.p1_total:.2f} / 30.00`",
        f"- **Pilar 2 — Sistema e Aplicação Desenvolvida (40%):** `{av.p2_total:.2f} / 40.00`",
        f"- **Pilar 3 — Base Apresentação & Slides (3.2 + 3.3):** `{av.p3_grupo_base:.2f} / 9.00` (+ 3.1 Arguição Individual até 6.00)",
        f"- **Média Geral Consolidada da Equipe:** **`{av.media_nota_final_grupo:.2f} / 100.00`**",
        "",
        "### Consolidação Individual dos Integrantes",
        "",
        "| Integrante | Planilha Oficial (P4) | Sprints (4.1) | Aulas (4.2) | P1 (30%) | P2 (40%) | P3 (15%) | P4 (15%) | Nota Final (100%) | Status / Liberação |",
        "| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]
    for ind in av.integrantes_notas:
        pend_txt = f" ({', '.join(ind.itens_insuficientes)})" if ind.itens_insuficientes else ""
        linhas.append(
            f"| **{ind.nome}** | `{ind.nome_completo_planilha or ind.nome}` | {ind.relatorios_entregues}/{ind.total_relatorios} (`{ind.nota_4_1_sprints:.2f}`) | {ind.aulas_participadas}/{ind.total_aulas_turma} (`{ind.nota_4_2_participacao:.2f}`) | {ind.p1_nota:.2f} | {ind.p2_nota:.2f} | {ind.p3_nota:.2f} | {ind.p4_nota:.2f} | **{ind.nota_final:.2f}%** | **{ind.resultado}**{pend_txt} |"
        )

    linhas.extend(
        [
            "",
            "---",
            "",
            f"## 2. Auditoria de Nomenclatura e Anexos Digitais (`CTDS-2026-02`) — Conformidade: `{av.conformidade_nomenclatura_pct}%`",
            "",
            "| Tipo de Artefato | Encontrado | Arquivo Entregue | Padrão Obrigatório | Status / Alertas |",
            "| :--- | :---: | :--- | :--- | :--- |",
        ]
    )
    for arq in av.arquivos_entregues:
        ok_str = "SIM" if arq.encontrado else "NÃO"
        alerta_str = "✅ Conforme" if arq.nomenclatura_conforme else ("; ".join(arq.alertas_nomenclatura) or "❌ Ausente")
        linhas.append(
            f"| `{arq.tipo}` | {ok_str} | `{arq.nome_arquivo or '—'}` | `{arq.padrao_esperado}` | {alerta_str} |"
        )

    linhas.extend(
        [
            "",
            "---",
            "",
            "## 3. Auditoria Profunda por Entregável",
            "",
            "### 3.1. Monografia ABNT (`.docx` / `.pdf`)",
            f"- **Extensão do Texto:** `{det.monografia_palavras}` palavras (~`{det.monografia_paginas_estimadas}` páginas, `{det.monografia_caracteres}` caracteres).",
            f"- **Requisitos Identificados:** `{det.rfs_detectados_qtd}` Requisitos Funcionais (RFs) e `{det.rnfs_detectados_qtd}` Requisitos Não Funcionais (RNFs).",
            f"- **Modelagem de Dados:** MER/DER: `{'Sim' if det.possui_mer_der else 'Não'}` | Dicionário de Dados: `{'Sim' if det.possui_dicionario_dados else 'Não'}`.",
            f"- **Prototipação / Figma:** `{'Sim' if det.possui_link_figma else 'Não'}` ({', '.join(det.links_figma_encontrados) or 'menção textual'}).",
            "",
            "#### Checklist de Seções Obrigatórias ABNT:",
        ]
    )
    for sec, presente in det.secoes_abnt_detectadas.items():
        linhas.append(f"- [{'x' if presente else ' '}] {sec}")

    linhas.extend(
        [
            "",
            "### 3.2. Banco de Dados Físico (`.sql`)",
            f"- **Arquivo Analisado:** `{det.sql_arquivo}` (`{det.sql_linhas}` linhas)",
            f"- **Diagnóstico Oficial:** **{det.sql_diagnostico}**",
            f"- **Tabelas Modeladas (`{det.sql_tabelas_qtd}`):** `{', '.join(det.sql_tabelas) or 'Nenhuma'}`",
            f"- **Total de Registros (`INSERT INTO`):** `{det.sql_total_registros_inseridos}` registros",
            f"- **Atende Exigência Mínima (>= 20 reg/tabela):** **`{'SIM' if det.sql_atende_min_20_por_tabela else 'NÃO'}`**",
            f"- **Recursos Relacionais:** PK: `{'Sim' if det.sql_possui_pk else 'Não'}` | FK: `{'Sim' if det.sql_possui_fk else 'Não'}` | Índices: `{'Sim' if det.sql_possui_indices else 'Não'}` | RLS: `{'Sim' if det.sql_possui_rls else 'Não'}`",
            "",
            "#### Contagem de Registros por Tabela no `.sql`:",
        ]
    )
    for tab, qtd in det.sql_inserts_por_tabela.items():
        status_tab = "✅ OK (>=20)" if qtd >= 20 else "❌ ABAIXO DO MÍNIMO (<20)"
        linhas.append(f"- `{tab}`: **{qtd}** registro(s) — {status_tab}")

    linhas.extend(
        [
            "",
            "### 3.3. Sistema e Código-Fonte (`.zip`)",
            f"- **Arquivo ZIP:** `{det.zip_arquivo}` (`{det.zip_total_arquivos}` arquivos de código inspecionados)",
            f"- **Stack Tecnológica Detectada:** `{', '.join(det.zip_stack_detectada) or 'N/A'}`",
            f"- **README.md no Projeto:** `{'Sim' if det.zip_possui_readme else 'Não'}` (`{det.zip_readme_tamanho}` bytes)",
            f"- **Principais Dependências:** `{', '.join(det.zip_dependencias[:18]) or 'N/A'}`",
            "",
            "### 3.4. Auditoria Online, Deploy em Nuvem & Rastreabilidade das Tabelas (Itens 2.3 e 2.4)",
            f"- **GitHub URL (`links.txt`):** {det.github_url or '*(EM BRANCO)*'}",
            f"- **Diagnóstico GitHub:** {det.github_diagnostico}",
            f"- **Deploy URL (`links.txt`):** {det.deploy_url or '*(AUSENTE)*'} (Provedor: `{det.deploy_provedor or 'N/A'}`)",
            f"- **Diagnóstico Deploy (2.4):** {det.deploy_diagnostico}",
            f"- **Banco de Dados em Nuvem Publicado (2.3):** `{det.banco_provedor_nuvem or 'Não identificado'}` ({det.banco_url_detectada or 'sem endpoint explícito'})",
            f"- **Chaves `localStorage` de UI/Sessão Permitidas (Não Penalizam):** `{', '.join(det.chaves_localstorage_permitidas_ui) or 'Nenhuma'}`",
            f"- **Persistência Local Indevida do Tema do Projeto:** `{', '.join(det.chaves_localstorage_negocio) or ('storage/*.json local' if det.usa_arquivos_json_locais_no_servidor else 'Nenhuma (100% Nuvem)')}`",
            f"- **Tabelas `.sql` Presentes no Banco Online:** `{det.tabelas_sql_presentes_online_qtd}/{det.sql_tabelas_qtd}`",
            f"- **Tabelas `.sql` Gravadas (`INSERT/UPDATE`) pelo Código:** `{det.tabelas_sql_gravadas_pelo_codigo_qtd}/{det.sql_tabelas_qtd}`",
            f"- **Tabelas `.sql` Consumidas (`SELECT`) pelo Código:** `{det.tabelas_sql_consumidas_pelo_codigo_qtd}/{det.sql_tabelas_qtd}` (Ciclo completo: `{det.tabelas_ciclo_completo_qtd}/{det.sql_tabelas_qtd}`)",
            f"- **Diagnóstico de Persistência (2.3 / 2.4):** {det.diagnostico_persistencia_2_3_2_4}",
            "",
            "#### Matriz de Rastreabilidade por Tabela (`.sql` ↔ Banco Online ↔ Gravação & Consumo no Código):",
            "| Tabela (`.sql`) | Regs no `.sql` | Existe no Banco Online? | Status Online | Código Grava (`INSERT/UPDATE`)? | Código Consome (`SELECT`)? | Ciclo Completo? | Evidência no Código |",
            "| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |",
        ]
    )
    for t_aud in det.tabelas_auditoria_online:
        linhas.append(
            f"| `{t_aud.tabela}` | {t_aud.registros_no_sql} | {'✅ Sim' if t_aud.presente_no_banco_online else '❌ Não'} | "
            f"{t_aud.status_banco_online} | {'✅ Sim' if t_aud.codigo_faz_gravacao else '❌ Não'} | "
            f"{'✅ Sim' if t_aud.codigo_faz_consumo_leitura else '❌ Não'} | "
            f"{'✅ OK' if t_aud.conforme_ciclo_completo else '⚠️ Incompleto'} | {t_aud.evidencia_codigo} |"
        )
    if det.entidades_tema_sem_tabela_banco:
        linhas.append("")
        linhas.append(
            f"- **⚠️ Entidades do Tema do Projeto Sem Tabela no `.sql`/Banco Online (gravadas em `localStorage`):** `{', '.join(det.entidades_tema_sem_tabela_banco)}`"
        )

    linhas.extend(
        [
            "",
            "### 3.5. Apresentação de Slides (`.pptx` / `.pdf`)",
            f"- **Arquivo de Slides:** `{det.slides_arquivo}` (`{det.slides_qtd}` slides)",
            "- **Cobertura do Roteiro Cronometrado (7 Etapas):**",
        ]
    )
    for etapa, ok_etapa in det.slides_etapas_roteiro.items():
        linhas.append(f"  - [{'x' if ok_etapa else ' '}] {etapa}")

    linhas.extend(
        [
            "",
            "---",
            "",
            "## 4. Detalhamento por Rubrica MSEP",
            "",
            "| Item | Critério | Nível | Nota | Peso Máx | Justificativa & Evidências |",
            "| :---: | :--- | :---: | :---: | :---: | :--- |",
        ]
    )
    for r in av.rubricas:
        ev_str = " • ".join(r.evidencias)
        linhas.append(
            f"| **{r.codigo}** | {r.titulo} | `{r.nivel}` | **{r.nota:.2f}** | {r.peso_max:.2f} | {r.justificativa_ia} ({ev_str}) |"
        )

    linhas.extend(
        [
            "",
            "---",
            "",
            "## 5. Roteiro de Arguição Técnica Individual (Sabatina de Código — Item 3.1)",
            "",
        ]
    )
    for idx, p in enumerate(av.perguntas_arguicao, start=1):
        linhas.extend(
            [
                f"### Pergunta {idx} — Direcionada a: **{p.integrante_sugerido}** ({p.categoria})",
                f"- **Arquivo / Referência:** `{p.arquivo_referencia}`",
                f"- **Pergunta da Banca:** {p.pergunta}",
                f"- **Resposta Técnica Esperada:** {p.resposta_esperada}",
                "```",
                p.trecho_codigo,
                "```",
                "",
            ]
        )

    linhas.extend(
        [
            "---",
            "",
            "## 6. Parecer Técnico Consolidado da Banca Examinadora (Dividido por Dimensão)",
            "",
        ]
    )
    if av.parecer_estruturado:
        for b in av.parecer_estruturado:
            linhas.append(f"### {b.titulo} (`{b.status.upper()}`)")
            linhas.append(f"{b.resumo}")
            for item in b.itens:
                linhas.append(f"- {item}")
            linhas.append("")
    else:
        linhas.append(av.parecer_tecnico)
        linhas.append("")
    return "\n".join(linhas)


def gerar_html_dossie_analitico(av: AvaliacaoGrupoModel) -> str:
    """Constrói uma versão HTML executiva do Dossiê Técnico (incluindo as Perguntas de Arguição e SQL) para PDF."""
    det = av.auditoria_tecnica

    linhas_arq = "".join(
        f"""
        <tr>
          <td><strong>{html.escape(a.tipo)}</strong></td>
          <td style="text-align:center">{'✅ Sim' if a.encontrado else '❌ Não'}</td>
          <td style="font-family:monospace;font-size:9px">{html.escape(a.nome_arquivo or '—')}</td>
          <td style="color:{'#047857' if a.nomenclatura_conforme else '#b91c1c'}">
            {'Conforme CTDS-2026-02' if a.nomenclatura_conforme else html.escape('; '.join(a.alertas_nomenclatura) or 'Ausente')}
          </td>
        </tr>
        """
        for a in av.arquivos_entregues
    )

    if det.tabelas_auditoria_online:
        linhas_sql = "".join(
            f"""
            <tr>
              <td style="font-family:monospace"><strong>{html.escape(t_aud.tabela)}</strong></td>
              <td style="text-align:center"><strong>{t_aud.registros_no_sql}</strong></td>
              <td style="text-align:center; color:{'#047857' if t_aud.presente_no_banco_online else '#b91c1c'}; font-weight:bold">
                {'✅ Sim' if t_aud.presente_no_banco_online else '❌ Não'}<br/>
                <span style="font-size:8px; font-weight:normal; color:#475569">{html.escape(t_aud.status_banco_online)}</span>
              </td>
              <td style="text-align:center; color:{'#047857' if t_aud.codigo_faz_gravacao else '#b91c1c'}; font-weight:bold">
                {'✅ Grava' if t_aud.codigo_faz_gravacao else '❌ Não'}
              </td>
              <td style="text-align:center; color:{'#047857' if t_aud.codigo_faz_consumo_leitura else '#b91c1c'}; font-weight:bold">
                {'✅ Consome' if t_aud.codigo_faz_consumo_leitura else '❌ Não'}
              </td>
              <td style="font-size:8.5px; color:#334155">{html.escape(t_aud.evidencia_codigo)}</td>
            </tr>
            """
            for t_aud in det.tabelas_auditoria_online
        )
    else:
        linhas_sql = "".join(
            f"""
            <tr>
              <td style="font-family:monospace"><strong>{html.escape(tab)}</strong></td>
              <td style="text-align:center"><strong>{qtd}</strong></td>
              <td colspan="4" style="color:{'#047857' if qtd >= 20 else '#b91c1c'}; font-weight:bold">
                {'✅ Atende (>= 20 reg)' if qtd >= 20 else '❌ Insuficiente (< 20 reg)'}
              </td>
            </tr>
            """
            for tab, qtd in det.sql_inserts_por_tabela.items()
        )

    blocos_perguntas = "".join(
        f"""
        <div style="border:1px solid #cbd5e1; border-radius:6px; padding:8px 10px; margin-bottom:8px; background:#f8fafc; page-break-inside:avoid;">
          <div style="font-weight:bold; color:#0f294a; font-size:10.5px;">
            Pergunta {idx} • Aluno(a): <span style="color:#b91c1c">{html.escape(p.integrante_sugerido)}</span>
            — [{html.escape(p.categoria)}] (Ref: <code>{html.escape(p.arquivo_referencia)}</code>)
          </div>
          <p style="margin:4px 0; font-size:10px;"><strong>Arguição:</strong> {html.escape(p.pergunta)}</p>
          <p style="margin:4px 0; font-size:9.5px; color:#047857;"><strong>Critério de Resposta:</strong> {html.escape(p.resposta_esperada)}</p>
          <pre style="background:#0f172a; color:#f8fafc; padding:6px 8px; border-radius:4px; font-size:8.5px; overflow-x:hidden; white-space:pre-wrap; margin:4px 0 0 0;">{html.escape(p.trecho_codigo)}</pre>
        </div>
        """
        for idx, p in enumerate(av.perguntas_arguicao, start=1)
    )

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Dossiê Analítico TCC — {html.escape(av.projeto)}</title>
<style>
  @page {{ size: A4; margin: 12mm; }}
  * {{ box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }}
  body {{ margin: 0; color: #0f172a; font-size: 10px; line-height: 1.38; }}
  .hdr {{ background: #0f172a; color: #fff; padding: 12px 14px; border-radius: 6px; border-left: 6px solid #e30613; margin-bottom: 10px; }}
  .hdr h1 {{ margin: 0; font-size: 15px; }}
  .hdr p {{ margin: 3px 0 0 0; font-size: 10px; color: #cbd5e1; }}
  h2 {{ font-size: 12px; color: #0f294a; border-bottom: 1.5px solid #e30613; padding-bottom: 3px; margin: 12px 0 6px 0; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 8px; }}
  th, td {{ border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; font-size: 9.5px; }}
  th {{ background: #1e293b; color: #fff; }}
  .kpi-grid {{ display: flex; gap: 8px; margin-bottom: 10px; }}
  .kpi {{ flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; background: #f8fafc; text-align: center; }}
  .kpi .lbl {{ font-size: 8.5px; color: #64748b; text-transform: uppercase; font-weight: bold; }}
  .kpi .val {{ font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px; }}
</style>
</head>
<body>
  <div class="hdr">
    <h1>DOSSIÊ TÉCNICO DE AUDITORIA TCC — {html.escape(av.projeto.upper())}</h1>
    <p>SENAI Ourinhos (Unidade 7.94) • {html.escape(av.turma)} • {html.escape(av.grupo)} • Data: {html.escape(av.data_banca)} ({html.escape(av.horario)}) • Integrantes: {html.escape(', '.join(av.integrantes))}</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="lbl">Pilar 1 (Doc 30%)</div><div class="val">{av.p1_total:.2f} / 30</div></div>
    <div class="kpi"><div class="lbl">Pilar 2 (Sist 40%)</div><div class="val">{av.p2_total:.2f} / 40</div></div>
    <div class="kpi"><div class="lbl">Média Final</div><div class="val" style="color:#b91c1c">{av.media_nota_final_grupo:.2f}%</div></div>
    <div class="kpi"><div class="lbl">Monografia</div><div class="val">{det.monografia_palavras} pal.</div></div>
    <div class="kpi"><div class="lbl">Tabelas / Regs SQL</div><div class="val">{det.sql_tabelas_qtd} tab / {det.sql_total_registros_inseridos} reg</div></div>
  </div>

  <h2>1. Conformidade de Nomenclatura e Anexos Obrigatórios (CTDS-2026-02: {av.conformidade_nomenclatura_pct}%)</h2>
  <table>
    <tr><th>Artefato</th><th style="text-align:center">Entregue</th><th>Nome do Arquivo</th><th>Diagnóstico de Padronização</th></tr>
    {linhas_arq}
  </table>

  <h2>2. Raio-X de Engenharia (Monografia, Código-Fonte, GitHub e Deploy)</h2>
  <table>
    <tr><th style="width:24%">Dimensão Auditada</th><th>Evidências Técnicas Extraídas pelo Agente</th></tr>
    <tr><td><strong>Monografia ABNT</strong></td><td>{det.monografia_palavras} palavras (~{det.monografia_paginas_estimadas} páginas) • {det.rfs_detectados_qtd} RFs e {det.rnfs_detectados_qtd} RNFs • MER/DER: {'Sim' if det.possui_mer_der else 'Não'} • Figma: {'Sim' if det.possui_link_figma else 'Não'}</td></tr>
    <tr><td><strong>Código-Fonte (.zip)</strong></td><td>{det.zip_total_arquivos} arquivos úteis • Stack: <strong>{html.escape(', '.join(det.zip_stack_detectada))}</strong> • README: {'Sim' if det.zip_possui_readme else 'Não'} ({det.zip_readme_tamanho} bytes)</td></tr>
    <tr><td><strong>Banco de Dados (.sql)</strong></td><td>{html.escape(det.sql_diagnostico)}</td></tr>
    <tr><td><strong>Persistência Nuvem (2.3/2.4)</strong></td><td>Banco: <strong>{html.escape(det.banco_provedor_nuvem or 'Não identificado')}</strong> ({html.escape(det.banco_url_detectada or 'N/A')}) • {html.escape(det.diagnostico_persistencia_2_3_2_4)}</td></tr>
    <tr><td><strong>Repositório GitHub</strong></td><td>{html.escape(det.github_diagnostico)}</td></tr>
    <tr><td><strong>Deploy Online (2.4)</strong></td><td>Provedor: <strong>{html.escape(det.deploy_provedor or 'N/A')}</strong> • {html.escape(det.deploy_diagnostico)}</td></tr>
    <tr><td><strong>Apresentação (Slides)</strong></td><td>{det.slides_qtd} slides em <code>{html.escape(det.slides_arquivo)}</code></td></tr>
  </table>

  <h2>3. Rastreabilidade por Tabela (.sql ↔ Banco Online ↔ Gravação INSERT/UPDATE ↔ Consumo SELECT)</h2>
  <table>
    <tr>
      <th>Tabela (.sql)</th>
      <th style="text-align:center">Regs .sql</th>
      <th style="text-align:center">Existe no Banco Online?</th>
      <th style="text-align:center">Grava (INSERT/UPDATE)?</th>
      <th style="text-align:center">Consome (SELECT)?</th>
      <th>Evidência no Código</th>
    </tr>
    {linhas_sql}
  </table>

  <h2>4. Perguntas Técnicas de Arguição Individual (Entendimento da Tecnologia — Rubrica 3.1)</h2>
  {blocos_perguntas}

  <h2>5. Parecer Técnico Consolidado (Status: {html.escape(av.status_liberacao_nota)})</h2>
  <div style="border:1px solid #cbd5e1; background:#f8fafc; padding:8px 10px; border-radius:6px;">
    {"".join(f"<div style='margin-bottom:6px;'><strong>• {html.escape(b.titulo)}:</strong> {html.escape(b.resumo)}</div>" for b in av.parecer_estruturado) or html.escape(av.parecer_tecnico)}
  </div>
</body>
</html>
"""


def exportar_ficha_msep_pdf(av: AvaliacaoGrupoModel) -> Path:
    cfg = ler_env()
    pasta = resolver_pasta_destino(cfg.pasta_destino)
    nome = f"Ficha_MSEP_{av.turma}_{_sanitizar_nome_arquivo(av.grupo)}_{_sanitizar_nome_arquivo(av.projeto)}.pdf"
    caminho = pasta / nome
    html_str = gerar_html_ficha_msep(av)
    return _renderizar_html_para_pdf(html_str, caminho)


def exportar_dossie_analitico_pdf_e_md(av: AvaliacaoGrupoModel) -> tuple[Path, Path]:
    cfg = ler_env()
    pasta = resolver_pasta_destino(cfg.pasta_destino)
    base_nome = f"Dossie_Auditoria_{av.turma}_{_sanitizar_nome_arquivo(av.grupo)}_{_sanitizar_nome_arquivo(av.projeto)}"

    caminho_md = pasta / f"{base_nome}.md"
    caminho_pdf = pasta / f"{base_nome}.pdf"

    md_str = gerar_markdown_dossie_analitico(av)
    caminho_md.write_text(md_str, encoding="utf-8")

    html_str = gerar_html_dossie_analitico(av)
    _renderizar_html_para_pdf(html_str, caminho_pdf)
    return caminho_pdf, caminho_md


def exportar_planilha_consolidada_xlsx(
    avaliacoes: list[AvaliacaoGrupoModel],
    turma_filtro: str | None = None,
) -> Path:
    """
    Gera a planilha Excel (.xlsx) consolidada com 3 abas formatadas:
    1. 'Notas Individuais (MSEP)' — todos os alunos da(s) turma(s) com P1, P2, P3, P4, Nota Final e Status.
    2. 'Resumo das Bancas' — os grupos do cronograma, status de entrega, notas por pilar e links.
    3. 'Auditoria Técnica' — métricas de monografia, tabelas/registros SQL, stack, GitHub e Deploy.
    """
    cfg = ler_env()
    pasta = resolver_pasta_destino(cfg.pasta_destino)
    sufixo_turma = turma_filtro if turma_filtro in ("I2DEV-A", "I2DEV-B") else "Todas_Turmas"
    data_str = datetime.now().strftime("%Y-%m-%d")
    caminho_xlsx = pasta / f"Consolidado_Bancas_TCC_PSOF3_{sufixo_turma}_{data_str}.xlsx"

    peso_h = {"primeiro": 1, "segundo": 2, "terceiro": 3, "quarto": 4}
    filtradas = sorted(
        [a for a in avaliacoes if (not turma_filtro or turma_filtro == "Todas" or a.turma == turma_filtro)],
        key=lambda a: (
            a.turma,
            a.data_banca_iso if a.data_banca_iso else a.data_banca,
            next((v for k, v in peso_h.items() if k in (a.horario or "").lower()), 99),
        ),
    )

    wb = Workbook()

    # Estilos institucionais SENAI
    fill_header = PatternFill("solid", fgColor="0F294A")
    fill_senai_red = PatternFill("solid", fgColor="E30613")
    fill_ok = PatternFill("solid", fgColor="DCFCE7")
    fill_warn = PatternFill("solid", fgColor="FEF3C7")
    fill_err = PatternFill("solid", fgColor="FEE2E2")

    font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    font_bold = Font(name="Calibri", size=10, bold=True)
    font_regular = Font(name="Calibri", size=10)
    thin_side = Side(border_style="thin", color="CBD5E1")
    border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    # =========================================================================
    # ABA 1: NOTAS INDIVIDUAIS (MSEP)
    # =========================================================================
    ws1 = wb.active
    ws1.title = "Notas Individuais (MSEP)"

    headers_ws1 = [
        "Turma",
        "Data da Banca",
        "Horário",
        "Grupo",
        "Projeto / TCC",
        "Nome do Aluno / Integrante",
        "Entrega na Pasta",
        "P1 - Doc (30%)",
        "P2 - Sistema (40%)",
        "3.1 Arguição (6%)",
        "3.2+3.3 Pitch/Slides (9%)",
        "P3 - Banca (15%)",
        "4.1 Sprints (8%)",
        "4.2 Participação (7%)",
        "P4 - Contínuo (15%)",
        "Nota Final (100%)",
        "Resultado Final",
        "GitHub Autor (Commits)",
    ]
    ws1.append(headers_ws1)
    for col_idx in range(1, len(headers_ws1) + 1):
        c = ws1.cell(row=1, column=col_idx)
        c.fill = fill_header
        c.font = font_header
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    row_idx = 2
    for av in filtradas:
        for ind in av.integrantes_notas:
            status_entrega = "Entregue" if av.entregue_na_pasta else "Pendente"
            resultado_txt = ind.resultado if av.entregue_na_pasta else "Pendente Entrega"
            gh_str = f"{ind.github_autor} ({ind.commits_qtd})" if ind.github_autor else "—"
            ws1.append(
                [
                    av.turma,
                    av.data_banca,
                    av.horario,
                    av.grupo,
                    av.projeto,
                    ind.nome,
                    status_entrega,
                    round(ind.p1_nota, 2) if av.entregue_na_pasta else 0.0,
                    round(ind.p2_nota, 2) if av.entregue_na_pasta else 0.0,
                    round(ind.nota_3_1_arguicao, 2) if av.entregue_na_pasta else 0.0,
                    round(av.p3_grupo_base, 2) if av.entregue_na_pasta else 0.0,
                    round(ind.p3_nota, 2) if av.entregue_na_pasta else 0.0,
                    round(ind.nota_4_1_sprints, 2),
                    round(ind.nota_4_2_participacao, 2),
                    round(ind.p4_nota, 2),
                    round(ind.nota_final, 2) if av.entregue_na_pasta else round(ind.p4_nota, 2),
                    resultado_txt,
                    gh_str,
                ]
            )
            for c_i in range(1, len(headers_ws1) + 1):
                cell = ws1.cell(row=row_idx, column=c_i)
                cell.font = font_bold if c_i in (6, 16, 17) else font_regular
                cell.border = border_cell
                if c_i in (1, 2, 3, 4, 7, 17) or (8 <= c_i <= 16):
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                if c_i == 17:
                    if resultado_txt == "Aprovado":
                        cell.fill = fill_ok
                    elif resultado_txt in ("Nota Retida (Pendências)", "Pendente Entrega"):
                        cell.fill = fill_warn
                    else:
                        cell.fill = fill_err
            row_idx += 1

    # =========================================================================
    # ABA 2: RESUMO DAS BANCAS
    # =========================================================================
    ws2 = wb.create_sheet(title="Resumo das Bancas")
    headers_ws2 = [
        "ID",
        "Turma",
        "Data",
        "Horário",
        "Grupo",
        "Projeto",
        "Integrantes",
        "Status Entrega",
        "Nomenclatura (%)",
        "P1 (30)",
        "P2 (40)",
        "P3 Base (9)",
        "Média Final (100)",
        "Tabelas SQL",
        "Registros SQL",
        "SQL >= 20/tab",
        "Deploy Online",
        "GitHub Online",
        "Sincronizado Firebase",
    ]
    ws2.append(headers_ws2)
    for col_idx in range(1, len(headers_ws2) + 1):
        c = ws2.cell(row=1, column=col_idx)
        c.fill = fill_senai_red
        c.font = font_header
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for r_i, av in enumerate(filtradas, start=2):
        det = av.auditoria_tecnica
        ws2.append(
            [
                av.id,
                av.turma,
                av.data_banca,
                av.horario,
                av.grupo,
                av.projeto,
                ", ".join(av.integrantes),
                "Entregue" if av.entregue_na_pasta else "Aguardando Entrega",
                av.conformidade_nomenclatura_pct if av.entregue_na_pasta else 0.0,
                av.p1_total if av.entregue_na_pasta else 0.0,
                av.p2_total if av.entregue_na_pasta else 0.0,
                av.p3_grupo_base if av.entregue_na_pasta else 0.0,
                av.media_nota_final_grupo if av.entregue_na_pasta else 0.0,
                det.sql_tabelas_qtd,
                det.sql_total_registros_inseridos,
                "SIM" if det.sql_atende_min_20_por_tabela else ("NÃO" if av.entregue_na_pasta else "—"),
                det.deploy_url or "—",
                det.github_url or ("EM BRANCO" if av.entregue_na_pasta else "—"),
                "Sim" if av.sincronizado_firebase else "Não",
            ]
        )
        for c_i in range(1, len(headers_ws2) + 1):
            cell = ws2.cell(row=r_i, column=c_i)
            cell.font = font_regular
            cell.border = border_cell
            if c_i == 8:
                cell.fill = fill_ok if av.entregue_na_pasta else fill_warn

    # Ajustar largura das colunas nas duas abas
    for ws in (ws1, ws2):
        ws.row_dimensions[1].height = 26
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(12, min(42, max_len + 4))

    wb.save(str(caminho_xlsx))
    return caminho_xlsx

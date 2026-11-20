"""
Testes automatizados do Backend e Motor de Auditoria de Bancas TCC (PSOF3 — SENAI Ourinhos).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health_check():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_listar_agentes_e_regras():
    r_ag = client.get("/api/agents")
    assert r_ag.status_code == 200
    agentes = r_ag.json()["agentes"]
    assert len(agentes) == 1
    assert agentes[0]["id"] == "avaliador-bancas-tcc"
    assert agentes[0]["total_bancas_cronograma"] == 25
    assert agentes[0]["grupos_entregues_qtd"] >= 3

    r_reg = client.get("/api/regras")
    assert r_reg.status_code == 200
    dados_reg = r_reg.json()
    assert len(dados_reg["documentos_regras"]) == 4
    assert len(dados_reg["rubricas_msep"]) == 18
    assert len(dados_reg["cronograma_oficial"]) == 25


def test_auditoria_dos_3_grupos_entregues():
    r_bancas = client.get("/api/bancas")
    assert r_bancas.status_code == 200
    payload = r_bancas.json()
    assert payload["total"] == 25
    assert payload["entregues"] >= 3

    mapa = {b["id"]: b for b in payload["bancas"]}

    # 1. Banca 01 - Grupo 08 - OrganizAI
    g08 = mapa["I2DEV-B_Grupo08"]
    assert g08["entregue_na_pasta"] is True
    assert g08["ordem_apresentacao"] >= 1
    assert g08["data_banca_iso"] == "2026-11-16"
    assert g08["auditoria_tecnica"]["sql_tabelas_qtd"] == 3
    assert g08["auditoria_tecnica"]["tabelas_sql_presentes_online_qtd"] == 3
    assert g08["auditoria_tecnica"]["tabelas_ciclo_completo_qtd"] == 3
    assert "temaEscuro" in g08["auditoria_tecnica"]["chaves_localstorage_permitidas_ui"]
    assert "ocultarValores" in g08["auditoria_tecnica"]["chaves_localstorage_permitidas_ui"]
    assert "boletos" in g08["auditoria_tecnica"]["chaves_localstorage_negocio"]
    assert g08["auditoria_tecnica"]["sql_total_registros_inseridos"] == 0
    assert g08["auditoria_tecnica"]["sql_atende_min_20_por_tabela"] is False
    assert g08["auditoria_tecnica"]["usa_localstorage_indevido"] is True
    assert g08["auditoria_tecnica"]["inviabiliza_finalizacao_persistencia"] is True
    assert g08["status_liberacao_nota"] == "Nota Retida (Pendências)"
    assert len(g08["parecer_estruturado"]) >= 5

    # Verificar que 3.1 e 3.2 iniciam como Pendente (0.0)
    rub_g08 = {r["codigo"]: r for r in g08["rubricas"]}
    assert rub_g08["3.1"]["nivel"] == "Pendente"
    assert rub_g08["3.1"]["nota"] == 0.0
    assert rub_g08["3.2"]["nivel"] == "Pendente"
    assert rub_g08["3.2"]["nota"] == 0.0

    # Verificar notas oficiais do Pilar 4 carregadas do PDF para OrganizAI
    notas_ind_g08 = {i["nome"]: i for i in g08["integrantes_notas"]}
    assert notas_ind_g08["Leonardo"]["nota_4_1_sprints"] == 6.4
    assert notas_ind_g08["Leonardo"]["nota_4_2_participacao"] == 6.6
    assert notas_ind_g08["João Sergio"]["nota_4_1_sprints"] == 1.6
    assert notas_ind_g08["João Sergio"]["nivel_4_1"] == "Insuficiente"

    # 2. Banca 02 - Grupo 03 - Guardião Animal
    g03 = mapa["I2DEV-B_Grupo03"]
    assert g03["entregue_na_pasta"] is True
    assert g03["auditoria_tecnica"]["sql_tabelas_qtd"] == 12
    assert g03["auditoria_tecnica"]["tabelas_sql_presentes_online_qtd"] == 11
    assert g03["auditoria_tecnica"]["tabelas_sql_gravadas_pelo_codigo_qtd"] == 5
    assert g03["auditoria_tecnica"]["tabelas_sql_consumidas_pelo_codigo_qtd"] == 0
    assert g03["auditoria_tecnica"]["usa_arquivos_json_locais_no_servidor"] is True
    assert g03["auditoria_tecnica"]["sql_total_registros_inseridos"] == 0
    assert g03["auditoria_tecnica"]["sql_atende_min_20_por_tabela"] is False
    assert g03["auditoria_tecnica"]["inviabiliza_finalizacao_persistencia"] is True
    assert "Supabase" in g03["auditoria_tecnica"]["banco_provedor_nuvem"]
    assert g03["status_liberacao_nota"] == "Nota Retida (Pendências)"

    # 3. Banca 03 - Grupo 05 - Risk Zero
    g05 = mapa["I2DEV-B_Grupo05"]
    assert g05["entregue_na_pasta"] is True
    assert g05["auditoria_tecnica"]["sql_tabelas_qtd"] == 8
    assert g05["auditoria_tecnica"]["tabelas_ciclo_completo_qtd"] == 6
    assert "rz_welcome_dismissed" in g05["auditoria_tecnica"]["chaves_localstorage_permitidas_ui"]
    assert g05["auditoria_tecnica"]["sql_total_registros_inseridos"] == 176
    assert g05["auditoria_tecnica"]["sql_atende_min_20_por_tabela"] is True
    assert "github.com" in g05["auditoria_tecnica"]["github_url"]
    assert "Firebase" in g05["auditoria_tecnica"]["banco_provedor_nuvem"]
    assert g05["status_liberacao_nota"] == "Nota Retida (Pendências)"
    assert len(g05["perguntas_arguicao"]) >= 3


def test_auditoria_grupos_i2dev_a():
    r_bancas = client.get("/api/bancas")
    assert r_bancas.status_code == 200
    mapa = {b["id"]: b for b in r_bancas.json()["bancas"]}

    # Grupo 05 - LabwareNext (Hospedado na VM Oracle 147.15.2.73)
    g_lab = mapa["I2DEV-A_Grupo05"]
    assert g_lab["entregue_na_pasta"] is True
    assert "LabWare" in g_lab["projeto"] or "Labware" in g_lab["projeto"]
    assert len(g_lab["perguntas_arguicao"]) >= 3
    assert g_lab["auditoria_tecnica"]["hospedado_vm_oracle"] is True
    assert "VM Oracle" in g_lab["auditoria_tecnica"]["deploy_provedor"]
    assert g_lab["auditoria_tecnica"]["deploy_online_ok"] is True
    assert g_lab["auditoria_tecnica"]["sql_tabelas_qtd"] == 8
    assert g_lab["auditoria_tecnica"]["tabelas_sql_presentes_online_qtd"] == 8
    assert g_lab["auditoria_tecnica"]["tabelas_ciclo_completo_qtd"] == 8
    # Validação da Introdução e seções ABNT
    assert g_lab["auditoria_tecnica"]["secoes_abnt_detectadas"]["Introdução & Justificativa"] is True
    assert "Introdução & Justificativa" not in g_lab["auditoria_tecnica"]["secoes_abnt_faltantes"]
    assert len(g_lab["auditoria_tecnica"]["secoes_abnt_faltantes"]) == 0
    assert sum(1 for v in g_lab["auditoria_tecnica"]["secoes_abnt_detectadas"].values() if v) == 14
    rub_lab = {r["codigo"]: r for r in g_lab["rubricas"]}
    assert rub_lab["2.3"]["nota"] >= 9.0
    assert rub_lab["2.4"]["nota"] >= 4.4

    # Grupo 12 - BRIO
    g_brio = mapa["I2DEV-A_Grupo12"]
    assert g_brio["entregue_na_pasta"] is True
    assert g_brio["projeto"] == "BRIO"
    assert "github.com" in g_brio["auditoria_tecnica"]["github_url"]
    assert "brio.site.je" in g_brio["auditoria_tecnica"]["deploy_url"]

    # Grupo 03 - Fitlink
    g_fit = mapa["I2DEV-A_Grupo03"]
    assert g_fit["entregue_na_pasta"] is True
    assert g_fit["projeto"] == "Fitlink"
    assert g_fit["auditoria_tecnica"]["sql_tabelas_qtd"] == 11
    assert g_fit["auditoria_tecnica"]["sql_total_registros_inseridos"] == 403


def test_exportar_relatorios_endpoints():
    r_ficha = client.post("/api/bancas/I2DEV-A_Grupo05/exportar/ficha-pdf")
    assert r_ficha.status_code == 200
    dados_ficha = r_ficha.json()
    assert dados_ficha["arquivo"].endswith(".pdf")
    p_ficha = Path(dados_ficha["caminho"])
    assert p_ficha.exists()
    assert p_ficha.stat().st_size > 5000
    conteudo_ficha = p_ficha.read_bytes()
    assert conteudo_ficha.startswith(b"%PDF-1.")

    # Validar que a Ficha MSEP respeita rigorosamente o limite de 2 páginas
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(str(p_ficha))
        num_paginas = len(doc)
        doc.close()
    except ImportError:
        from pypdf import PdfReader

        num_paginas = len(PdfReader(str(p_ficha)).pages)
    assert num_paginas == 2, f"Ficha MSEP deve ter exatamente 2 páginas, mas tem {num_paginas}"

    # Testar download do arquivo gerado via GET
    r_dl = client.get(dados_ficha["url_download"])
    assert r_dl.status_code == 200
    assert r_dl.content.startswith(b"%PDF-1.")

    r_dossie = client.post("/api/bancas/I2DEV-B_Grupo05/exportar/dossie")
    assert r_dossie.status_code == 200
    dados_dossie = r_dossie.json()
    assert dados_dossie["arquivo_pdf"].endswith(".pdf")
    assert dados_dossie["arquivo_md"].endswith(".md")
    r_dl_pdf = client.get(dados_dossie["url_pdf"])
    assert r_dl_pdf.status_code == 200
    assert r_dl_pdf.content.startswith(b"%PDF-1.")
    assert len(r_dl_pdf.content) > 5000
    r_dl_md = client.get(dados_dossie["url_md"])
    assert r_dl_md.status_code == 200
    assert len(r_dl_md.text) > 500

    r_xlsx = client.post("/api/exportar/consolidado-xlsx?turma=I2DEV-B")
    assert r_xlsx.status_code == 200
    assert r_xlsx.json()["arquivo"].endswith(".xlsx")


def test_protecao_bancas_ja_realizadas_e_escopo_reauditoria():
    from backend.app.tcc_auditor import (
        sincronizar_e_obter_todas_bancas,
        ler_avaliacoes_salvas,
        salvar_avaliacoes_salvas,
    )

    salvas = ler_avaliacoes_salvas()
    gid = "I2DEV-B_Grupo08"
    assert gid in salvas

    # Simular que a banca do Grupo 08 já foi realizada pelos professores avaliadores
    original = dict(salvas[gid])
    salvas[gid]["banca_realizada"] = True
    salvas[gid]["status_avaliacao"] = "avaliado_banca"
    salvas[gid]["parecer_tecnico"] = "PARECER_OFICIAL_BANCA_CONCLUIDA_NAO_SOBRESCREVER"
    salvar_avaliacoes_salvas(salvas)

    logs: list[str] = []
    # Disparar sincronização com executar_auditoria_nos_entregues=True
    resultados = sincronizar_e_obter_todas_bancas(
        executar_auditoria_nos_entregues=True,
        grupo_ids_alvo=[gid],
        log_cb=logs.append,
    )

    mapa = {b.id: b for b in resultados}
    # Grupo 08 deve ter sido preservado sem reanálise da pasta
    assert mapa[gid].banca_realizada is True
    assert mapa[gid].status_avaliacao == "avaliado_banca"
    assert mapa[gid].parecer_tecnico == "PARECER_OFICIAL_BANCA_CONCLUIDA_NAO_SOBRESCREVER"
    assert any("PRESERVADO" in log and "banca já realizada" in log for log in logs)

    # Restaurar avaliação original
    salvas[gid] = original
    salvar_avaliacoes_salvas(salvas)


def test_auditoria_profunda_v2():
    res = client.get("/api/bancas")
    assert res.status_code == 200
    mapa = {g["id"]: g for g in res.json()["bancas"]}

    # 1. Fitlink (I2DEV-A_Grupo03): DOCX somente imagens com fallback PDF + 13/14 capítulos + DER 100%
    g_fit = mapa["I2DEV-A_Grupo03"]
    aud_fit = g_fit["auditoria_tecnica"]
    assert aud_fit["docx_somente_imagens"] is True
    assert len(aud_fit["secoes_abnt_presentes"]) + len(aud_fit["secoes_abnt_faltantes"]) == 14
    assert "Fundamentação Teórica" in aud_fit["secoes_abnt_faltantes"]
    assert aud_fit["sql_correspondencia_der_pct"] == 100.0

    # 2. LabWareNext (I2DEV-A_Grupo05): 14/14 capítulos, checklist ABNT, GitHub funcional, VM Oracle co-host e CRUD separado
    g_lab = mapa["I2DEV-A_Grupo05"]
    aud_lab = g_lab["auditoria_tecnica"]
    assert len(aud_lab["secoes_abnt_presentes"]) == 14
    assert len(aud_lab["secoes_abnt_faltantes"]) == 0
    assert len(aud_lab["checklist_abnt"]) >= 8
    assert aud_lab["github_sistema_funcional"] is True
    assert aud_lab["bd_host_localhost_valido_em_nuvem"] is True
    assert len(aud_lab["tabelas_auditoria_online"]) > 0
    for tab in aud_lab["tabelas_auditoria_online"]:
        assert "codigo_faz_insert" in tab
        assert "codigo_faz_update" in tab
        assert "codigo_faz_select" in tab
        assert "codigo_faz_delete" in tab

    # 3. Guardião Animal (I2DEV-B_Grupo03): fallback PDF de slides + objetividade
    g_guard = mapa["I2DEV-B_Grupo03"]
    aud_guard = g_guard["auditoria_tecnica"]
    assert "PDF" in aud_guard["slides_fonte_texto"].upper()
    assert aud_guard["slides_qtd"] >= 10
    assert aud_guard["slides_objetividade_nivel"] != ""

    # 4. OrganizAI (I2DEV-B_Grupo08): capítulos faltantes explícitos + localStorage indevido
    g_org = mapa["I2DEV-B_Grupo08"]
    aud_org = g_org["auditoria_tecnica"]
    assert "Metodologia" in aud_org["secoes_abnt_faltantes"]
    assert "Backlog & Cronograma Ágil" in aud_org["secoes_abnt_faltantes"]
    assert aud_org["usa_localstorage_indevido"] is True

    # 5. Sem trava paralela automática exclusiva de formatação ABNT quando rubrica 1.1 >= 50%
    for g in mapa.values():
        if not g.get("entregue_na_pasta"):
            continue
        r11 = next((r for r in g.get("rubricas", []) if r.get("codigo") == "1.1"), None)
        if r11 and r11["nota"] >= r11["peso_max"] * 0.5:
            assert not any("Formatação ABNT" in item for item in g.get("itens_insuficientes_grupo", []))



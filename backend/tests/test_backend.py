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
    assert g05["auditoria_tecnica"]["github_url"] == ""
    assert "Firebase" in g05["auditoria_tecnica"]["banco_provedor_nuvem"]
    assert g05["status_liberacao_nota"] == "Nota Retida (Pendências)"
    assert len(g05["perguntas_arguicao"]) >= 3


def test_exportar_relatorios_endpoints():
    r_ficha = client.post("/api/bancas/I2DEV-B_Grupo05/exportar/ficha-pdf")
    assert r_ficha.status_code == 200
    assert r_ficha.json()["arquivo"].endswith(".pdf")

    r_dossie = client.post("/api/bancas/I2DEV-B_Grupo05/exportar/dossie")
    assert r_dossie.status_code == 200
    assert r_dossie.json()["arquivo_pdf"].endswith(".pdf")
    assert r_dossie.json()["arquivo_md"].endswith(".md")

    r_xlsx = client.post("/api/exportar/consolidado-xlsx?turma=I2DEV-B")
    assert r_xlsx.status_code == 200
    assert r_xlsx.json()["arquivo"].endswith(".xlsx")

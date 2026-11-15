"""
Script determinístico da Camada 3 (/execution) para auditar todas as entregas de TCC
em ./tcc/I2DEV-A e ./tcc/I2DEV-B, sincronizar com o Firebase Firestore configurado no .env
e gerar os relatórios em PDF, Markdown e Excel (.xlsx).
"""
from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
import sys
import uuid

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from backend.app.config_manager import registrar_execucao
from backend.app.models import ExecucaoHistorico
from backend.app.report_generator import (
    exportar_dossie_analitico_pdf_e_md,
    exportar_ficha_msep_pdf,
    exportar_planilha_consolidada_xlsx,
)
from backend.app.tcc_auditor import sincronizar_e_obter_todas_bancas


def main() -> int:
    parser = argparse.ArgumentParser(description="Audita as Bancas de TCC (PSOF3 — SENAI Ourinhos) via CLI.")
    parser.add_argument("--turma", choices=["I2DEV-A", "I2DEV-B"], help="Filtrar por turma específica")
    parser.add_argument("--grupo", help="ID específico do grupo (ex: I2DEV-B_Grupo08)")
    parser.add_argument("--sem-firebase", action="store_true", help="Não sincronizar com o Firebase")
    parser.add_argument("--gerar-pdfs", action="store_true", help="Gerar Fichas MSEP e Dossiês em PDF para cada grupo entregue")
    args = parser.parse_args()

    exec_id = uuid.uuid4().hex[:10]
    iniciado_em = datetime.now().isoformat(timespec="seconds")
    grupo_ids = [args.grupo] if args.grupo else None

    print("=" * 80)
    print("🤖 AGENTE AVALIADOR DE BANCAS TCC — PSOF3 (SENAI OURINHOS)")
    print("=" * 80)

    resultados = sincronizar_e_obter_todas_bancas(
        executar_auditoria_nos_entregues=True,
        grupo_ids_alvo=grupo_ids,
        turma_alvo=args.turma,
        sincronizar_firebase=not args.sem_firebase,
        log_cb=lambda msg: print(msg),
    )

    entregues = [r for r in resultados if r.entregue_na_pasta]
    if args.gerar_pdfs:
        for av in entregues:
            if grupo_ids and av.id not in grupo_ids:
                continue
            ficha_pdf = exportar_ficha_msep_pdf(av)
            dossie_pdf, dossie_md = exportar_dossie_analitico_pdf_e_md(av)
            print(f"📄 [{av.id}] Ficha MSEP PDF: {ficha_pdf.name}")
            print(f"📑 [{av.id}] Dossiê Analítico: {dossie_pdf.name} & {dossie_md.name}")

    arq_xlsx = exportar_planilha_consolidada_xlsx(resultados, turma_filtro=args.turma)
    print(f"📊 Planilha Consolidada XLSX gerada em: {arq_xlsx}")

    registrar_execucao(
        ExecucaoHistorico(
            id=exec_id,
            iniciado_em=iniciado_em,
            finalizado_em=datetime.now().isoformat(timespec="seconds"),
            status="success",
            escopo=args.turma or "Todas as Turmas (CLI)",
            grupos_processados=len(entregues),
            arquivo_gerado=arq_xlsx.name,
            mensagem=f"Auditoria CLI concluída para {len(entregues)} grupo(s) entregue(s).",
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

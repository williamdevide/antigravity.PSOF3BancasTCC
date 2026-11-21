# Arquivos Revisados Pós-Banca (`revisados/`) & Aceite pelo Professor Titular

## Goal
Permitir o envio de arquivos corrigidos extras após qualquer banca realizada (válido para os 3 status), salvando-os isoladamente em `./tcc/{turma}/{pasta_grupo}/revisados/` sem substituir a entrega original, com validação de aceite pelo Professor Titular e liberação para alternar o status final do trabalho entre os 3 possíveis.

## Tasks
- [x] **Etapa 0:** Atualizar `documentation/promptHistory.md` (Sessão 29), `directives/avaliador_bancas_tcc.md` e criar `arquivos-revisados-pos-banca.md`.
- [x] **Etapa 1 (Backend):** Adicionar `RevisaoPosBancaModel` e `AvaliarRevisaoPosBancaRequest` em `backend/app/models.py`; helpers de `revisados/` e sincronização em `backend/app/tcc_auditor.py`; endpoints `GET/POST/DELETE /api/bancas/{id}/revisados` e `/revisados/avaliar` em `backend/app/main.py`.
- [x] **Etapa 2 (Frontend):** Atualizar `types.ts`, `api.ts`, `bancaMultiAvaliador.ts`, expandir `ModalEntregaArquivos.tsx` com a aba **"Arquivos Revisados (Pós-Banca)"**, adicionar botão dedicado em `App.tsx` e exibir o status da revisão pós-banca em `StudentLandingPage.tsx`.
- [x] **Etapa 3 (Testes & Produção):** Adicionar teste completo em `backend/tests/test_backend.py`, validar `oxlint`, `tsc --noEmit`, `vite build` e `pytest`, fazer commit/push no GitHub e implantar na VM Oracle (`147.15.2.73`) validando via HTTPS.

## ✅ PHASE X COMPLETE
- **Frontend:** `oxlint` (`0` erros), `tsc --noEmit` (`0` erros) e `vite build` (`dist/assets/index-ChZxocHv.js`) aprovados.
- **Backend:** `python -m pytest backend/tests/test_backend.py -v` aprovado (**9/9** testes PASS, incluindo `test_arquivos_revisados_pos_banca_e_aceite_status`).


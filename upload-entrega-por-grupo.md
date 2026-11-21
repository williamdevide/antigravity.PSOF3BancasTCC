# Upload de Entrega por Grupo & Reabertura Controlada

## Goal
Permitir que o docente arraste e gerencie os arquivos de entrega diretamente pelo card de cada grupo na aba **Auditoria & Bancas**, salvando-os nas pastas oficiais em `./tcc/`, disparando a auditoria pelo modal, permitindo baixar/substituir/excluir arquivos após a análise e protegendo bancas concluídas até reabertura explícita.

## Decisões (`/grill-me` — Sessão 26)
- **Botões no modal:** **"Enviar e Auditar Agora"** (ação principal) + **"Apenas Salvar Arquivos"**, além de **"Auditar / Reauditar Grupo"** na lista de arquivos já salvos.
- **Proteção de banca concluída:** Enquanto concluída, bloqueia upload e exclusão (mantém download) e exibe **"Reabrir Banca (Voltar para Entregue)"**, que reabre a sessão para entregue mantendo histórico de notas/rascunhos dos professores no Firestore.
- **Lista de arquivos:** Aceita `.docx`, `.pdf`, `.pptx`, `.sql`, `.zip`, `.txt`, `.md`, `.csv`, `.png`, `.jpg`, `.jpeg` (até 200 MB por arquivo) com substituição por nome, download individual, exclusão individual e limpeza total (se ficar vazia, pasta é removida e status volta para pendente).

## Tasks
- [x] **Etapa 0:** Atualizar `documentation/promptHistory.md` (Sessão 26), `directives/avaliador_bancas_tcc.md`, `backend/requirements.txt` e criar `upload-entrega-por-grupo.md`.
- [x] **Etapa 1 (Backend):** Atualizar `backend/app/tcc_auditor.py` e `backend/app/main.py` com endpoints `GET/POST/DELETE /api/bancas/{grupo_id}/arquivos`, `GET .../arquivos/{nome_arquivo}` e `POST /api/bancas/{grupo_id}/reabrir`.
- [x] **Etapa 2 (Frontend):** Atualizar `frontend/src/types.ts`, `frontend/src/services/api.ts`, `frontend/src/services/bancaMultiAvaliador.ts`, criar `frontend/src/components/ModalEntregaArquivos.tsx` e integrar em `frontend/src/App.tsx`.
- [x] **Etapa 3 (Testes & Build):** Criar teste automatizado em `backend/tests/test_backend.py`, rodar `oxlint`, `tsc --noEmit`, `vite build` e `pytest`.
- [x] **Etapa 4 (Git & Produção):** Commit/push nos dois remotes GitHub, instalar `python-multipart` e implantar na VM Oracle (`147.15.2.73`), validando via HTTPS.

## ✅ PHASE X COMPLETE
- **Frontend:** `oxlint` (`0` erros), `tsc --noEmit` (`0` erros) e `vite build` (`dist/assets/index-CdH0eG1T.js`) aprovados.
- **Backend:** `python -m pytest backend/tests/test_backend.py -v` aprovado (**8/8** testes PASS).


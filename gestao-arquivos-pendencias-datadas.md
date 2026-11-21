# Gestão de Arquivos, Histórico Datado de Pendências & Paridade Visual

## Goal
Implementar: (1) bloco completo **Controle de Pendências & Cumprimento (Portal dos Alunos)** com troca entre os 3 status na aba de **Arquivos Revisados**, (2) histórico cronológico datado de mensagens registradas durante a banca e na recepção dos arquivos revisados exibido na Ficha MSEP, no modal de revisados e no Portal dos Alunos (`/`), (3) bordas coloridas em *Auditoria & Bancas* idênticas às da tela do aluno, e (4) tela **Gestão de Arquivos** na navegação ao lado de *Configurações* (árvore de diretórios/arquivos de `./tcc` à esquerda + visualizador rico de conteúdo à direita).

## Tasks
- [x] **Etapa 0:** Atualizar `documentation/promptHistory.md` (Sessão 30), `directives/avaliador_bancas_tcc.md` e criar `gestao-arquivos-pendencias-datadas.md`.
- [x] **Etapa 1 (Backend):** Adicionar `RegistroHistoricoPendenciaModel` e `SalvarPendenciasGrupoRequest` em `backend/app/models.py`; helper `registrar_pendencia_e_status_backend` e histórico datado em `backend/app/tcc_auditor.py`; criar `backend/app/file_explorer.py` e expor rotas `/api/bancas/{id}/pendencias` e `/api/arquivos/*` em `backend/app/main.py`.
- [x] **Etapa 2 (Frontend):** Atualizar `types.ts`, `api.ts`, `bancaMultiAvaliador.ts`, `AgentHub.tsx`, `PainelBancaConsolidada.tsx`, `ModalEntregaArquivos.tsx`, `StudentLandingPage.tsx`, criar `FileExplorerView.tsx` e integrar botão `Gestão de Arquivos` + cores nos cards em `App.tsx`.
- [x] **Etapa 3 (Testes & Produção):** Expandir `backend/tests/test_backend.py`, validar `oxlint`, `tsc --noEmit`, `vite build` e `pytest`, fazer commit/push no GitHub e deploy na VM Oracle (`147.15.2.73`) validando via HTTPS.

## ✅ PHASE 3 COMPLETE
- Frontend `oxlint` (0 erros), `tsc --noEmit` (exit 0) e `vite build` (`dist/` gerado) aprovados.
- Backend `pytest backend/tests/test_backend.py -v` aprovado com 10/10 testes passando.

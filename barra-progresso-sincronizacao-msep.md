# Barra de Progresso na Análise, Sincronização de Pilares (1, 2, 3 e 4) & Níveis MSEP

## Goal
Corrigir três pontos críticos no fluxo pós-entrega de arquivos:
1. Exibir barra de carregamento em 2 fases (Upload % + Análise técnica etapa por etapa) no modal e em banner fixo no topo de *Auditoria & Bancas* enquanto processa os arquivos.
2. Evitar auditoria síncrona silenciosa durante `GET /api/bancas` quando arquivos acabaram de ser enviados, e eliminar closures obsoletos em `bancaConsolidada` e `rubricasEdit` (com invalidação de rascunho pré-auditoria) para que Pilares 1, 2, 3 e 4 apareçam imediatamente após a conclusão.
3. Garantir a atribuição automática do Nível MSEP (`Insuficiente` / `Pleno` / `Avançado`) em todos os subitens na *Ficha MSEP & Arguição* e exibir badges de Nível MSEP nas parciais dos 4 Pilares em *Auditoria & Bancas* e na *Ficha MSEP & Arguição*.

## Tasks
- [x] **Etapa 0:** Atualizar `documentation/promptHistory.md` (Sessão 31), `directives/avaliador_bancas_tcc.md` e criar `barra-progresso-sincronizacao-msep.md`.
- [x] **Etapa 1 (Backend):** Adicionar `step_cb` com 8 etapas granulares em `auditar_grupo_individual` e impedir bloqueio síncrono de `entregue_nao_auditado` no `GET /api/bancas` em `backend/app/tcc_auditor.py`.
- [x] **Etapa 2 (Frontend Tipos & API):** Adicionar `auditado_em_base` em `DraftAvaliacaoLocal` (`frontend/src/types.ts`) e suporte a `onProgress` via `XMLHttpRequest` em `api.uploadArquivosGrupo` (`frontend/src/services/api.ts`).
- [x] **Etapa 3 (Frontend UI):** Implementar barra de carregamento em 2 fases em `ModalEntregaArquivos.tsx` e banner fixo em `App.tsx`; corrigir `bancaConsolidada` via `useMemo`, sincronização reativa de `rubricasEdit` com invalidação de draft pré-auditoria, e badges de Nível MSEP nos 4 Pilares (`Auditoria & Bancas` + `Ficha MSEP & Arguição`).
- [x] **Etapa 4 (Testes & Produção):** Adicionar `test_upload_nao_bloqueia_get_bancas_e_auditoria_reporta_progresso_granular` em `backend/tests/test_backend.py`, validar `oxlint`, `tsc --noEmit`, `vite build` e `pytest`, fazer commit/push no GitHub e deploy na VM Oracle (`147.15.2.73`).

## ✅ PHASE COMPLETE
- Frontend: `oxlint` (0 erros / 20 warnings preexistentes), `tsc --noEmit` (exit 0), `vite build` (`dist/assets/index-COoUNQ3I.js` gerado em `1.09s`).
- Backend: `pytest backend/tests/test_backend.py -v` (`11 passed` em `7.42s`).

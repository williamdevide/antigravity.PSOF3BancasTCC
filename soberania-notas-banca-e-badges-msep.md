# Soberania das Notas Alteradas em Bancas Concluídas & Badges MSEP Compactos

## Goal
1. Corrigir a estética dos badges de Nível MSEP nos 4 pilares para nunca quebrarem em 2 linhas (especialmente em `INSUFICIENTE` e pré-banca do Pilar 3).
2. Garantir soberania total das notas modificadas/consolidadas pelos professores em bancas concluídas sobre o cálculo automático do sistema em todas as telas (*Ficha MSEP & Arguição*, *Auditoria & Bancas*, *Consolidado Turmas*, seletores) e nas exportações PDF/XLSX do backend.

## Tasks
- [x] **Etapa 0:** Atualizar `documentation/promptHistory.md` (Sessão 32), `directives/avaliador_bancas_tcc.md` e criar `soberania-notas-banca-e-badges-msep.md`.
- [x] **Etapa 1:** Retornar `consolidada` em `recalcularEConsolidarBancaAposEdicao` (`frontend/src/services/bancaMultiAvaliador.ts`).
- [x] **Etapa 2:** Tornar `badgeNivelMsep` compacto em 1 linha (`whitespace-nowrap`, sem prefixo `MSEP:` redundante, e `'3.3'` pré-banca) em `frontend/src/App.tsx`.
- [x] **Etapa 3:** Implementar carregamento soberano da Média Consolidada Oficial (leitura) / avaliação individual salva no Firestore (edição), helpers `mesclarRubricasSoberanasComBase` + `mesclarIntegrantesSoberanosComBase`, sincronização automática com o backend FastAPI (`PUT /api/bancas/{id}/avaliacao`) na consolidação/edição/exportação, e leitura soberana em *Consolidado Turmas*, Bloco 4, seletores e cabeçalho da Ficha MSEP (`frontend/src/App.tsx`).
- [x] **Etapa 4:** Validar `oxlint`, `tsc --noEmit`, `vite build` e `pytest`, commitar/push no GitHub, fazer deploy na VM Oracle (`147.15.2.73`) e verificar endpoints HTTPS em produção.

## ✅ PHASE COMPLETE
- Frontend: `oxlint` (0 erros / 21 warnings), `tsc --noEmit` (exit 0), `vite build` (`dist/assets/index-DQ28zDAB.js` gerado em `2.02s`).
- Backend: `pytest backend/tests/test_backend.py -v` (`11 passed` em `16.62s`).

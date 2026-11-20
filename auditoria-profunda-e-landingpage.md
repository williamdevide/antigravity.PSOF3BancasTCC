# Auditoria Profunda v2 & Landing Page Pública dos Alunos

## Goal
Aprimorar o motor híbrido de auditoria técnica (TCC/ABNT sem falsos positivos/negativos, qualidade e objetividade de slides, análise profunda Frontend/Backend/DER/CRUD/Deploy BD contextual e GitHub vs Deploy) e entregar a Landing Page pública dos alunos na rota raiz (`/`) com controle de pendências por grupo salvo no Firestore.

## Decisões Arquiteturais (`/grill-me`)
- **Arquitetura de Auditoria:** Híbrido em 2 Camadas (Parser determinístico XML nativo DOCX/PDF/PPTX + código/SQL/GitHub/Deploy + IA Gemini estruturada por dimensão com fallback determinístico).
- **Deploy de BD:** Validação contextual por provedor (VM Oracle, InfinityFree, Supabase, Firebase) + CRUD separado (`INSERT`, `UPDATE`, `SELECT`, `DELETE`) contra o `.sql` + sondagem HTTP do deploy (reconhecendo `localhost`/host interno na VM Oracle e InfinityFree como banco online legítimo).
- **Rigor ABNT:** Todos os desvios ABNT impactam a rubrica `1.1 Monografia ABNT` e são listados item a item, sem trava paralela automática (só retém se `1.1` ficar `Insuficiente < 50%` ou decisão manual).
- **Roteamento:** `/` = Landing Page pública dos alunos; `/professor` = Área autenticada dos docentes.
- **Gestão de Pendências:** Controle simplificado por grupo (campo de texto + alternador `Pendências em Aberto` / `Pendências Cumpridas`) salvo em `psof3_sessoes_banca/{grupoId}`.
- **Visibilidade na Landing Page:** Bancas futuras exibem dados + status de entrega de arquivos; bancas realizadas sempre exibem médias, parciais P1–P4, notas individuais, status (`Nota Liberada` / `Nota Retida` / `Nova Apresentação`) e situação das pendências.

## Tasks
- [x] **Etapa 0:** Registrar plano (`auditoria-profunda-e-landingpage.md`), `documentation/promptHistory.md` (Sessão 25) e atualizar `directives/avaliador_bancas_tcc.md` → Verify: leitura dos 3 arquivos atualizados.
- [x] **Etapa 1:** Expandir modelos Pydantic em `backend/app/models.py` mantendo compatibilidade com `backend/data/avaliacoes.json` → Verify: importação e parsing do JSON atual em Python sem erro.
- [x] **Etapa 2:** Implementar `backend/app/auditoria_profunda.py` e integrar em `backend/app/tcc_auditor.py` (ABNT via XML nativo + PDF, capítulos 14/14 com evidências e faltantes, slides com fallback PDF e objetividade, CRUD C/R/U/D + DER↔SQL + contexto VM Oracle/InfinityFree, GitHub tree + fallback 403/ls-remote + comparação Deploy↔GitHub, enriquecimento Gemini estruturado) → Verify: reauditar os 6 grupos entregues e conferir diagnósticos reais.
- [x] **Etapa 3:** Atualizar `frontend/src/types.ts`, `frontend/src/services/bancaMultiAvaliador.ts`, `frontend/src/components/PainelBancaConsolidada.tsx` e `frontend/src/App.tsx` com novos painéis de auditoria e controle de pendências → Verify: `tsc --noEmit` / `npm run build` sem erros.
- [x] **Etapa 4:** Criar `frontend/src/components/StudentLandingPage.tsx`, atualizar `frontend/src/components/AuthModal.tsx` e implementar roteamento `/` vs `/professor` em `frontend/src/App.tsx` → Verify: `npm run lint` e `npm run build` sem erros.
- [x] **Etapa 5:** Expandir `backend/tests/test_backend.py`, executar suíte `pytest` + lint/build frontend, atualizar `Phase X` neste arquivo, realizar commit/push no GitHub e deploy na VM Oracle (`147.15.2.73`) validando via HTTPS → Verify: pytest 100% pass, build pass e `curl` 200 OK em `/`, `/professor`, `/api/health` e `/api/bancas`.

## Done When
- [x] Todos os 6 grupos entregues reauditados com precisão verificada nos logs e JSON.
- [x] Testes automatizados (`pytest`), `oxlint` e `vite build` aprovados após a última edição.
- [x] Código publicado nos dois repositórios GitHub e em produção na VM Oracle (`https://bancas.147.15.2.73.sslip.io`).

## ✅ PHASE X COMPLETE
- **Frontend:** `npm --prefix frontend run lint` (0 errors), `npx tsc --noEmit` (0 errors) e `npm --prefix frontend run build` aprovados.
- **Backend:** Reauditoria completa dos 6 grupos entregues gravada em `backend/data/avaliacoes.json` + suíte `python -m pytest backend/tests/test_backend.py -v` aprovada (7/7 testes PASS).

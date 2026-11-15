# 🎓 Central de Agentes Inteligentes SENAI Ourinhos — Avaliador de Bancas TCC (PSOF3)

<div align="center">

![Google Antigravity](https://img.shields.io/badge/Google_Antigravity-AI_Orchestrator-C8102E?style=for-the-badge&logo=google&logoColor=white)
![React](https://img.shields.io/badge/React_19-Vite_6-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.14-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Caddy](https://img.shields.io/badge/Caddy-Auto_HTTPS-22B573?style=for-the-badge&logo=caddy&logoColor=white)
![SENAI Ourinhos](https://img.shields.io/badge/SENAI_Ourinhos-MSEP_PSOF3-B91C1C?style=for-the-badge)

**Agente Auditor Híbrido (Pré-Banca + Banca ao Vivo com 2 Professores Simultâneos) para Projetos de Software Final 3 (PSOF3 — Técnico em Desenvolvimento de Sistemas — SENAI Ourinhos)**  
*Hybrid AI Auditor Agent (Pre-Defense + Live Defense with 2 Simultaneous Evaluators) for Final Software Projects 3 (PSOF3 — Systems Development — SENAI Ourinhos)*

🌐 **Acesse Online em Produção:** [https://bancas.147.15.2.73.sslip.io](https://bancas.147.15.2.73.sslip.io)  

[🇧🇷 Português](#-português-brasil) • [🇺🇸 English](#-english-version)

</div>

---

## 🇧🇷 Português Brasil

### 🚀 Visão Geral e Destaque Tecnológico com Google Antigravity

Este projeto foi concebido e desenvolvido com o **Google Antigravity** operando sob a **Arquitetura de 3 Camadas** (`/directives`, `/backend` + `/frontend`, `/execution`), com identidade visual inspirada na **Central de Agentes Inteligentes SENAI Ourinhos** (`antigravity.agenteSenai` — capa executiva Hub, relógio em tempo real, console de terminal ao vivo, barra de progresso e tela institucional com os *Milkfed Devs && Reqs Lords*).

O **Agente Avaliador de Bancas TCC (PSOF3)** varre automaticamente a pasta `./tcc` (turmas `I2DEV-A` e `I2DEV-B`, cobrindo o cronograma oficial de **25 bancas** e inspecionando dinamicamente novos grupos conforme forem entregues) e audita cada pacote de entrega contra os **4 documentos normativos oficiais** em `./tcc/regras/`:

1. 📅 `agendamentos_tcc_senai_geral.pdf` — Cronograma oficial das 25 bancas (`I2DEV-A`: 13 bancas; `I2DEV-B`: 12 bancas).
2. 📋 `PSOF3_Formulario_Rubricas_MSEP_Banca.pdf` — Ficha Oficial de Avaliação por Rubricas MSEP (**4 Pilares = 100%**, **18 subcritérios** em níveis *Insuficiente*, *Pleno* e *Avançado*).
3. 📦 `PSOF3_Relacao_Entregaveis_e_Criterios.pdf` — Auditoria de Monografia ABNT (`.docx`/`.pdf`), Banco de Dados (`.sql` com DDL, PK/FK e **mínimo de 20 registros `INSERT` por tabela**), Código-Fonte (`.zip`), Slides (`.pptx`/`.pdf`) e `links.txt` (GitHub API + Deploy HTTP).
4. 🎤 `PSOF3_Roteiro_Apresentacao_Banca_TCC.pdf` — Estrutura de apresentação de 25–30 min em 7 etapas e validação rigorosa da nomenclatura digital `CTDS-2026-02-[Tipo]-[Nome do projeto]-[Primeiro nome dos integrantes]`.

---

### 🤖 Agentes de IA e Skill Packs Utilizados

* **`/agente-orquestrador`** (`agente-orquestrador`): Coordenação central na Camada 2 da Arquitetura de 3 Camadas (`/directives` -> Orquestração -> `/execution`), autoverificação determinística e manutenção de `/documentation/promptHistory.md`.
* **`/grill-me`**: Entrevista estruturada de alinhamento arquitetural para definição do motor híbrido, escopo dos 4 pilares MSEP, formatos de exportação e auditoria online.
* **`/goal`**: Execução autônoma ponta a ponta com testes automatizados (`pytest`), compilação de produção (`vite build`) e geração real dos dossiês e fichas oficiais em PDF/XLSX.
* **`firebase-firestore`**: Persistência em nuvem via Cloud Firestore REST v1 (`psof3_avaliacoes_tcc`) combinada com cache local resiliente (`backend/data/avaliacoes.json`).

---

### 📁 Estrutura de Pastas do Projeto

```text
antigravity.PSOF3BancasTCC/
├── .agents/                  # Kit Antigravity (Agentes, Skills e Workflows)
├── directives/               # Camada 1: Diretivas e SOPs em Markdown
│   ├── avaliador_bancas_tcc.md
│   └── empacotamento_instalador.md
├── backend/                  # Camada 2/3: API FastAPI, Motor de Auditoria e Relatórios
│   ├── app/
│   │   ├── main.py           # Endpoints REST (/api/bancas, /api/regras, /api/exportar)
│   │   ├── regras_msep.py    # Catálogo das 25 bancas e 18 rubricas MSEP (100 pts)
│   │   ├── tcc_auditor.py    # Auditor determinístico (.docx, .pdf, .sql, .zip, .pptx, GitHub, Deploy)
│   │   ├── report_generator.py # Gerador Playwright PDF (Ficha MSEP + Dossiê) e Excel (.xlsx)
│   │   ├── firebase_service.py # Sincronização Cloud Firestore + fallback local
│   │   ├── config_manager.py # Gestão de .env, state.json e avaliacoes.json
│   │   └── models.py         # Schemas Pydantic
│   ├── tests/
│   │   └── test_backend.py   # Suite de testes automatizados (pytest)
│   └── launcher_app.py       # Launcher Desktop unificado (--app=http://127.0.0.1:8766)
├── frontend/                 # Camada 2: Interface React 19 + TypeScript + Tailwind CSS + Vite
│   └── src/
│       ├── App.tsx           # Painel Principal (Matriz 25 Bancas, Dossiê, Ficha MSEP, Arguição, Consolidado)
│       └── components/
│           ├── AgentHub.tsx  # Capa Central de Agentes SENAI Ourinhos
│           └── AboutView.tsx # Sobre o Sistema, Autor e Milkfed Devs && Reqs Lords
├── execution/                # Camada 3: Scripts CLI Determinísticos
│   ├── auditar_bancas_cli.py # Auditoria em lote via terminal + geração de PDFs/XLSX
│   └── build_instalador.py   # Empacotador PyInstaller (.exe + instalador .bat)
├── documentation/            # Documentação Técnica e Histórico de Prompts
│   ├── plano_projeto.md      # Arquitetura e análise detalhada dos grupos entregues
│   └── promptHistory.md      # Histórico integral dos prompts da sessão
├── downloads_relatorios/     # Relatórios PDF (Ficha MSEP, Dossiê), Markdown e Excel gerados
├── tcc/                      # Pasta monitorada com as turmas I2DEV-A, I2DEV-B e ./tcc/regras
└── README.md                 # Documentação Bilíngue (PT-BR / EN)
```

---

### ⚡ Como Acessar e Executar

#### 1. Acesso Direto em Produção (Recomendado para o dia da Banca)
O sistema está publicado e ativo em nuvem na VM Oracle com HTTPS seguro e sincronização em tempo real:
- **URL da Aplicação:** [https://bancas.147.15.2.73.sslip.io](https://bancas.147.15.2.73.sslip.io)
- **Suporte Multi-Docente:** Cada professor abre o link em seu próprio notebook ou tablet, clica em **"Identificar Avaliador"** (Firebase Auth) e lança suas notas. As avaliações são sincronizadas instantaneamente e a média simples oficial da banca é calculada em tempo real.

#### 2. Modo Web / Desenvolvimento Local (`FastAPI` + `Vite`)
```powershell
# 1. Instalar dependências do Backend (caso necessário)
pip install -r backend/requirements.txt

# 2. Iniciar o servidor FastAPI (porta 8766)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8766 --reload

# 3. Em outro terminal (opcional para hot-reload do frontend):
cd frontend
npm install
npm run dev
```
> **Nota:** Como o bundle de produção `frontend/dist` já está compilado, basta iniciar o `uvicorn` ou o `launcher_app.py` e acessar `http://127.0.0.1:8766` diretamente!

#### 2. Modo Aplicativo Desktop (`launcher_app.py`)
```powershell
python backend/launcher_app.py
```

#### 3. Auditoria em Lote via CLI (Camada 3)
```powershell
python execution/auditar_bancas_cli.py --gerar-pdfs
```

---

## 🇺🇸 English Version

### 🚀 Overview & Google Antigravity Highlight

Built with **Google Antigravity** using the **3-Layer Architecture** (`/directives`, `/backend` + `/frontend`, `/execution`), **Central de Agentes Inteligentes SENAI Ourinhos — TCC Defense Evaluator (PSOF3)** is a full-stack Hybrid AI Auditor designed to inspect, grade, and generate official documentation for all **25 scheduled Final Software Project (TCC) defenses** across classes `I2DEV-A` and `I2DEV-B`.

### ✨ Key Capabilities

1. **Deep Deterministic & AI-Enriched Auditing (`tcc_auditor.py`):**
   - **File Naming Validator:** Verifies every submitted file against the mandatory `CTDS-2026-02-[Type]-[ProjectName]-[MembersFirstNames]` convention.
   - **ABNT Monograph Parser (`.docx` & `.pdf`):** Counts words, estimates pages, extracts sections, and counts Functional (`RF`) and Non-Functional (`RNF`) requirements.
   - **SQL Database Inspector (`.sql`):** Extracts `CREATE TABLE` schemas, checks PK/FK constraints, RLS/Triggers, and counts `INSERT INTO` rows per table against the mandatory **minimum of 20 records per table** rule (Rubric 2.3).
   - **Source Code Archive Inspector (`.zip`):** Detects frontend/backend stacks, flags forbidden bloat (`node_modules`, `.venv`, `.git`) or leaked `.env` secrets, and identifies key files for technical defense questions.
   - **Presentation Inspector (`.pptx` & `.pdf`):** Evaluates slide count and coverage of the 7 official presentation stages (25–30 min script).
   - **Live Cloud Verification (`links.txt`):** Queries the GitHub REST API (commit count, branches, contributors) and performs live HTTP checks on the deployed application URL.
2. **Interactive 4-Pillar MSEP Rubric Form (100 Points):**
   - Automatically suggests Pre-Defense scores for **Pillar 1 (30%)**, **Pillar 2 (40%)**, and **Item 3.3 (4%)**, while allowing evaluators during the live defense to adjust any rubric and score **Pillar 3 (Defense & Pitch — 20%)** and **Pillar 4 (Agile Management & Individual Participation — 10%)**, calculating individual grades per student (`Approved >= 60` / `Re-evaluate < 60`).
3. **4 Export & Persistence Channels:**
   - **Official 2-Page MSEP Evaluation Form PDF** (`Ficha_MSEP_*.pdf`) rendered via Playwright Chromium.
   - **Comprehensive Analytical Dossier** in both **PDF** (`Dossie_Auditoria_*.pdf`) and **Markdown** (`Dossie_Auditoria_*.md`).
   - **Consolidated Class Spreadsheet** in **Excel** (`Consolidado_Bancas_TCC_PSOF3_*.xlsx`) with tabs for General Schedule, Individual Student Grades, and Detailed 18-Criteria Rubric Matrix.
   - **Firebase Cloud Firestore** (`psof3_avaliacoes_tcc`) + local JSON persistence (`backend/data/avaliacoes.json`).

---

<div align="center">
  <sub>Desenvolvido com excelência utilizando <strong>Google Antigravity</strong> — <strong>SENAI Ourinhos Edition</strong> • Prof. Me. William Devidé Komel</sub>
</div>

# 📦 Diretiva Operacional (SOP) — Empacotamento e Distribuição Windows (`.exe`)

## 1. Objetivo
Compilar o **Agente Avaliador de Bancas TCC — PSOF3 (Central de Agentes SENAI)** em um executável nativo para Windows (`AvaliadorBancasTCC_SENAI.exe`) e gerador de instalador, com abertura em janela dedicada (`--app=URL`) maximizada e ícone institucional do SENAI.

## 2. Etapas Determinísticas (`execution/build_instalador.py`)
1. Compilar o frontend React + TypeScript + Vite (`npm run build` dentro de `/frontend`).
2. Empacotar o backend FastAPI + launcher desktop (`backend/launcher_app.py`) via PyInstaller (`--noconsole`) ou gerar o lançador desktop pronto para uso na banca examinadora.
3. Preservar a leitura dinâmica da pasta `./tcc` e do arquivo `.env` na raiz do projeto.

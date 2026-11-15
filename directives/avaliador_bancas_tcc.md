# 📋 Diretiva Operacional (SOP) — Agente Avaliador de Bancas TCC (PSOF3)

**Unidade:** Escola e Faculdade de Tecnologia SENAI Ourinhos (Unidade 7.94)  
**Curso:** Técnico em Desenvolvimento de Sistemas  
**Disciplina:** Módulo Específico II — Projetos de Software III (PSOF3)  
**Docente Responsável:** Prof. William Devidé Komel (`william.komel@docente.senai.br`)  
**Arquitetura:** 3 Camadas (`/directives` → Orquestração IA → `/execution` & `/backend`)

---

## 1. Objetivo Estratégico (O Quê e Por Quê)
Automatizar a auditoria técnica, documental e estrutural dos Trabalhos de Conclusão de Curso (TCC) entregues pelas turmas **I2DEV-A** (13 bancas) e **I2DEV-B** (12 bancas) na pasta `./tcc/`, confrontando cada entrega com os documentos normativos oficiais presentes em `./tcc/regras/` e os PDFs de acompanhamento contínuo em `./tcc/`:
1. `agendamentos_tcc_senai_geral.pdf` — Cronograma Oficial das 25 Bancas Examinadoras (ordenadas por Turma [I2DEV-A e I2DEV-B], Data cronológica e Horário de apresentação).
2. `PSOF3_Formulario_Rubricas_MSEP_Banca.pdf` — Ficha Oficial de Avaliação (Rubricas MSEP — 4 Pilares, 100%).
3. `PSOF3_Relacao_Entregaveis_e_Criterios.pdf` — Ponderação detalhada dos entregáveis obrigatórios.
4. `PSOF3_Roteiro_Apresentacao_Banca_TCC.pdf` — Roteiro de apresentação (25-30 min) e padronização de nomenclatura digital (`CTDS-2026-02-...`).
5. `i2dev-a-entregas-participação.pdf` e `i2dev-b-entregas-participação.pdf` — Planilhas oficiais de pontuação individual da Parte 4 (`4.1 Relatórios Semanais de Sprint` [8,0 pts] e `4.2 Participação nas Aulas` [7,0 pts]).

---

## 2. Entradas Esperadas
- **Diretório Raiz de Entregas:** `./tcc/I2DEV-A/` e `./tcc/I2DEV-B/`.
- **Subpastas por Grupo:** Ex.: `Banca01-Grupo08-OrganizAI-(João Sergio, Leonardo, Ramon)`.
- **Anexos Obrigatórios e Nomenclatura Oficial (`CTDS-2026-02`):**
  1. **Monografia TCC (PDF e DOCX):** `CTDS-2026-02-TCC-[Nome do projeto]-[Primeiro nome dos integrantes].pdf` e `.docx`
  2. **Sistema / Código-Fonte (ZIP):** `CTDS-2026-02-Sistema-[Nome do projeto]-[Primeiro nome dos integrantes].zip`
  3. **Script de Banco de Dados (SQL):** `CTDS-2026-02-BD-[Nome do projeto]-[Primeiro nome dos integrantes].sql`
  4. **Apresentação de Slides (PDF e PPTX):** `CTDS-2026-02-Apresentação-[Nome do projeto]-[Primeiro nome dos integrantes].pdf` e `.pptx`
  5. **Arquivo de Links (`links.txt`):** Contendo link do repositório GitHub e link do Deploy Online ativo.

---

## 3. Matriz de Avaliação — Rubricas MSEP (4 Pilares = 100 pontos)

### Pilar 1: Documentação Técnica / TCC Escrito (Peso: 30,0%)
| Código | Critério / Item | Peso Máx | Insuficiente (0-49%) | Pleno (50-89%) | Avançado (90-100%) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **1.1** | Monografia ABNT | **8,00** | Incompleta / Erros ABNT | Estrutura ABNT correta | Redação e rigor impecáveis |
| **1.2** | Requisitos RF/RNF | **3,00** | Ausentes/Confusos | Mapeados e coerentes | Rastreabilidade total |
| **1.3** | Modelagem de BD | **3,00** | Inexistente/Errado | Diagrama e dicionário ok | Normalização perfeita |
| **1.4** | Protótipo & Figma | **3,00** | Sem protótipo | Telas navegáveis ok | UI/UX profissional |
| **1.5** | Arquitetura & Stack | **3,00** | Não especificado | Diagrama e stack ok | Decisões justificadas |
| **1.6** | Plano de Negócio | **3,00** | Ausente | Precificação coerente | Modelo sustentável |
| **1.7** | Testes & Relatório | **3,00** | Sem testes | Casos de teste ok | Relatório completo |
| **1.8** | Backlog & Cronograma | **4,00** | Desorganizado | Backlog atualizado | Gestão ágil exemplar |

### Pilar 2: Sistema e Aplicação Desenvolvida (Peso: 40,0%)
| Código | Critério / Item | Peso Máx | Insuficiente (0-49%) | Pleno (50-89%) | Avançado (90-100%) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **2.1** | Backend (APIs) | **10,00** | APIs com falhas | Rotas e regras operacionais | Código limpo e seguro |
| **2.2** | Frontend (UI/UX) | **10,00** | Layout quebrado | Responsivo e funcional | UX/UI excelente |
| **2.3** | Banco de Dados Físico | **10,00** | Sem dados / `localStorage` | Exclusivo em Nuvem e mín. 20 reg/tabela | Povoado e performático |
| **2.4** | Deploy Online | **5,00** | Localhost / `localStorage` | Deploy online ativo e 100% em nuvem | Deploy estável sem erros |
| **2.5** | GitHub & README | **5,00** | Desorganizado / Link ausente | README com instruções | Documentação impecável |

### Pilar 3: Apresentação e Defesa para a Banca (Peso: 15,0%)
| Código | Critério / Item | Peso Máx | Estado Inicial Pré-Banca | Critério de Avaliação |
| :--- | :--- | :---: | :--- | :--- |
| **3.1** | Arguição do Código (Individual) | **6,00** | **`Pendente` (Vazio / Chamativo)** | Preenchido ao vivo na tabela individual por integrante |
| **3.2** | Pitch do Grupo | **5,00** | **`Pendente` (Vazio / Chamativo)** | Preenchido ao vivo durante a apresentação da equipe |
| **3.3** | Material de Slides | **4,00** | Calculado automaticamente | Estrutura, design e aderência às 7 etapas do roteiro |

### Pilar 4: Participação e Acompanhamento Contínuo (Peso: 15,0% — Individual via PDFs Oficiais)
| Código | Critério / Item | Peso Máx | Fonte Oficial dos Dados |
| :--- | :--- | :---: | :--- |
| **4.1** | Relatórios de Sprint | **8,00** | Extraído de `tcc/i2dev-a-entregas-participação.pdf` e `tcc/i2dev-b-entregas-participação.pdf` (10 relatórios) |
| **4.2** | Participação em Aula | **7,00** | Extraído de `tcc/i2dev-a-entregas-participação.pdf` (15 aulas) e `tcc/i2dev-b-entregas-participação.pdf` (16 aulas) |

---

## 4. Delimitação das Rubricas 2.3 e 2.4, Sabatina Técnica e Regras Finais
1. **Delimitação da Rubrica 2.3 (Banco de Dados Físico — 10,0 pts):**
   - **Critérios de Avaliação:**
     1. Estrutura do arquivo `.sql` corresponde à modelagem / DER (DDL de tabelas, tipos de dados, chaves primárias e relacionamentos FK).
     2. A estrutura está sendo usada efetivamente pelo programa (leitura via `SELECT` e gravação via `INSERT`/`UPDATE`).
     3. O script possui registros em todas as tabelas (não é obrigatório atingir 20 registros por tabela, os 20 eram apenas uma sugestão/recomendação de boas práticas; ter registros em todas as tabelas povoadas já atende plenamente ao povoamento).
   - **Penalidade / Abatimento de 2.3:** Se existirem dados de negócio do tema do projeto sendo gravados fora do banco de dados (em `localStorage`, `sessionStorage` ou arquivos JSON locais como `storage/*.json`), **abate pontos diretamente da rubrica 2.3**, tornando-a Insuficiente. Preferências efêmeras de UI (tema claro/escuro, ocultar valores, preferências de tela) continuam permitidas localmente e não geram penalidade.
2. **Delimitação da Rubrica 2.4 (Deploy Online & Execução em Nuvem — 5,0 pts):**
   - **Critérios de Avaliação:**
     1. O deploy online do sistema foi realizado e está funcional (resposta HTTP 200).
     2. Existe banco de dados online ativo (Supabase, Firebase, Railway, etc.), e o sistema publicado aponta para ele.
   - **Penalidade / Abatimento de 2.4:** Se **não existir banco de dados online** ou **o sistema publicado não apontar para ele** (ou se o deploy estiver inacessível), **abate pontos diretamente da rubrica 2.4**. (Nota: persistência local de dados é penalizada no item 2.3, desacoplando perfeitamente os dois critérios).
3. **Sabatina Técnica (`3.1`) — Perguntas Simples e Diretas:**
   - Perguntas formuladas em linguagem acessível e direta (1 a 2 frases), focando no entendimento fundamental da tecnologia:
     1. *Arquitetura:* Por que escolheram essa stack e como o Frontend se comunica com o Backend/Banco de Dados?
     2. *Persistência:* Qual a diferença prática entre guardar informações no navegador (localStorage) e gravar de fato em um banco de dados na nuvem?
     3. *Segurança:* Como o sistema sabe quem é o usuário logado e como ele impede que um usuário acesse ou altere os dados de outro?
     4. *Deploy:* Qual a diferença prática entre rodar o sistema no computador (localhost) e publicá-lo em um servidor na nuvem (deploy)?
4. **Regras Finais de Aprovação e Liberação da Nota:**
   - **Média >= 50,0 pontos E nenhum item `Insuficiente`:** Status **`Aprovado`** (Nota Liberada).
   - **Média >= 50,0 pontos PORÉM com qualquer item `Insuficiente`:** A nota final é calculada normalmente, mas o aluno/grupo fica com **`Nota Retida (Pendências)`** até a entrega/regularização das pendências (nota: itens `3.1` e `3.2` em estado `Pendente` antes da banca ao vivo não acionam trava de `Insuficiente`).
   - **Média < 50,0 pontos:** Status **`Nova Chance (Data Futura)`** (nova apresentação agendada em data futura).

---

## 5. Avaliação Multi-Docente (2 Professores Simultâneos) e Hospedagem Oficial

1. **Banca Examinadora com 2 Professores Simultâneos:**
   - Cada professor acessa o sistema a partir de sua própria máquina (desktop, notebook ou tablet).
   - Identificação via **Firebase Authentication** com contas dedicadas de avaliador.
   - Cada professor lança suas notas individuais (rubricas MSEP, notas da arguição de cada integrante e seu parecer técnico).
   - As notas individuais são salvas no **Firebase Firestore** na coleção `psof3_avaliacoes_professores/{grupo_id}_{professor_uid}`.
2. **Cálculo da Média Simples Oficial da Banca:**
   - Com 1 professor lançado: exibe status *"🟡 Aguardando 2º Avaliador (1/2 concluído)"*, mostrando as notas parciais do primeiro professor.
   - Quando o 2º professor salva: o sistema calcula instantaneamente a **Média Simples Oficial** para cada rubrica coletiva, para cada aluno individualmente (Pilares 1, 2, 3 e 4) e consolida os dois pareceres técnicos na ata da banca.
   - Sincronização em tempo real via listener `onSnapshot` do Firestore, sem necessidade de atualizar a página.
3. **Ambiente de Produção (VM Oracle Cloud):**
   - **URL Oficial:** `https://bancas.147.15.2.73.sslip.io`
   - **Infraestrutura:** VM Oracle Ubuntu x86_64 (`147.15.2.73`) com servidor Caddy (Auto-HTTPS Let's Encrypt e compressão Gzip).
   - **Backend:** FastAPI gerenciado por serviço systemd (`psof3-bancas.service`) escutando em `127.0.0.1:8001`.
   - **Frontend:** SPA React + Vite com Tailwind CSS servida estaticamente em `/var/www/projects/bancas/frontend/dist`.

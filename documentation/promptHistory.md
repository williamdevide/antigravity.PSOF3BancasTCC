# 📜 Histórico de Prompts — antigravity.PSOF3BancasTCC

## Sessão 01 — 14/11/2026

### Prompt 1 (14/11/2026 - 16:07)
```text
/agente-orquestrador /grill-me /goal quero que atue como um engenheiro de ia senior e me ajude a elaborar um projeto  que visa ler a subpasta tcc (la dentro tem minhas 2 turmas e dentro de cada turmas a pasta de cada grupo a apresentar o tcc), por enquanto existem só os grupos que já realizaram a entrega, mas logo haverão outros.
a ideia é criar um agente que leia o conteudo entregue por cada grupo e de acordo com os documentos presentes na pasta regras me entregue uma analise detalhada. (leia todos os documentos da pasta regras e estabeleça o necessario).
o visual do nosso agente deve ser similar ao do projeto antigravity.agenteSenai
```

### Entrevista de Alinhamento (`/grill-me`) — Decisões do Usuário
1. **Motor de Inteligência da Análise:**
   - `(Recommended) Avaliação Híbrida: motor determinístico em Python (ABNT, .sql, estrutura do .zip, links/deploy, slides) + integração opcional com LLM (Gemini API) para análise qualitativa do texto e geração de perguntas de arguição`
2. **Escopo dos 4 Pilares da Ficha MSEP:**
   - `(Recommended) Completo (Pré-Banca + Ao Vivo): O Agente pré-calcula e sugere notas/níveis (Insuficiente, Pleno, Avançado) para os Pilares 1 e 2 e Slide 3.3, gera perguntas de arguição sob medida (por arquivo/integrante), e na interface permite ao avaliador ajustar qualquer nota e preencher os Pilares 3 e 4 durante/após a banca, consolidando a Nota Final Individual de cada aluno.`
3. **Formatos de Exportação e Persistência dos Relatórios:**
   - `Ficha Oficial MSEP Preenchida em PDF (idêntica ao layout SENAI de PSOF3_Formulario_Rubricas_MSEP_Banca.pdf, pronta para impressão/assinatura), quero a opção 1 e opção 2 (Relatório Analítico Detalhado em PDF e Markdown), mais a gravação direta no firebase configurado no .env e para finalizar tela consolidada por turma como na opção 4, com opção de exportação em xlsx`
4. **Profundidade da Auditoria Externa (GitHub API e Deploy Online):**
   - `(Recommended) Auditoria Completa Online + Local: além de analisar os arquivos da pasta (.zip, .sql, .pdf, .docx, .pptx), usar o GITHUB_TOKEN para buscar commits por autor/README/repositório na API do GitHub e testar a URL de Deploy (status HTTP, tempo de resposta e elementos da página)`
5. **Modo de Execução e Empacotamento:**
   - `(Recommended) Ambos: Rodar diretamente em modo Web/Dev (FastAPI + React Vite) e incluir também o launcher_app.py + script de build de executável caso queira abrir como App Desktop dedicado no dia da banca`


---

## Sessão 02 — 14/11/2026 (17:37)

### Prompt 2 (14/11/2026 - 17:37)
```text
/agente-orquestrador /grill-me /goal na tela de auditoria e bancas os filtros devem ser por turma (tire a informação terça e segunda dos botões de filtro), também posso filtrar pelo dia (campo data com calendário), na coluna da esquerda exibe os grupos pela orderm de apresentação, quero um botão para encolher a faixa da esquerda e ver a analise na faixa da direita maior.
para a parte 4 da avaliação, acabei de anexar na pasta tcc 2 pdf que contem quanto os alunos pontuaram na parte 4, analise e utilize esses dados. no parte do parecer técnicoo da auditoria quero uma melhor separação e divisão do resultado para facilitar a leitura.
na ficha msep & arguição, se eu mudo o nivel msep quero ter como voltar rapidamente aquele item ao valor analisado automaticamente (deixe os 3 botões que estão (Insu, Plen, Avan), mas coloque um antes deles que só aparece se eu mudar o valor original (Rest.) ao clicar nele restaura o valor calculado automatico.
no pilar 3 os itens 3.1 (que estão na tabela abaixo) e 3.2 devem aparecer vazios e chamativos quanto a necessidade de preenchimento.
o parecer técnico e observações precisa ser exibido com visual mais detalhado e adequado, talvez itens em uma lista e nunca cortados. 
as perguntas da sabatina técnica não devem ser tão focadas em código e sim focadas no entendimento da tecnologia.
por fim nos itens 2.3 e 2.4 deve-se verificar se o sistema esta rodando inteiramente a partir do deploy online e se a persistencia de dados esta sendo feita exclusivamente no banco de dados e onde ele esta publicado (persistencia no localstorage ou sessionstorage sem utilizar o banco inviabilização a finalização).
regras finais: se o grupo atingir nota 50 mas tiver qualquer item insuficiente, a nota final é calculada, mas o grupo fica com a liberação da nota presa até entrega das pendências. se não atingir 50 pontos o aluno terá uma nova chance de apresentação em data futura.
```

### Entrevista de Alinhamento (`/grill-me`) — Sessão 02
1. **Pontuação do Pilar 4 nos PDFs (`i2dev-a-entregas-participação.pdf` e `i2dev-b-entregas-participação.pdf`):**
   - `na ficha da msep o pilar 4 vale 15 pontos, 8 para relatorios e 7 para participação` (Pilar 1 = 30 pts, Pilar 2 = 40 pts, Pilar 3 = 15 pts [3.1 = 6,0 | 3.2 = 5,0 | 3.3 = 4,0], Pilar 4 = 15 pts [4.1 = 8,0 | 4.2 = 7,0 Individual]).
2. **Estado Inicial dos Itens 3.1 e 3.2 e Regra de Retenção de Nota:**
   - `(Recommended) Sim: 3.1 (6,0 pts) e 3.2 (5,0 pts) iniciam no estado 'Pendente' (0 pts, destacados em amarelo/laranja chamativo para preenchimento na banca), e a trava de 'Nota Retida por Pendência' (quando Nota >= 50) é acionada apenas quando algum critério está efetivamente classificado como 'Insuficiente'`


---

## Sessão 03 — 14/11/2026 (18:31)

### Prompt 3 (14/11/2026 - 18:31)
```text
/agente-orquestrador /grill-me /goal sobre a persistencia local de dados ela é permitida para itens de menor importancia como tema claro e escuro e coisas afins, contudo você deve analisar se o que tange o tema do projeto, se as tabelas que estão no script .sql estão presentes  no banco online e se o programa esta gravando nelas e consumindo delas corretamente.
```

### Entrevista de Alinhamento (`/grill-me`) — Sessão 03
1. **Rastreabilidade de Persistência por Tabela (`.sql` ↔ Banco Online ↔ Gravação/Consumo no Código) e Permissão de `localStorage` para UI:**
   - `(Recommended) Auditoria Completa por Tabela (SQL ↔ Banco Online ↔ Leitura/Gravação no Código): ignorar localStorage de UI/sessão (tema, ocultar valores, cache), verificar via API/código cada tabela do .sql (se existe online, se o código grava INSERT/UPDATE e consome SELECT dela) e reter a nota (2.3/2.4 Insuficiente) se tabelas do tema faltarem no banco online ou se o sistema ler/gravar dados de negócio apenas localmente (localStorage ou JSON local)`


---

## Sessão 04 — 14/11/2026 (21:38)

### Prompt 4 (14/11/2026 - 21:38)
```text
/agente-orquestrador /grill-me /goal exiba os projetos para banca em auditoria & bancas primeiro por ordem de turma, depois de data e por ultimo de horário
```

### Decisões e Implementações — Sessão 04
1. **Critério de Ordenação das Bancas:**
   - A lista de projetos na aba **Auditoria & Bancas**, no seletor da **Ficha MSEP & Arguição** e na **Tabela Consolidada de Turmas (XLSX/Web)** passa a ser ordenada rigorosamente por:
     1. **Turma:** Ordem alfabética da turma (`I2DEV-A` primeiro, depois `I2DEV-B`).
     2. **Data:** Ordem cronológica da banca (`17/11/2026` → `24/11/2026` → `01/12/2026` → `08/12/2026` para a turma A; `16/11/2026` → `23/11/2026` → `30/11/2026` → `07/12/2026` para a turma B).
     3. **Horário:** Ordem cronológica da apresentação no dia (`Primeiro Horário` → `Segundo Horário` → `Terceiro Horário` → `Quarto Horário`).
   - Mantida a identificação da ordem oficial de apresentação na turma (`#1º`, `#2º`, ..., `#13º` em `I2DEV-A` e `#1º`..`#12º` em `I2DEV-B`), eliminando qualquer intercalação entre as turmas e mantendo total consistência visual e lógica.

---

## Sessão 05 — 14/11/2026 (22:50)

### Prompt 5 (14/11/2026 - 22:50)
```text
na pagina auditoria & bancas logo no começo esta exibindo cards dos pilares 1, 2 e 3 , exiba tambem do pilar 4 e a média. depois disso os blocos devem ser simples e diretos, gostei dos cards com o endereço do deploy e do bd, faltou um card com o github. o primeiro grande cards deve ser o de parecer tecnico com seus sub-cards a sequencia com anexos esta otima.
na pagina de ficha msep e arguição precisamos esclarecer o limite dos itens 2.3 e 2.4, no 2.3 vemos se a estrutura do arquivo .sql corresponde ao DER e se esta sendo usada efetivamente pelo programa e se o script possui registros em todas as tabelas (não é obrigatorio os 20 registros, era uma sugestão), ainda no 2.3 vemos se esta sendo gravado algo que deveria estar no bd na local ou session storage. no 2.4 vemos se foi realizado o deploy do sistema e esta funcional e se existe o bd online e ativo. se existirem dados sendo gravados fora do bd (local, session ou json) deve abater pontos do 2.3, se não existir bd online ou o sistema não apontar para ele abate do 2.4.
no parecer técnico deixe um card em baixo do outro. O texto consolidado começa vazio e é onde preenchemos nossas considerações.
as arguições podem ficar onde estão, mas quero perguntas mais simples e diretas.
```

### Decisões e Implementações — Sessão 05
1. **Aba "Auditoria & Bancas":**
   - **Mini-Placar de 5 Cards:** Exibição responsiva dos 4 Pilares (P1 Doc 30%, P2 Sistema 40%, P3 Apresentação 15%, P4 Sprints/Aulas 15%) e a Média Geral Calculada (100%).
   - **Grid de 3 Cards Rápidos:** Cards diretos e objetivos para **Deploy Online (Item 2.4)**, **Banco de Dados em Nuvem (Item 2.3)** e **Repositório GitHub (Item 2.5)**, com links clicáveis, latência e status HTTP.
   - **Sequência dos Grandes Cards:**
     1. **1º Grande Card:** Parecer Técnico da Auditoria & Observações com sub-cards estruturados + pontos fortes e pontos de atenção.
     2. **2º Grande Card:** Anexos Obrigatórios & Padrão CTDS-2026-02 (tabela dos 7 arquivos da pasta).
     3. **3º Grande Card:** Rastreabilidade das Tabelas (.sql ↔ Banco Online ↔ Gravação & Consumo no Código).
     4. **4º Grande Card:** Notas Individuais da Parte 4 (Sprints semanais e frequência/participação em aula).

2. **Delimitação das Rubricas 2.3 e 2.4:**
   - **Item 2.3 (Banco de Dados Físico):**
     - Avalia estrutura do `.sql` alinhada ao DER, uso efetivo pelo código e presença de registros em todas as tabelas (20 registros era sugestão/boa prática, ter registros em todas atende plenamente).
     - **Penalidade específica de 2.3:** Se dados de negócio do tema forem gravados fora do banco (`localStorage`, `sessionStorage` ou `storage/*.json`), abate pontos diretamente de 2.3!
   - **Item 2.4 (Deploy Online & Execução em Nuvem):**
     - Avalia se o deploy online está ativo e funcional (HTTP 200) e se existe banco de dados online ativo apontado pela aplicação publicada.
     - **Penalidade específica de 2.4:** Se não existir BD online ativo ou se a aplicação publicada não apontar para ele, abate pontos diretamente de 2.4!

3. **Ficha MSEP & Parecer da Banca:**
   - Sub-cards do parecer técnico dispostos verticalmente (um embaixo do outro).
   - O campo consolidado de parecer inicia vazio (`""`) para registro ao vivo das considerações da banca, com opção de carregar a síntese da auditoria com 1 clique se desejado.

4. **Arguições da Sabatina Técnica (Item 3.1):**
   - Perguntas reformuladas para enunciados simples, diretos e objetivos, testando o entendimento conceitual das tecnologias adotadas (Frontend/Backend, Banco Nuvem vs LocalStorage, Autenticação/Segurança e Deploy em Produção).

---

## Sessão 06 — 14/11/2026 (23:41)

### Prompt 6 (14/11/2026 - 23:41)
```text
/agente-orquestrador /grill-me /goal perfeito, cheguei na avaliação que queriamos, agora importante, a banca será realizada por dois professores, preciso rodar esse sistema em duas maquinas, dai cada professor deve lançar suas notas e texto consolidado, isso fica salvo no nosso firebase e então se calcula a média simples entre os 2 professores. acredito que melhor do que rodarmos localmente seja publicar esse projeto no github e de lá mandamos para o vercel.
```

### Entrevista de Alinhamento (`/grill-me`) — Sessão 06
1. **Identificação e Autenticação dos Professores:**
   - Adotado **Firebase Authentication** com modal de Login/Cadastro em e-mail e senha, além de botões de atalho rápido para os docentes da banca.
2. **Persistência Multi-Docente no Firebase Firestore:**
   - Coleção `psof3_avaliacoes_professores` com documentos no padrão `{grupo_id}_{professor_uid}`.
   - Sincronização em tempo real via listener `onSnapshot`: alterações feitas por um professor em sua máquina refletem instantaneamente na tela do segundo professor sem necessidade de refresh manual.
3. **Cálculo da Média Simples Oficial da Banca:**
   - **Com 1 professor:** status *"🟡 Aguardando 2º Avaliador (1/2 concluído)"*, exibindo as notas parciais do professor que já salvou.
   - **Com 2 professores:** status *"✅ BANCA CONCLUÍDA — Média Simples Oficial dos 2 Professores"*, calculando automaticamente a média simples dos 4 Pilares, de todas as rubricas MSEP, das arguições individuais de cada integrante e exibindo ambos os pareceres técnicos na ata.
4. **Infraestrutura e Deploy em Nuvem:**
   - Publicado com sucesso na **VM Oracle Cloud (Ubuntu x86_64 / IP 147.15.2.73)** no subdomínio oficial com certificado SSL automático:
     - **URL Oficial:** `https://bancas.147.15.2.73.sslip.io`
     - **Servidor Web:** Caddy Server com compressão Gzip e Auto-HTTPS Let's Encrypt.
     - **Backend FastAPI:** Serviço gerenciado por systemd (`psof3-bancas.service`) na porta `8001`, com reinício automático e isolamento em virtualenv.
     - **Frontend SPA:** Compilado via Vite e servido estaticamente pelo Caddy com fallback de rotas SPA.
     - **Testes:** 4/4 testes unitários e de integração aprovados com pytest; build do frontend 100% livre de warnings impeditivos.

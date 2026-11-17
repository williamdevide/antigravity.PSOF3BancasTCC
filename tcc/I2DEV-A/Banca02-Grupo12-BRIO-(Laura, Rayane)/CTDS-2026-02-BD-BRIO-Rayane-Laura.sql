-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 10/11/2026 às 14:41
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `brio`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `assinaturas`
--

CREATE TABLE `assinaturas` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `plano_id` int(11) NOT NULL,
  `inicio` date NOT NULL,
  `fim` date DEFAULT NULL,
  `status` enum('ativa','cancelada','expirada') NOT NULL DEFAULT 'ativa',
  `criado_em` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `assinaturas`
--

INSERT INTO `assinaturas` (`id`, `usuario_id`, `plano_id`, `inicio`, `fim`, `status`, `criado_em`) VALUES
(1, 8, 2, '2026-10-20', '2027-04-20', 'cancelada', '2026-10-20 16:49:38'),
(2, 8, 2, '2026-10-20', '2027-04-20', 'cancelada', '2026-10-20 16:52:03'),
(3, 8, 2, '2026-10-20', '2027-04-20', 'cancelada', '2026-10-20 16:54:27'),
(4, 8, 1, '2026-10-20', '2026-11-20', 'cancelada', '2026-10-20 16:55:28'),
(5, 8, 1, '2026-10-20', '2026-11-20', 'cancelada', '2026-10-20 16:55:31'),
(6, 8, 3, '2026-10-20', '2027-10-20', 'cancelada', '2026-10-20 17:01:25'),
(7, 8, 2, '2026-10-20', '2027-04-20', 'cancelada', '2026-10-20 17:01:36'),
(8, 8, 2, '2026-10-20', '2027-04-20', 'cancelada', '2026-10-20 17:05:04'),
(9, 8, 1, '2026-10-20', '2026-11-20', 'ativa', '2026-10-20 17:06:39'),
(10, 13, 4, '2026-11-03', '2026-12-03', 'ativa', '2026-11-03 10:00:34'),
(11, 14, 4, '2026-11-03', '2026-12-03', 'ativa', '2026-11-03 10:01:14'),
(12, 15, 1, '2026-11-03', '2026-12-03', 'ativa', '2026-11-03 10:21:59'),
(13, 16, 1, '2026-11-03', '2026-12-03', 'ativa', '2026-11-03 10:24:04'),
(14, 17, 4, '2026-11-03', '2026-12-03', 'ativa', '2026-11-03 10:26:43'),
(15, 18, 2, '2026-11-03', '2027-05-03', 'ativa', '2026-11-03 10:50:37'),
(16, 19, 3, '2026-11-03', '2027-11-03', 'ativa', '2026-11-03 16:14:20'),
(17, 26, 4, '2026-11-09', '2026-12-09', 'ativa', '2026-11-09 08:57:01'),
(18, 27, 2, '2026-11-09', '2027-05-09', 'ativa', '2026-11-09 09:24:20'),
(19, 28, 4, '2026-11-09', '2026-12-09', 'ativa', '2026-11-09 09:42:26'),
(20, 30, 4, '2026-11-09', '2026-12-09', 'ativa', '2026-11-09 14:56:30'),
(21, 33, 4, '2026-11-10', '2026-12-10', 'cancelada', '2026-11-10 09:22:15'),
(22, 33, 1, '2026-11-10', '2026-12-10', 'ativa', '2026-11-10 09:26:29'),
(23, 34, 4, '2026-11-10', '2026-12-10', 'cancelada', '2026-11-10 09:27:15'),
(24, 34, 2, '2026-11-10', '2027-05-10', 'ativa', '2026-11-10 09:27:46'),
(25, 35, 4, '2026-11-10', '2026-12-10', 'ativa', '2026-11-10 09:50:27'),
(26, 37, 4, '2026-11-10', '2026-12-10', 'cancelada', '2026-11-10 10:07:22'),
(27, 37, 2, '2026-11-10', '2027-05-10', 'ativa', '2026-11-10 10:08:21'),
(28, 38, 3, '2026-11-10', '2027-11-10', 'ativa', '2026-11-10 10:11:10'),
(29, 39, 4, '2026-11-10', '2026-12-10', 'cancelada', '2026-11-10 10:22:25'),
(30, 39, 3, '2026-11-10', '2027-11-10', 'ativa', '2026-11-10 10:22:54');

-- --------------------------------------------------------

--
-- Estrutura para tabela `conquistas`
--

CREATE TABLE `conquistas` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `xp` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `conquistas`
--

INSERT INTO `conquistas` (`id`, `nome`, `descricao`, `xp`) VALUES
(6, 'Primeiro passo', 'Concluiu seu primeiro conteúdo.', 20),
(7, 'Primeiro simulado', 'Finalizou seu primeiro simulado.', 30),
(8, 'Primeira redação', 'Enviou sua primeira redação.', 25),
(9, 'Uma semana', 'Estudou por 7 dias seguidos.', 50),
(10, '500 XP', 'Alcançou 500 pontos de XP.', 100),
(11, 'Foco total', 'Concluiu 10 atividades.', 75),
(12, '1000 XP', 'Alcançou 1000 pontos de XP.', 150),
(13, 'Mestre BRIO', 'Completou todos os principais desafios da plataforma.', 300),
(14, 'Próximo nível', 'Alcance o nível 2.', 50);

-- --------------------------------------------------------

--
-- Estrutura para tabela `conteudos`
--

CREATE TABLE `conteudos` (
  `id` int(11) NOT NULL,
  `materia_id` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `texto` longtext NOT NULL,
  `nivel` enum('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
  `criado_em` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `conteudos`
--

INSERT INTO `conteudos` (`id`, `materia_id`, `titulo`, `descricao`, `texto`, `nivel`, `criado_em`) VALUES
(1, 1, 'Interpretação de texto', 'Estratégias para compreender textos.', 'Leia o texto buscando tema, ideia principal, argumentos e relação entre as informações. Identifique palavras-chave e observe o contexto antes de escolher uma alternativa.', 'iniciante', '2026-09-15 16:04:24'),
(2, 2, 'Funções do 1º grau', 'Conceitos básicos de funções lineares.', 'Uma função do primeiro grau pode ser representada por f(x) = ax + b, com a diferente de zero. O coeficiente a indica a inclinação e b indica o ponto em que a reta cruza o eixo y.', 'intermediario', '2026-09-15 16:04:24'),
(3, 3, 'Brasil República', 'Panorama introdutório do período republicano.', 'A República brasileira passou por diferentes fases políticas e sociais. Para estudar o período, organize os acontecimentos em uma linha do tempo e relacione causas e consequências.', 'intermediario', '2026-09-15 16:04:24'),
(4, 4, 'Globalização', 'Conceitos e impactos da globalização.', 'Globalização é um processo de intensificação das relações econômicas, culturais e tecnológicas entre diferentes partes do mundo.', 'iniciante', '2026-09-15 16:04:24'),
(5, 9, 'Interpretação de Texto em Inglês', 'Estratégias para compreender textos em língua inglesa.', 'Pratique a identificação de ideias principais, informações explícitas, contexto e vocabulário.', 'iniciante', '2026-09-29 08:45:16'),
(6, 9, 'Gramática Inglesa', 'Principais estruturas gramaticais da língua inglesa.', 'Estude tempos verbais, pronomes, preposições, conectivos e formação de frases.', 'intermediario', '2026-09-29 08:45:16'),
(7, 9, 'Interpretação de Texto em Espanhol', 'Estratégias para compreender textos em língua espanhola.', 'Pratique interpretação, identificação de informações e compreensão de vocabulário em espanhol.', 'iniciante', '2026-09-29 08:45:16'),
(8, 9, 'Gramática Espanhola', 'Principais estruturas gramaticais da língua espanhola.', 'Estude verbos, pronomes, artigos, preposições e conectivos da língua espanhola.', 'intermediario', '2026-09-29 08:45:16'),
(9, 10, 'Filosofia Antiga', 'Introdução aos principais filósofos da Antiguidade.', 'Estude Sócrates, Platão e Aristóteles e suas principais ideias filosóficas.', 'iniciante', '2026-09-29 08:45:16'),
(10, 10, 'Filosofia Medieval', 'Principais conceitos da filosofia medieval.', 'Estude a relação entre fé e razão e as ideias de Santo Agostinho e São Tomás de Aquino.', 'intermediario', '2026-09-29 08:45:16'),
(11, 10, 'Filosofia Moderna', 'Principais correntes do pensamento filosófico moderno.', 'Estude racionalismo, empirismo, Iluminismo e os principais pensadores modernos.', 'intermediario', '2026-09-29 08:45:16'),
(12, 10, 'Ética e Moral', 'Conceitos fundamentais relacionados à ética.', 'Estude diferentes concepções de ética, moral, liberdade, responsabilidade e justiça.', 'avancado', '2026-09-29 08:45:16'),
(13, 11, 'Introdução à Sociologia', 'Conceitos básicos para compreender a sociedade.', 'Estude sociedade, indivíduo, cultura, socialização e relações sociais.', 'iniciante', '2026-09-29 08:45:16'),
(14, 11, 'Cultura e Sociedade', 'A relação entre cultura e organização social.', 'Estude cultura, identidade, diversidade cultural, etnocentrismo e relativismo cultural.', 'iniciante', '2026-09-29 08:45:16'),
(15, 11, 'Desigualdade Social', 'Principais conceitos relacionados às desigualdades sociais.', 'Estude classes sociais, desigualdade econômica, pobreza, mobilidade social e estratificação.', 'intermediario', '2026-09-29 08:45:16'),
(16, 11, 'Política e Sociedade', 'Relações entre sociedade, poder e política.', 'Estude Estado, poder, cidadania, democracia, participação política e movimentos sociais.', 'avancado', '2026-09-29 08:45:16'),
(17, 5, 'Citologia', 'Estudo das células e suas principais estruturas.', 'A célula é a unidade básica dos seres vivos. Estude as diferenças entre células procariontes e eucariontes, além das funções das principais organelas, como núcleo, mitocôndrias, ribossomos e complexo de Golgi.', 'iniciante', '2026-09-29 08:52:09'),
(18, 5, 'Genética', 'Conceitos fundamentais de genética e hereditariedade.', 'Estude genes, cromossomos, DNA, RNA, alelos, genótipo, fenótipo e as leis de Mendel. Compreenda como as características podem ser transmitidas entre gerações.', 'intermediario', '2026-09-29 08:52:10'),
(19, 5, 'Ecologia', 'Relações entre os seres vivos e o ambiente.', 'Estude conceitos como população, comunidade, ecossistema, cadeia alimentar, teia alimentar, níveis tróficos e relações ecológicas.', 'intermediario', '2026-09-29 08:52:10'),
(20, 5, 'Evolução', 'Principais conceitos relacionados à evolução dos seres vivos.', 'Estude seleção natural, adaptação, mutação, variabilidade genética e as ideias de Charles Darwin e outros pesquisadores sobre a evolução.', 'avancado', '2026-09-29 08:52:10'),
(21, 7, 'Estrutura Atômica', 'Estudo da estrutura e das características dos átomos.', 'Estude prótons, nêutrons, elétrons, número atômico, número de massa, isótopos e os principais modelos atômicos.', 'iniciante', '2026-09-29 08:52:10'),
(22, 7, 'Tabela Periódica', 'Organização dos elementos químicos.', 'Aprenda como os elementos são organizados na tabela periódica e estude períodos, famílias, metais, ametais, gases nobres e propriedades periódicas.', 'iniciante', '2026-09-29 08:52:10'),
(23, 7, 'Ligações Químicas', 'Estudo das ligações entre átomos.', 'Estude ligações iônicas, covalentes e metálicas e compreenda como os átomos se combinam para formar diferentes substâncias.', 'intermediario', '2026-09-29 08:52:10'),
(24, 7, 'Reações Químicas', 'Principais tipos de reações químicas.', 'Estude reagentes, produtos, balanceamento de equações e os principais tipos de reações químicas, como síntese, decomposição, simples troca e dupla troca.', 'avancado', '2026-09-29 08:52:10'),
(25, 6, 'Cinemática', 'Estudo dos movimentos dos corpos.', 'Aprenda os conceitos de posição, deslocamento, velocidade e aceleração. Estude movimento uniforme e movimento uniformemente variado.', 'iniciante', '2026-09-29 08:52:10'),
(26, 6, 'Leis de Newton', 'Princípios fundamentais da mecânica.', 'Estude as três leis de Newton e compreenda conceitos como força, massa, aceleração, inércia e ação e reação.', 'intermediario', '2026-09-29 08:52:10'),
(27, 6, 'Energia e Trabalho', 'Conceitos de trabalho, energia e potência.', 'Estude trabalho realizado por uma força, energia cinética, energia potencial, energia mecânica e conservação da energia.', 'intermediario', '2026-09-29 08:52:10'),
(28, 6, 'Eletricidade', 'Conceitos básicos de eletricidade e circuitos.', 'Estude corrente elétrica, tensão, resistência, Lei de Ohm e circuitos elétricos simples.', 'avancado', '2026-09-29 08:52:10'),
(29, 1, 'Interpretação de texto', 'Aprenda estratégias para compreender diferentes tipos de textos.', 'Interpretar um texto significa compreender as informações apresentadas e também perceber ideias que podem estar implícitas. Para isso, é importante identificar o tema, a ideia principal, os argumentos utilizados e a finalidade do texto.\r\n\r\nDurante a leitura, observe palavras-chave, conectivos e informações que se repetem. Também é importante considerar o contexto para entender corretamente determinadas palavras e expressões.\r\n\r\nUma boa estratégia é realizar uma primeira leitura para entender o assunto geral e depois uma segunda leitura procurando informações específicas.\r\n\r\nA interpretação de texto é muito importante em provas porque ajuda o aluno a compreender corretamente os enunciados e identificar o que realmente está sendo solicitado.', 'iniciante', '2026-09-29 09:57:35'),
(30, 1, 'Classes gramaticais', 'Conheça as principais classes de palavras da língua portuguesa.', 'As classes gramaticais organizam as palavras de acordo com sua função e características.\r\n\r\nEntre as principais classes estão substantivo, adjetivo, artigo, pronome, verbo, advérbio, preposição, conjunção e interjeição.\r\n\r\nO substantivo nomeia seres, objetos, lugares, sentimentos e conceitos. O adjetivo caracteriza o substantivo. O verbo indica ações, estados ou fenômenos.\r\n\r\nOs pronomes podem substituir ou acompanhar substantivos. Os advérbios modificam principalmente verbos, indicando circunstâncias como tempo, lugar e modo.\r\n\r\nConhecer as classes gramaticais facilita a compreensão da estrutura das frases e ajuda na produção de textos.', 'iniciante', '2026-09-29 09:57:35'),
(31, 1, 'Figuras de linguagem', 'Aprenda os principais recursos utilizados para dar efeitos de sentido aos textos.', 'Figuras de linguagem são recursos utilizados para tornar a comunicação mais expressiva.\r\n\r\nA metáfora estabelece uma comparação implícita entre elementos. A comparação também aproxima dois elementos, mas geralmente utiliza palavras como \"como\".\r\n\r\nA personificação atribui características humanas a seres que não são humanos. A hipérbole representa um exagero utilizado para reforçar uma ideia.\r\n\r\nA ironia acontece quando uma expressão apresenta um sentido diferente daquele que seria esperado literalmente.\r\n\r\nEsses recursos aparecem com frequência em textos literários, músicas, propagandas e textos do cotidiano.', 'intermediario', '2026-09-29 09:57:35'),
(32, 1, 'Literatura brasileira', 'Conheça características importantes da literatura produzida no Brasil.', 'A literatura brasileira apresenta diferentes períodos, estilos e autores.\r\n\r\nEntre os principais movimentos estão Quinhentismo, Barroco, Arcadismo, Romantismo, Realismo, Naturalismo, Parnasianismo, Simbolismo e Modernismo.\r\n\r\nCada período possui características próprias relacionadas ao contexto histórico e social em que surgiu.\r\n\r\nO Modernismo, por exemplo, buscou romper com modelos tradicionais e valorizar uma linguagem mais próxima da realidade brasileira.\r\n\r\nPara estudar literatura, é importante relacionar autores, obras, características literárias e contexto histórico.', 'intermediario', '2026-09-29 09:57:35'),
(33, 1, 'Produção textual', 'Aprenda como organizar uma redação de forma clara e coerente.', 'Uma boa produção textual precisa apresentar organização, clareza e coerência.\r\n\r\nEm uma redação dissertativo-argumentativa, normalmente é importante apresentar uma introdução com a ideia principal, desenvolver argumentos nos parágrafos seguintes e finalizar com uma conclusão.\r\n\r\nOs argumentos devem estar relacionados ao tema e precisam ser explicados de maneira clara.\r\n\r\nTambém é importante utilizar conectivos para estabelecer relações entre as ideias e revisar o texto antes de finalizá-lo.\r\n\r\nUma boa redação apresenta progressão de ideias e mantém relação com o tema proposto.', 'intermediario', '2026-09-29 09:57:35'),
(34, 9, 'Present Simple', 'Aprenda a utilizar o presente simples em inglês.', 'O Present Simple é utilizado principalmente para falar sobre hábitos, rotinas, fatos e situações que acontecem com frequência.\r\n\r\nExemplos incluem frases como \"I study every day\" e \"She works at school\".\r\n\r\nCom os pronomes he, she e it, normalmente acrescentamos \"s\" ao verbo na forma afirmativa.\r\n\r\nPara formar perguntas e frases negativas, utilizamos principalmente os auxiliares do e does.\r\n\r\nÉ importante observar o sujeito da frase para utilizar corretamente o verbo e o auxiliar.', 'iniciante', '2026-09-29 09:57:35'),
(35, 9, 'Past Simple', 'Aprenda como falar sobre acontecimentos passados em inglês.', 'O Past Simple é utilizado para falar sobre acontecimentos que ocorreram e terminaram no passado.\r\n\r\nNos verbos regulares, geralmente acrescentamos \"ed\", como em \"worked\" e \"played\".\r\n\r\nJá os verbos irregulares possuem formas próprias, como \"go\" que se transforma em \"went\".\r\n\r\nPara perguntas e negativas, o auxiliar \"did\" é utilizado.\r\n\r\nPalavras como yesterday, last week e last year ajudam a indicar que a situação aconteceu no passado.', 'iniciante', '2026-09-29 09:57:35'),
(36, 9, 'Vocabulário do cotidiano', 'Aprenda palavras e expressões utilizadas em situações comuns.', 'O vocabulário cotidiano envolve palavras utilizadas em situações como apresentações, compras, escola, trabalho, alimentação e transporte.\r\n\r\nAlgumas expressões são importantes para iniciar uma conversa, pedir informações, agradecer e responder perguntas.\r\n\r\nA melhor forma de ampliar o vocabulário é aprender palavras dentro de frases e situações reais.\r\n\r\nTambém é útil revisar as palavras com frequência e tentar utilizá-las em pequenos textos ou conversas.', 'iniciante', '2026-09-29 09:57:35'),
(37, 9, 'Future com will', 'Aprenda como falar sobre situações futuras utilizando will.', 'O auxiliar will pode ser utilizado para falar sobre acontecimentos futuros, previsões, decisões tomadas no momento da fala e promessas.\r\n\r\nA estrutura básica é sujeito + will + verbo principal.\r\n\r\nPor exemplo, podemos dizer \"I will study tomorrow\".\r\n\r\nA forma negativa utiliza will not, geralmente contraída como won\'t.\r\n\r\nNas perguntas, will aparece antes do sujeito, como em \"Will you study tomorrow?\".', 'intermediario', '2026-09-29 09:57:35'),
(38, 9, 'Reading e compreensão', 'Aprenda estratégias para compreender textos em inglês.', 'A leitura em inglês pode ser facilitada quando o aluno identifica palavras-chave e utiliza o contexto para compreender palavras desconhecidas.\r\n\r\nNão é necessário traduzir todas as palavras para entender um texto.\r\n\r\nPrimeiro, procure compreender o assunto geral. Depois, identifique informações específicas solicitadas pela questão.\r\n\r\nTambém é importante observar títulos, imagens, conectivos e palavras que aparecem várias vezes.\r\n\r\nCom prática, a compreensão de textos se torna mais rápida e eficiente.', 'intermediario', '2026-09-29 09:57:35'),
(39, 2, 'Função do primeiro grau', 'Aprenda os conceitos básicos das funções lineares.', 'Uma função do primeiro grau pode ser representada pela expressão f(x) = ax + b, em que a é diferente de zero.\r\n\r\nO coeficiente a determina a inclinação da reta no gráfico. O coeficiente b indica o ponto em que a reta cruza o eixo vertical.\r\n\r\nO gráfico de uma função do primeiro grau é uma reta.\r\n\r\nPara encontrar o valor da função, basta substituir o valor de x na expressão e realizar os cálculos necessários.', 'intermediario', '2026-09-29 09:57:35'),
(40, 2, 'Equações do primeiro grau', 'Aprenda a resolver equações simples com uma incógnita.', 'Uma equação do primeiro grau possui uma incógnita com expoente igual a 1.\r\n\r\nPara resolver uma equação, devemos realizar operações para deixar a incógnita isolada em um dos lados da igualdade.\r\n\r\nÉ importante realizar a mesma operação nos dois lados da equação para manter a igualdade.\r\n\r\nDepois de encontrar o valor da incógnita, podemos substituí-lo na equação original para verificar se o resultado está correto.', 'iniciante', '2026-09-29 09:57:35'),
(41, 2, 'Porcentagem', 'Aprenda a calcular e interpretar porcentagens.', 'Porcentagem representa uma parte de um total dividido em cem partes.\r\n\r\nPor exemplo, 25% significa 25 partes de um total de 100.\r\n\r\nPara calcular uma porcentagem, podemos transformar o valor percentual em número decimal e multiplicar pelo valor total.\r\n\r\nPorcentagens aparecem em situações como descontos, aumentos, juros, pesquisas e estatísticas.', 'iniciante', '2026-09-29 09:57:35'),
(42, 2, 'Geometria plana', 'Conheça conceitos básicos sobre figuras geométricas.', 'A geometria plana estuda figuras que possuem duas dimensões.\r\n\r\nEntre as principais figuras estão triângulos, quadrados, retângulos, círculos e polígonos.\r\n\r\nO perímetro corresponde à soma dos lados de uma figura.\r\n\r\nA área representa a medida da superfície ocupada pela figura.\r\n\r\nCada figura possui fórmulas específicas para calcular sua área. No retângulo, por exemplo, a área é calculada multiplicando a base pela altura.', 'iniciante', '2026-09-29 09:57:35'),
(43, 2, 'Probabilidade', 'Aprenda os conceitos básicos de probabilidade.', 'Probabilidade é uma medida utilizada para representar a possibilidade de determinado evento acontecer.\r\n\r\nEm situações simples, podemos calcular a probabilidade dividindo o número de resultados favoráveis pelo número total de resultados possíveis.\r\n\r\nO resultado pode ser apresentado como fração, número decimal ou porcentagem.\r\n\r\nA probabilidade é utilizada em jogos, estatísticas, pesquisas e diversas situações do cotidiano.', 'intermediario', '2026-09-29 09:57:35'),
(44, 5, 'Evolução', 'Entenda como as espécies podem mudar ao longo das gerações.', 'A evolução biológica é o processo de mudança nas características das populações ao longo das gerações.\r\n\r\nCharles Darwin contribuiu para a compreensão da evolução ao desenvolver a ideia de seleção natural. Segundo esse conceito, indivíduos que apresentam características favoráveis em determinado ambiente podem ter maiores chances de sobreviver e deixar descendentes.\r\n\r\nA variabilidade genética é importante porque fornece diferenças entre os indivíduos de uma população.\r\n\r\nMutações e recombinação genética são fontes de variabilidade.\r\n\r\nA evolução acontece em populações ao longo das gerações e está relacionada às mudanças na frequência das características presentes nessas populações.', 'intermediario', '2026-09-29 09:57:35'),
(45, 5, 'Genética', 'Aprenda os conceitos básicos de hereditariedade.', 'A genética é a área da Biologia que estuda a hereditariedade e a variação das características dos seres vivos.\r\n\r\nOs genes são segmentos de DNA que participam da determinação de características.\r\n\r\nOs alelos são diferentes versões de um mesmo gene.\r\n\r\nGregor Mendel realizou experimentos com ervilhas e identificou padrões importantes de transmissão de características.\r\n\r\nOs conceitos de genótipo e fenótipo também são importantes. Genótipo representa a constituição genética, enquanto fenótipo corresponde às características observáveis resultantes da interação entre genética e ambiente.', 'intermediario', '2026-09-29 09:57:35'),
(46, 5, 'Citologia', 'Conheça as principais estruturas das células.', 'A célula é considerada a unidade básica dos seres vivos.\r\n\r\nAs células podem ser classificadas principalmente em procariontes e eucariontes.\r\n\r\nAs células eucariontes possuem núcleo delimitado por membrana, enquanto as procariontes não apresentam núcleo delimitado.\r\n\r\nEntre as estruturas celulares estão membrana plasmática, citoplasma e material genético.\r\n\r\nNas células eucariontes também existem organelas, como mitocôndrias, ribossomos, complexo de Golgi e retículo endoplasmático, cada uma desempenhando funções específicas.', 'iniciante', '2026-09-29 09:57:35'),
(47, 5, 'Ecologia', 'Entenda as relações entre os seres vivos e o ambiente.', 'A Ecologia estuda as relações dos seres vivos entre si e com o ambiente.\r\n\r\nAlguns conceitos importantes são população, comunidade, ecossistema, habitat e nicho ecológico.\r\n\r\nUma cadeia alimentar representa a transferência de matéria e energia entre organismos.\r\n\r\nOs produtores são organismos capazes de produzir matéria orgânica, enquanto consumidores obtêm alimento a partir de outros organismos.\r\n\r\nOs decompositores participam da decomposição da matéria orgânica e são importantes para a reciclagem de nutrientes.', 'iniciante', '2026-09-29 09:57:35'),
(48, 5, 'Sistema circulatório', 'Aprenda como funciona a circulação do sangue no organismo.', 'O sistema circulatório é responsável pelo transporte de substâncias pelo corpo.\r\n\r\nO coração funciona como uma bomba que impulsiona o sangue pelos vasos sanguíneos.\r\n\r\nAs artérias transportam o sangue para fora do coração, enquanto as veias conduzem o sangue em direção ao coração.\r\n\r\nOs capilares são vasos muito pequenos onde acontecem trocas de substâncias entre o sangue e os tecidos.\r\n\r\nA circulação permite o transporte de oxigênio, nutrientes, hormônios e outras substâncias.', 'iniciante', '2026-09-29 09:57:35'),
(49, 7, 'Átomos e elementos químicos', 'Entenda a estrutura básica da matéria.', 'A matéria é formada por átomos.\r\n\r\nUm átomo possui núcleo, formado por prótons e nêutrons, e uma região ao redor onde se encontram os elétrons.\r\n\r\nOs elementos químicos são identificados pelo número de prótons presentes no núcleo.\r\n\r\nA tabela periódica organiza os elementos químicos de acordo com suas propriedades e características.\r\n\r\nConhecer a estrutura atômica é importante para compreender as transformações químicas.', 'iniciante', '2026-09-29 09:57:35'),
(50, 7, 'Tabela periódica', 'Aprenda como os elementos químicos são organizados.', 'A tabela periódica organiza os elementos químicos em períodos e grupos.\r\n\r\nOs elementos localizados em uma mesma família apresentam características químicas semelhantes.\r\n\r\nA tabela também permite identificar informações como número atômico e símbolo químico.\r\n\r\nOs elementos podem ser classificados em metais, ametais, gases nobres e outras categorias.\r\n\r\nA organização da tabela ajuda a prever propriedades e comportamentos dos elementos.', 'iniciante', '2026-09-29 09:57:35'),
(51, 7, 'Ligações químicas', 'Conheça os principais tipos de ligações entre átomos.', 'Ligações químicas são interações responsáveis pela união entre átomos.\r\n\r\nEntre os principais tipos estão ligação iônica, covalente e metálica.\r\n\r\nNa ligação iônica ocorre transferência de elétrons entre átomos, formando íons.\r\n\r\nNa ligação covalente ocorre compartilhamento de elétrons.\r\n\r\nA ligação metálica está relacionada à interação entre átomos de metais e à movimentação de elétrons.', 'intermediario', '2026-09-29 09:57:35'),
(52, 7, 'Reações químicas', 'Aprenda a identificar transformações químicas.', 'Reações químicas acontecem quando substâncias são transformadas em outras substâncias.\r\n\r\nAs substâncias presentes no início são chamadas de reagentes e as formadas ao final são chamadas de produtos.\r\n\r\nUma reação pode ser representada por uma equação química.\r\n\r\nÉ importante observar que os átomos são reorganizados durante a reação, mantendo-se a quantidade de cada elemento.', 'intermediario', '2026-09-29 09:57:35'),
(53, 7, 'Ácidos e bases', 'Conheça conceitos básicos sobre ácidos e bases.', 'Ácidos e bases são grupos importantes de substâncias estudados pela Química.\r\n\r\nEm uma classificação simples, ácidos estão relacionados à presença de íons H+ em solução aquosa, enquanto bases estão relacionadas à presença de íons OH-.\r\n\r\nO pH é uma escala utilizada para indicar a acidez ou basicidade de uma solução.\r\n\r\nValores menores de pH indicam maior acidez, enquanto valores maiores indicam maior basicidade.', 'intermediario', '2026-09-29 09:57:35'),
(54, 6, 'Movimento e velocidade', 'Aprenda os conceitos básicos relacionados ao movimento.', 'A velocidade média relaciona a distância percorrida com o intervalo de tempo utilizado.\r\n\r\nA fórmula básica é velocidade média = distância / tempo.\r\n\r\nPara estudar um movimento, é importante observar a posição de um corpo e como ela varia com o passar do tempo.\r\n\r\nAs unidades mais comuns são metros por segundo e quilômetros por hora.', 'iniciante', '2026-09-29 09:57:35'),
(55, 6, 'Leis de Newton', 'Conheça as três principais leis do movimento.', 'As leis de Newton ajudam a explicar o movimento dos corpos.\r\n\r\nA primeira lei está relacionada à inércia e afirma que um corpo tende a manter seu estado de movimento quando a força resultante é nula.\r\n\r\nA segunda lei relaciona força, massa e aceleração pela expressão F = m · a.\r\n\r\nA terceira lei afirma que as forças aparecem aos pares, com mesma intensidade e sentidos opostos.', 'intermediario', '2026-09-29 09:57:35'),
(56, 6, 'Energia', 'Entenda os principais conceitos relacionados à energia.', 'Energia é uma grandeza associada à capacidade de produzir transformações.\r\n\r\nExistem diferentes formas de energia, como cinética, potencial, térmica, elétrica e química.\r\n\r\nA energia cinética está relacionada ao movimento de um corpo.\r\n\r\nA energia potencial está relacionada à posição ou configuração de um sistema.\r\n\r\nEm muitos processos físicos, a energia pode ser transformada de uma forma para outra.', 'iniciante', '2026-09-29 09:57:35'),
(57, 6, 'Eletricidade', 'Aprenda conceitos básicos de corrente e tensão elétrica.', 'A eletricidade está relacionada ao movimento e à interação de cargas elétricas.\r\n\r\nA corrente elétrica representa o movimento ordenado de cargas.\r\n\r\nA tensão elétrica representa uma diferença de potencial entre dois pontos.\r\n\r\nA resistência elétrica representa a oposição à passagem da corrente.\r\n\r\nA Lei de Ohm relaciona tensão, corrente e resistência pela expressão U = R · i.', 'intermediario', '2026-09-29 09:57:35'),
(58, 6, 'Calor e temperatura', 'Entenda a diferença entre calor e temperatura.', 'Temperatura está relacionada ao estado térmico de um corpo.\r\n\r\nCalor é energia transferida entre corpos devido a uma diferença de temperatura.\r\n\r\nQuando dois corpos com temperaturas diferentes entram em contato, ocorre transferência de energia térmica.\r\n\r\nEssa transferência acontece espontaneamente do corpo de maior temperatura para o corpo de menor temperatura, até que o equilíbrio térmico seja atingido.', 'iniciante', '2026-09-29 09:57:35'),
(59, 3, 'Brasil Colônia', 'Conheça aspectos importantes do período colonial brasileiro.', 'O período colonial brasileiro começou com a chegada dos portugueses no século XVI e foi marcado pela exploração econômica do território.\r\n\r\nA produção de açúcar teve grande importância, principalmente no Nordeste.\r\n\r\nA sociedade colonial era marcada por desigualdades e pelo uso intenso de trabalho escravizado.\r\n\r\nA administração portuguesa passou por diferentes formas de organização durante o período.\r\n\r\nO Brasil permaneceu como colônia de Portugal até a independência em 1822.', 'iniciante', '2026-09-29 09:57:35'),
(60, 3, 'Independência do Brasil', 'Entenda o processo que levou à independência brasileira.', 'A Independência do Brasil ocorreu em 1822.\r\n\r\nO processo esteve relacionado a mudanças políticas e econômicas que aconteceram no Brasil e em Portugal.\r\n\r\nA presença da família real portuguesa no Brasil a partir de 1808 alterou a organização política e econômica da colônia.\r\n\r\nEm 7 de setembro de 1822, ocorreu o episódio conhecido como Independência do Brasil.\r\n\r\nApós a independência, o Brasil passou a ser uma monarquia independente.', 'iniciante', '2026-09-29 09:57:35'),
(61, 3, 'Primeira Guerra Mundial', 'Conheça as principais causas e consequências da Primeira Guerra Mundial.', 'A Primeira Guerra Mundial ocorreu entre 1914 e 1918.\r\n\r\nEntre os fatores relacionados ao conflito estavam disputas imperialistas, nacionalismos, alianças militares e tensões políticas na Europa.\r\n\r\nO conflito envolveu diferentes países e provocou grandes perdas humanas e materiais.\r\n\r\nA guerra terminou em 1918 com a derrota das Potências Centrais.\r\n\r\nO Tratado de Versalhes estabeleceu condições para a Alemanha após o conflito.', 'intermediario', '2026-09-29 09:57:35'),
(62, 3, 'Revolução Industrial', 'Entenda as transformações provocadas pela industrialização.', 'A Revolução Industrial começou na Inglaterra durante o século XVIII e provocou grandes mudanças na produção.\r\n\r\nA utilização de máquinas e novas fontes de energia aumentou a capacidade produtiva.\r\n\r\nO processo também provocou mudanças sociais, com crescimento das cidades e formação de uma classe trabalhadora industrial.\r\n\r\nAs condições de trabalho nas primeiras fábricas eram frequentemente difíceis, com jornadas longas e baixos salários.\r\n\r\nA industrialização posteriormente se espalhou para outras regiões.', 'intermediario', '2026-09-29 09:57:35'),
(63, 3, 'Ditadura Militar no Brasil', 'Conheça aspectos históricos do período de 1964 a 1985.', 'O regime militar brasileiro começou em 1964 e terminou em 1985.\r\n\r\nDurante esse período, o país foi governado por presidentes militares.\r\n\r\nO período foi marcado por restrições às liberdades políticas, censura e perseguição de opositores.\r\n\r\nTambém ocorreram mudanças econômicas e grandes obras de infraestrutura.\r\n\r\nO processo de redemocratização ganhou força durante a década de 1980, levando ao fim do regime militar.', 'intermediario', '2026-09-29 09:57:35'),
(64, 4, 'Globalização', 'Entenda o processo de integração entre diferentes partes do mundo.', 'A globalização corresponde à intensificação das relações econômicas, culturais, políticas e tecnológicas entre diferentes regiões do mundo.\r\n\r\nO desenvolvimento dos meios de transporte e comunicação contribuiu para acelerar esse processo.\r\n\r\nEmpresas passaram a atuar em diferentes países e produtos podem ser produzidos utilizando etapas realizadas em vários lugares.\r\n\r\nA globalização também facilita a circulação de informações, pessoas, capitais e mercadorias.', 'iniciante', '2026-09-29 09:57:35'),
(65, 4, 'Clima', 'Conheça os principais fatores que influenciam o clima.', 'O clima corresponde ao comportamento médio das condições atmosféricas de uma região durante um longo período.\r\n\r\nEntre os fatores climáticos estão latitude, altitude, relevo, massas de ar, maritimidade e continentalidade.\r\n\r\nO Brasil possui diferentes tipos de clima devido à sua grande extensão territorial.\r\n\r\nÉ importante diferenciar clima de tempo. Tempo representa as condições atmosféricas em determinado momento, enquanto clima considera padrões observados durante longos períodos.', 'iniciante', '2026-09-29 09:57:35'),
(66, 4, 'Relevo', 'Aprenda sobre as principais formas de relevo.', 'O relevo corresponde às diferentes formas presentes na superfície terrestre.\r\n\r\nEntre as principais formas estão planaltos, planícies e depressões.\r\n\r\nO relevo é resultado da ação de fatores internos e externos.\r\n\r\nFatores internos, como movimentos tectônicos, podem modificar a superfície terrestre.\r\n\r\nFatores externos, como erosão causada pela água e pelo vento, também contribuem para transformar o relevo.', 'iniciante', '2026-09-29 09:57:35'),
(67, 4, 'Urbanização', 'Entenda o crescimento das cidades e seus impactos.', 'Urbanização é o processo de crescimento da população que vive em áreas urbanas.\r\n\r\nO processo de urbanização brasileira se intensificou principalmente durante o século XX.\r\n\r\nO crescimento rápido das cidades pode gerar desafios como falta de moradia, trânsito, poluição e dificuldades de acesso a serviços públicos.\r\n\r\nO planejamento urbano é importante para organizar o espaço e melhorar a qualidade de vida da população.', 'intermediario', '2026-09-29 09:57:35'),
(68, 4, 'População e migrações', 'Conheça conceitos relacionados à população e aos deslocamentos humanos.', 'A Geografia da população estuda aspectos como distribuição populacional, crescimento, estrutura etária e movimentos migratórios.\r\n\r\nMigração é o deslocamento de pessoas de uma área para outra.\r\n\r\nOs deslocamentos podem ocorrer por diferentes motivos, incluindo fatores econômicos, sociais, ambientais e políticos.\r\n\r\nAs migrações podem ser internas, quando acontecem dentro de um país, ou internacionais, quando envolvem diferentes países.', 'intermediario', '2026-09-29 09:57:35'),
(69, 10, 'Origem da Filosofia', 'Entenda como surgiu o pensamento filosófico.', 'A Filosofia surgiu na Grécia Antiga e buscou explicar a realidade por meio da razão e da reflexão.\r\n\r\nOs primeiros filósofos passaram a questionar explicações baseadas apenas em mitos e procuraram compreender a natureza por meio de argumentos.\r\n\r\nO pensamento filosófico envolve questionamento, análise e busca por justificativas.\r\n\r\nA Filosofia continua sendo utilizada para refletir sobre conhecimento, ética, política, sociedade e existência.', 'iniciante', '2026-09-29 09:57:35'),
(70, 10, 'Sócrates', 'Conheça as principais ideias associadas a Sócrates.', 'Sócrates foi um filósofo grego que viveu em Atenas.\r\n\r\nEle ficou conhecido por utilizar o diálogo e o questionamento como formas de estimular a reflexão.\r\n\r\nA chamada maiêutica socrática está relacionada ao processo de fazer perguntas para ajudar uma pessoa a refletir sobre aquilo que acredita saber.\r\n\r\nSócrates não deixou obras escritas. Muitas informações sobre seu pensamento foram registradas por seus discípulos e outros autores.', 'iniciante', '2026-09-29 09:57:35'),
(71, 10, 'Platão', 'Conheça conceitos importantes do pensamento de Platão.', 'Platão foi discípulo de Sócrates e fundou a Academia em Atenas.\r\n\r\nUma ideia importante em sua filosofia é a distinção entre o mundo sensível e o mundo inteligível.\r\n\r\nPlatão também desenvolveu reflexões sobre conhecimento, política, justiça e educação.\r\n\r\nA Alegoria da Caverna é uma das passagens mais conhecidas associadas ao seu pensamento.', 'intermediario', '2026-09-29 09:57:35'),
(72, 10, 'Filosofia e ética', 'Entenda o que a Filosofia discute sobre ações e valores.', 'A ética é uma área da Filosofia que busca refletir sobre ações humanas, valores, deveres e formas de convivência.\r\n\r\nQuestões éticas aparecem quando precisamos avaliar como agir diante de determinada situação.\r\n\r\nA reflexão ética não consiste apenas em seguir regras, mas também em analisar razões, consequências e princípios envolvidos nas decisões.', 'iniciante', '2026-09-29 09:57:35'),
(73, 10, 'Filosofia política', 'Conheça questões filosóficas relacionadas à sociedade e ao poder.', 'A Filosofia política investiga questões relacionadas ao Estado, poder, justiça, liberdade e organização da sociedade.\r\n\r\nDiferentes filósofos apresentaram ideias distintas sobre como uma sociedade deveria ser organizada.\r\n\r\nO estudo da Filosofia política ajuda a compreender conceitos utilizados em discussões sobre direitos, cidadania e organização social.', 'intermediario', '2026-09-29 09:57:35'),
(74, 11, 'Sociedade', 'Entenda o conceito de sociedade nas Ciências Sociais.', 'Sociedade é formada por pessoas que compartilham relações, instituições, normas e formas de organização.\r\n\r\nA Sociologia busca compreender como essas relações funcionam e como influenciam o comportamento dos indivíduos.\r\n\r\nA sociedade está em constante transformação e pode apresentar diferentes formas de organização ao longo do tempo.', 'iniciante', '2026-09-29 09:57:35'),
(75, 11, 'Cultura', 'Aprenda o que significa cultura para a Sociologia.', 'Cultura envolve conhecimentos, valores, crenças, costumes, práticas e formas de expressão compartilhadas por grupos sociais.\r\n\r\nEla é aprendida por meio da convivência e da socialização.\r\n\r\nExistem diferentes culturas e formas de organização social, e elas podem mudar ao longo do tempo.\r\n\r\nO estudo da cultura ajuda a compreender a diversidade presente nas sociedades.', 'iniciante', '2026-09-29 09:57:35'),
(76, 11, 'Socialização', 'Entenda como os indivíduos aprendem normas e valores sociais.', 'Socialização é o processo pelo qual os indivíduos aprendem normas, valores, comportamentos e conhecimentos necessários para participar da sociedade.\r\n\r\nA família, a escola, os amigos e outras instituições participam desse processo.\r\n\r\nA socialização acontece durante diferentes fases da vida e contribui para a formação da identidade social dos indivíduos.', 'iniciante', '2026-09-29 09:57:35'),
(77, 11, 'Desigualdade social', 'Compreenda o conceito de desigualdade social.', 'Desigualdade social ocorre quando recursos, oportunidades e condições de vida são distribuídos de maneira diferente entre grupos da sociedade.\r\n\r\nEla pode estar relacionada a fatores econômicos, educacionais, territoriais e sociais.\r\n\r\nA Sociologia busca analisar as causas e consequências dessas desigualdades e compreender como elas se reproduzem na sociedade.', 'intermediario', '2026-09-29 09:57:35'),
(78, 11, 'Instituições sociais', 'Conheça o papel das instituições na organização da sociedade.', 'Instituições sociais são estruturas responsáveis por organizar diferentes aspectos da vida coletiva.\r\n\r\nEntre os exemplos estão família, escola, Estado, religião e instituições econômicas.\r\n\r\nElas possuem normas e funções que influenciam o comportamento dos indivíduos.\r\n\r\nO estudo das instituições ajuda a compreender como a sociedade mantém e transforma suas formas de organização.', 'intermediario', '2026-09-29 09:57:35'),
(79, 5, 'Evolução biológica', 'Conheça a seleção natural e as mudanças nas populações.', 'EVOLUÇÃO BIOLÓGICA\r\n\r\nA evolução biológica corresponde às mudanças nas características hereditárias das populações ao longo das gerações.\r\n\r\nVARIAÇÃO GENÉTICA\r\nOs indivíduos de uma população apresentam diferenças. Mutações e recombinação genética contribuem para essa diversidade.\r\n\r\nSELEÇÃO NATURAL\r\nCaracterísticas hereditárias que favorecem a sobrevivência e a reprodução em determinado ambiente podem se tornar mais frequentes ao longo das gerações.\r\n\r\nADAPTAÇÃO\r\nUma adaptação é uma característica que contribui para o sucesso reprodutivo em um ambiente. Ela não surge porque o organismo decide mudar.\r\n\r\nIMPORTANTE\r\nIndivíduos não evoluem geneticamente por necessidade durante a vida. A evolução ocorre nas populações ao longo das gerações.', 'iniciante', '2026-10-27 15:38:17'),
(80, 9, 'Interpretação de textos em língua estrangeira', 'Estratégias de leitura em inglês e espanhol.', 'INTERPRETAÇÃO EM LÍNGUA ESTRANGEIRA\r\n\r\nO objetivo é compreender o sentido geral de textos em inglês ou espanhol, mesmo quando algumas palavras são desconhecidas.\r\n\r\nCOGNATOS\r\nSão palavras semelhantes em forma e significado, como important (inglês) e importante (português).\r\n\r\nFALSOS COGNATOS\r\nSão palavras parecidas que possuem significados diferentes. Em inglês, actually significa na verdade, e não atualmente.\r\n\r\nESTRATÉGIAS\r\nObserve títulos, imagens, palavras conhecidas e o contexto. Em seguida, identifique o tema, a finalidade e as informações principais.', 'iniciante', '2026-10-27 15:38:17'),
(81, 13, 'Interpretação de texto', 'Aprenda a identificar a ideia principal de um texto.', 'INTERPRETAÇÃO DE TEXTO\r\n\r\nA interpretação de texto consiste em compreender as informações apresentadas e perceber o que o autor deseja comunicar.\r\n\r\nIDEIA PRINCIPAL\r\nÉ a informação central do texto. Para identificá-la, observe o título, as palavras-chave e as ideias que se repetem.\r\n\r\nINFORMAÇÕES EXPLÍCITAS E IMPLÍCITAS\r\nInformações explícitas aparecem diretamente no texto. Informações implícitas precisam ser deduzidas a partir de pistas e do contexto.\r\n\r\nDICA DE ESTUDO\r\nLeia o texto completo antes de responder às perguntas. Evite escolher uma alternativa que apresente informações não sustentadas pelo texto.', 'iniciante', '2026-10-27 15:38:17'),
(82, 7, 'Estrutura do átomo', 'Estude prótons, nêutrons, elétrons e número atômico.', 'ESTRUTURA DO ÁTOMO\r\n\r\nO átomo é formado por um núcleo e uma região ocupada pelos elétrons.\r\n\r\nPRÓTONS\r\nPossuem carga elétrica positiva e ficam no núcleo.\r\n\r\nNÊUTRONS\r\nNão possuem carga elétrica e também ficam no núcleo.\r\n\r\nELÉTRONS\r\nPossuem carga elétrica negativa e ocupam a região ao redor do núcleo.\r\n\r\nNÚMERO ATÔMICO\r\nÉ representado pela letra Z e corresponde ao número de prótons.\r\n\r\nNÚMERO DE MASSA\r\nÉ representado por A e corresponde à soma de prótons e nêutrons: A = Z + N.\r\n\r\nEXEMPLO\r\nUm átomo com 6 prótons e 6 nêutrons tem número atômico 6 e número de massa 12.', 'iniciante', '2026-10-27 15:38:17');

-- --------------------------------------------------------

--
-- Estrutura para tabela `correcoes`
--

CREATE TABLE `correcoes` (
  `id` int(11) NOT NULL,
  `redacao_id` int(11) NOT NULL,
  `professor_id` int(11) NOT NULL,
  `nota` decimal(5,2) NOT NULL,
  `comentario` text NOT NULL,
  `data_correcao` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `correcoes`
--

INSERT INTO `correcoes` (`id`, `redacao_id`, `professor_id`, `nota`, `comentario`, `data_correcao`) VALUES
(1, 1, 23, 0.00, 'Não fez o pedido.', '2026-11-03 17:14:03'),
(2, 2, 23, 0.00, 'Não fez.', '2026-11-03 17:17:38'),
(3, 4, 23, 960.00, 'Está ótima, melhorar apenas a pontuação', '2026-11-03 17:18:07'),
(4, 3, 24, 0.00, 'Não escreveu.', '2026-11-09 07:59:43'),
(5, 5, 25, 999.99, 'Perfeito!', '2026-11-09 08:58:31'),
(6, 6, 24, 840.00, 'Melhorar argumentação.', '2026-11-10 10:05:44');

-- --------------------------------------------------------

--
-- Estrutura para tabela `documentos_professores`
--

CREATE TABLE `documentos_professores` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `diploma_arquivo` varchar(255) NOT NULL,
  `status` enum('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  `criado_em` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `documentos_professores`
--

INSERT INTO `documentos_professores` (`id`, `usuario_id`, `diploma_arquivo`, `status`, `criado_em`) VALUES
(1, 20, 'd04d96032f660023de1ba31651898de1.pdf', 'aprovado', '2026-11-03 17:03:10'),
(2, 21, 'b5b542af793cf51932bfcbdcd5f9e6db.pdf', 'aprovado', '2026-11-03 17:04:38'),
(3, 22, '67713579ea025a74d3f9fbd2c9c8d465.pdf', 'aprovado', '2026-11-03 17:07:06'),
(4, 23, 'e405e7d1d9ce645399a9e61c3aa8d39e.pdf', 'aprovado', '2026-11-03 17:13:18'),
(5, 24, 'd7c46c0a0ef374a95bb4da0c3d1e2727.pdf', 'aprovado', '2026-11-09 07:55:46'),
(6, 25, '313723e73ca45e7fceae7a10c530e071.pdf', 'aprovado', '2026-11-09 08:42:57'),
(7, 31, 'a61dde65c104bb3e56564ede4f66966d.pdf', 'aprovado', '2026-11-10 08:59:08'),
(8, 32, '8ec2a4f96d62927b4ee3bfb7198f186c.pdf', 'aprovado', '2026-11-10 09:17:16'),
(9, 36, 'b4a00778958f35e900a6534d9a86121f.pdf', 'aprovado', '2026-11-10 10:06:36');

-- --------------------------------------------------------

--
-- Estrutura para tabela `materias`
--

CREATE TABLE `materias` (
  `id` int(11) NOT NULL,
  `nome` varchar(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `materias`
--

INSERT INTO `materias` (`id`, `nome`) VALUES
(5, 'Biologia'),
(15, 'Espanhol'),
(10, 'Filosofia'),
(6, 'Física'),
(4, 'Geografia'),
(3, 'História'),
(14, 'Inglês'),
(9, 'Língua Estrangeira (Inglês/Espanhol)'),
(13, 'Língua Portuguesa'),
(2, 'Matemática'),
(1, 'Português'),
(7, 'Química'),
(8, 'Redação'),
(11, 'Sociologia');

-- --------------------------------------------------------

--
-- Estrutura para tabela `planos`
--

CREATE TABLE `planos` (
  `id` int(11) NOT NULL,
  `nome` varchar(50) NOT NULL,
  `valor_mensal` decimal(10,2) NOT NULL,
  `periodo_meses` int(11) NOT NULL,
  `descricao` text NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `planos`
--

INSERT INTO `planos` (`id`, `nome`, `valor_mensal`, `periodo_meses`, `descricao`, `ativo`) VALUES
(1, 'Mensal', 59.90, 1, 'Acesso mensal à experiência completa da BRIO.', 1),
(2, 'Semestral', 49.90, 6, 'Plano de 6 meses com valor mensal reduzido.', 1),
(3, 'Anual', 39.90, 12, 'Plano de 12 meses com o menor valor mensal.', 1),
(4, 'Gratuito', 0.00, 1, 'Acesso inicial gratuito para conhecer a plataforma.', 1);

-- --------------------------------------------------------

--
-- Estrutura para tabela `pontuacoes`
--

CREATE TABLE `pontuacoes` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `quantidade` int(11) NOT NULL,
  `motivo` varchar(150) NOT NULL,
  `data` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `pontuacoes`
--

INSERT INTO `pontuacoes` (`id`, `usuario_id`, `quantidade`, `motivo`, `data`) VALUES
(1, 2, 120, 'Bônus inicial de demonstração', '2026-09-15 16:04:24'),
(2, 2, 40, 'Atividade concluída', '2026-09-15 16:04:24'),
(3, 3, 10, 'Conteúdo concluído', '2026-09-22 16:10:06'),
(4, 3, 10, 'Conteúdo concluído', '2026-09-22 16:10:15'),
(5, 3, 30, 'Simulado concluído', '2026-09-22 16:10:27'),
(6, 3, 25, 'Redação enviada', '2026-09-22 16:11:43'),
(7, 3, 30, 'Simulado concluído', '2026-09-22 16:36:07'),
(8, 3, 10, 'Conteúdo concluído', '2026-09-22 17:21:55'),
(9, 3, 30, 'Simulado concluído', '2026-09-22 17:24:52'),
(10, 3, 25, 'Redação enviada', '2026-09-22 17:25:17'),
(11, 4, 35, 'Simulado concluído', '2026-09-29 09:36:14'),
(12, 4, 10, 'Tarefa concluída', '2026-09-29 09:50:22'),
(13, 4, 35, 'Simulado concluído', '2026-09-29 10:31:42'),
(14, 7, 40, 'Jogo BRIO', '2026-10-20 17:13:22'),
(15, 7, 10, 'Jogo BRIO', '2026-10-20 17:18:05'),
(16, 7, 40, 'Jogo BRIO', '2026-10-20 17:18:51'),
(17, 7, 20, 'Jogo BRIO', '2026-10-20 17:21:57'),
(18, 7, 30, 'Jogo BRIO', '2026-10-20 17:24:12'),
(19, 7, 20, 'Jogo BRIO', '2026-10-20 17:24:46'),
(20, 11, 25, 'Redação enviada', '2026-10-27 16:04:31'),
(21, 11, 30, 'Jogo BRIO', '2026-10-27 17:14:13'),
(22, 11, 20, 'Jogo BRIO', '2026-10-27 17:14:35'),
(23, 17, 10, 'Conteúdo concluído', '2026-11-03 10:34:20'),
(24, 17, 10, 'Conteúdo concluído', '2026-11-03 10:38:35'),
(25, 17, 10, 'Conteúdo concluído', '2026-11-03 10:41:10'),
(26, 18, 10, 'Conteúdo concluído', '2026-11-03 10:50:50'),
(27, 17, 30, 'Simulado concluído', '2026-11-03 11:01:35'),
(28, 17, 30, 'Simulado concluído', '2026-11-03 11:07:32'),
(29, 17, 30, 'Simulado concluído', '2026-11-03 11:14:03'),
(30, 17, 40, 'Simulado concluído', '2026-11-03 11:14:17'),
(31, 17, 35, 'Simulado concluído', '2026-11-03 11:14:44'),
(32, 18, 35, 'Simulado concluído', '2026-11-03 11:17:21'),
(33, 18, 10, 'Conteúdo concluído', '2026-11-03 11:17:39'),
(34, 18, 10, 'Conteúdo concluído', '2026-11-03 11:17:43'),
(35, 18, 10, 'Conteúdo concluído', '2026-11-03 11:17:45'),
(36, 18, 40, 'Jogo BRIO', '2026-11-03 11:18:23'),
(37, 18, 30, 'Simulado concluído', '2026-11-03 14:53:36'),
(38, 18, 30, 'Jogo BRIO', '2026-11-03 14:53:56'),
(39, 18, 30, 'Jogo BRIO', '2026-11-03 14:54:11'),
(40, 18, 10, 'Conteúdo concluído', '2026-11-03 14:54:19'),
(41, 18, 10, 'Conteúdo concluído', '2026-11-03 14:54:22'),
(42, 18, 10, 'Conteúdo concluído', '2026-11-03 14:54:25'),
(43, 18, 10, 'Conteúdo concluído', '2026-11-03 14:54:34'),
(44, 18, 10, 'Conteúdo concluído', '2026-11-03 14:54:36'),
(45, 17, 10, 'Conteúdo concluído', '2026-11-03 15:41:11'),
(46, 17, 30, 'Simulado concluído', '2026-11-03 15:41:20'),
(47, 19, 25, 'Redação enviada', '2026-11-03 16:37:45'),
(48, 19, 40, 'Simulado concluído', '2026-11-03 16:44:04'),
(49, 19, 35, 'Simulado concluído', '2026-11-03 16:44:17'),
(50, 3, 40, 'Redação corrigida', '2026-11-03 17:14:03'),
(51, 3, 40, 'Redação corrigida', '2026-11-03 17:17:38'),
(52, 19, 40, 'Redação corrigida', '2026-11-03 17:18:07'),
(53, 11, 40, 'Redação corrigida', '2026-11-09 07:59:43'),
(54, 18, 10, 'Conteúdo concluído', '2026-11-09 08:43:47'),
(55, 18, 40, 'Simulado concluído', '2026-11-09 08:43:58'),
(56, 18, 25, 'Redação enviada', '2026-11-09 08:44:36'),
(57, 18, 30, 'Jogo BRIO', '2026-11-09 08:53:30'),
(58, 26, 25, 'Redação enviada', '2026-11-09 08:57:45'),
(59, 18, 40, 'Redação corrigida', '2026-11-09 08:58:31'),
(60, 18, 10, 'Tarefa concluída', '2026-11-10 08:30:06'),
(61, 18, 10, 'Conteúdo concluído', '2026-11-10 08:35:58'),
(62, 18, 10, 'Conteúdo concluído', '2026-11-10 08:36:03'),
(63, 18, 10, 'Conteúdo concluído', '2026-11-10 08:36:08'),
(64, 18, 10, 'Conteúdo concluído', '2026-11-10 08:36:13'),
(65, 18, 30, 'Simulado concluído', '2026-11-10 08:37:42'),
(66, 18, 25, 'Redação enviada', '2026-11-10 08:38:58'),
(67, 34, 10, 'Tarefa concluída', '2026-11-10 09:29:44'),
(68, 34, 10, 'Tarefa concluída', '2026-11-10 09:44:15'),
(69, 34, 10, 'Tarefa concluída', '2026-11-10 09:47:16'),
(70, 35, 10, 'Conteúdo concluído', '2026-11-10 09:50:36'),
(71, 35, 35, 'Simulado concluído', '2026-11-10 10:01:25'),
(72, 26, 40, 'Redação corrigida', '2026-11-10 10:05:44'),
(73, 18, 10, 'Tarefa concluída', '2026-11-10 10:09:34'),
(74, 18, 35, 'Simulado concluído', '2026-11-10 10:09:48'),
(75, 18, 10, 'Conteúdo concluído', '2026-11-10 10:09:58'),
(76, 18, 10, 'Conteúdo concluído', '2026-11-10 10:20:43'),
(77, 18, 35, 'Simulado concluído', '2026-11-10 10:21:01');

-- --------------------------------------------------------

--
-- Estrutura para tabela `progresso_conteudo`
--

CREATE TABLE `progresso_conteudo` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `conteudo_id` int(11) NOT NULL,
  `concluido` tinyint(1) DEFAULT 0,
  `data_conclusao` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `progresso_conteudos`
--

CREATE TABLE `progresso_conteudos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `conteudo_id` int(11) NOT NULL,
  `percentual` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `concluido` tinyint(1) NOT NULL DEFAULT 0,
  `atualizado_em` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `progresso_conteudos`
--

INSERT INTO `progresso_conteudos` (`id`, `usuario_id`, `conteudo_id`, `percentual`, `concluido`, `atualizado_em`) VALUES
(1, 2, 1, 65, 0, '2026-09-15 16:04:24'),
(2, 3, 4, 100, 1, '2026-09-22 16:10:06'),
(3, 3, 3, 100, 1, '2026-09-22 16:10:15'),
(4, 3, 2, 100, 1, '2026-09-22 17:21:55'),
(5, 17, 81, 100, 1, '2026-11-03 10:34:20'),
(6, 17, 80, 100, 1, '2026-11-03 10:38:35'),
(7, 17, 33, 100, 1, '2026-11-03 10:41:10'),
(8, 18, 81, 100, 1, '2026-11-03 10:50:50'),
(9, 18, 33, 100, 1, '2026-11-03 11:17:39'),
(10, 18, 32, 100, 1, '2026-11-03 11:17:43'),
(11, 18, 31, 100, 1, '2026-11-03 11:17:45'),
(12, 18, 38, 100, 1, '2026-11-03 14:54:19'),
(13, 18, 80, 100, 1, '2026-11-03 14:54:22'),
(14, 18, 37, 100, 1, '2026-11-03 14:54:25'),
(15, 18, 43, 100, 1, '2026-11-03 14:54:34'),
(16, 18, 42, 100, 1, '2026-11-03 14:54:36'),
(17, 17, 32, 100, 1, '2026-11-03 15:41:11'),
(18, 18, 29, 100, 1, '2026-11-09 08:43:47'),
(19, 18, 79, 100, 1, '2026-11-10 08:35:58'),
(20, 18, 46, 100, 1, '2026-11-10 08:36:03'),
(21, 18, 17, 100, 1, '2026-11-10 08:36:08'),
(22, 18, 18, 100, 1, '2026-11-10 08:36:13'),
(23, 35, 81, 100, 1, '2026-11-10 09:50:36'),
(24, 18, 64, 100, 1, '2026-11-10 10:09:58'),
(25, 18, 30, 100, 1, '2026-11-10 10:20:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `questoes`
--

CREATE TABLE `questoes` (
  `id` int(11) NOT NULL,
  `simulado_id` int(11) NOT NULL,
  `enunciado` text NOT NULL,
  `alternativa_a` varchar(500) NOT NULL,
  `alternativa_b` varchar(500) NOT NULL,
  `alternativa_c` varchar(500) NOT NULL,
  `alternativa_d` varchar(500) NOT NULL,
  `alternativa_e` varchar(500) NOT NULL,
  `resposta_correta` char(1) NOT NULL,
  `comentario` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `questoes`
--

INSERT INTO `questoes` (`id`, `simulado_id`, `enunciado`, `alternativa_a`, `alternativa_b`, `alternativa_c`, `alternativa_d`, `alternativa_e`, `resposta_correta`, `comentario`) VALUES
(1, 1, 'Ao interpretar um texto, qual estratégia ajuda a identificar a ideia principal?', 'Ler somente o título.', 'Ignorar o contexto.', 'Observar tema, argumentos e informações centrais.', 'Escolher a alternativa mais longa.', 'Desconsiderar palavras-chave.', 'C', 'A ideia principal é identificada considerando o tema e as informações centrais apresentadas pelo texto.'),
(2, 1, 'Qual elemento pode ajudar a compreender o sentido de uma palavra em um texto?', 'O contexto.', 'A cor da tela.', 'O tamanho da fonte.', 'O número da página.', 'A quantidade de parágrafos.', 'A', 'O contexto em que a palavra aparece ajuda a determinar seu sentido.'),
(3, 2, 'Se f(x) = 2x + 3, qual é f(2)?', '5', '6', '7', '8', '9', 'C', 'Substituindo x por 2: f(2) = 2·2 + 3 = 7.'),
(4, 3, 'Em um texto, a ideia principal corresponde:', 'A uma informação sem relação com o tema.', 'Ao assunto central desenvolvido pelo autor.', 'Somente ao título do texto.', 'À última palavra do texto.', 'A uma informação escolhida aleatoriamente.', 'B', 'A ideia principal representa o assunto central desenvolvido no texto.'),
(5, 3, 'Qual recurso ajuda o leitor a compreender o sentido de uma palavra desconhecida?', 'O contexto em que ela aparece.', 'A quantidade de letras.', 'A posição da palavra na página.', 'O tamanho da fonte.', 'A cor utilizada no texto.', 'A', 'O contexto permite compreender o significado que a palavra assume naquele texto.'),
(6, 4, 'In English, the sentence \"She studies every day\" indicates:', 'An action that happens regularly.', 'An action that happened yesterday.', 'An action that will never happen.', 'An action happening only once.', 'An action that has already ended.', 'A', 'The simple present is commonly used for habits and regular actions.'),
(7, 4, 'Em espanhol, a palavra \"escuela\" significa:', 'Biblioteca.', 'Escola.', 'Casa.', 'Cidade.', 'Universidade.', 'B', 'Escuela significa escola em português.'),
(8, 2, 'Se f(x) = 2x + 5, qual é o valor de f(3)?', '8', '9', '10', '11', '12', 'D', 'f(3) = 2 × 3 + 5 = 11.'),
(9, 2, 'Qual é a área de um retângulo com 8 cm de comprimento e 5 cm de largura?', '13 cm²', '26 cm²', '40 cm²', '45 cm²', '80 cm²', 'C', 'A área é comprimento × largura: 8 × 5 = 40 cm².'),
(10, 5, 'Qual estrutura celular é responsável por armazenar a maior parte do material genético nas células eucariontes?', 'Ribossomo.', 'Mitocôndria.', 'Núcleo.', 'Lisossomo.', 'Complexo de Golgi.', 'C', 'O núcleo contém a maior parte do DNA das células eucariontes.'),
(11, 5, 'Em uma cadeia alimentar, os produtores são organismos que:', 'Produzem seu próprio alimento.', 'Alimentam-se exclusivamente de animais.', 'Não realizam metabolismo.', 'Alimentam-se de outros produtores.', 'Vivem somente em ambientes aquáticos.', 'A', 'Os produtores, como as plantas, produzem matéria orgânica principalmente por fotossíntese.'),
(12, 6, 'Qual partícula possui carga elétrica negativa?', 'Próton.', 'Nêutron.', 'Elétron.', 'Núcleo.', 'Íon positivo.', 'C', 'O elétron possui carga elétrica negativa.'),
(13, 6, 'A água é representada pela fórmula:', 'CO2', 'O2', 'H2O', 'NaCl', 'CH4', 'C', 'Uma molécula de água é formada por dois átomos de hidrogênio e um de oxigênio.'),
(14, 7, 'Um carro percorre 100 metros em 10 segundos. Qual é sua velocidade média?', '5 m/s', '10 m/s', '20 m/s', '50 m/s', '100 m/s', 'B', 'A velocidade média é distância dividida pelo tempo: 100 ÷ 10 = 10 m/s.'),
(15, 7, 'Qual das grandezas abaixo é uma unidade de força no Sistema Internacional?', 'Joule.', 'Watt.', 'Newton.', 'Volt.', 'Ohm.', 'C', 'A unidade de força no SI é o Newton (N).'),
(16, 8, 'A Proclamação da República no Brasil ocorreu em:', '1500.', '1822.', '1889.', '1930.', '1964.', 'C', 'A República foi proclamada no Brasil em 15 de novembro de 1889.'),
(17, 8, 'A Revolução Industrial teve início principalmente:', 'Na Inglaterra.', 'No Brasil.', 'No Japão.', 'Na Rússia.', 'No Egito.', 'A', 'A Revolução Industrial começou na Inglaterra no século XVIII.'),
(18, 9, 'A globalização está relacionada principalmente:', 'Ao isolamento entre países.', 'À intensificação das relações econômicas, culturais e tecnológicas.', 'Ao fim das tecnologias de comunicação.', 'À redução das trocas comerciais.', 'À diminuição da circulação de informações.', 'B', 'A globalização intensifica relações econômicas, culturais, tecnológicas e sociais entre diferentes regiões.'),
(19, 9, 'Qual destes elementos é um fator natural relacionado ao clima?', 'Latitude.', 'Idioma.', 'Sistema político.', 'Moeda.', 'Industrialização.', 'A', 'A latitude influencia a quantidade de radiação solar recebida e, consequentemente, o clima.'),
(20, 10, 'Sócrates ficou conhecido na filosofia principalmente por:', 'Defender a busca pelo conhecimento por meio do diálogo.', 'Criar a teoria da evolução.', 'Desenvolver a física moderna.', 'Fundar a sociologia.', 'Criar a matemática moderna.', 'A', 'Sócrates utilizava o diálogo e o questionamento como instrumentos para a busca do conhecimento.'),
(21, 10, 'A ética está relacionada principalmente ao estudo:', 'Dos movimentos planetários.', 'Dos seres vivos.', 'Das ações humanas e dos valores que orientam a conduta.', 'Da composição química da matéria.', 'Da formação das rochas.', 'C', 'A ética investiga questões relacionadas às ações, valores, escolhas e responsabilidades humanas.'),
(22, 11, 'A Sociologia tem como objeto de estudo principalmente:', 'Apenas os fenômenos naturais.', 'A sociedade e as relações sociais.', 'Somente os organismos vivos.', 'A composição dos átomos.', 'O movimento dos planetas.', 'B', 'A Sociologia busca compreender a sociedade e as relações estabelecidas entre indivíduos e grupos.'),
(23, 11, 'A socialização pode ser entendida como:', 'O processo pelo qual o indivíduo aprende normas, valores e comportamentos sociais.', 'A separação completa do indivíduo da sociedade.', 'A eliminação da cultura.', 'Um fenômeno exclusivamente biológico.', 'A ausência de relações sociais.', 'A', 'A socialização é o processo de aprendizagem e internalização de normas, valores e comportamentos sociais.'),
(24, 12, 'A interpretação de um texto depende principalmente da compreensão:', 'Apenas do título.', 'Do contexto e das informações apresentadas.', 'Somente da primeira frase.', 'Apenas das palavras mais longas.', 'Da quantidade de parágrafos.', 'B', 'A interpretação considera o contexto, o tema e as relações entre as informações.'),
(25, 12, 'Se uma função é f(x) = 3x + 2, qual é f(4)?', '10', '12', '14', '16', '18', 'C', 'f(4) = 3 × 4 + 2 = 14.'),
(26, 12, 'Qual organela está relacionada à produção de energia celular?', 'Ribossomo.', 'Núcleo.', 'Mitocôndria.', 'Lisossomo.', 'Vacúolo.', 'C', 'As mitocôndrias realizam processos relacionados à produção de energia na célula.'),
(27, 12, 'Qual é a fórmula química da água?', 'CO2', 'H2O', 'O2', 'NaCl', 'CH4', 'B', 'A água é formada por dois átomos de hidrogênio e um de oxigênio.'),
(28, 12, 'Um corpo percorre 60 metros em 5 segundos. Qual é sua velocidade média?', '5 m/s', '10 m/s', '12 m/s', '15 m/s', '20 m/s', 'C', 'A velocidade média é 60 ÷ 5 = 12 m/s.'),
(29, 12, 'A Proclamação da República brasileira ocorreu em:', '1500.', '1822.', '1889.', '1930.', '1964.', 'C', 'A Proclamação da República ocorreu em 1889.'),
(30, 12, 'A globalização caracteriza-se pela:', 'Diminuição das relações internacionais.', 'Intensificação das relações econômicas, culturais e tecnológicas.', 'Eliminação das tecnologias.', 'Redução da circulação de informações.', 'Separação dos mercados mundiais.', 'B', 'A globalização intensifica a conexão entre diferentes sociedades.'),
(31, 12, 'Para Sócrates, o diálogo e o questionamento eram importantes para:', 'Evitar qualquer reflexão.', 'Buscar o conhecimento.', 'Impedir discussões.', 'Substituir a razão.', 'Eliminar a filosofia.', 'B', 'O método socrático utilizava perguntas e diálogo na busca pelo conhecimento.'),
(32, 12, 'A Sociologia estuda principalmente:', 'A composição dos átomos.', 'Os movimentos planetários.', 'A sociedade e as relações sociais.', 'A formação das células.', 'As reações químicas.', 'C', 'A Sociologia investiga relações, estruturas e fenômenos sociais.'),
(33, 12, 'Em inglês, a frase \"I study every day\" indica:', 'Uma ação habitual.', 'Uma ação impossível.', 'Uma ação que nunca acontece.', 'Uma ação que aconteceu somente uma vez.', 'Uma ação que não possui tempo verbal.', 'A', 'O Simple Present é utilizado para hábitos e ações recorrentes.');

-- --------------------------------------------------------

--
-- Estrutura para tabela `redacoes`
--

CREATE TABLE `redacoes` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tema_id` int(11) NOT NULL,
  `texto` longtext NOT NULL,
  `status` enum('enviada','corrigida') NOT NULL DEFAULT 'enviada',
  `data_envio` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `redacoes`
--

INSERT INTO `redacoes` (`id`, `usuario_id`, `tema_id`, `texto`, `status`, `data_envio`) VALUES
(1, 3, 3, 'kKAAKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', 'corrigida', '2026-09-22 16:11:43'),
(2, 3, 1, 'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', 'corrigida', '2026-09-22 17:25:17'),
(3, 11, 3, 'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk', 'corrigida', '2026-10-27 16:04:31'),
(4, 19, 23, '# Os desafios da segurança de dados na internet\n\nNa sociedade contemporânea, a internet tornou-se uma ferramenta indispensável para a comunicação, o trabalho e a educação. Entretanto, o crescimento do uso das plataformas digitais também trouxe preocupações relacionadas à segurança das informações pessoais. Nesse contexto, a falta de conhecimento sobre os riscos virtuais e a atuação de criminosos digitais representam grandes desafios para a proteção dos dados dos usuários.\n\nEm primeiro lugar, a ausência de educação digital contribui para a exposição indevida de informações pessoais. Muitas pessoas compartilham dados, fotografias e documentos nas redes sociais sem compreender as possíveis consequências dessa prática. Além disso, a utilização de senhas fracas e o acesso a links desconhecidos facilitam a ação de golpistas. Dessa forma, a falta de orientação sobre segurança na internet torna os usuários mais vulneráveis a fraudes e ao roubo de informações.\n\nAdemais, o aumento dos crimes virtuais evidencia a necessidade de maior responsabilidade por parte das empresas e das autoridades. Vazamentos de dados podem comprometer a privacidade de milhares de pessoas, causando prejuízos financeiros e emocionais. Embora o Brasil possua a Lei Geral de Proteção de Dados (LGPD), ainda existem dificuldades relacionadas à fiscalização e à conscientização da população. Portanto, é fundamental fortalecer os mecanismos de proteção e incentivar práticas mais seguras no ambiente digital.\n\nDiante disso, torna-se necessário desenvolver medidas para enfrentar os desafios da segurança de dados na internet. O Ministério da Educação, em parceria com instituições de ensino, deve promover campanhas e atividades sobre educação digital, ensinando os estudantes a identificar golpes, criar senhas seguras e proteger suas informações pessoais. Paralelamente, os órgãos responsáveis pela fiscalização devem ampliar o acompanhamento das empresas que armazenam dados dos usuários, garantindo o cumprimento da legislação. Assim, será possível construir um ambiente virtual mais seguro, consciente e acessível para toda a sociedade.', 'corrigida', '2026-11-03 16:37:45'),
(5, 18, 21, '# Os desafios do primeiro emprego para os jovens\n\nA entrada dos jovens no mercado de trabalho é um dos grandes desafios da sociedade brasileira. Embora muitos adolescentes e jovens adultos desejem conquistar sua independência financeira e ajudar suas famílias, encontram diversas dificuldades para conseguir o primeiro emprego. Entre os principais obstáculos estão a falta de experiência profissional, a exigência de qualificação e a escassez de oportunidades. Dessa forma, é necessário discutir medidas que facilitem o ingresso dessa parcela da população no mundo do trabalho.\n\nEm primeiro lugar, a exigência de experiência profissional representa uma grande barreira para os jovens. Muitas empresas procuram candidatos que já tenham trabalhado anteriormente, mesmo quando oferecem vagas destinadas a iniciantes. Essa situação cria um problema, pois os jovens precisam de uma oportunidade para adquirir experiência, mas acabam sendo rejeitados justamente por não possuírem um histórico profissional. Como consequência, muitos ficam desmotivados e enfrentam dificuldades para iniciar suas carreiras.\n\nAlém disso, a desigualdade no acesso à educação e à qualificação profissional também dificulta a conquista do primeiro emprego. Jovens de famílias com menor renda nem sempre conseguem realizar cursos profissionalizantes, aprender outros idiomas ou desenvolver habilidades tecnológicas exigidas pelas empresas. Enquanto alguns possuem acesso a diversas formas de preparação, outros precisam conciliar os estudos com responsabilidades familiares. Assim, a falta de oportunidades educacionais contribui para aumentar as desigualdades no mercado de trabalho.\n\nPortanto, é fundamental que o poder público, as instituições de ensino e as empresas atuem em conjunto para facilitar a entrada dos jovens no mercado profissional. O Governo Federal, em parceria com escolas e empresas privadas, deve ampliar programas de aprendizagem e oferecer cursos gratuitos de capacitação, por meio de investimentos em educação profissional e incentivos à contratação de iniciantes. Essas medidas permitirão que mais jovens desenvolvam habilidades, adquiram experiência e conquistem sua independência financeira, contribuindo para uma sociedade mais justa e com maiores oportunidades para todos.', 'corrigida', '2026-11-09 08:44:36'),
(6, 26, 1, '# Os impactos da tecnologia na educação\n\nNa sociedade contemporânea, a tecnologia está cada vez mais presente no cotidiano das pessoas, principalmente no ambiente escolar. Ferramentas digitais, como computadores, celulares e plataformas de ensino, transformaram a maneira como os estudantes aprendem e os professores ensinam. Entretanto, apesar dos benefícios proporcionados por esses recursos, ainda existem desafios relacionados à desigualdade de acesso e ao uso inadequado da internet. Dessa forma, é necessário analisar tanto as contribuições da tecnologia para a educação quanto os obstáculos que dificultam sua utilização de maneira eficiente.\n\nEm primeiro lugar, a tecnologia facilita o acesso ao conhecimento e torna o processo de aprendizagem mais dinâmico. Por meio de videoaulas, aplicativos educativos e bibliotecas virtuais, os estudantes conseguem aprofundar seus conhecimentos e revisar conteúdos de diferentes disciplinas. Além disso, os professores podem utilizar recursos interativos para explicar assuntos complexos e estimular a participação dos alunos. Assim, quando utilizada de forma adequada, a tecnologia contribui para uma educação mais acessível, interessante e adaptada às necessidades dos estudantes.\n\nPor outro lado, a desigualdade digital representa um grande desafio para a educação brasileira. Muitos alunos de famílias de baixa renda não possuem computadores, celulares adequados ou acesso estável à internet, o que dificulta a realização de atividades escolares. Além disso, o uso excessivo das redes sociais e de outras plataformas de entretenimento pode prejudicar a concentração e o desempenho acadêmico. Portanto, a falta de infraestrutura tecnológica e de orientação sobre o uso consciente desses recursos pode ampliar as desigualdades educacionais existentes no país.\n\nDiante disso, é fundamental que o Governo Federal, em parceria com as secretarias de educação, desenvolva políticas públicas para garantir o acesso à tecnologia nas escolas. Para isso, devem ser realizados investimentos na instalação de internet de qualidade, na distribuição de equipamentos digitais e na capacitação dos professores, por meio de cursos de formação continuada. Paralelamente, as instituições de ensino devem promover atividades que incentivem o uso responsável da internet, orientando os estudantes sobre seus benefícios e riscos. Dessa maneira, será possível aproveitar as vantagens da tecnologia, reduzir as desigualdades e construir uma educação mais inclusiva e de qualidade para todos.', 'corrigida', '2026-11-09 08:57:45'),
(7, 18, 21, '## Os desafios do primeiro emprego para os jovens\n\nA entrada dos jovens no mercado de trabalho representa uma etapa importante para a conquista da independência financeira e do desenvolvimento pessoal. Entretanto, muitos enfrentam dificuldades para conseguir o primeiro emprego, principalmente devido à falta de experiência profissional e à exigência de qualificação. Nesse contexto, é necessário discutir os obstáculos que dificultam o acesso dos jovens às oportunidades de trabalho.\n\nEm primeiro lugar, a falta de experiência é um dos principais desafios enfrentados por quem busca o primeiro emprego. Muitas empresas exigem conhecimentos práticos e experiências anteriores, mesmo para vagas destinadas a iniciantes. Essa situação cria um problema, pois os jovens precisam trabalhar para adquirir experiência, mas encontram dificuldades para conseguir uma oportunidade. Como consequência, muitos acabam desmotivados e inseguros em relação ao próprio futuro profissional.\n\nAlém disso, a desigualdade no acesso à educação e à qualificação profissional também contribui para esse cenário. Jovens de famílias de baixa renda, muitas vezes, não possuem condições financeiras para realizar cursos ou aprender novas habilidades. Dessa forma, acabam enfrentando uma concorrência desigual no mercado de trabalho. Por isso, investir em educação de qualidade e em programas de capacitação é fundamental para ampliar as oportunidades dessa população.\n\nPortanto, os desafios do primeiro emprego para os jovens precisam ser enfrentados por meio de ações conjuntas entre o governo, as instituições de ensino e as empresas. O poder público deve ampliar programas de aprendizagem e oferecer cursos profissionalizantes gratuitos, enquanto as empresas devem criar mais vagas para candidatos sem experiência. Assim, será possível facilitar a entrada dos jovens no mercado de trabalho, reduzir as desigualdades e contribuir para a construção de um futuro com mais oportunidades para todos.', 'enviada', '2026-11-10 08:38:58');

-- --------------------------------------------------------

--
-- Estrutura para tabela `respostas`
--

CREATE TABLE `respostas` (
  `id` int(11) NOT NULL,
  `tentativa_id` int(11) NOT NULL,
  `questao_id` int(11) NOT NULL,
  `resposta` char(1) DEFAULT NULL,
  `correta` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `respostas`
--

INSERT INTO `respostas` (`id`, `tentativa_id`, `questao_id`, `resposta`, `correta`) VALUES
(1, 1, 3, 'B', 0),
(2, 2, 3, 'A', 0),
(3, 3, 1, 'B', 0),
(4, 3, 2, 'B', 0),
(5, 4, 22, 'E', 0),
(6, 4, 23, 'A', 1),
(7, 5, 22, 'A', 0),
(8, 5, 23, 'A', 1),
(9, 6, 24, 'A', 0),
(10, 6, 25, 'A', 0),
(11, 6, 26, 'B', 0),
(12, 6, 27, 'D', 0),
(13, 6, 28, 'D', 0),
(14, 6, 29, 'D', 0),
(15, 6, 30, 'C', 0),
(16, 6, 31, 'D', 0),
(17, 6, 32, 'B', 0),
(18, 6, 33, 'C', 0),
(19, 7, 24, 'A', 0),
(20, 7, 25, 'A', 0),
(21, 7, 26, 'B', 0),
(22, 7, 27, 'D', 0),
(23, 7, 28, 'D', 0),
(24, 7, 29, 'D', 0),
(25, 7, 30, 'C', 0),
(26, 7, 31, 'D', 0),
(27, 7, 32, 'B', 0),
(28, 7, 33, 'C', 0),
(29, 8, 22, 'A', 0),
(30, 8, 23, 'B', 0),
(31, 9, 20, 'A', 1),
(32, 9, 21, 'C', 1),
(33, 10, 3, 'B', 0),
(34, 10, 8, 'E', 0),
(35, 10, 9, 'C', 1),
(36, 11, 22, 'A', 0),
(37, 11, 23, 'A', 1),
(38, 12, 20, 'B', 0),
(39, 12, 21, 'D', 0),
(40, 13, 16, 'B', 0),
(41, 13, 17, 'C', 0),
(42, 14, 22, 'B', 1),
(43, 14, 23, 'A', 1),
(44, 15, 20, 'C', 0),
(45, 15, 21, 'C', 1),
(46, 16, 20, 'A', 1),
(47, 16, 21, 'C', 1),
(48, 17, 14, 'A', 0),
(49, 17, 15, 'A', 0),
(50, 18, 4, 'A', 0),
(51, 18, 5, 'A', 1),
(52, 19, 22, 'B', 1),
(53, 19, 23, 'C', 0),
(54, 20, 22, 'B', 1),
(55, 20, 23, 'B', 0);

-- --------------------------------------------------------

--
-- Estrutura para tabela `simulados`
--

CREATE TABLE `simulados` (
  `id` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `materia_id` int(11) DEFAULT NULL,
  `nivel` enum('iniciante','intermediario','avancado') NOT NULL DEFAULT 'intermediario',
  `descricao` varchar(255) NOT NULL,
  `tipo` enum('geral','materia') NOT NULL DEFAULT 'materia',
  `criado_em` datetime DEFAULT current_timestamp(),
  `gratuito` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `simulados`
--

INSERT INTO `simulados` (`id`, `titulo`, `materia_id`, `nivel`, `descricao`, `tipo`, `criado_em`, `gratuito`) VALUES
(1, 'Simulado de Português', 1, 'iniciante', 'Questões de interpretação e linguagem.', 'materia', '2026-09-15 16:04:24', 1),
(2, 'Simulado de Matemática', 2, 'intermediario', 'Questões sobre funções e raciocínio matemático.', 'materia', '2026-09-15 16:04:24', 1),
(3, 'Simulado de Língua Portuguesa', 1, 'intermediario', 'Questões de interpretação de texto, gramática e linguagem.', 'materia', '2026-09-29 09:01:01', 1),
(4, 'Simulado de Língua Estrangeira', 9, 'intermediario', 'Questões de Inglês e Espanhol.', 'materia', '2026-09-29 09:01:01', 0),
(5, 'Simulado de Biologia', 5, 'intermediario', 'Questões de citologia, genética, ecologia e evolução.', 'materia', '2026-09-29 09:01:02', 0),
(6, 'Simulado de Química', 7, 'intermediario', 'Questões de química geral, estrutura atômica, ligações e reações.', 'materia', '2026-09-29 09:01:02', 0),
(7, 'Simulado de Física', 6, 'intermediario', 'Questões de mecânica, energia, movimento e eletricidade.', 'materia', '2026-09-29 09:01:02', 0),
(8, 'Simulado de História', 3, 'intermediario', 'Questões de História do Brasil e História Geral.', 'materia', '2026-09-29 09:01:02', 0),
(9, 'Simulado de Geografia', 4, 'intermediario', 'Questões de geografia física, humana, política e econômica.', 'materia', '2026-09-29 09:01:02', 0),
(10, 'Simulado de Filosofia', 10, 'intermediario', 'Questões de filosofia antiga, moderna, ética e política.', 'materia', '2026-09-29 09:01:02', 0),
(11, 'Simulado de Sociologia', 11, 'intermediario', 'Questões de sociedade, cultura, política e desigualdade social.', 'materia', '2026-09-29 09:01:02', 0),
(12, 'Simulado ENEM — Todas as Matérias', NULL, 'avancado', 'Simulado geral com questões de todas as matérias do BRIO.', 'geral', '2026-09-29 09:01:02', 0);

-- --------------------------------------------------------

--
-- Estrutura para tabela `tarefas`
--

CREATE TABLE `tarefas` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `data` date NOT NULL,
  `horario` time DEFAULT NULL,
  `duracao` int(11) DEFAULT NULL,
  `tipo` enum('estudo','simulado','redacao','outro') NOT NULL DEFAULT 'estudo',
  `status` enum('pendente','concluida') NOT NULL DEFAULT 'pendente',
  `criado_em` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tarefas`
--

INSERT INTO `tarefas` (`id`, `usuario_id`, `titulo`, `descricao`, `data`, `horario`, `duracao`, `tipo`, `status`, `criado_em`) VALUES
(1, 2, 'Estudar interpretação de texto', 'Revisar conteúdo de Português.', '2026-09-15', '14:00:00', 50, 'estudo', 'pendente', '2026-09-15 16:04:24'),
(2, 2, 'Fazer simulado', 'Realizar um simulado de Português.', '2026-09-15', '16:00:00', 40, 'simulado', 'pendente', '2026-09-15 16:04:24'),
(3, 4, 'Prova', 'estudar', '2026-09-30', '13:55:00', 50, 'estudo', 'concluida', '2026-09-29 09:50:15'),
(4, 4, 'estudar', 'matematica funcoes', '2026-10-01', '14:50:00', 50, 'simulado', 'pendente', '2026-09-29 09:50:52'),
(5, 19, 'Estudar matemática', 'Funções', '2026-11-17', '16:30:00', 50, 'estudo', 'pendente', '2026-11-03 16:21:25'),
(6, 19, 'Simulado', 'ENEM', '2026-11-03', '16:28:00', 50, 'simulado', 'pendente', '2026-11-03 16:27:19'),
(10, 34, 'Historia', 'Guerra Mundial', '2026-11-12', '09:50:00', 50, 'simulado', 'concluida', '2026-11-10 09:47:07');

-- --------------------------------------------------------

--
-- Estrutura para tabela `temas_redacao`
--

CREATE TABLE `temas_redacao` (
  `id` int(11) NOT NULL,
  `titulo` varchar(180) NOT NULL,
  `proposta` text NOT NULL,
  `orientacoes` text DEFAULT NULL,
  `criado_em` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `temas_redacao`
--

INSERT INTO `temas_redacao` (`id`, `titulo`, `proposta`, `orientacoes`, `criado_em`) VALUES
(1, 'Os impactos da tecnologia na educação', 'A tecnologia está cada vez mais presente no processo de aprendizagem. Discuta os impactos positivos e os desafios de seu uso na educação.', 'Apresente uma tese clara, desenvolva argumentos e finalize com uma proposta de intervenção coerente.', '2026-09-15 16:04:24'),
(2, 'Desafios para manter uma rotina de estudos', 'A falta de organização e as distrações podem dificultar a constância nos estudos. Discuta estratégias para enfrentar esse problema.', 'Utilize argumentos relacionados à rotina, disciplina, ambiente de estudo e uso consciente da tecnologia.', '2026-09-15 16:04:24'),
(3, 'O papel da educação na transformação social', 'Discuta como a educação pode contribuir para mudanças sociais e para a formação de cidadãos.', 'Construa uma argumentação organizada e apresente uma conclusão relacionada ao problema discutido.', '2026-09-15 16:04:24'),
(4, 'Os desafios da saúde mental entre os jovens brasileiros', 'Discuta os fatores que afetam a saúde mental dos jovens e os caminhos para ampliar o cuidado psicológico.', 'Aborde a pressão social, o ambiente escolar e o acesso à saúde.', '2026-11-03 16:33:52'),
(5, 'A importância da preservação ambiental no Brasil', 'Analise os desafios para proteger o meio ambiente e promover o desenvolvimento sustentável.', 'Considere o desmatamento, a educação ambiental e as políticas públicas.', '2026-11-03 16:33:52'),
(6, 'O combate ao bullying nas escolas brasileiras', 'Discuta as consequências do bullying e estratégias para construir ambientes escolares seguros.', 'Apresente medidas de prevenção e conscientização.', '2026-11-03 16:33:52'),
(7, 'A desigualdade social e seus impactos na educação', 'Analise como as diferenças socioeconômicas afetam as oportunidades educacionais.', 'Considere o acesso à escola, a permanência e a inclusão.', '2026-11-03 16:33:52'),
(8, 'Os desafios da inclusão digital no Brasil', 'Discuta as dificuldades de acesso à internet e às tecnologias digitais.', 'Aborde infraestrutura, desigualdade e educação digital.', '2026-11-03 16:33:52'),
(9, 'A importância da leitura na formação dos jovens', 'Analise o papel da leitura no desenvolvimento intelectual e social.', 'Discuta o incentivo à leitura e o acesso aos livros.', '2026-11-03 16:33:52'),
(10, 'O combate à desinformação nas redes sociais', 'Discuta os impactos das notícias falsas na sociedade brasileira.', 'Aborde educação midiática e responsabilidade digital.', '2026-11-03 16:33:52'),
(11, 'Os desafios da mobilidade urbana nas grandes cidades', 'Analise os problemas de transporte e deslocamento nos centros urbanos.', 'Considere transporte público, acessibilidade e sustentabilidade.', '2026-11-03 16:33:52'),
(12, 'A valorização dos professores na sociedade brasileira', 'Discuta a importância dos educadores e os desafios enfrentados pela profissão.', 'Considere formação, remuneração e condições de trabalho.', '2026-11-03 16:33:52'),
(13, 'Os impactos do uso excessivo das redes sociais', 'Analise como o uso intenso das redes sociais influencia o comportamento e as relações humanas.', 'Considere saúde mental, produtividade e convivência social.', '2026-11-03 16:33:52'),
(14, 'A importância da educação financeira para os jovens', 'Discuta como o conhecimento financeiro pode contribuir para decisões mais conscientes.', 'Aborde consumo, planejamento e endividamento.', '2026-11-03 16:33:52'),
(15, 'O combate ao desperdício de alimentos no Brasil', 'Analise as causas e consequências do desperdício de alimentos.', 'Considere consumo responsável e segurança alimentar.', '2026-11-03 16:33:52'),
(16, 'Os desafios da acessibilidade para pessoas com deficiência', 'Discuta os obstáculos enfrentados por pessoas com deficiência na sociedade.', 'Aborde inclusão, infraestrutura e direitos.', '2026-11-03 16:33:52'),
(17, 'A importância do esporte na formação dos jovens', 'Analise como a prática esportiva contribui para o desenvolvimento pessoal e social.', 'Considere saúde, disciplina e inclusão.', '2026-11-03 16:33:52'),
(18, 'Os desafios do envelhecimento da população brasileira', 'Discuta os impactos sociais do aumento da população idosa.', 'Aborde saúde, previdência e qualidade de vida.', '2026-11-03 16:33:52'),
(19, 'A preservação da cultura e da identidade brasileira', 'Analise a importância de valorizar as manifestações culturais do Brasil.', 'Considere diversidade, patrimônio e educação.', '2026-11-03 16:33:52'),
(20, 'O papel da escola no combate ao preconceito', 'Discuta como a educação pode contribuir para uma sociedade mais respeitosa.', 'Aborde diversidade, cidadania e inclusão.', '2026-11-03 16:33:52'),
(21, 'Os desafios do primeiro emprego para os jovens', 'Analise as dificuldades de ingresso dos jovens no mercado de trabalho.', 'Considere qualificação, experiência e oportunidades.', '2026-11-03 16:33:52'),
(22, 'A importância do consumo consciente na sociedade', 'Discuta os impactos do consumo excessivo e a necessidade de hábitos sustentáveis.', 'Aborde publicidade, meio ambiente e responsabilidade individual.', '2026-11-03 16:33:52'),
(23, 'Os desafios da segurança de dados na internet', 'Analise os riscos relacionados à exposição de informações pessoais no ambiente digital.', 'Considere privacidade, golpes virtuais e educação tecnológica.', '2026-11-03 16:33:52');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tentativas`
--

CREATE TABLE `tentativas` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `simulado_id` int(11) NOT NULL,
  `acertos` int(11) NOT NULL DEFAULT 0,
  `erros` int(11) NOT NULL DEFAULT 0,
  `percentual` decimal(5,2) NOT NULL DEFAULT 0.00,
  `xp_ganho` int(11) NOT NULL DEFAULT 0,
  `realizado_em` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tentativas`
--

INSERT INTO `tentativas` (`id`, `usuario_id`, `simulado_id`, `acertos`, `erros`, `percentual`, `xp_ganho`, `realizado_em`) VALUES
(1, 3, 2, 0, 1, 0.00, 30, '2026-09-22 16:10:27'),
(2, 3, 2, 0, 1, 0.00, 30, '2026-09-22 16:36:07'),
(3, 3, 1, 0, 2, 0.00, 30, '2026-09-22 17:24:52'),
(4, 4, 11, 1, 1, 50.00, 35, '2026-09-29 09:36:14'),
(5, 4, 11, 1, 1, 50.00, 35, '2026-09-29 10:31:42'),
(6, 17, 12, 0, 10, 0.00, 30, '2026-11-03 11:01:35'),
(7, 17, 12, 0, 10, 0.00, 30, '2026-11-03 11:07:32'),
(8, 17, 11, 0, 2, 0.00, 30, '2026-11-03 11:14:03'),
(9, 17, 10, 2, 0, 100.00, 40, '2026-11-03 11:14:17'),
(10, 17, 2, 1, 2, 33.33, 35, '2026-11-03 11:14:44'),
(11, 18, 11, 1, 1, 50.00, 35, '2026-11-03 11:17:21'),
(12, 18, 10, 0, 2, 0.00, 30, '2026-11-03 14:53:36'),
(13, 17, 8, 0, 2, 0.00, 30, '2026-11-03 15:41:20'),
(14, 19, 11, 2, 0, 100.00, 40, '2026-11-03 16:44:04'),
(15, 19, 10, 1, 1, 50.00, 35, '2026-11-03 16:44:17'),
(16, 18, 10, 2, 0, 100.00, 40, '2026-11-09 08:43:58'),
(17, 18, 7, 0, 2, 0.00, 30, '2026-11-10 08:37:42'),
(18, 35, 3, 1, 1, 50.00, 35, '2026-11-10 10:01:25'),
(19, 18, 11, 1, 1, 50.00, 35, '2026-11-10 10:09:48'),
(20, 18, 11, 1, 1, 50.00, 35, '2026-11-10 10:21:01');

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nome` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `tipo` enum('aluno','professor') NOT NULL DEFAULT 'aluno',
  `objetivo` varchar(120) DEFAULT NULL,
  `plano_atual_id` int(11) DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `usuarios`
--

INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha`, `tipo`, `objetivo`, `plano_atual_id`, `criado_em`) VALUES
(1, 'Professor BRIO', 'professor@brio.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'professor', 'Correção de redações', NULL, '2026-09-15 16:04:24'),
(2, 'Aluno BRIO', 'aluno@brio.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'aluno', 'Vestibular', NULL, '2026-09-15 16:04:24'),
(3, 'laura', 'laura@gmail.com', '8bb0cf6eb9b17d0f7d22b456f121257dc1254e1f01665370476383ea776df414', 'aluno', 'enem', NULL, '2026-09-22 16:07:53'),
(4, 'Pedro Gomes', 'pedro.gomes@gmail.com', '9b860aafd69380064251d530a553177b2efe9c8c8ef335c6a145c93c0d47df8d', 'aluno', 'ENEM', NULL, '2026-09-29 08:21:48'),
(5, 'Ana Laura Santos', 'ana.laura@gmail.com', 'e82827b00b2ca8620beb37f879778c082b292a52270390cff35b6fe3157f4e8b', 'aluno', 'enem', NULL, '2026-09-29 10:39:11'),
(6, 'Laura Aguirre', 'laura.a.moraes@aluno.senai.br', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'aluno', 'enem', NULL, '2026-10-06 16:15:43'),
(7, 'Rayane Pereira', 'rayane@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'aluno', 'enem', NULL, '2026-10-20 16:40:03'),
(8, 'Luan Santana', 'luan.santana@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'aluno', 'enem', 1, '2026-10-20 16:47:33'),
(9, 'Pedro Costa', 'pedro.costa@gmail.com', '96cae35ce8a9b0244178bf28e4966c2ce1b8385723a96a6b838858cdd6ca0a1e', 'aluno', 'enem', NULL, '2026-10-27 14:30:09'),
(10, 'Pedro Costa', 'pedrocosta@gmail.com', '96cae35ce8a9b0244178bf28e4966c2ce1b8385723a96a6b838858cdd6ca0a1e', 'aluno', 'enem', NULL, '2026-10-27 14:47:34'),
(11, 'Arthur Lima', 'arthur@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'aluno', 'enem', NULL, '2026-10-27 15:47:55'),
(12, 'Luana Gomes', 'luana.gomes@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'aluno', 'enem', NULL, '2026-11-03 09:36:18'),
(13, 'Lucas Eduardo', 'lucas123@gmail.com', '96cae35ce8a9b0244178bf28e4966c2ce1b8385723a96a6b838858cdd6ca0a1e', 'aluno', 'enem', 4, '2026-11-03 09:44:19'),
(14, 'Lais Oliveira', 'lais@gmail.com', 'a320480f534776bddb5cdb54b1e93d210a3c7d199e80a23c1b2178497b184c76', 'aluno', 'enem', 4, '2026-11-03 10:01:11'),
(15, 'Kaua Ramon', 'kaua@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'aluno', 'enem', 1, '2026-11-03 10:20:44'),
(16, 'João Paulo', 'joao@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'aluno', 'enem', 1, '2026-11-03 10:23:49'),
(17, 'Giovana Machado', 'giovana@gmail.com', '0da1b10b8e887f06bb42196da69f4d31494614e97dd6d23c05a01274cee1831d', 'aluno', 'enem', 4, '2026-11-03 10:26:38'),
(18, 'Elienai Rodrigues', 'elienai@gmail.com', '4d4cf0a595de51852ad415ea67be0b5ae46b2d857060419a4483067f943e04fb', 'aluno', 'vestibular', 2, '2026-11-03 10:49:27'),
(19, 'Rayane Pereira', 'rayane123@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'aluno', 'ufpr', 3, '2026-11-03 16:13:47'),
(20, 'João Carlos', 'joao123@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'professor', '', NULL, '2026-11-03 17:03:10'),
(21, 'Joaquim Alexandre', 'joaquim@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'professor', '', NULL, '2026-11-03 17:04:38'),
(22, 'Edivan Pereira', 'edivan@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'professor', '', NULL, '2026-11-03 17:07:06'),
(23, 'Pedro Silva', 'pedro@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'professor', '', NULL, '2026-11-03 17:13:18'),
(24, 'Matheus Souza', 'matheus123@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'professor', '', NULL, '2026-11-09 07:55:46'),
(25, 'Ana Carolina Carvalho', 'anaca@gmail.com', '64c3ac348f3ced0f7b407bd975705339875af4be9d70a2d906254e5229ff9017', 'professor', '', NULL, '2026-11-09 08:42:57'),
(26, 'Beatriz Pereira', 'bia123@gmail.com', 'c35a316e6b9cb9cb67acf5b3eea8595ea0387f2601068c87bacec713f159d2b0', 'aluno', 'enem', 4, '2026-11-09 08:54:47'),
(27, 'Cassiano Miranda', 'cassiano@gmail.com', 'c8860d0d0b33653f27e31bbd8d0b93f67144331ed31e1cc66d732659d795ad9d', 'aluno', 'enem', 2, '2026-11-09 09:24:09'),
(28, 'Gabriel Silva', 'gabriel@outlook.com', 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', 'aluno', 'enem', 4, '2026-11-09 09:42:21'),
(29, 'Cassiano de Miranda Farias', 'cassiano.farias@aluno.senai.br', '547bb48e381b780be1912f1ecd7649317b786cbcda551f837fbaf2bb7f1595c9', 'aluno', 'enem', NULL, '2026-11-09 09:50:26'),
(30, 'joao paulo', 'jpaulo@sp.senai.br', '5d342d18aad2ee28f6e3495f802ea2bf801d7c29c117efa24496a20efdfe7be6', 'aluno', 'enem', 4, '2026-11-09 14:56:24'),
(31, 'William Komel', 'william@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'professor', '', NULL, '2026-11-10 08:59:08'),
(32, 'William Komel', 'william123@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'professor', '', NULL, '2026-11-10 09:17:16'),
(33, 'Maria Clara Silva', 'mariaclara123@gmail.com', '64c3ac348f3ced0f7b407bd975705339875af4be9d70a2d906254e5229ff9017', 'aluno', 'enem', 1, '2026-11-10 09:18:20'),
(34, 'Carlos Santana', 'carlinhos123@gmail.com', '3201c11fc1b5fab192c244ed94f6dc59a9ad55277ffb91131498d7cd149c585e', 'aluno', 'ufpr', 2, '2026-11-10 09:27:12'),
(35, 'João Pedro Gomes', 'jpgg@gmail.com', '68fe1c4cd68188e7e332bf91b6213bb034ac50d13421fd1084bcb2740e5f6916', 'aluno', 'enem', 4, '2026-11-10 09:50:25'),
(36, 'Edivan Pereira', 'edivan123@gmail.com', '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef', 'professor', '', NULL, '2026-11-10 10:06:36'),
(37, 'Giovanna Machado', 'gi123@gmail.com', '7d5b042bf3e64d1624c72d76f4d9fe27fca92bdc22baf12b3ce49e99b26ba365', 'aluno', 'enem', 2, '2026-11-10 10:07:18'),
(38, 'Nicole Santana', 'nicole@outlook.com', 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', 'aluno', 'enem', 3, '2026-11-10 10:11:05'),
(39, 'Laura Aguirre de Moraes', 'laura123@gmail.com', '14489612491aeab09b47b992701a2659667512c171c754d791bf407bd1a75510', 'aluno', 'vestibular', 3, '2026-11-10 10:22:19');

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuario_conquistas`
--

CREATE TABLE `usuario_conquistas` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `conquista_id` int(11) NOT NULL,
  `conquistada_em` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `usuario_conquistas`
--

INSERT INTO `usuario_conquistas` (`id`, `usuario_id`, `conquista_id`, `conquistada_em`) VALUES
(1, 4, 7, '2026-09-29 10:31:18'),
(6, 18, 6, '2026-11-03 11:17:02'),
(8, 18, 7, '2026-11-03 11:17:25'),
(39, 18, 11, '2026-11-03 14:54:41'),
(40, 18, 14, '2026-11-03 14:54:41'),
(91, 18, 10, '2026-11-10 08:46:05');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `assinaturas`
--
ALTER TABLE `assinaturas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `plano_id` (`plano_id`);

--
-- Índices de tabela `conquistas`
--
ALTER TABLE `conquistas`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `conteudos`
--
ALTER TABLE `conteudos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `materia_id` (`materia_id`);

--
-- Índices de tabela `correcoes`
--
ALTER TABLE `correcoes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `redacao_id` (`redacao_id`),
  ADD KEY `professor_id` (`professor_id`);

--
-- Índices de tabela `documentos_professores`
--
ALTER TABLE `documentos_professores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario_id` (`usuario_id`);

--
-- Índices de tabela `materias`
--
ALTER TABLE `materias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nome` (`nome`);

--
-- Índices de tabela `planos`
--
ALTER TABLE `planos`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `pontuacoes`
--
ALTER TABLE `pontuacoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Índices de tabela `progresso_conteudo`
--
ALTER TABLE `progresso_conteudo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario_conteudo_unique` (`usuario_id`,`conteudo_id`),
  ADD KEY `conteudo_id` (`conteudo_id`);

--
-- Índices de tabela `progresso_conteudos`
--
ALTER TABLE `progresso_conteudos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_progresso` (`usuario_id`,`conteudo_id`),
  ADD KEY `conteudo_id` (`conteudo_id`);

--
-- Índices de tabela `questoes`
--
ALTER TABLE `questoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `simulado_id` (`simulado_id`);

--
-- Índices de tabela `redacoes`
--
ALTER TABLE `redacoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `tema_id` (`tema_id`);

--
-- Índices de tabela `respostas`
--
ALTER TABLE `respostas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tentativa_id` (`tentativa_id`),
  ADD KEY `questao_id` (`questao_id`);

--
-- Índices de tabela `simulados`
--
ALTER TABLE `simulados`
  ADD PRIMARY KEY (`id`),
  ADD KEY `materia_id` (`materia_id`);

--
-- Índices de tabela `tarefas`
--
ALTER TABLE `tarefas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Índices de tabela `temas_redacao`
--
ALTER TABLE `temas_redacao`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `tentativas`
--
ALTER TABLE `tentativas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `simulado_id` (`simulado_id`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_usuario_plano` (`plano_atual_id`);

--
-- Índices de tabela `usuario_conquistas`
--
ALTER TABLE `usuario_conquistas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_conquista` (`usuario_id`,`conquista_id`),
  ADD KEY `conquista_id` (`conquista_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `assinaturas`
--
ALTER TABLE `assinaturas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT de tabela `conquistas`
--
ALTER TABLE `conquistas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de tabela `conteudos`
--
ALTER TABLE `conteudos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;

--
-- AUTO_INCREMENT de tabela `correcoes`
--
ALTER TABLE `correcoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `documentos_professores`
--
ALTER TABLE `documentos_professores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `materias`
--
ALTER TABLE `materias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de tabela `planos`
--
ALTER TABLE `planos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `pontuacoes`
--
ALTER TABLE `pontuacoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=78;

--
-- AUTO_INCREMENT de tabela `progresso_conteudo`
--
ALTER TABLE `progresso_conteudo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `progresso_conteudos`
--
ALTER TABLE `progresso_conteudos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de tabela `questoes`
--
ALTER TABLE `questoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de tabela `redacoes`
--
ALTER TABLE `redacoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `respostas`
--
ALTER TABLE `respostas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT de tabela `simulados`
--
ALTER TABLE `simulados`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de tabela `tarefas`
--
ALTER TABLE `tarefas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `temas_redacao`
--
ALTER TABLE `temas_redacao`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de tabela `tentativas`
--
ALTER TABLE `tentativas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT de tabela `usuario_conquistas`
--
ALTER TABLE `usuario_conquistas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=109;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `assinaturas`
--
ALTER TABLE `assinaturas`
  ADD CONSTRAINT `assinaturas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assinaturas_ibfk_2` FOREIGN KEY (`plano_id`) REFERENCES `planos` (`id`);

--
-- Restrições para tabelas `conteudos`
--
ALTER TABLE `conteudos`
  ADD CONSTRAINT `conteudos_ibfk_1` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`);

--
-- Restrições para tabelas `correcoes`
--
ALTER TABLE `correcoes`
  ADD CONSTRAINT `correcoes_ibfk_1` FOREIGN KEY (`redacao_id`) REFERENCES `redacoes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `correcoes_ibfk_2` FOREIGN KEY (`professor_id`) REFERENCES `usuarios` (`id`);

--
-- Restrições para tabelas `documentos_professores`
--
ALTER TABLE `documentos_professores`
  ADD CONSTRAINT `documentos_professores_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Restrições para tabelas `pontuacoes`
--
ALTER TABLE `pontuacoes`
  ADD CONSTRAINT `pontuacoes_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `progresso_conteudo`
--
ALTER TABLE `progresso_conteudo`
  ADD CONSTRAINT `progresso_conteudo_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `progresso_conteudo_ibfk_2` FOREIGN KEY (`conteudo_id`) REFERENCES `conteudos` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `progresso_conteudos`
--
ALTER TABLE `progresso_conteudos`
  ADD CONSTRAINT `progresso_conteudos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `progresso_conteudos_ibfk_2` FOREIGN KEY (`conteudo_id`) REFERENCES `conteudos` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `questoes`
--
ALTER TABLE `questoes`
  ADD CONSTRAINT `questoes_ibfk_1` FOREIGN KEY (`simulado_id`) REFERENCES `simulados` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `redacoes`
--
ALTER TABLE `redacoes`
  ADD CONSTRAINT `redacoes_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `redacoes_ibfk_2` FOREIGN KEY (`tema_id`) REFERENCES `temas_redacao` (`id`);

--
-- Restrições para tabelas `respostas`
--
ALTER TABLE `respostas`
  ADD CONSTRAINT `respostas_ibfk_1` FOREIGN KEY (`tentativa_id`) REFERENCES `tentativas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `respostas_ibfk_2` FOREIGN KEY (`questao_id`) REFERENCES `questoes` (`id`);

--
-- Restrições para tabelas `simulados`
--
ALTER TABLE `simulados`
  ADD CONSTRAINT `simulados_ibfk_1` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`);

--
-- Restrições para tabelas `tarefas`
--
ALTER TABLE `tarefas`
  ADD CONSTRAINT `tarefas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `tentativas`
--
ALTER TABLE `tentativas`
  ADD CONSTRAINT `tentativas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tentativas_ibfk_2` FOREIGN KEY (`simulado_id`) REFERENCES `simulados` (`id`);

--
-- Restrições para tabelas `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuario_plano` FOREIGN KEY (`plano_atual_id`) REFERENCES `planos` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `usuario_conquistas`
--
ALTER TABLE `usuario_conquistas`
  ADD CONSTRAINT `usuario_conquistas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `usuario_conquistas_ibfk_2` FOREIGN KEY (`conquista_id`) REFERENCES `conquistas` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

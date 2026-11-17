-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 06/10/2026 às 21:22
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
-- Banco de dados: `fitlink`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_academia`
--

CREATE TABLE `tb_academia` (
  `id_academia` int(20) NOT NULL,
  `nomeacademia` varchar(100) NOT NULL,
  `endereco` varchar(100) NOT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL,
  `place_id` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_academia`
--

INSERT INTO `tb_academia` (`id_academia`, `nomeacademia`, `endereco`, `cidade`, `estado`, `place_id`, `latitude`, `longitude`) VALUES
(1, 'Academia Overcome', 'Endereço não informado no OpenStreetMap', NULL, NULL, 'way/1174873775', -22.97490300, -49.87123300),
(2, 'CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga', 'Rua Quatorze de Julho, 804 - Vila Margarida ', 'Ourinhos', 'SP', 'node/13349016956', -22.97447320, -49.87878170),
(3, 'PAULO ALVES GYMNASIUM', 'Avenida Ailson Ramos dos Santos, 915 - Popular', 'Andirá', 'SP', 'node/12081481710', -23.05699610, -50.22387360),
(4, 'Studio Vip', 'Rua Geraldo Dermarchi ', 'Andirá', 'SP', 'node/13741587280', -23.06002290, -50.23420130);

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_agenda`
--

CREATE TABLE `tb_agenda` (
  `id_agenda` int(20) NOT NULL,
  `dia` date NOT NULL,
  `horario` time NOT NULL,
  `id_academia` int(20) DEFAULT NULL,
  `id_cref` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_agenda`
--

INSERT INTO `tb_agenda` (`id_agenda`, `dia`, `horario`, `id_academia`, `id_cref`) VALUES
(1, '2026-09-15', '07:00:00', 2, 987654),
(3, '2026-09-21', '07:00:00', 2, 987654),
(4, '2026-09-21', '12:00:00', 2, 987654),
(5, '2026-09-21', '21:00:00', 2, 987654),
(8, '2026-09-15', '03:00:00', 2, 987654),
(9, '2026-09-15', '04:00:00', 2, 987654),
(10, '2026-09-15', '05:00:00', 2, 987654),
(11, '2026-09-15', '06:00:00', 2, 987654),
(12, '2026-09-15', '08:00:00', 2, 987654),
(13, '2026-09-15', '09:00:00', 2, 987654),
(14, '2026-09-15', '10:00:00', 2, 987654),
(15, '2026-09-15', '11:00:00', 2, 987654),
(16, '2026-09-15', '12:00:00', 2, 987654),
(17, '2026-09-15', '13:00:00', 2, 987654),
(18, '2026-09-15', '14:00:00', 2, 987654),
(19, '2026-09-15', '15:00:00', 2, 987654),
(20, '2026-09-15', '16:00:00', 2, 987654),
(21, '2026-09-15', '17:00:00', 2, 987654),
(22, '2026-09-15', '18:00:00', 2, 987654),
(23, '2026-09-15', '19:00:00', 2, 987654),
(24, '2026-09-15', '20:00:00', 2, 987654),
(25, '2026-09-15', '21:00:00', 2, 987654),
(26, '2026-09-16', '03:00:00', 2, 987654),
(27, '2026-09-16', '04:00:00', 2, 987654),
(28, '2026-09-16', '05:00:00', 2, 987654),
(29, '2026-09-16', '06:00:00', 2, 987654),
(30, '2026-09-16', '07:00:00', 2, 987654),
(31, '2026-09-16', '08:00:00', 2, 987654),
(32, '2026-09-16', '09:00:00', 2, 987654),
(33, '2026-09-16', '10:00:00', 2, 987654),
(34, '2026-09-16', '11:00:00', 2, 987654),
(35, '2026-09-16', '12:00:00', 2, 987654),
(36, '2026-09-16', '13:00:00', 2, 987654),
(37, '2026-09-16', '14:00:00', 2, 987654),
(38, '2026-09-16', '15:00:00', 2, 987654),
(39, '2026-09-16', '16:00:00', 2, 987654),
(40, '2026-09-16', '17:00:00', 2, 987654),
(41, '2026-09-16', '18:00:00', 2, 987654),
(42, '2026-09-16', '19:00:00', 2, 987654),
(43, '2026-09-16', '20:00:00', 2, 987654),
(44, '2026-09-16', '21:00:00', 2, 987654),
(45, '2026-09-20', '07:00:00', 2, 987654),
(46, '2026-09-20', '08:00:00', 2, 987654),
(47, '2026-09-20', '09:00:00', 2, 987654),
(48, '2026-09-20', '10:00:00', 2, 987654),
(49, '2026-09-20', '11:00:00', 2, 987654),
(50, '2026-09-20', '12:00:00', 2, 987654),
(51, '2026-09-19', '07:00:00', 2, 987654),
(52, '2026-09-19', '08:00:00', 2, 987654),
(53, '2026-09-19', '09:00:00', 2, 987654),
(54, '2026-09-19', '10:00:00', 2, 987654),
(55, '2026-09-19', '11:00:00', 2, 987654),
(56, '2026-09-19', '12:00:00', 2, 987654),
(57, '2026-09-19', '13:00:00', 2, 987654),
(58, '2026-09-19', '14:00:00', 2, 987654),
(59, '2026-09-21', '03:00:00', 2, 987654),
(60, '2026-09-21', '04:00:00', 2, 987654),
(61, '2026-09-21', '05:00:00', 2, 987654),
(62, '2026-09-21', '06:00:00', 2, 987654),
(63, '2026-09-21', '08:00:00', 2, 987654),
(64, '2026-09-21', '09:00:00', 2, 987654),
(65, '2026-09-21', '10:00:00', 2, 987654),
(66, '2026-09-21', '11:00:00', 2, 987654),
(67, '2026-09-21', '13:00:00', 2, 987654),
(68, '2026-09-21', '14:00:00', 2, 987654),
(69, '2026-09-21', '15:00:00', 2, 987654),
(70, '2026-09-21', '16:00:00', 2, 987654),
(71, '2026-09-21', '17:00:00', 2, 987654),
(72, '2026-09-21', '18:00:00', 2, 987654),
(73, '2026-09-21', '19:00:00', 2, 987654),
(74, '2026-09-21', '20:00:00', 2, 987654),
(75, '2026-09-25', '03:00:00', 2, 987654),
(76, '2026-09-25', '04:00:00', 2, 987654),
(77, '2026-09-25', '05:00:00', 2, 987654),
(78, '2026-09-25', '06:00:00', 2, 987654),
(79, '2026-09-25', '07:00:00', 2, 987654),
(80, '2026-09-25', '08:00:00', 2, 987654),
(81, '2026-09-25', '09:00:00', 2, 987654),
(82, '2026-09-25', '10:00:00', 2, 987654),
(83, '2026-09-25', '11:00:00', 2, 987654),
(84, '2026-09-25', '12:00:00', 2, 987654),
(85, '2026-09-25', '13:00:00', 2, 987654),
(86, '2026-09-25', '14:00:00', 2, 987654),
(87, '2026-09-25', '15:00:00', 2, 987654),
(88, '2026-09-25', '16:00:00', 2, 987654),
(89, '2026-09-25', '17:00:00', 2, 987654),
(90, '2026-09-25', '18:00:00', 2, 987654),
(91, '2026-09-25', '19:00:00', 2, 987654),
(92, '2026-09-25', '20:00:00', 2, 987654),
(93, '2026-09-25', '21:00:00', 2, 987654),
(94, '2026-09-27', '07:00:00', 2, 987654),
(95, '2026-09-27', '08:00:00', 2, 987654),
(96, '2026-09-27', '09:00:00', 2, 987654),
(97, '2026-09-27', '10:00:00', 2, 987654),
(98, '2026-09-27', '11:00:00', 2, 987654),
(99, '2026-09-27', '12:00:00', 2, 987654),
(100, '2026-09-22', '03:00:00', 2, 987654),
(101, '2026-09-22', '04:00:00', 2, 987654),
(102, '2026-09-22', '05:00:00', 2, 987654),
(103, '2026-09-22', '06:00:00', 2, 987654),
(104, '2026-09-22', '07:00:00', 2, 987654),
(105, '2026-09-22', '08:00:00', 2, 987654),
(106, '2026-09-22', '09:00:00', 2, 987654),
(107, '2026-09-22', '10:00:00', 2, 987654),
(108, '2026-09-22', '11:00:00', 2, 987654),
(109, '2026-09-22', '12:00:00', 2, 987654),
(110, '2026-09-22', '13:00:00', 2, 987654),
(111, '2026-09-22', '14:00:00', 2, 987654),
(112, '2026-09-22', '15:00:00', 2, 987654),
(113, '2026-09-22', '16:00:00', 2, 987654),
(114, '2026-09-22', '17:00:00', 2, 987654),
(115, '2026-09-22', '18:00:00', 2, 987654),
(116, '2026-09-22', '19:00:00', 2, 987654),
(117, '2026-09-22', '20:00:00', 2, 987654),
(118, '2026-09-22', '21:00:00', 2, 987654),
(119, '2026-10-08', '03:00:00', 2, 987654),
(120, '2026-10-08', '04:00:00', 2, 987654),
(121, '2026-10-08', '05:00:00', 2, 987654),
(122, '2026-10-08', '06:00:00', 2, 987654),
(123, '2026-10-08', '07:00:00', 2, 987654),
(124, '2026-10-09', '03:00:00', 2, 987654),
(125, '2026-10-09', '04:00:00', 2, 987654),
(126, '2026-10-09', '05:00:00', 2, 987654),
(127, '2026-10-09', '06:00:00', 2, 987654),
(128, '2026-10-09', '07:00:00', 2, 987654),
(129, '2026-10-09', '08:00:00', 2, 987654),
(130, '2026-10-09', '09:00:00', 2, 987654),
(131, '2026-10-09', '10:00:00', 2, 987654),
(132, '2026-10-09', '11:00:00', 2, 987654),
(133, '2026-10-09', '12:00:00', 2, 987654),
(134, '2026-10-09', '13:00:00', 2, 987654),
(135, '2026-10-09', '14:00:00', 2, 987654),
(136, '2026-10-09', '15:00:00', 2, 987654),
(137, '2026-10-09', '16:00:00', 2, 987654),
(138, '2026-10-09', '17:00:00', 2, 987654),
(139, '2026-10-09', '18:00:00', 2, 987654),
(140, '2026-10-09', '19:00:00', 2, 987654),
(141, '2026-10-09', '20:00:00', 2, 987654),
(142, '2026-10-09', '21:00:00', 2, 987654),
(143, '2026-09-29', '03:00:00', 2, 987654),
(144, '2026-09-29', '04:00:00', 2, 987654),
(145, '2026-09-29', '05:00:00', 2, 987654),
(146, '2026-09-29', '06:00:00', 2, 987654),
(147, '2026-09-29', '07:00:00', 2, 987654),
(148, '2026-09-29', '08:00:00', 2, 987654),
(149, '2026-09-29', '09:00:00', 2, 987654),
(150, '2026-09-29', '10:00:00', 2, 987654),
(151, '2026-09-29', '11:00:00', 2, 987654),
(152, '2026-09-29', '12:00:00', 2, 987654),
(153, '2026-09-29', '13:00:00', 2, 987654),
(154, '2026-09-29', '14:00:00', 2, 987654),
(155, '2026-09-29', '15:00:00', 2, 987654),
(156, '2026-09-29', '16:00:00', 2, 987654),
(157, '2026-09-29', '17:00:00', 2, 987654),
(158, '2026-09-29', '18:00:00', 2, 987654),
(159, '2026-09-29', '19:00:00', 2, 987654),
(160, '2026-09-29', '20:00:00', 2, 987654),
(161, '2026-09-29', '21:00:00', 2, 987654),
(162, '2026-09-30', '03:00:00', 2, 987654),
(163, '2026-09-30', '04:00:00', 2, 987654),
(164, '2026-09-30', '05:00:00', 2, 987654),
(165, '2026-09-30', '06:00:00', 2, 987654),
(166, '2026-09-30', '07:00:00', 2, 987654),
(167, '2026-09-30', '08:00:00', 2, 987654),
(168, '2026-09-30', '09:00:00', 2, 987654),
(169, '2026-09-30', '10:00:00', 2, 987654),
(170, '2026-09-30', '11:00:00', 2, 987654),
(171, '2026-09-30', '12:00:00', 2, 987654),
(172, '2026-09-30', '13:00:00', 2, 987654),
(173, '2026-09-30', '14:00:00', 2, 987654),
(174, '2026-09-30', '15:00:00', 2, 987654),
(175, '2026-09-30', '16:00:00', 2, 987654),
(176, '2026-09-30', '17:00:00', 2, 987654),
(177, '2026-09-30', '18:00:00', 2, 987654),
(178, '2026-09-30', '19:00:00', 2, 987654),
(179, '2026-09-30', '20:00:00', 2, 987654),
(180, '2026-09-30', '21:00:00', 2, 987654),
(181, '2026-10-06', '03:00:00', 2, 987654),
(182, '2026-10-06', '04:00:00', 2, 987654),
(183, '2026-10-06', '05:00:00', 2, 987654),
(184, '2026-10-06', '06:00:00', 2, 987654),
(185, '2026-10-06', '07:00:00', 2, 987654),
(186, '2026-10-06', '08:00:00', 2, 987654),
(187, '2026-10-06', '09:00:00', 2, 987654),
(188, '2026-10-06', '10:00:00', 2, 987654),
(189, '2026-10-06', '11:00:00', 2, 987654),
(190, '2026-10-06', '12:00:00', 2, 987654),
(191, '2026-10-06', '13:00:00', 2, 987654),
(192, '2026-10-06', '14:00:00', 2, 987654),
(193, '2026-10-06', '15:00:00', 2, 987654),
(194, '2026-10-06', '16:00:00', 2, 987654),
(195, '2026-10-06', '17:00:00', 2, 987654),
(196, '2026-10-06', '18:00:00', 2, 987654),
(197, '2026-10-06', '19:00:00', 2, 987654),
(198, '2026-10-06', '20:00:00', 2, 987654),
(199, '2026-10-06', '21:00:00', 2, 987654),
(200, '2026-10-07', '03:00:00', 2, 987654),
(201, '2026-10-07', '04:00:00', 2, 987654),
(202, '2026-10-07', '05:00:00', 2, 987654),
(203, '2026-10-07', '06:00:00', 2, 987654),
(204, '2026-10-07', '07:00:00', 2, 987654),
(205, '2026-10-07', '08:00:00', 2, 987654),
(206, '2026-10-07', '09:00:00', 2, 987654),
(207, '2026-10-07', '10:00:00', 2, 987654),
(208, '2026-10-07', '11:00:00', 2, 987654),
(209, '2026-10-07', '12:00:00', 2, 987654),
(210, '2026-10-07', '13:00:00', 2, 987654),
(211, '2026-10-07', '14:00:00', 2, 987654),
(212, '2026-10-07', '15:00:00', 2, 987654),
(213, '2026-10-07', '16:00:00', 2, 987654),
(214, '2026-10-07', '17:00:00', 2, 987654),
(215, '2026-10-07', '18:00:00', 2, 987654),
(216, '2026-10-07', '19:00:00', 2, 987654),
(217, '2026-10-07', '20:00:00', 2, 987654),
(218, '2026-10-07', '21:00:00', 2, 987654),
(219, '2026-10-08', '08:00:00', 2, 987654),
(220, '2026-10-08', '09:00:00', 2, 987654),
(221, '2026-10-08', '10:00:00', 2, 987654),
(222, '2026-10-08', '11:00:00', 2, 987654),
(223, '2026-10-08', '12:00:00', 2, 987654),
(224, '2026-10-08', '13:00:00', 2, 987654),
(225, '2026-10-08', '14:00:00', 2, 987654),
(226, '2026-10-08', '15:00:00', 2, 987654),
(227, '2026-10-08', '16:00:00', 2, 987654),
(228, '2026-10-08', '17:00:00', 2, 987654),
(229, '2026-10-08', '18:00:00', 2, 987654),
(230, '2026-10-08', '19:00:00', 2, 987654),
(231, '2026-10-08', '20:00:00', 2, 987654),
(232, '2026-10-08', '21:00:00', 2, 987654),
(233, '2026-10-12', '03:00:00', 2, 987654),
(234, '2026-10-12', '04:00:00', 2, 987654),
(235, '2026-10-12', '05:00:00', 2, 987654),
(236, '2026-10-12', '06:00:00', 2, 987654),
(237, '2026-10-12', '07:00:00', 2, 987654),
(238, '2026-10-12', '08:00:00', 2, 987654),
(239, '2026-10-12', '09:00:00', 2, 987654),
(240, '2026-10-12', '10:00:00', 2, 987654),
(241, '2026-10-12', '11:00:00', 2, 987654),
(242, '2026-10-12', '12:00:00', 2, 987654),
(243, '2026-10-12', '13:00:00', 2, 987654),
(244, '2026-10-12', '14:00:00', 2, 987654),
(245, '2026-10-12', '15:00:00', 2, 987654),
(246, '2026-10-12', '16:00:00', 2, 987654),
(247, '2026-10-12', '17:00:00', 2, 987654),
(248, '2026-10-12', '18:00:00', 2, 987654),
(249, '2026-10-12', '19:00:00', 2, 987654),
(250, '2026-10-12', '20:00:00', 2, 987654),
(251, '2026-10-12', '21:00:00', 2, 987654);

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_aulamarcada`
--

CREATE TABLE `tb_aulamarcada` (
  `id_aula` int(20) NOT NULL,
  `id_agenda` int(20) NOT NULL,
  `id_aluno` int(20) NOT NULL,
  `id_contrato` int(20) DEFAULT NULL,
  `status` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_aulamarcada`
--

INSERT INTO `tb_aulamarcada` (`id_aula`, `id_agenda`, `id_aluno`, `id_contrato`, `status`) VALUES
(2, 81, 1, 1, 'marcada'),
(3, 96, 1, 1, 'marcada'),
(4, 104, 1, 1, 'cancelada'),
(5, 100, 1, 1, 'confirmada'),
(6, 132, 1, 2, 'confirmada'),
(7, 163, 1, 2, 'confirmada'),
(8, 200, 1, 2, 'confirmada'),
(9, 201, 1, 2, 'pendente'),
(10, 121, 1, 2, 'pendente'),
(11, 235, 1, 2, 'confirmada');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_cadastroaluno`
--

CREATE TABLE `tb_cadastroaluno` (
  `id_aluno` int(20) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `telefone` varchar(20) NOT NULL,
  `data_nascimento` int(11) NOT NULL,
  `genero` varchar(20) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `foto` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_cadastroaluno`
--

INSERT INTO `tb_cadastroaluno` (`id_aluno`, `nome`, `email`, `telefone`, `data_nascimento`, `genero`, `senha`, `foto`) VALUES
(1, 'Gabriel Castro Sanches', 'gabrieldecastrosanches@gmail.com', '14996003884', 2008, 'Masculino', '$2y$10$C8gzmuyPKb4nwuLH1NvSZufILOiZmrCYNYkQO2ObwBaxk15IVwGwe', 'img/perfil_aluno/aluno_1_9f85cc0c01fa8f1b.jpg');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_cadastropersonal`
--

CREATE TABLE `tb_cadastropersonal` (
  `id_cref` int(20) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `telefone` varchar(20) NOT NULL,
  `data_nascimento` date NOT NULL,
  `genero` varchar(20) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `foto` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_cadastropersonal`
--

INSERT INTO `tb_cadastropersonal` (`id_cref`, `nome`, `email`, `telefone`, `data_nascimento`, `genero`, `senha`, `foto`) VALUES
(987376, 'Cassiano', 'cassiano@gmail.com', '14996004779', '2003-07-29', 'Masculino', '$2y$10$Rb6QcmKQUqK2mU6SDkqQNuXoSY2XitmeP3yPj6rOBeoxpEmEcgKeu', NULL),
(987654, 'Lucas Torme', 'lucas@gmail.com', '14996053884', '1999-05-13', 'Masculino', '$2y$10$C/yv7v6jqcIvbEBa46DL5uv64p2OgcznBK6GDIKKGXKSoVNSNuTVG', 'img/perfil_personal/personal_987654_f7c5160d146bddab.jpg');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_contrato`
--

CREATE TABLE `tb_contrato` (
  `id_contrato` int(20) NOT NULL,
  `id_plano` int(20) NOT NULL,
  `id_aluno` int(20) NOT NULL,
  `data_aula` date NOT NULL,
  `horario_aula` time NOT NULL,
  `data_contratacao` datetime NOT NULL DEFAULT current_timestamp(),
  `confirmado` tinyint(1) NOT NULL DEFAULT 0,
  `data_confirmacao` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_contrato`
--

INSERT INTO `tb_contrato` (`id_contrato`, `id_plano`, `id_aluno`, `data_aula`, `horario_aula`, `data_contratacao`, `confirmado`, `data_confirmacao`) VALUES
(2, 2, 1, '2026-09-22', '03:00:00', '2026-09-22 03:00:00', 1, '2026-09-22 03:00:00');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_disponibilidade`
--

CREATE TABLE `tb_disponibilidade` (
  `id_disponibilidade` int(20) NOT NULL,
  `id_cref` int(20) NOT NULL,
  `dia_semana` tinyint(4) NOT NULL,
  `horario` time NOT NULL,
  `id_academia` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_disponibilidade`
--

INSERT INTO `tb_disponibilidade` (`id_disponibilidade`, `id_cref`, `dia_semana`, `horario`, `id_academia`) VALUES
(18, 987654, 1, '07:00:00', 2),
(19, 987654, 1, '12:00:00', 2),
(20, 987654, 1, '21:00:00', 2),
(21, 987654, 2, '07:00:00', 2),
(22, 987654, 3, '07:00:00', 2),
(23, 987654, 4, '07:00:00', 2),
(24, 987654, 5, '07:00:00', 2),
(25, 987654, 6, '07:00:00', 2),
(26, 987654, 7, '07:00:00', 2),
(27, 987654, 1, '03:00:00', 2),
(28, 987654, 2, '03:00:00', 2),
(29, 987654, 3, '03:00:00', 2),
(30, 987654, 4, '03:00:00', 2),
(31, 987654, 5, '03:00:00', 2),
(32, 987654, 1, '04:00:00', 2),
(33, 987654, 2, '04:00:00', 2),
(34, 987654, 3, '04:00:00', 2),
(35, 987654, 4, '04:00:00', 2),
(36, 987654, 5, '04:00:00', 2),
(37, 987654, 1, '05:00:00', 2),
(38, 987654, 1, '06:00:00', 2),
(39, 987654, 2, '05:00:00', 2),
(40, 987654, 2, '06:00:00', 2),
(41, 987654, 3, '05:00:00', 2),
(42, 987654, 3, '06:00:00', 2),
(43, 987654, 4, '05:00:00', 2),
(44, 987654, 4, '06:00:00', 2),
(45, 987654, 5, '05:00:00', 2),
(46, 987654, 5, '06:00:00', 2),
(47, 987654, 1, '08:00:00', 2),
(48, 987654, 1, '09:00:00', 2),
(49, 987654, 1, '10:00:00', 2),
(50, 987654, 1, '11:00:00', 2),
(51, 987654, 2, '08:00:00', 2),
(52, 987654, 2, '09:00:00', 2),
(53, 987654, 2, '10:00:00', 2),
(54, 987654, 2, '11:00:00', 2),
(55, 987654, 2, '12:00:00', 2),
(56, 987654, 1, '13:00:00', 2),
(57, 987654, 2, '13:00:00', 2),
(58, 987654, 1, '14:00:00', 2),
(59, 987654, 2, '14:00:00', 2),
(60, 987654, 3, '08:00:00', 2),
(61, 987654, 3, '09:00:00', 2),
(62, 987654, 3, '10:00:00', 2),
(63, 987654, 3, '11:00:00', 2),
(64, 987654, 3, '12:00:00', 2),
(65, 987654, 3, '13:00:00', 2),
(66, 987654, 3, '14:00:00', 2),
(67, 987654, 4, '08:00:00', 2),
(68, 987654, 4, '09:00:00', 2),
(69, 987654, 4, '10:00:00', 2),
(70, 987654, 4, '11:00:00', 2),
(71, 987654, 4, '12:00:00', 2),
(72, 987654, 4, '13:00:00', 2),
(73, 987654, 4, '14:00:00', 2),
(74, 987654, 5, '08:00:00', 2),
(75, 987654, 5, '09:00:00', 2),
(76, 987654, 5, '10:00:00', 2),
(77, 987654, 5, '11:00:00', 2),
(78, 987654, 5, '12:00:00', 2),
(79, 987654, 5, '13:00:00', 2),
(80, 987654, 5, '14:00:00', 2),
(81, 987654, 6, '08:00:00', 2),
(82, 987654, 6, '09:00:00', 2),
(83, 987654, 6, '10:00:00', 2),
(84, 987654, 6, '11:00:00', 2),
(85, 987654, 6, '12:00:00', 2),
(86, 987654, 6, '13:00:00', 2),
(87, 987654, 6, '14:00:00', 2),
(88, 987654, 7, '08:00:00', 2),
(89, 987654, 7, '09:00:00', 2),
(90, 987654, 7, '10:00:00', 2),
(91, 987654, 7, '11:00:00', 2),
(92, 987654, 7, '12:00:00', 2),
(93, 987654, 1, '15:00:00', 2),
(94, 987654, 1, '16:00:00', 2),
(95, 987654, 1, '17:00:00', 2),
(96, 987654, 1, '18:00:00', 2),
(97, 987654, 1, '19:00:00', 2),
(98, 987654, 1, '20:00:00', 2),
(99, 987654, 2, '15:00:00', 2),
(100, 987654, 2, '16:00:00', 2),
(101, 987654, 2, '17:00:00', 2),
(102, 987654, 2, '18:00:00', 2),
(103, 987654, 2, '19:00:00', 2),
(104, 987654, 2, '20:00:00', 2),
(105, 987654, 2, '21:00:00', 2),
(106, 987654, 3, '21:00:00', 2),
(107, 987654, 3, '20:00:00', 2),
(108, 987654, 3, '19:00:00', 2),
(109, 987654, 3, '18:00:00', 2),
(110, 987654, 3, '17:00:00', 2),
(111, 987654, 3, '16:00:00', 2),
(112, 987654, 3, '15:00:00', 2),
(113, 987654, 4, '15:00:00', 2),
(114, 987654, 4, '16:00:00', 2),
(115, 987654, 4, '18:00:00', 2),
(116, 987654, 4, '17:00:00', 2),
(117, 987654, 4, '19:00:00', 2),
(118, 987654, 4, '20:00:00', 2),
(119, 987654, 4, '21:00:00', 2),
(120, 987654, 5, '21:00:00', 2),
(121, 987654, 5, '20:00:00', 2),
(122, 987654, 5, '19:00:00', 2),
(123, 987654, 5, '18:00:00', 2),
(124, 987654, 5, '17:00:00', 2),
(125, 987654, 5, '16:00:00', 2),
(126, 987654, 5, '15:00:00', 2),
(135, 987376, 2, '00:00:00', 4),
(136, 987376, 1, '00:00:00', 3),
(137, 987376, 1, '01:00:00', 3),
(138, 987376, 1, '03:00:00', 4);

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_feedbacks`
--

CREATE TABLE `tb_feedbacks` (
  `id_feedback` int(20) NOT NULL,
  `relato` varchar(500) NOT NULL,
  `id_aluno` int(20) NOT NULL,
  `id_cref` int(20) NOT NULL,
  `avaliacao` tinyint(4) NOT NULL,
  `foto` blob NOT NULL,
  `id_plano` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_mensagens`
--

CREATE TABLE `tb_mensagens` (
  `id_mensagem` int(20) NOT NULL,
  `id_aluno` int(20) NOT NULL,
  `id_cref` int(20) NOT NULL,
  `remetente` enum('aluno','personal','sistema') NOT NULL,
  `tipo` enum('texto','agendamento','confirmacao','cancelamento','remarcacao') NOT NULL DEFAULT 'texto',
  `mensagem` varchar(2000) NOT NULL,
  `id_aula` int(20) DEFAULT NULL,
  `data_envio` datetime NOT NULL DEFAULT current_timestamp(),
  `lida` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_mensagens`
--

INSERT INTO `tb_mensagens` (`id_mensagem`, `id_aluno`, `id_cref`, `remetente`, `tipo`, `mensagem`, `id_aula`, `data_envio`, `lida`) VALUES
(1, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 27/09/2026 às 09:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 3, '2026-09-21 15:56:17', 1),
(2, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 22/09/2026 às 07:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 4, '2026-09-21 16:14:53', 1),
(3, 1, 987654, 'personal', 'cancelamento', 'Aula cancelada para 22/09/2026 às 07:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 4, '2026-09-21 16:15:53', 1),
(4, 1, 987654, 'aluno', 'remarcacao', 'Olá! Preciso remarcar minha aula.', 3, '2026-09-21 16:16:36', 1),
(5, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 22/09/2026 às 03:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 5, '2026-09-21 16:31:04', 1),
(6, 1, 987654, 'personal', 'confirmacao', 'Aula confirmada para 22/09/2026 às 03:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 5, '2026-09-21 16:34:42', 1),
(7, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 09/10/2026 às 11:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 6, '2026-09-22 10:35:28', 1),
(8, 1, 987654, 'personal', 'confirmacao', 'Aula confirmada para 09/10/2026 às 11:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 6, '2026-09-22 10:36:18', 1),
(9, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 30/09/2026 às 04:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 7, '2026-09-29 14:10:10', 1),
(10, 1, 987654, 'personal', 'confirmacao', 'Aula confirmada para 30/09/2026 às 04:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 7, '2026-09-29 14:10:44', 1),
(11, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 07/10/2026 às 03:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 8, '2026-10-06 15:33:52', 1),
(12, 1, 987654, 'personal', 'confirmacao', 'Aula confirmada para 07/10/2026 às 03:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 8, '2026-10-06 15:34:31', 1),
(13, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 07/10/2026 às 04:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 9, '2026-10-06 15:36:46', 1),
(14, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 08/10/2026 às 05:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 10, '2026-10-06 15:36:56', 1),
(15, 1, 987654, 'sistema', 'agendamento', 'Aula agendada com sucesso para 12/10/2026 às 05:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 11, '2026-10-06 15:37:03', 1),
(16, 1, 987654, 'personal', 'confirmacao', 'Aula confirmada para 12/10/2026 às 05:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 11, '2026-10-06 15:52:02', 0),
(17, 1, 987654, 'personal', 'confirmacao', 'Aula confirmada para 12/10/2026 às 05:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 11, '2026-10-06 15:52:06', 0),
(18, 1, 987654, 'personal', 'confirmacao', 'Aula confirmada para 12/10/2026 às 05:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 11, '2026-10-06 15:52:09', 0),
(19, 1, 987654, 'personal', 'confirmacao', 'Aula confirmada para 12/10/2026 às 05:00 na CT HAF • Centro de treinamento / Funcional / Corrida / Hit / Musculação / Krav Maga.', 11, '2026-10-06 15:52:14', 0);

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_personalacademia`
--

CREATE TABLE `tb_personalacademia` (
  `id_cref` int(20) NOT NULL,
  `id_academia` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_personalacademia`
--

INSERT INTO `tb_personalacademia` (`id_cref`, `id_academia`) VALUES
(987376, 3),
(987376, 4),
(987654, 2);

-- --------------------------------------------------------

--
-- Estrutura para tabela `tb_planos`
--

CREATE TABLE `tb_planos` (
  `id_plano` int(20) NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `beneficios` varchar(10000) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `validade` int(11) NOT NULL,
  `id_cref` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tb_planos`
--

INSERT INTO `tb_planos` (`id_plano`, `titulo`, `beneficios`, `valor`, `validade`, `id_cref`) VALUES
(2, 'Plano Básico', '2x por semana', 100.00, 1, 987654),
(4, 'Plano Básico', '2x por semana', 119.00, 1, 987376);

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `tb_academia`
--
ALTER TABLE `tb_academia`
  ADD PRIMARY KEY (`id_academia`);

--
-- Índices de tabela `tb_agenda`
--
ALTER TABLE `tb_agenda`
  ADD PRIMARY KEY (`id_agenda`),
  ADD KEY `id_cref` (`id_cref`),
  ADD KEY `idx_agenda_academia` (`id_academia`);

--
-- Índices de tabela `tb_aulamarcada`
--
ALTER TABLE `tb_aulamarcada`
  ADD PRIMARY KEY (`id_aula`),
  ADD KEY `id_agenda` (`id_agenda`),
  ADD KEY `id_aluno` (`id_aluno`),
  ADD KEY `idx_aulamarcada_contrato` (`id_contrato`);

--
-- Índices de tabela `tb_cadastroaluno`
--
ALTER TABLE `tb_cadastroaluno`
  ADD PRIMARY KEY (`id_aluno`);

--
-- Índices de tabela `tb_cadastropersonal`
--
ALTER TABLE `tb_cadastropersonal`
  ADD PRIMARY KEY (`id_cref`);

--
-- Índices de tabela `tb_contrato`
--
ALTER TABLE `tb_contrato`
  ADD PRIMARY KEY (`id_contrato`),
  ADD KEY `id_aluno` (`id_aluno`),
  ADD KEY `id_plano` (`id_plano`),
  ADD KEY `idx_contrato_financeiro` (`confirmado`,`data_confirmacao`);

--
-- Índices de tabela `tb_disponibilidade`
--
ALTER TABLE `tb_disponibilidade`
  ADD PRIMARY KEY (`id_disponibilidade`),
  ADD UNIQUE KEY `uq_disponibilidade` (`id_cref`,`dia_semana`,`horario`),
  ADD KEY `idx_cref` (`id_cref`),
  ADD KEY `idx_academia` (`id_academia`);

--
-- Índices de tabela `tb_feedbacks`
--
ALTER TABLE `tb_feedbacks`
  ADD PRIMARY KEY (`id_feedback`),
  ADD KEY `id_aluno` (`id_aluno`),
  ADD KEY `id_cref` (`id_cref`),
  ADD KEY `id_plano` (`id_plano`);

--
-- Índices de tabela `tb_mensagens`
--
ALTER TABLE `tb_mensagens`
  ADD PRIMARY KEY (`id_mensagem`),
  ADD KEY `idx_mensagens_aluno` (`id_aluno`),
  ADD KEY `idx_mensagens_cref` (`id_cref`),
  ADD KEY `idx_mensagens_aula` (`id_aula`),
  ADD KEY `idx_mensagens_conversa` (`id_aluno`,`id_cref`);

--
-- Índices de tabela `tb_personalacademia`
--
ALTER TABLE `tb_personalacademia`
  ADD PRIMARY KEY (`id_cref`,`id_academia`),
  ADD KEY `id_academia` (`id_academia`);

--
-- Índices de tabela `tb_planos`
--
ALTER TABLE `tb_planos`
  ADD PRIMARY KEY (`id_plano`),
  ADD KEY `id_cref` (`id_cref`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `tb_academia`
--
ALTER TABLE `tb_academia`
  MODIFY `id_academia` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `tb_agenda`
--
ALTER TABLE `tb_agenda`
  MODIFY `id_agenda` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=252;

--
-- AUTO_INCREMENT de tabela `tb_aulamarcada`
--
ALTER TABLE `tb_aulamarcada`
  MODIFY `id_aula` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `tb_cadastroaluno`
--
ALTER TABLE `tb_cadastroaluno`
  MODIFY `id_aluno` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `tb_cadastropersonal`
--
ALTER TABLE `tb_cadastropersonal`
  MODIFY `id_cref` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=987655;

--
-- AUTO_INCREMENT de tabela `tb_contrato`
--
ALTER TABLE `tb_contrato`
  MODIFY `id_contrato` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `tb_disponibilidade`
--
ALTER TABLE `tb_disponibilidade`
  MODIFY `id_disponibilidade` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=139;

--
-- AUTO_INCREMENT de tabela `tb_feedbacks`
--
ALTER TABLE `tb_feedbacks`
  MODIFY `id_feedback` int(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `tb_mensagens`
--
ALTER TABLE `tb_mensagens`
  MODIFY `id_mensagem` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de tabela `tb_planos`
--
ALTER TABLE `tb_planos`
  MODIFY `id_plano` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `tb_agenda`
--
ALTER TABLE `tb_agenda`
  ADD CONSTRAINT `fk_agenda_academia` FOREIGN KEY (`id_academia`) REFERENCES `tb_academia` (`id_academia`),
  ADD CONSTRAINT `tb_agenda_ibfk_1` FOREIGN KEY (`id_cref`) REFERENCES `tb_cadastropersonal` (`id_cref`);

--
-- Restrições para tabelas `tb_aulamarcada`
--
ALTER TABLE `tb_aulamarcada`
  ADD CONSTRAINT `fk_aulamarcada_contrato` FOREIGN KEY (`id_contrato`) REFERENCES `tb_contrato` (`id_contrato`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `tb_aulamarcada_ibfk_1` FOREIGN KEY (`id_agenda`) REFERENCES `tb_agenda` (`id_agenda`),
  ADD CONSTRAINT `tb_aulamarcada_ibfk_2` FOREIGN KEY (`id_aluno`) REFERENCES `tb_cadastroaluno` (`id_aluno`);

--
-- Restrições para tabelas `tb_contrato`
--
ALTER TABLE `tb_contrato`
  ADD CONSTRAINT `tb_contrato_ibfk_1` FOREIGN KEY (`id_aluno`) REFERENCES `tb_cadastroaluno` (`id_aluno`),
  ADD CONSTRAINT `tb_contrato_ibfk_2` FOREIGN KEY (`id_plano`) REFERENCES `tb_planos` (`id_plano`);

--
-- Restrições para tabelas `tb_disponibilidade`
--
ALTER TABLE `tb_disponibilidade`
  ADD CONSTRAINT `fk_disponibilidade_academia` FOREIGN KEY (`id_academia`) REFERENCES `tb_academia` (`id_academia`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_disponibilidade_personal` FOREIGN KEY (`id_cref`) REFERENCES `tb_cadastropersonal` (`id_cref`) ON DELETE CASCADE;

--
-- Restrições para tabelas `tb_feedbacks`
--
ALTER TABLE `tb_feedbacks`
  ADD CONSTRAINT `tb_feedbacks_ibfk_1` FOREIGN KEY (`id_aluno`) REFERENCES `tb_cadastroaluno` (`id_aluno`),
  ADD CONSTRAINT `tb_feedbacks_ibfk_2` FOREIGN KEY (`id_cref`) REFERENCES `tb_cadastropersonal` (`id_cref`),
  ADD CONSTRAINT `tb_feedbacks_ibfk_3` FOREIGN KEY (`id_plano`) REFERENCES `tb_planos` (`id_plano`);

--
-- Restrições para tabelas `tb_mensagens`
--
ALTER TABLE `tb_mensagens`
  ADD CONSTRAINT `fk_mensagens_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `tb_cadastroaluno` (`id_aluno`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mensagens_aula` FOREIGN KEY (`id_aula`) REFERENCES `tb_aulamarcada` (`id_aula`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mensagens_personal` FOREIGN KEY (`id_cref`) REFERENCES `tb_cadastropersonal` (`id_cref`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `tb_personalacademia`
--
ALTER TABLE `tb_personalacademia`
  ADD CONSTRAINT `tb_personalacademia_ibfk_1` FOREIGN KEY (`id_academia`) REFERENCES `tb_academia` (`id_academia`),
  ADD CONSTRAINT `tb_personalacademia_ibfk_2` FOREIGN KEY (`id_cref`) REFERENCES `tb_cadastropersonal` (`id_cref`);

--
-- Restrições para tabelas `tb_planos`
--
ALTER TABLE `tb_planos`
  ADD CONSTRAINT `tb_planos_ibfk_1` FOREIGN KEY (`id_cref`) REFERENCES `tb_cadastropersonal` (`id_cref`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

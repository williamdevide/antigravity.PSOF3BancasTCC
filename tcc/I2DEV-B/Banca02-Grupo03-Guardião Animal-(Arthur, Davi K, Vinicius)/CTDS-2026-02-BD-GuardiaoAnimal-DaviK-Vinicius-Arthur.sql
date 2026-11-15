-- ============================================================================
-- GUARDIÃO ANIMAL — BANCO DE DADOS COMPLETO (SUPABASE / POSTGRESQL)
-- Versão documental: V35 | TCC Técnico em Desenvolvimento de Sistemas — SENAI
-- Autores do projeto: Arthur Morais, Davi Kiliam e Vinicius Lourenço
-- ============================================================================
-- ESCOPO: esquema relacional consolidado com 12 tabelas, relacionamentos,
-- chaves, índices, permissões e políticas Row Level Security (RLS).
-- BASE DOCUMENTAL: SQL V32 completo e catálogo de ONGs da V35 do próprio projeto.
-- Este script define a ESTRUTURA; não é um backup das linhas reais em produção.
-- Não contém senhas, hashes, tokens de API nem dados pessoais de denunciantes.
--
-- IMPORTANTE: parte da aplicação PHP V35 utiliza arquivos JSON na hospedagem.
-- A criação das tabelas não migra esses dados nem integra automaticamente
-- os logins de administradores/ONGs com Supabase Auth.
--
-- EXECUÇÃO: editor SQL do Supabase num projeto novo ou ambiente de teste.
-- Em banco já existente, faça BACKUP e revise antes de executar.
-- ============================================================================

BEGIN;

create extension if not exists pgcrypto;

create table if not exists public.denuncias (
 id uuid primary key default gen_random_uuid(),
 protocolo text unique not null,
 especie text,
 descricao text not null,
 local_ocorrencia text not null,
 bairro text not null,
 cidade text not null default 'Ourinhos',
 estado text not null default 'SP',
 urgencia text not null default 'baixa',
 deseja_identificar boolean not null default false,
 nome_denunciante text,
 contato_denunciante text,
 status text not null default 'recebida',
 created_at timestamptz not null default now()
);
-- Compatibilidade caso o SQL antigo só tenha criado parte dos campos:
alter table public.denuncias add column if not exists protocolo text;
alter table public.denuncias add column if not exists especie text;
alter table public.denuncias add column if not exists descricao text;
alter table public.denuncias add column if not exists local_ocorrencia text;
alter table public.denuncias add column if not exists bairro text;
alter table public.denuncias add column if not exists cidade text default 'Ourinhos';
alter table public.denuncias add column if not exists estado text default 'SP';
alter table public.denuncias add column if not exists urgencia text default 'baixa';
alter table public.denuncias add column if not exists deseja_identificar boolean default false;
alter table public.denuncias add column if not exists nome_denunciante text;
alter table public.denuncias add column if not exists contato_denunciante text;
alter table public.denuncias add column if not exists status text default 'recebida';
alter table public.denuncias add column if not exists created_at timestamptz default now();
create unique index if not exists ga_denuncias_protocolo_idx on public.denuncias (protocolo);
create index if not exists ga_denuncias_bairro_idx on public.denuncias (bairro);
create index if not exists ga_denuncias_data_idx on public.denuncias (created_at desc);

create table if not exists public.ongs (
 id uuid primary key default gen_random_uuid(),
 local_id bigint unique,
 nome text not null,
 email text unique,
 password_hash text,
 cidade text not null default 'Ourinhos',
 estado text default 'SP',
 bairro text,
 telefone text,
 ano_fundacao integer,
 foco text,
 descricao text,
 historia text,
 imagem_url text,
 status text not null default 'Pendente',
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);

create table if not exists public.animais (
 id uuid primary key default gen_random_uuid(),
 local_id bigint unique,
 ong_id uuid references public.ongs(id) on delete set null,
 nome text not null,
 especie text not null,
 raca text,
 idade text,
 sexo text,
 porte text,
 temperamento text,
 historia_resgate text,
 local_encontrado text,
 data_encontrado date,
 status text not null default 'disponivel',
 imagem_url text,
 created_at timestamptz not null default now()
);

create table if not exists public.solicitacoes_adocao (
 id uuid primary key default gen_random_uuid(),
 animal_id uuid references public.animais(id) on delete set null,
 animal_nome text,
 ong_nome text,
 nome_completo text not null,
 email text not null,
 telefone text,
 moradia text,
 experiencia text,
 mensagem text,
 status text not null default 'pendente',
 created_at timestamptz not null default now()
);

create table if not exists public.doacoes (
 id uuid primary key default gen_random_uuid(),
 ong_id uuid references public.ongs(id) on delete set null,
 ong_nome text,
 nome_doador text,
 email_doador text,
 valor numeric(12,2) not null check(valor > 0),
 tipo text not null default 'unica',
 descricao text,
 mensagem text,
 forma_entrega text,
 comissao_plataforma numeric(12,2),
 valor_liquido numeric(12,2),
 pagamento_confirmado boolean not null default false,
 status text not null default 'registrada',
 created_at timestamptz not null default now()
);

create table if not exists public.apadrinhamentos (
 id uuid primary key default gen_random_uuid(),
 animal_id uuid references public.animais(id) on delete set null,
 animal_nome text,
 nome text not null,
 email text not null,
 valor_mensal numeric(12,2),
 mensagem text,
 status text not null default 'pendente',
 created_at timestamptz not null default now()
);

create table if not exists public.contatos (
 id uuid primary key default gen_random_uuid(),
 nome text not null,
 email text not null,
 assunto text,
 mensagem text not null,
 lido boolean not null default false,
 status text not null default 'novo',
 created_at timestamptz not null default now()
);

create table if not exists public.noticias (
 id uuid primary key default gen_random_uuid(),
 titulo text not null,
 resumo text,
 conteudo text not null,
 imagem_url text,
 publicada boolean not null default false,
 publicada_em timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists public.administradores (
 id uuid primary key default gen_random_uuid(),
 local_id bigint unique,
 nome text not null,
 username text unique not null,
 email text unique not null,
 password_hash text not null,
 tipo text not null default 'admin' check (tipo in ('principal','admin')),
 status text not null default 'Ativo' check (status in ('Ativo','Bloqueado')),
 created_at timestamptz not null default now()
);

create table if not exists public.admin_solicitacoes (
 id uuid primary key default gen_random_uuid(),
 local_id bigint unique,
 nome text not null,
 username text not null,
 email text not null,
 password_hash text not null,
 status text not null default 'Pendente' check (status in ('Pendente','Aprovada','Rejeitada')),
 reviewed_at timestamptz,
 reviewed_by uuid references public.administradores(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.ong_denuncia_atendimentos (
 id uuid primary key default gen_random_uuid(),
 ong_id uuid not null references public.ongs(id) on delete cascade,
 denuncia_id uuid not null references public.denuncias(id) on delete cascade,
 status text not null default 'Recebida',
 observacao text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(ong_id,denuncia_id)
);

create table if not exists public.auditoria (
 id uuid primary key default gen_random_uuid(),
 ator_id uuid references public.administradores(id) on delete set null,
 tipo_acao text not null,
 entidade text not null,
 entidade_id text,
 detalhes jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

-- Índices complementares para relacionamentos e consultas frequentes.
CREATE INDEX IF NOT EXISTS ga_animais_ong_idx ON public.animais (ong_id);
CREATE INDEX IF NOT EXISTS ga_animais_status_idx ON public.animais (status);
CREATE INDEX IF NOT EXISTS ga_solicitacoes_adocao_animal_idx ON public.solicitacoes_adocao (animal_id);
CREATE INDEX IF NOT EXISTS ga_doacoes_ong_idx ON public.doacoes (ong_id);
CREATE INDEX IF NOT EXISTS ga_apadrinhamentos_animal_idx ON public.apadrinhamentos (animal_id);
CREATE INDEX IF NOT EXISTS ga_ong_atendimentos_ong_idx ON public.ong_denuncia_atendimentos (ong_id);
CREATE INDEX IF NOT EXISTS ga_ong_atendimentos_denuncia_idx ON public.ong_denuncia_atendimentos (denuncia_id);
CREATE INDEX IF NOT EXISTS ga_admin_solicitacoes_status_idx ON public.admin_solicitacoes (status);
CREATE INDEX IF NOT EXISTS ga_contatos_status_idx ON public.contatos (status);
CREATE INDEX IF NOT EXISTS ga_noticias_publicadas_idx ON public.noticias (publicada, publicada_em DESC);

-- RLS habilitado em TODAS as tabelas expostas no esquema public.
alter table public.denuncias enable row level security;
alter table public.ongs enable row level security;
alter table public.animais enable row level security;
alter table public.solicitacoes_adocao enable row level security;
alter table public.doacoes enable row level security;
alter table public.apadrinhamentos enable row level security;
alter table public.contatos enable row level security;
alter table public.noticias enable row level security;
alter table public.administradores enable row level security;
alter table public.admin_solicitacoes enable row level security;
alter table public.ong_denuncia_atendimentos enable row level security;
alter table public.auditoria enable row level security;

-- Política de gravação pública apenas nos formulários que realmente recebem usuários anônimos.
-- Controle de abuso, CAPTCHA e rate limiting devem ser implementados antes de uso público amplo.
drop policy if exists ga_inserir_denuncia on public.denuncias;
create policy ga_inserir_denuncia on public.denuncias for insert to anon, authenticated with check (
 status='recebida' and cidade='Ourinhos' and estado='SP'
 and length(protocolo) between 8 and 40
 and length(descricao) between 15 and 3000
 and length(local_ocorrencia) between 5 and 250
);
-- Remover eventual política antiga com restrições diferentes, sem apagar registros.
drop policy if exists ga_public_insert_denuncias on public.denuncias;

drop policy if exists ga_inserir_doacao on public.doacoes;
create policy ga_inserir_doacao on public.doacoes for insert to anon, authenticated with check (
 status='registrada' and pagamento_confirmado=false and valor between 1 and 100000
);
drop policy if exists ga_inserir_contato on public.contatos;
create policy ga_inserir_contato on public.contatos for insert to anon, authenticated with check (
 lido=false and status='novo' and length(mensagem) between 1 and 3000
);
drop policy if exists ga_inserir_adocao on public.solicitacoes_adocao;
create policy ga_inserir_adocao on public.solicitacoes_adocao for insert to anon, authenticated with check (status='pendente');
drop policy if exists ga_inserir_apadrinhamento on public.apadrinhamentos;
create policy ga_inserir_apadrinhamento on public.apadrinhamentos for insert to anon, authenticated with check (status='pendente');

-- Leitura pública de notícias já publicadas, organizações aprovadas e animais disponíveis.
-- OBS: a aplicação V32 ainda usa catálogo local para esses itens; este SQL prepara a migração.
drop policy if exists ga_ler_ongs_aprovadas on public.ongs;
create policy ga_ler_ongs_aprovadas on public.ongs for select to anon, authenticated using (status='Aprovada');
drop policy if exists ga_ler_animais on public.animais;
create policy ga_ler_animais on public.animais for select to anon, authenticated using (status='disponivel');
drop policy if exists ga_ler_noticias on public.noticias;
create policy ga_ler_noticias on public.noticias for select to anon, authenticated using (publicada=true);

-- Restringe explicitamente acesso público antes de conceder permissões pontuais.
-- O proprietário do banco e as credenciais internas de serviço seguem suas permissões.
REVOKE ALL ON TABLE
    public.denuncias, public.ongs, public.animais, public.solicitacoes_adocao,
    public.doacoes, public.apadrinhamentos, public.contatos, public.noticias,
    public.administradores, public.admin_solicitacoes,
    public.ong_denuncia_atendimentos, public.auditoria
FROM anon, authenticated;

-- Privilégios mínimos: nunca abrir leitura pública de denúncias nem cadastros administrativos.
grant usage on schema public to anon, authenticated;
grant insert on public.denuncias, public.doacoes, public.contatos, public.solicitacoes_adocao, public.apadrinhamentos to anon, authenticated;
-- Nunca conceder SELECT irrestrito em ONGs, pois a tabela contém password_hash.
revoke select on public.ongs from anon, authenticated;
grant select (id,nome,cidade,estado,bairro,telefone,ano_fundacao,foco,descricao,historia,imagem_url,status,created_at)
    on public.ongs to anon, authenticated;
grant select on public.animais, public.noticias to anon, authenticated;
revoke select, update, delete on public.denuncias, public.doacoes, public.contatos, public.solicitacoes_adocao, public.apadrinhamentos from anon;
revoke all on public.administradores, public.admin_solicitacoes, public.ong_denuncia_atendimentos, public.auditoria from anon, authenticated;
-- FIM DO ESQUEMA. DADOS DE TESTE NÃO SÃO INSERIDOS NESTE ARQUIVO.
-- Uma amostra fictícia opcional de cinco perfis de ONG está em arquivo separado.
-- Não usar 'service_role' ou chave secreta no código público/browser.
COMMIT;

-- ==========================================================================
-- SCHEMA DO SUPABASE - ÁREA PÚBLICA, MURAL, REPUTAÇÃO E SEGURANÇA
-- SISTEMA CARTOMANTE (UNIFICADO & SEGURO)
-- ==========================================================================

-- Habilitar a extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================================
-- 1. CRIAÇÃO DAS TABELAS (SEM REQUISITOS DE ORDEM CONFLITANTES)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome text,
  email text,
  tipo_conta text CHECK (tipo_conta IN ('cliente', 'cartomante', 'admin', 'mestra', 'gerente')),
  telefone text,
  avatar_url text,
  status text NOT NULL DEFAULT 'ativo'::text,
  criado_em timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  atualizado_em timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.cartomantes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  telefone text,
  sexo text,
  funcao text,
  bio text,
  foto_url text,
  banner_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cartomantes_pkey PRIMARY KEY (id),
  CONSTRAINT cartomantes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  nome_completo text NOT NULL,
  email text,
  telefone text,
  data_nascimento date,
  genero text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  foto_url text,
  celular text,
  religiao text,
  sexo text,
  pronome text,
  estado_civil text,
  guia_espiritual text,
  pai_mae_cabeca text,
  tradicao_espiritual text,
  observacoes_gerais text,
  personalidade_percebida text,
  padroes_recorrentes text,
  pontos_delicados text,
  resumo_historia text,
  CONSTRAINT clientes_pkey PRIMARY KEY (id),
  CONSTRAINT clientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.cartomante_clientes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  bloqueado boolean NOT NULL DEFAULT false,
  CONSTRAINT cartomante_clientes_pkey PRIMARY KEY (id),
  CONSTRAINT cartomante_clientes_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id),
  CONSTRAINT cartomante_clientes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);

CREATE TABLE IF NOT EXISTS public.tags_clientes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  tag text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  cor text,
  CONSTRAINT tags_clientes_pkey PRIMARY KEY (id),
  CONSTRAINT tags_clientes_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id),
  CONSTRAINT tags_clientes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);

CREATE TABLE IF NOT EXISTS public.notas_clientes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  nota text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notas_clientes_pkey PRIMARY KEY (id),
  CONSTRAINT notas_clientes_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id),
  CONSTRAINT notas_clientes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);

CREATE TABLE IF NOT EXISTS public.servicos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  preco numeric,
  duracao integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT servicos_pkey PRIMARY KEY (id),
  CONSTRAINT servicos_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id)
);

CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid,
  cliente_id uuid,
  servico_id uuid,
  inicio timestamp with time zone NOT NULL,
  fim timestamp with time zone NOT NULL,
  public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agenda_eventos_pkey PRIMARY KEY (id),
  CONSTRAINT agenda_eventos_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id),
  CONSTRAINT agenda_eventos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT agenda_eventos_servico_id_fkey FOREIGN KEY (servico_id) REFERENCES public.servicos(id)
);

CREATE TABLE IF NOT EXISTS public.chat_conversas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_conversas_pkey PRIMARY KEY (id),
  CONSTRAINT chat_conversas_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id),
  CONSTRAINT chat_conversas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);

CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversa_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  enviado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_mensagens_pkey PRIMARY KEY (id),
  CONSTRAINT chat_mensagens_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES public.chat_conversas(id)
);

CREATE TABLE IF NOT EXISTS public.financeiro_movimentos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid NOT NULL,
  tipo text NOT NULL,
  valor numeric NOT NULL,
  descricao text,
  data timestamp with time zone DEFAULT now(),
  CONSTRAINT financeiro_movimentos_pkey PRIMARY KEY (id),
  CONSTRAINT financeiro_movimentos_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id)
);

CREATE TABLE IF NOT EXISTS public.galeria_cliente (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cliente_id uuid NOT NULL,
  url text NOT NULL,
  tipo text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT galeria_cliente_pkey PRIMARY KEY (id),
  CONSTRAINT galeria_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);

CREATE TABLE IF NOT EXISTS public.mural_publico (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid NOT NULL,
  conteudo text NOT NULL,
  visivel boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mural_publico_pkey PRIMARY KEY (id),
  CONSTRAINT mural_publico_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id)
);

CREATE TABLE IF NOT EXISTS public.organizacao_pessoal (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cartomante_id uuid NOT NULL,
  nota text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizacao_pessoal_pkey PRIMARY KEY (id),
  CONSTRAINT organizacao_pessoal_cartomante_id_fkey FOREIGN KEY (cartomante_id) REFERENCES public.cartomantes(id)
);

CREATE TABLE IF NOT EXISTS public.conversas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartomante_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT conversas_pkey PRIMARY KEY (id),
  CONSTRAINT conversas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  UNIQUE (cartomante_id, cliente_id)
);

CREATE TABLE IF NOT EXISTS public.configuracoes_chat (
  cartomante_id uuid NOT NULL,
  limite_diario integer NOT NULL DEFAULT 50 CHECK (limite_diario >= 0),
  limite_por_cliente integer NOT NULL DEFAULT 10 CHECK (limite_por_cliente >= 0),
  horario_inicio time without time zone NOT NULL DEFAULT '09:00:00'::time without time zone,
  horario_fim time without time zone NOT NULL DEFAULT '21:00:00'::time without time zone,
  pausa_automatica boolean NOT NULL DEFAULT false,
  senha_financeira text,
  senha_financeira_ativa boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  modo_esgotamento boolean NOT NULL DEFAULT false,
  mensagem_esgotamento text NOT NULL DEFAULT 'Os atendimentos estão funcionando em ritmo reduzido no momento para manter a qualidade e cuidado emocional.'::text,
  max_atendimentos_diarios integer NOT NULL DEFAULT 10,
  max_perguntas_diarias integer NOT NULL DEFAULT 5,
  tempo_minimo_entre_clientes integer NOT NULL DEFAULT 15,
  horarios_descanso jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT configuracoes_chat_pkey PRIMARY KEY (cartomante_id)
);

CREATE TABLE IF NOT EXISTS public.perguntas_baralho (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  cartomante_id uuid NOT NULL,
  pergunta_principal text NOT NULL,
  contexto text,
  area_vida text NOT NULL CHECK (area_vida IN ('amor', 'espiritual', 'financeiro', 'trabalho', 'familia', 'saude_emocional', 'outro')),
  urgencia text NOT NULL CHECK (urgencia IN ('baixa', 'media', 'alta')),
  status text NOT NULL DEFAULT 'enviada'::text CHECK (status IN ('enviada', 'aguardando_pagamento', 'paga', 'respondida', 'cancelada')),
  quantidade_perguntas integer NOT NULL DEFAULT 1 CHECK (quantidade_perguntas > 0),
  valor numeric NOT NULL DEFAULT 0.0,
  resposta_texto text,
  resposta_arquivo_url text,
  resposta_arquivo_tipo text CHECK (resposta_arquivo_tipo IN ('texto', 'audio', 'imagem', 'pdf', 'video')),
  respondido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT perguntas_baralho_pkey PRIMARY KEY (id),
  CONSTRAINT perguntas_baralho_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES public.conversas(id),
  CONSTRAINT perguntas_baralho_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);

CREATE TABLE IF NOT EXISTS public.mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('cartomante', 'cliente')),
  texto text,
  arquivo_url text,
  arquivo_nome text,
  arquivo_tipo text CHECK (arquivo_tipo IN ('imagem', 'audio', 'pdf', 'arquivo')),
  is_question boolean NOT NULL DEFAULT false,
  question_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT mensagens_pkey PRIMARY KEY (id),
  CONSTRAINT mensagens_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES public.conversas(id),
  CONSTRAINT mensagens_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.perguntas_baralho(id)
);

CREATE TABLE IF NOT EXISTS public.financeiro (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartomante_id uuid NOT NULL,
  cliente_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria text NOT NULL CHECK (categoria IN ('atendimento', 'pergunta_baralho', 'servico', 'gasto_pessoal', 'plataforma', 'outros')),
  valor numeric NOT NULL DEFAULT 0.0 CHECK (valor >= 0.0),
  status text NOT NULL DEFAULT 'pendente'::text CHECK (status IN ('pendente', 'pago', 'cancelado', 'reembolsado')),
  origem text NOT NULL DEFAULT 'manual'::text CHECK (origem IN ('manual', 'automatico')),
  referencia_id uuid,
  descricao text,
  data_registro timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT financeiro_pkey PRIMARY KEY (id),
  CONSTRAINT financeiro_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);

CREATE TABLE IF NOT EXISTS public.perfis_publicos (
  cartomante_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  banner_url text,
  foto_url text,
  bio text NOT NULL,
  especialidades text[] NOT NULL DEFAULT '{}'::text[],
  certificados text[] NOT NULL DEFAULT '{}'::text[],
  redes_sociais jsonb DEFAULT '{}'::jsonb,
  idiomas text[] NOT NULL DEFAULT '{"Português"}'::text[],
  modalidade text NOT NULL DEFAULT 'online'::text CHECK (modalidade IN ('online', 'presencial', 'ambos')),
  cor_primaria text DEFAULT '#C7A27A'::text,
  cor_secundaria text DEFAULT '#6E5AAB'::text,
  publicado boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT perfis_publicos_pkey PRIMARY KEY (cartomante_id)
);

CREATE TABLE IF NOT EXISTS public.servicos_publicos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartomante_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  preco numeric NOT NULL CHECK (preco >= 0.0),
  duracao_minutos integer NOT NULL CHECK (duracao_minutos > 0),
  prazo_dias integer NOT NULL DEFAULT 1 CHECK (prazo_dias >= 0),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  meio_pagamento text DEFAULT 'PIX'::text,
  CONSTRAINT servicos_publicos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.mural_postagens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartomante_id uuid NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  imagem_url text,
  video_url text,
  visibilidade text NOT NULL DEFAULT 'publico'::text CHECK (visibilidade IN ('publico', 'clientes')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT mural_postagens_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.avaliacoes_futuras (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartomante_id uuid NOT NULL,
  cliente_nome_exibido text NOT NULL,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  data_registro timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT avaliacoes_futuras_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.anotacoes_pessoais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartomante_id uuid NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('video', 'postagem', 'ritual', 'estudo', 'atendimento', 'pessoal', 'outro')),
  tipo_aba text NOT NULL CHECK (tipo_aba IN ('rotina', 'ideias', 'videos', 'pesquisas', 'inspiracoes', 'anotacoes')),
  favorito boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT anotacoes_pessoais_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.respostas_rapidas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartomante_id uuid NOT NULL,
  chave text NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  CONSTRAINT respostas_rapidas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  referencia_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notificacoes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.historico_acoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartomante_id uuid NOT NULL,
  cliente_id uuid,
  acao text NOT NULL,
  detalhes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT historico_acoes_pkey PRIMARY KEY (id),
  CONSTRAINT historico_acoes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);

CREATE TABLE IF NOT EXISTS public.pedidos_servicos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  cartomante_id uuid NOT NULL,
  servico_id uuid,
  servico_titulo text NOT NULL,
  servico_preco numeric NOT NULL,
  meio_pagamento text,
  status text NOT NULL DEFAULT 'aguardando_pagamento'::text CHECK (status IN ('aguardando_pagamento', 'pagamento_informado', 'pagamento_confirmado', 'pagamento_pendente', 'bloqueado_temporariamente', 'cancelado')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  nota_cliente text,
  hash_transacao text,
  comprovante_url text,
  data_envio_pagamento timestamp with time zone,
  CONSTRAINT pedidos_servicos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_servicos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT pedidos_servicos_servico_id_fkey FOREIGN KEY (servico_id) REFERENCES public.servicos_publicos(id)
);

-- ==========================================================================
-- 2. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ==========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartomantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartomante_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_publico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacao_pessoal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas_baralho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_publicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos_publicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_postagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_futuras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes_pessoais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_servicos ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 3. DEFINIÇÃO DE POLÍTICAS RLS (CONTROLE DE ACESSO ROBUSTO)
-- ==========================================================================

-- 3.0. PERFIS (PROFILES)
DROP POLICY IF EXISTS "Qualquer um pode ver perfis públicos" ON public.profiles;
CREATE POLICY "Qualquer um pode ver perfis públicos" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuários podem gerenciar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem gerenciar seu próprio perfil" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir inserção inicial de perfil" ON public.profiles;
CREATE POLICY "Permitir inserção inicial de perfil" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3.1. CARTOMANTES & PERFIS
DROP POLICY IF EXISTS "Permitir inserção de cartomantes" ON public.cartomantes;
CREATE POLICY "Permitir inserção de cartomantes" ON public.cartomantes FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Cartomantes podem visualizar seu próprio perfil" ON public.cartomantes;
CREATE POLICY "Cartomantes podem visualizar seu próprio perfil" ON public.cartomantes FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cartomantes podem atualizar seu próprio perfil" ON public.cartomantes;
CREATE POLICY "Cartomantes podem atualizar seu próprio perfil" ON public.cartomantes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Qualquer um pode ver lista de cartomantes" ON public.cartomantes;
CREATE POLICY "Qualquer um pode ver lista de cartomantes" ON public.cartomantes FOR SELECT USING (true);

-- 3.2. CLIENTES (HARDENING DE PRIVACIDADE)
DROP POLICY IF EXISTS "Permitir inserção de clientes" ON public.clientes;
CREATE POLICY "Permitir inserção de clientes" ON public.clientes FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura restrita de perfil de cliente" ON public.clientes;
CREATE POLICY "Leitura restrita de perfil de cliente" ON public.clientes FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.cartomante_clientes cc
        WHERE cc.cliente_id = clientes.id AND cc.cartomante_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Clientes podem atualizar seu próprio perfil" ON public.clientes;
CREATE POLICY "Clientes podem atualizar seu próprio perfil" ON public.clientes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3.3. CONVERSAS & CHATS
DROP POLICY IF EXISTS "Cartomantes podem acessar suas próprias conversas" ON public.conversas;
CREATE POLICY "Cartomantes podem acessar suas próprias conversas" ON public.conversas FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

DROP POLICY IF EXISTS "Clientes podem visualizar seu vínculo de chat" ON public.conversas;
CREATE POLICY "Clientes podem visualizar seu vínculo de chat" ON public.conversas FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = conversas.cliente_id AND c.user_id = auth.uid()
    )
);

-- 3.4. CONFIGURAÇÕES DE CHAT
DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas próprias configurações" ON public.configuracoes_chat;
CREATE POLICY "Cartomantes podem gerenciar suas próprias configurações" ON public.configuracoes_chat FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

-- 3.5. PERGUNTAS AO BARALHO
DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas próprias perguntas ao baralho" ON public.perguntas_baralho;
CREATE POLICY "Cartomantes podem gerenciar suas próprias perguntas ao baralho" ON public.perguntas_baralho FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

-- 3.6. MENSAGENS
DROP POLICY IF EXISTS "Cartomantes podem acessar mensagens de suas conversas" ON public.mensagens;
CREATE POLICY "Cartomantes podem acessar mensagens de suas conversas" ON public.mensagens FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = mensagens.conversa_id AND c.cartomante_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = mensagens.conversa_id AND c.cartomante_id = auth.uid())
);

-- 3.7. FINANCEIRO
DROP POLICY IF EXISTS "Cartomantes possuem controle total sobre seu próprio financeiro" ON public.financeiro;
CREATE POLICY "Cartomantes possuem controle total sobre seu próprio financeiro" ON public.financeiro FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

-- 3.8. PERFIS PÚBLICOS
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar perfis públicos publicados" ON public.perfis_publicos;
CREATE POLICY "Qualquer visitante pode visualizar perfis públicos publicados" ON public.perfis_publicos FOR SELECT USING (publicado = true);

DROP POLICY IF EXISTS "Cartomantes podem gerenciar seu próprio perfil público" ON public.perfis_publicos;
CREATE POLICY "Cartomantes podem gerenciar seu próprio perfil público" ON public.perfis_publicos FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

-- 3.9. SERVIÇOS PÚBLICOS
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar serviços públicos ativos" ON public.servicos_publicos;
CREATE POLICY "Qualquer visitante pode visualizar serviços públicos ativos" ON public.servicos_publicos FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Cartomantes podem gerenciar seus serviços públicos" ON public.servicos_publicos;
CREATE POLICY "Cartomantes podem gerenciar seus serviços públicos" ON public.servicos_publicos FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

-- 3.10. MURAL DE POSTAGENS
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar postagens públicas do mural" ON public.mural_postagens;
CREATE POLICY "Qualquer visitante pode visualizar postagens públicas do mural" ON public.mural_postagens FOR SELECT USING (visibilidade = 'publico');

DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas postagens no mural" ON public.mural_postagens;
CREATE POLICY "Cartomantes podem gerenciar suas postagens no mural" ON public.mural_postagens FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

-- 3.11. AVALIAÇÕES
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar as avaliações" ON public.avaliacoes_futuras;
CREATE POLICY "Qualquer visitante pode visualizar as avaliações" ON public.avaliacoes_futuras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Apenas cartomantes ou usuários cadastrados criam avaliações" ON public.avaliacoes_futuras;
CREATE POLICY "Apenas cartomantes ou usuários cadastrados criam avaliações" ON public.avaliacoes_futuras FOR INSERT TO authenticated WITH CHECK (true);

-- 3.12. ANOTAÇÕES PESSOAIS
DROP POLICY IF EXISTS "Cartomantes possuem privacidade total sobre suas anotações" ON public.anotacoes_pessoais;
CREATE POLICY "Cartomantes possuem privacidade total sobre suas anotações" ON public.anotacoes_pessoais FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

-- 3.13. RESPOSTAS RÁPIDAS
DROP POLICY IF EXISTS "Cartomantes gerenciam suas próprias respostas rápidas" ON public.respostas_rapidas;
CREATE POLICY "Cartomantes gerenciam suas próprias respostas rápidas" ON public.respostas_rapidas FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

-- 3.14. RELACIONAMENTO CARTOMANTE-CLIENTES
DROP POLICY IF EXISTS "Cartomantes podem gerenciar seus clientes" ON public.cartomante_clientes;
CREATE POLICY "Cartomantes podem gerenciar seus clientes" ON public.cartomante_clientes FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

DROP POLICY IF EXISTS "Clientes podem visualizar seu vínculo" ON public.cartomante_clientes;
CREATE POLICY "Clientes podem visualizar seu vínculo" ON public.cartomante_clientes FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cartomante_clientes.cliente_id AND c.user_id = auth.uid())
);

-- 3.15. PEDIDOS DE SERVIÇOS
DROP POLICY IF EXISTS "Cartomantes podem gerenciar pedidos de seus serviços" ON public.pedidos_servicos;
CREATE POLICY "Cartomantes podem gerenciar pedidos de seus serviços" ON public.pedidos_servicos FOR ALL TO authenticated USING (auth.uid() = cartomante_id) WITH CHECK (auth.uid() = cartomante_id);

DROP POLICY IF EXISTS "Clientes podem visualizar e criar seus próprios pedidos" ON public.pedidos_servicos;
CREATE POLICY "Clientes podem visualizar e criar seus próprios pedidos" ON public.pedidos_servicos FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = pedidos_servicos.cliente_id AND c.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = pedidos_servicos.cliente_id AND c.user_id = auth.uid())
);

-- 3.16. HISTÓRICO DE AÇÕES (AUDITORIA)
DROP POLICY IF EXISTS "Cartomantes podem visualizar seu próprio histórico" ON public.historico_acoes;
CREATE POLICY "Cartomantes podem visualizar seu próprio histórico" ON public.historico_acoes FOR SELECT TO authenticated USING (auth.uid() = cartomante_id);

DROP POLICY IF EXISTS "Cartomantes podem inserir registros no histórico" ON public.historico_acoes;
CREATE POLICY "Cartomantes podem inserir registros no histórico" ON public.historico_acoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = cartomante_id);

-- 3.17. NOTIFICAÇÕES (HARDENING DE PRIVACIDADE)
DROP POLICY IF EXISTS "Usuarios visualizam suas proprias notificacoes" ON public.notificacoes;
CREATE POLICY "Usuarios visualizam suas proprias notificacoes" ON public.notificacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ==========================================================================
-- 4. ÍNDICES DE DESEMPENHO E BUSCA RÁPIDA
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_conversas_cartomante ON public.conversas(cartomante_id);
CREATE INDEX IF NOT EXISTS idx_conversas_cliente ON public.conversas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_created ON public.mensagens(conversa_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_perguntas_conversa ON public.perguntas_baralho(conversa_id);
CREATE INDEX IF NOT EXISTS idx_perguntas_status ON public.perguntas_baralho(status);
CREATE INDEX IF NOT EXISTS idx_financeiro_cartomante ON public.financeiro(cartomante_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_tipo ON public.financeiro(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_categoria ON public.financeiro(categoria);
CREATE INDEX IF NOT EXISTS idx_financeiro_data ON public.financeiro(data_registro DESC);
CREATE INDEX IF NOT EXISTS idx_perfis_publicos_slug ON public.perfis_publicos(slug);
CREATE INDEX IF NOT EXISTS idx_servicos_cartomante ON public.servicos_publicos(cartomante_id);
CREATE INDEX IF NOT EXISTS idx_mural_cartomante_date ON public.mural_postagens(cartomante_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_cartomante ON public.avaliacoes_futuras(cartomante_id);

-- ==========================================================================
-- 5. FUNÇÕES PLPGSQL COM HARDENING DE SEGURANÇA (search_path & privileges)
-- ==========================================================================

-- 5.1. FUNÇÃO: SINCRONIZAR PERGUNTAS AO FINANCEIRO
CREATE OR REPLACE FUNCTION public.fn_sync_pergunta_financeiro()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'aguardando_pagamento') OR 
       (TG_OP = 'UPDATE' AND NEW.status = 'aguardando_pagamento' AND OLD.status != 'aguardando_pagamento') THEN
        
        INSERT INTO public.financeiro (cartomante_id, cliente_id, tipo, categoria, valor, status, origem, referencia_id, descricao)
        VALUES (NEW.cartomante_id, NEW.cliente_id, 'entrada', 'pergunta_baralho', NEW.valor, 'pendente', 'automatico', NEW.id, 'Pergunta ao Baralho espiritual')
        ON CONFLICT (id) DO UPDATE SET valor = NEW.valor, status = 'pendente';
        
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'paga' AND OLD.status != 'paga') THEN
        
        INSERT INTO public.financeiro (cartomante_id, cliente_id, tipo, categoria, valor, status, origem, referencia_id, descricao)
        VALUES (NEW.cartomante_id, NEW.cliente_id, 'entrada', 'pergunta_baralho', NEW.valor, 'pago', 'automatico', NEW.id, 'Pergunta ao Baralho espiritual paga')
        ON CONFLICT (id) DO UPDATE SET status = 'pago', valor = NEW.valor;
        
        UPDATE public.mensagens 
        SET texto = '✨ A Pergunta ao Baralho foi PAGA! A cartomante está canalizando as energias para responder...'
        WHERE question_id = NEW.id AND is_question = true;

    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'cancelada' AND OLD.status != 'cancelada') THEN
        UPDATE public.financeiro 
        SET status = 'cancelado' 
        WHERE referencia_id = NEW.id AND categoria = 'pergunta_baralho';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revogar execução pública para hardening
REVOKE EXECUTE ON FUNCTION public.fn_sync_pergunta_financeiro() FROM public;

-- 5.2. FUNÇÃO: AUTO CONFIRMAÇÃO DE EMAIL DE TESTE
CREATE OR REPLACE FUNCTION public.fn_auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
    NEW.raw_user_meta_data = jsonb_set(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb), '{email_verified}', 'true'::jsonb);
    NEW.raw_user_meta_data = jsonb_set(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb), '{phone_verified}', 'true'::jsonb);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revogar execução pública para hardening
REVOKE EXECUTE ON FUNCTION public.fn_auto_confirm_email() FROM public;

-- ==========================================================================
-- 6. GATILHOS (TRIGGERS)
-- ==========================================================================

DROP TRIGGER IF EXISTS tg_sync_pergunta_financeiro ON public.perguntas_baralho;
CREATE TRIGGER tg_sync_pergunta_financeiro
    AFTER INSERT OR UPDATE OF status ON public.perguntas_baralho
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_pergunta_financeiro();

DROP TRIGGER IF EXISTS tg_auto_confirm_email ON auth.users;
CREATE TRIGGER tg_auto_confirm_email
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auto_confirm_email();

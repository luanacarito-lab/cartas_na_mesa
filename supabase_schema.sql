-- ==========================================================================
-- SCHEMA DO SUPABASE - ÁREA PÚBLICA, MURAL & REPUTAÇÃO
-- SISTEMA CARTOMANTE
-- ==========================================================================

-- Habilitar a extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE CONVERSAS (CHATS PRIVADOS)
CREATE TABLE IF NOT EXISTS public.conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartomante_id UUID NOT NULL, -- references auth.users(id)
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (cartomante_id, cliente_id)
);

-- Habilitar RLS em conversas
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança RLS para conversas
DROP POLICY IF EXISTS "Cartomantes podem acessar suas próprias conversas" ON public.conversas;
DROP POLICY IF EXISTS "Cartomantes podem acessar suas próprias conversas" ON conversas;
CREATE POLICY "Cartomantes podem acessar suas próprias conversas" 
    ON public.conversas 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- 2. TABELA DE CONFIGURAÇÕES DE LIMITES, ENERGIA E SEGURANÇA FINANCEIRA
CREATE TABLE IF NOT EXISTS public.configuracoes_chat (
    cartomante_id UUID PRIMARY KEY, -- references auth.users(id)
    limite_diario INT NOT NULL DEFAULT 50 CHECK (limite_diario >= 0),
    limite_por_cliente INT NOT NULL DEFAULT 10 CHECK (limite_por_cliente >= 0),
    horario_inicio TIME NOT NULL DEFAULT '09:00',
    horario_fim TIME NOT NULL DEFAULT '21:00',
    pausa_automatica BOOLEAN NOT NULL DEFAULT false,
    
    -- Segurança Financeira Secundária
    senha_financeira TEXT, -- Senha secundária PIN de 4 dígitos
    senha_financeira_ativa BOOLEAN NOT NULL DEFAULT false,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em configuracoes_chat
ALTER TABLE public.configuracoes_chat ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para configuracoes_chat
DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas próprias configurações" ON public.configuracoes_chat;
DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas próprias configurações" ON configuracoes_chat;
CREATE POLICY "Cartomantes podem gerenciar suas próprias configurações"
    ON public.configuracoes_chat
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- 3. TABELA DE PERGUNTAS AO BARALHO (CENTRAL DE PERGUNTAS)
CREATE TABLE IF NOT EXISTS public.perguntas_baralho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    cartomante_id UUID NOT NULL, -- references auth.users(id)
    pergunta_principal TEXT NOT NULL,
    contexto TEXT,
    area_vida TEXT NOT NULL CHECK (area_vida IN ('amor', 'espiritual', 'financeiro', 'trabalho', 'familia', 'saude_emocional', 'outro')),
    urgencia TEXT NOT NULL CHECK (urgencia IN ('baixa', 'media', 'alta')),
    status TEXT NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviada', 'aguardando_pagamento', 'paga', 'respondida', 'cancelada')),
    quantidade_perguntas INT NOT NULL DEFAULT 1 CHECK (quantidade_perguntas > 0),
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    resposta_texto TEXT,
    resposta_arquivo_url TEXT,
    resposta_arquivo_tipo TEXT CHECK (resposta_arquivo_tipo IN ('texto', 'audio', 'imagem', 'pdf', 'video')),
    respondido_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em perguntas_baralho
ALTER TABLE public.perguntas_baralho ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para perguntas_baralho
DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas próprias perguntas ao baralho" ON public.perguntas_baralho;
DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas próprias perguntas ao baralho" ON perguntas_baralho;
CREATE POLICY "Cartomantes podem gerenciar suas próprias perguntas ao baralho"
    ON public.perguntas_baralho
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- 4. TABELA DE MENSAGENS DO CHAT
CREATE TABLE IF NOT EXISTS public.mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('cartomante', 'cliente')),
    texto TEXT,
    arquivo_url TEXT,
    arquivo_nome TEXT,
    arquivo_tipo TEXT CHECK (arquivo_tipo IN ('imagem', 'audio', 'pdf', 'arquivo')),
    is_question BOOLEAN DEFAULT false NOT NULL,
    question_id UUID REFERENCES public.perguntas_baralho(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em mensagens
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para mensagens
DROP POLICY IF EXISTS "Cartomantes podem acessar mensagens de suas conversas" ON public.mensagens;
DROP POLICY IF EXISTS "Cartomantes podem acessar mensagens de suas conversas" ON mensagens;
CREATE POLICY "Cartomantes podem acessar mensagens de suas conversas"
    ON public.mensagens
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversas c
            WHERE c.id = mensagens.conversa_id
            AND c.cartomante_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversas c
            WHERE c.id = mensagens.conversa_id
            AND c.cartomante_id = auth.uid()
        )
    );


-- 5. TABELA FINANCEIRA EXPANDIDA (MOVIMENTAÇÕES DE ENTRADA E SAÍDA)
CREATE TABLE IF NOT EXISTS public.financeiro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartomante_id UUID NOT NULL, -- references auth.users(id)
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL, -- Opcional
    
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria TEXT NOT NULL CHECK (categoria IN ('atendimento', 'pergunta_baralho', 'servico', 'gasto_pessoal', 'plataforma', 'outros')),
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0.0 CHECK (valor >= 0.0),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'reembolsado')),
    origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'automatico')),
    
    referencia_id UUID, -- ID da pergunta, consulta ou serviço
    descricao TEXT,
    data_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em financeiro
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança RLS para financeiro
DROP POLICY IF EXISTS "Cartomantes possuem controle total sobre seu próprio financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "Cartomantes possuem controle total sobre seu próprio financeiro" ON financeiro;
CREATE POLICY "Cartomantes possuem controle total sobre seu próprio financeiro"
    ON public.financeiro
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- 6. TABELA DE PERFIS PÚBLICOS (VITRINE DA CARTOMANTE)
CREATE TABLE IF NOT EXISTS public.perfis_publicos (
    cartomante_id UUID PRIMARY KEY, -- references auth.users(id)
    slug TEXT NOT NULL UNIQUE,
    banner_url TEXT,
    foto_url TEXT,
    bio TEXT NOT NULL,
    especialidades TEXT[] NOT NULL DEFAULT '{}',
    certificados TEXT[] NOT NULL DEFAULT '{}',
    redes_sociais JSONB DEFAULT '{}'::jsonb,
    idiomas TEXT[] NOT NULL DEFAULT '{"Português"}',
    modalidade TEXT NOT NULL DEFAULT 'online' CHECK (modalidade IN ('online', 'presencial', 'ambos')),
    cor_primaria TEXT DEFAULT '#C7A27A',
    cor_secundaria TEXT DEFAULT '#6E5AAB',
    publicado BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em perfis_publicos
ALTER TABLE public.perfis_publicos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Leitura pública para qualquer visitante, escrita apenas pela dona do perfil
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar perfis públicos publicados" ON public.perfis_publicos;
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar perfis públicos publicados" ON perfis_publicos;
CREATE POLICY "Qualquer visitante pode visualizar perfis públicos publicados"
    ON public.perfis_publicos
    FOR SELECT
    USING (publicado = true);

DROP POLICY IF EXISTS "Cartomantes podem gerenciar seu próprio perfil público" ON public.perfis_publicos;
DROP POLICY IF EXISTS "Cartomantes podem gerenciar seu próprio perfil público" ON perfis_publicos;
CREATE POLICY "Cartomantes podem gerenciar seu próprio perfil público"
    ON public.perfis_publicos
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- 7. TABELA DE SERVIÇOS PÚBLICOS OFERTADOS
CREATE TABLE IF NOT EXISTS public.servicos_publicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartomante_id UUID NOT NULL, -- references auth.users(id)
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0.0),
    duracao_minutos INT NOT NULL CHECK (duracao_minutos > 0),
    prazo_dias INT NOT NULL DEFAULT 1 CHECK (prazo_dias >= 0),
    meio_pagamento TEXT DEFAULT 'PIX',
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em servicos_publicos
ALTER TABLE public.servicos_publicos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Leitura pública para ativos, modificações apenas pela cartomante dona
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar serviços públicos ativos" ON public.servicos_publicos;
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar serviços públicos ativos" ON servicos_publicos;
CREATE POLICY "Qualquer visitante pode visualizar serviços públicos ativos"
    ON public.servicos_publicos
    FOR SELECT
    USING (ativo = true);

DROP POLICY IF EXISTS "Cartomantes podem gerenciar seus serviços públicos" ON public.servicos_publicos;
DROP POLICY IF EXISTS "Cartomantes podem gerenciar seus serviços públicos" ON servicos_publicos;
CREATE POLICY "Cartomantes podem gerenciar seus serviços públicos"
    ON public.servicos_publicos
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- 8. TABELA DO MURAL PÚBLICO (FEED DE POSTAGENS / MENSAGENS)
CREATE TABLE IF NOT EXISTS public.mural_postagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartomante_id UUID NOT NULL, -- references auth.users(id)
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    imagem_url TEXT,
    video_url TEXT,
    visibilidade TEXT NOT NULL DEFAULT 'publico' CHECK (visibilidade IN ('publico', 'clientes')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em mural_postagens
ALTER TABLE public.mural_postagens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Leitura pública, gravação/exclusão apenas pela própria cartomante
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar postagens públicas do mural" ON public.mural_postagens;
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar postagens públicas do mural" ON mural_postagens;
CREATE POLICY "Qualquer visitante pode visualizar postagens públicas do mural"
    ON public.mural_postagens
    FOR SELECT
    USING (visibilidade = 'publico');

DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas postagens no mural" ON public.mural_postagens;
DROP POLICY IF EXISTS "Cartomantes podem gerenciar suas postagens no mural" ON mural_postagens;
CREATE POLICY "Cartomantes podem gerenciar suas postagens no mural"
    ON public.mural_postagens
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- 9. TABELA DE AVALIAÇÕES E REPUTAÇÃO (PREPARAÇÃO DE ESTRUTURA FUTURA)
CREATE TABLE IF NOT EXISTS public.avaliacoes_futuras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartomante_id UUID NOT NULL, -- references auth.users(id)
    cliente_nome_exibido TEXT NOT NULL,
    nota INT NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    data_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em avaliacoes_futuras
ALTER TABLE public.avaliacoes_futuras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Leitura pública de avaliações
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar as avaliações" ON public.avaliacoes_futuras;
DROP POLICY IF EXISTS "Qualquer visitante pode visualizar as avaliações" ON avaliacoes_futuras;
CREATE POLICY "Qualquer visitante pode visualizar as avaliações"
    ON public.avaliacoes_futuras
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Apenas cartomantes ou usuários cadastrados criam avaliações" ON public.avaliacoes_futuras;
DROP POLICY IF EXISTS "Apenas cartomantes ou usuários cadastrados criam avaliações" ON avaliacoes_futuras;
CREATE POLICY "Apenas cartomantes ou usuários cadastrados criam avaliações"
    ON public.avaliacoes_futuras
    FOR INSERT
    TO authenticated
    WITH CHECK (true);


-- 10. ÍNDICES DE DESEMPENHO E BUSCA RÁPIDA
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


-- 11. GATILHO PARA RECALCULAR AUTOMATICAMENTE E INTEGRAR PERGUNTAS AO FINANCEIRO
CREATE OR REPLACE FUNCTION public.fn_sync_pergunta_financeiro()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'aguardando_pagamento', cria ou atualiza registro no financeiro como pendente
    IF (TG_OP = 'INSERT' AND NEW.status = 'aguardando_pagamento') OR 
       (TG_OP = 'UPDATE' AND NEW.status = 'aguardando_pagamento' AND OLD.status != 'aguardando_pagamento') THEN
        
        -- Garante que se já houver um registro de entrada para essa pergunta, atualiza o valor
        INSERT INTO public.financeiro (cartomante_id, cliente_id, tipo, categoria, valor, status, origem, referencia_id, descricao)
        VALUES (NEW.cartomante_id, NEW.cliente_id, 'entrada', 'pergunta_baralho', NEW.valor, 'pendente', 'automatico', NEW.id, 'Pergunta ao Baralho espiritual')
        ON CONFLICT (id) DO UPDATE SET valor = NEW.valor, status = 'pendente';
        
    -- Se o status mudou para 'paga', atualiza o registro no financeiro correspondente para 'pago'
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'paga' AND OLD.status != 'paga') THEN
        
        -- Atualiza ou insere como pago se não existia
        INSERT INTO public.financeiro (cartomante_id, cliente_id, tipo, categoria, valor, status, origem, referencia_id, descricao)
        VALUES (NEW.cartomante_id, NEW.cliente_id, 'entrada', 'pergunta_baralho', NEW.valor, 'pago', 'automatico', NEW.id, 'Pergunta ao Baralho espiritual paga')
        ON CONFLICT (id) DO UPDATE SET status = 'pago', valor = NEW.valor;
        
        -- Atualizar também na tabela de mensagens se houver para notificar
        UPDATE public.mensagens 
        SET texto = '✨ A Pergunta ao Baralho foi PAGA! A cartomante está canalizando as energias para responder...'
        WHERE question_id = NEW.id AND is_question = true;

    -- Se o status foi cancelado
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'cancelada' AND OLD.status != 'cancelada') THEN
        UPDATE public.financeiro 
        SET status = 'cancelado' 
        WHERE referencia_id = NEW.id AND categoria = 'pergunta_baralho';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho de sincronização para perguntas ao baralho
DROP TRIGGER IF EXISTS tg_sync_pergunta_financeiro ON public.perguntas_baralho;
CREATE TRIGGER tg_sync_pergunta_financeiro
    AFTER INSERT OR UPDATE OF status ON public.perguntas_baralho
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_pergunta_financeiro();


-- ==========================================================================
-- 12. EXPANSÃO PARA ORGANIZAÇÃO PESSOAL, RESPOSTAS RÁPIDAS E MODO EMOCIONAL (PROMPT 11)
-- ==========================================================================

-- Tabela de Anotações Pessoais e Roteiros da Cartomante
CREATE TABLE IF NOT EXISTS public.anotacoes_pessoais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartomante_id UUID NOT NULL,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('video', 'postagem', 'ritual', 'estudo', 'atendimento', 'pessoal', 'outro')),
    tipo_aba TEXT NOT NULL CHECK (tipo_aba IN ('rotina', 'ideias', 'videos', 'pesquisas', 'inspiracoes', 'anotacoes')),
    favorito BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em anotacoes_pessoais
ALTER TABLE public.anotacoes_pessoais ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para anotacoes_pessoais
DROP POLICY IF EXISTS "Cartomantes possuem privacidade total sobre suas anotações" ON public.anotacoes_pessoais;
DROP POLICY IF EXISTS "Cartomantes possuem privacidade total sobre suas anotações" ON anotacoes_pessoais;
CREATE POLICY "Cartomantes possuem privacidade total sobre suas anotações"
    ON public.anotacoes_pessoais
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- Tabela de Respostas Rápidas (Templates Pré-fabricados de Chat)
CREATE TABLE IF NOT EXISTS public.respostas_rapidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartomante_id UUID NOT NULL,
    chave TEXT NOT NULL CHECK (chave IN ('confirmacao', 'reagendamento', 'atraso', 'pagamento', 'acolhimento', 'indisponibilidade')),
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL
);

-- Habilitar RLS em respostas_rapidas
ALTER TABLE public.respostas_rapidas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para respostas_rapidas
DROP POLICY IF EXISTS "Cartomantes gerenciam suas próprias respostas rápidas" ON public.respostas_rapidas;
DROP POLICY IF EXISTS "Cartomantes gerenciam suas próprias respostas rápidas" ON respostas_rapidas;
CREATE POLICY "Cartomantes gerenciam suas próprias respostas rápidas"
    ON public.respostas_rapidas
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);


-- Alterar tabela configuracoes_chat para suportar o Modo Esgotamento e Filtro Social
ALTER TABLE public.configuracoes_chat 
ADD COLUMN IF NOT EXISTS modo_esgotamento BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mensagem_esgotamento TEXT NOT NULL DEFAULT 'Os atendimentos estão funcionando em ritmo reduzido no momento para manter a qualidade e cuidado emocional.',
ADD COLUMN IF NOT EXISTS max_atendimentos_diarios INT NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_perguntas_diarias INT NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS tempo_minimo_entre_clientes INT NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS horarios_descanso JSONB NOT NULL DEFAULT '[]'::jsonb;


-- Índices de desempenho e buscas de organização
CREATE INDEX IF NOT EXISTS idx_anotacoes_cartomante ON public.anotacoes_pessoais(cartomante_id, tipo_aba);
CREATE INDEX IF NOT EXISTS idx_respostas_cartomante ON public.respostas_rapidas(cartomante_id, chave);


-- 13. Tabela de relacionamento entre Cartomante e Clientes (link)
CREATE TABLE IF NOT EXISTS public.cartomante_clientes (
    cartomante_id UUID NOT NULL, -- references cartomante user id,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','pendente')),
    bloqueado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (cartomante_id, cliente_id)
);

-- Enable RLS on cartomante_clientes
ALTER TABLE public.cartomante_clientes ENABLE ROW LEVEL SECURITY;

-- Policies: Cartomante can manage its own links, clients can view their own link status
DROP POLICY IF EXISTS "Cartomantes podem gerenciar seus clientes" ON public.cartomante_clientes;
DROP POLICY IF EXISTS "Cartomantes podem gerenciar seus clientes" ON cartomante_clientes;
CREATE POLICY "Cartomantes podem gerenciar seus clientes"
    ON public.cartomante_clientes
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);

DROP POLICY IF EXISTS "Clientes podem visualizar seu vínculo" ON public.cartomante_clientes;
DROP POLICY IF EXISTS "Clientes podem visualizar seu vínculo" ON cartomante_clientes;
CREATE POLICY "Clientes podem visualizar seu vínculo"
    ON public.cartomante_clientes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = cliente_id);


-- ==========================================================================
-- 14. EXPANSÃO FINANCEIRA E FLUXO MANUAL DE SERVIÇOS
-- ==========================================================================
ALTER TABLE public.servicos_publicos ADD COLUMN IF NOT EXISTS meio_pagamento TEXT DEFAULT 'PIX';
ALTER TABLE public.cartomante_clientes ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.pedidos_servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    cartomante_id UUID NOT NULL, -- references auth.users(id)
    servico_id UUID REFERENCES public.servicos_publicos(id) ON DELETE SET NULL,
    servico_titulo TEXT NOT NULL,
    servico_preco NUMERIC(10, 2) NOT NULL,
    meio_pagamento TEXT,
    status TEXT NOT NULL DEFAULT 'aguardando_pagamento' CHECK (status IN ('aguardando_pagamento', 'pagamento_informado', 'pagamento_confirmado', 'pagamento_pendente', 'bloqueado_temporariamente', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em pedidos_servicos
ALTER TABLE public.pedidos_servicos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pedidos_servicos
DROP POLICY IF EXISTS "Cartomantes podem gerenciar pedidos de seus serviços" ON public.pedidos_servicos;
DROP POLICY IF EXISTS "Cartomantes podem gerenciar pedidos de seus serviços" ON pedidos_servicos;
CREATE POLICY "Cartomantes podem gerenciar pedidos de seus serviços"
    ON public.pedidos_servicos
    FOR ALL
    TO authenticated
    USING (auth.uid() = cartomante_id)
    WITH CHECK (auth.uid() = cartomante_id);

DROP POLICY IF EXISTS "Clientes podem visualizar e criar seus próprios pedidos" ON public.pedidos_servicos;
DROP POLICY IF EXISTS "Clientes podem visualizar e criar seus próprios pedidos" ON pedidos_servicos;
CREATE POLICY "Clientes podem visualizar e criar seus próprios pedidos"
    ON public.pedidos_servicos
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = pedidos_servicos.cliente_id
            AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = pedidos_servicos.cliente_id
            AND c.user_id = auth.uid()
        )
    );

-- ==========================================================================
-- 15. MELHORIAS DE SEGURANÇA E AUDITORIA FINANCEIRA ADICIONAL
-- ==========================================================================
ALTER TABLE public.pedidos_servicos ADD COLUMN IF NOT EXISTS nota_cliente TEXT;
ALTER TABLE public.pedidos_servicos ADD COLUMN IF NOT EXISTS hash_transacao TEXT;
ALTER TABLE public.pedidos_servicos ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE public.pedidos_servicos ADD COLUMN IF NOT EXISTS data_envio_pagamento TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.historico_acoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartomante_id UUID NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    detalhes TEXT NOT NULL,
    status_pedido TEXT,
    comprovante_anexado BOOLEAN DEFAULT false,
    observacao_cartomante TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em historico_acoes
ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: cartomantes só visualizam e inserem logs associados a elas.
DROP POLICY IF EXISTS "Cartomantes podem visualizar seu próprio histórico" ON public.historico_acoes;
DROP POLICY IF EXISTS "Cartomantes podem visualizar seu próprio histórico" ON historico_acoes;
CREATE POLICY "Cartomantes podem visualizar seu próprio histórico"
    ON public.historico_acoes FOR SELECT TO authenticated
    USING (auth.uid() = cartomante_id);

DROP POLICY IF EXISTS "Cartomantes podem inserir registros no histórico" ON public.historico_acoes;
DROP POLICY IF EXISTS "Cartomantes podem inserir registros no histórico" ON historico_acoes;
CREATE POLICY "Cartomantes podem inserir registros no histórico"
    ON public.historico_acoes FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = cartomante_id);


-- ==========================================================================
-- 16. AJUSTES DE RLS PARA FLUXO DE CADASTRO (CLIENTES & CARTOMANTES)
-- ==========================================================================

-- Habilitar RLS em clientes e cartomantes (garantindo que estejam ativos)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartomantes ENABLE ROW LEVEL SECURITY;

-- 1. Políticas de Inserção para Cadastro Inicial (Abertura para anon/authenticated)
DROP POLICY IF EXISTS "Permitir inserção de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir inserção de clientes" ON clientes;
CREATE POLICY "Permitir inserção de clientes" 
    ON public.clientes FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir inserção de cartomantes" ON public.cartomantes;
DROP POLICY IF EXISTS "Permitir inserção de cartomantes" ON cartomantes;
CREATE POLICY "Permitir inserção de cartomantes" 
    ON public.cartomantes FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);

-- 2. Políticas de Seleção e Atualização pós-login (Segurança do Usuário)
DROP POLICY IF EXISTS "Clientes podem visualizar seu próprio perfil" ON public.clientes;
DROP POLICY IF EXISTS "Clientes podem visualizar seu próprio perfil" ON clientes;
CREATE POLICY "Clientes podem visualizar seu próprio perfil" 
    ON public.clientes FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Clientes podem atualizar seu próprio perfil" ON public.clientes;
DROP POLICY IF EXISTS "Clientes podem atualizar seu próprio perfil" ON clientes;
CREATE POLICY "Clientes podem atualizar seu próprio perfil" 
    ON public.clientes FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cartomantes podem visualizar seu próprio perfil" ON public.cartomantes;
DROP POLICY IF EXISTS "Cartomantes podem visualizar seu próprio perfil" ON cartomantes;
CREATE POLICY "Cartomantes podem visualizar seu próprio perfil" 
    ON public.cartomantes FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cartomantes podem atualizar seu próprio perfil" ON public.cartomantes;
DROP POLICY IF EXISTS "Cartomantes podem atualizar seu próprio perfil" ON cartomantes;
CREATE POLICY "Cartomantes podem atualizar seu próprio perfil" 
    ON public.cartomantes FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Permitir que qualquer visitante logado ou anônimo veja perfis e cartomantes para a vitrine
DROP POLICY IF EXISTS "Qualquer um pode ver lista de cartomantes" ON public.cartomantes;
DROP POLICY IF EXISTS "Qualquer um pode ver lista de cartomantes" ON cartomantes;
CREATE POLICY "Qualquer um pode ver lista de cartomantes" 
    ON public.cartomantes FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Qualquer um pode ver lista de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Qualquer um pode ver lista de clientes" ON clientes;
CREATE POLICY "Qualquer um pode ver lista de clientes" 
    ON public.clientes FOR SELECT 
    USING (true);



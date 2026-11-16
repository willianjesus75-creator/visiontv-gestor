-- VisionTV Gestor | atualização da área Clientes
-- Migration aditiva: não apaga tabelas, colunas ou registros.
-- Execute no SQL Editor do projeto Supabase usado pelo painel.

DO $$
BEGIN
  IF to_regclass('public.clientes') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.clientes não encontrada. Confirme o projeto Supabase.';
  END IF;
  IF to_regclass('public.assinaturas') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.assinaturas não encontrada. Confirme o projeto Supabase.';
  END IF;
END $$;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS mac text,
  ADD COLUMN IF NOT EXISTS aplicativo text,
  ADD COLUMN IF NOT EXISTS observacoes text;

-- O campo telefone antigo permanece no banco por segurança.
-- A interface nova utiliza somente whatsapp como contato.

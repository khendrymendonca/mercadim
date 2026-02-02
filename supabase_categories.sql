-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Criar tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#10b981' -- Emerald-500 default
);

-- 2. Inserir categorias padrão caso a tabela esteja vazia
INSERT INTO categories (name) 
VALUES 
    ('Higiene'), 
    ('Bebidas'), 
    ('Mercearia'), 
    ('Padaria'), 
    ('Limpeza'), 
    ('Hortifruti'), 
    ('Açougue'), 
    ('Outros')
ON CONFLICT (name) DO NOTHING;

-- 3. Habilitar RLS e criar política de acesso
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all categories" ON categories FOR ALL USING (true) WITH CHECK (true);

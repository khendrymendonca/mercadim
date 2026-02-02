-- Execute este script no SQL Editor do seu projeto Supabase para atualizar as tabelas

-- 1. Adicionar coluna de promoção na tabela de itens de compra
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS is_promotion BOOLEAN DEFAULT FALSE;

-- 2. Criar tabela de Produtos Pré-cadastrados (Catálogo)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
    default_category TEXT DEFAULT 'Mercearia',
    default_unit TEXT DEFAULT 'un'
);

-- 3. Criar tabela de Marcas favoritas/frequentes por produto (opcional, mas ajuda)
CREATE TABLE IF NOT EXISTS product_brands (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    UNIQUE(product_id, brand_name)
);

-- 4. Inserir categorias iniciais seria bom, mas as categorias são fixas no código por enquanto.

-- Políticas de RLS para as novas tabelas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all product_brands" ON product_brands FOR ALL USING (true) WITH CHECK (true);

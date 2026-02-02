-- Execute este script no SQL Editor do seu projeto Supabase

-- Tabela de Mercados (Stores)
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    address TEXT
);

-- Tabela de Compras (Purchases)
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date DATE NOT NULL,
    store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
    total DECIMAL(10,2) NOT NULL
);

-- Tabela de Itens de Compra (Purchase Items)
CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    weight DECIMAL(10,2),
    unit TEXT,
    price DECIMAL(10,2) NOT NULL,
    date DATE
);

-- Tabela de Listas de Planejamento (Shopping Lists)
CREATE TABLE IF NOT EXISTS shopping_lists (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' -- 'active', 'completed'
);

-- Tabela de Itens da Lista (Shopping List Items)
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    list_id INTEGER REFERENCES shopping_lists(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    checked BOOLEAN DEFAULT FALSE,
    price DECIMAL(10,2),
    unit TEXT
);

-- Configuração de RLS (Opcional, mas recomendado desativar para testes iniciais ou configurar corretamente)
-- Por enquanto, vamos habilitar acesso total para facilitar o desenvolvimento.
-- No futuro, você deve configurar autenticação de usuários.

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso (Public read/write para protótipo rápido)
CREATE POLICY "Allow all stores" ON stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all purchase_items" ON purchase_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all shopping_lists" ON shopping_lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all shopping_list_items" ON shopping_list_items FOR ALL USING (true) WITH CHECK (true);

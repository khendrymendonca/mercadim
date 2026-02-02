-- Adicionar coluna de forma de pagamento na tabela de compras
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'va';

-- Comentário opcional para explicar os valores: 'va' para Vale Alimentação, 'personal' para Dinheiro do Bolso/Conta

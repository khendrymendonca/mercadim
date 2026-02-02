# Jireh 🕊️

Provedor de economias para o seu mercado. Progressive Web App (PWA) para controle de compras e comparação histórica de preços.

## 🎯 Funcionalidades

### ✅ Nova Compra
- Seleção ou cadastro de mercados
- Lançamento rápido de itens com:
  - Nome do produto, marca, peso/medida
  - Categoria (Higiene, Bebidas, Mercearia, etc.)
  - Preço com cálculo automático de preço por kg/litro
- **Card inteligente** mostrando menor preço histórico ao digitar
- Registro de compras retroativas

### 📊 Dashboard de Análise
- Gráfico de gastos mensais
- Indicador de inflação pessoal
- Ranking de mercados mais baratos
- Gastos por categoria (gráfico de pizza)

### 📜 Histórico de Compras
- Lista completa de todas as compras
- Visualização detalhada de cada compra
- Ordenação por data

### 🔍 Consulta de Produto
- Busca inteligente com sugestões
- Gráfico de variação de preço ao longo do tempo
- Histórico completo: onde e quando foi comprado
- Indicadores de menor/maior preço e variação percentual

## 🎨 Design
- **Mobile-first** com botões grandes para uso no supermercado
- Paleta: Sunset Warm (Laranja e Pêssego)
- Animações suaves e micro-interações
- Design moderno, acolhedor e premium

## 💾 Tecnologias
- **React** + **Vite**
- **IndexedDB** (via idb) para armazenamento offline
- **Recharts** para gráficos
- **React Router** para navegação
- **PWA** com service worker para funcionar offline

## 🚀 Como Executar

\`\`\`bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
\`\`\`

## 📱 Instalação como PWA
Acesse o app pelo navegador e clique em "Instalar" para adicionar à tela inicial do seu celular!

## 🔒 Privacidade
Todos os dados são armazenados localmente no seu dispositivo. Nenhuma informação é enviada para servidores externos.

# 🥬 Julius — Smart Grocery

App de monitoramento inteligente de preços de supermercado. Acompanhe promoções, compare preços entre mercados e otimize suas compras.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Drizzle ORM** + **PostgreSQL** (Neon.tech)
- **Recharts** para gráficos
- **Lucide React** para ícones

## Setup

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais do Neon.tech.

### 3. Gerar e aplicar migrations

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

### 4. Seed dos mercados iniciais

```bash
pnpm tsx src/db/seed.ts
```

### 5. Rodar o dev server

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Páginas

| Rota | Descrição |
|------|-----------| 
| `/` | Dashboard com gráficos de gastos e preços |
| `/produtos` | Lista de produtos com melhor preço por mercado |
| `/promocoes` | Feed de promoções dos últimos 7 dias |
| `/notas` | Histórico de notas fiscais processadas |
| `/lista` | Lista de compras inteligente agrupada por mercado |

## API Routes

### Preços

```
POST /api/prices
```

Body (objeto ou array):
```json
{
  "productName": "Arroz Tio João 5kg",
  "marketName": "Atacadão",
  "price": 22.90,
  "source": "promo",
  "promoValidUntil": "2025-03-20",
  "brand": "Tio João",
  "category": "Grãos",
  "unit": "5kg"
}
```

```
GET /api/prices
```
Retorna preços dos últimos 7 dias.

```
GET /api/prices/history/[productId]
```
Histórico completo de preço de um produto.

### Notas Fiscais

```
POST /api/receipts
```

```json
{
  "marketName": "Assaí",
  "total": 350.75,
  "date": "2025-03-14",
  "imageUrl": "https://...",
  "items": [
    {
      "productName": "Arroz Tio João 5kg",
      "quantity": 2,
      "unitPrice": 22.90,
      "totalPrice": 45.80
    }
  ]
}
```

```
GET /api/receipts
```
Lista notas fiscais com mercado.

### Produtos

```
GET /api/products?search=arroz&limit=20
```
Lista produtos com melhor preço.

### Dashboard

```
GET /api/dashboard
```
Estatísticas gerais, gastos por mercado, últimos preços.

### Lista de Compras

```
POST /api/shopping-list
```
```json
{ "productName": "Leite Integral", "quantity": 2, "notes": "Preferência Itambé" }
```

```
PATCH /api/shopping-list
```
```json
{ "id": 1, "checked": true }
```

```
DELETE /api/shopping-list
```
```json
{ "id": 1 }
```

## Mercados Iniciais (Seed)

- Atacadão
- Tenda
- Assaí
- Arena
- Morete
- São Vicente

## Deploy (Vercel)

1. Push para GitHub
2. Conectar repo na Vercel
3. Adicionar variáveis de ambiente
4. Deploy automático

## Database Schema

```
markets (id, name, phone, created_at)
products (id, name, brand, category, unit, created_at)
prices (id, product_id, market_id, price, source, promo_valid_until, created_at)
receipts (id, market_id, total, date, image_url, created_at)
receipt_items (id, receipt_id, product_id, quantity, unit_price, total_price)
shopping_list (id, product_id, quantity, notes, checked, created_at)
```

---

Feito com 💚 pelo Elliot para o projeto Julius.

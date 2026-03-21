"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, TrendingDown, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from "recharts";

interface Product {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string | null;
  unitType: string | null;
  unitQuantity: string | null;
  bestPrice: {
    price: string;
    marketName: string | null;
    source: string | null;
  } | null;
}

interface PriceHistoryEntry {
  price: string;
  createdAt: string;
  marketName: string;
  marketId: number;
  source: string;
  priceType: string;
}

const MARKET_COLORS = [
  "#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2",
  "#be185d", "#65a30d", "#ea580c", "#6366f1",
];

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openProduct = useCallback(async (product: Product) => {
    setSelectedProduct(product);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/prices/history/${product.id}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  // Prepare chart data: group by date, one series per market
  const marketNames = [...new Set(history.map((h) => h.marketName))];
  const chartData = history
    .slice()
    .reverse()
    .map((h) => ({
      date: new Date(h.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      fullDate: h.createdAt,
      [h.marketName]: parseFloat(h.price),
    }));

  // Merge entries with same date
  const mergedChart: Record<string, string | number>[] = [];
  const dateMap = new Map<string, Record<string, string | number>>();
  for (const entry of chartData) {
    const existing = dateMap.get(entry.date);
    if (existing) {
      Object.assign(existing, entry);
    } else {
      const newEntry = { ...entry } as Record<string, string | number>;
      dateMap.set(entry.date, newEntry);
      mergedChart.push(newEntry);
    }
  }

  // Market comparison: latest price per market
  const latestByMarket: Record<string, { price: number; source: string }> = {};
  for (const h of history) {
    if (!latestByMarket[h.marketName]) {
      latestByMarket[h.marketName] = {
        price: parseFloat(h.price),
        source: h.source,
      };
    }
  }
  const comparisonData = Object.entries(latestByMarket)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <p className="text-gray-500">Clique num produto para ver histórico e comparativo</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, marca ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">
              {products.length === 0
                ? "Nenhum produto cadastrado."
                : "Nenhum produto encontrado."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openProduct(product)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      {product.brand && (
                        <Badge variant="outline" className="text-xs">
                          {product.brand}
                        </Badge>
                      )}
                      {product.category && (
                        <Badge variant="secondary" className="text-xs">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {product.unitType && (
                    <span className="text-xs text-gray-400">
                      {product.unitQuantity && parseFloat(product.unitQuantity) !== 1
                        ? `${product.unitQuantity}${product.unitType}`
                        : product.unitType}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {product.bestPrice ? (
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">
                      R$ {parseFloat(product.bestPrice.price).toFixed(2)}
                    </span>
                    {product.bestPrice.marketName && (
                      <span className="text-xs text-gray-500">
                        @ {product.bestPrice.marketName}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sem preço registrado</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product Detail Dialog */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedProduct?.name}
              {selectedProduct?.brand && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {selectedProduct.brand}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum histórico de preço disponível.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Price History Chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Histórico de Preço
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={mergedChart}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `R$${v}`}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, ""]}
                    />
                    <Legend />
                    {marketNames.map((name, i) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={MARKET_COLORS[i % MARKET_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Market Comparison */}
              {comparisonData.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Comparativo entre Mercados
                  </h3>
                  <ResponsiveContainer width="100%" height={comparisonData.length * 50 + 20}>
                    <BarChart
                      data={comparisonData}
                      layout="vertical"
                      margin={{ left: 10, right: 40 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `R$${v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        width={130}
                      />
                      <Tooltip
                        formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Preço"]}
                      />
                      <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                        {comparisonData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={i === 0 ? "#16a34a" : "#94a3b8"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    Preço mais recente de cada mercado (últimos 7 dias)
                  </p>
                </div>
              )}

              {/* Price Table */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Últimos Preços
                </h3>
                <div className="space-y-1">
                  {history.slice(0, 15).map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{h.marketName}</span>
                        <Badge
                          variant={h.source === "promo" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {h.source === "promo" ? "encarte" : "nota"}
                        </Badge>
                        {h.priceType === "loyalty" && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                            Cartão
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {new Date(h.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="font-bold text-green-600 min-w-[80px] text-right">
                          R$ {parseFloat(h.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

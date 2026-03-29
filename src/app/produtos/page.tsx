"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Search, TrendingDown, Plus, Pencil, Trash2 } from "lucide-react";
import { MarketBadge } from "@/components/MarketBadge";
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
    marketLogoUrl: string | null;
    source: string | null;
  } | null;
}

interface PriceHistoryEntry {
  price: string;
  createdAt: string;
  marketName: string;
  marketLogoUrl: string | null;
  marketId: number;
  source: string;
  priceType: string;
}

const MARKET_COLORS = [
  "#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2",
  "#be185d", "#65a30d", "#ea580c", "#6366f1",
];

const emptyForm = {
  name: "",
  brand: "",
  category: "",
  unit: "",
  unitType: "",
  unitQuantity: "",
};

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Price history dialog
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // CRUD dialog
  const [crudOpen, setCrudOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [crudError, setCrudError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchProducts = () => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openHistory = useCallback(async (product: Product) => {
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

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCrudError(null);
    setCrudOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      brand: product.brand || "",
      category: product.category || "",
      unit: product.unit || "",
      unitType: product.unitType || "",
      unitQuantity: product.unitQuantity || "",
    });
    setCrudError(null);
    setCrudOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setCrudError(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category: form.category.trim() || null,
      unit: form.unit.trim() || null,
      unitType: form.unitType || null,
      unitQuantity: form.unitQuantity ? parseFloat(form.unitQuantity) : null,
    };

    try {
      const res = await fetch("/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCrudOpen(false);
        setForm(emptyForm);
        setEditingId(null);
        fetchProducts();
      } else {
        const data = await res.json();
        setCrudError(data.error || "Erro ao salvar");
      }
    } catch (e) {
      console.error(e);
      setCrudError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao deletar");
      }
    } catch (e) {
      console.error(e);
    }
    setDeleteConfirm(null);
    fetchProducts();
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  // Chart data
  const marketNames = [...new Set(history.map((h) => h.marketName))];
  const chartData = history.slice().reverse().map((h) => ({
    date: new Date(h.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    [h.marketName]: parseFloat(h.price),
  }));

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

  const latestByMarket: Record<string, { price: number; source: string }> = {};
  for (const h of history) {
    if (!latestByMarket[h.marketName]) {
      latestByMarket[h.marketName] = { price: parseFloat(h.price), source: h.source };
    }
  }
  const comparisonData = Object.entries(latestByMarket)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500">Clique num produto para ver histórico</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={16} />
          <span className="hidden sm:inline">Novo Produto</span>
          <span className="sm:hidden">Novo</span>
        </Button>
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
              {products.length === 0 ? "Nenhum produto cadastrado." : "Nenhum produto encontrado."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openHistory(product)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      {product.brand && <Badge variant="outline" className="text-xs">{product.brand}</Badge>}
                      {product.category && <Badge variant="secondary" className="text-xs">{product.category}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => { e.stopPropagation(); openEdit(product); }}
                    >
                      <Pencil size={14} />
                    </Button>
                    {deleteConfirm === product.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="destructive" size="xs" onClick={() => handleDelete(product.id)}>Sim</Button>
                        <Button variant="ghost" size="xs" onClick={() => setDeleteConfirm(null)}>Não</Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(product.id); }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {product.bestPrice ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-bold text-green-600">
                        R$ {parseFloat(product.bestPrice.price).toFixed(2)}
                      </span>
                    </div>
                    {product.bestPrice.marketName && (
                      <div className="flex items-center gap-1.5">
                        <MarketBadge
                          name={product.bestPrice.marketName}
                          logoUrl={product.bestPrice.marketLogoUrl}
                          size="sm"
                        />
                        <span className="text-xs text-gray-500">{product.bestPrice.marketName}</span>
                      </div>
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

      {/* CRUD Dialog */}
      <Dialog open={crudOpen} onOpenChange={setCrudOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700">Nome *</label>
              <Input placeholder="Ex: Cerveja Brahma Lata 350ml" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Marca</label>
                <Input placeholder="Ex: Brahma" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Categoria</label>
                <Input placeholder="Ex: Bebidas" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Unidade (display)</label>
              <Input placeholder="Ex: Lata 350ml, Pacote 5kg" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Tipo de unidade</label>
                <select
                  value={form.unitType}
                  onChange={(e) => setForm({ ...form, unitType: e.target.value })}
                  className="w-full h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">—</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                  <option value="un">un</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Quantidade</label>
                <Input type="number" step="0.001" min="0" placeholder="Ex: 350" value={form.unitQuantity} onChange={(e) => setForm({ ...form, unitQuantity: e.target.value })} />
              </div>
            </div>
            {crudError && <p className="text-sm text-red-600">{crudError}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedProduct?.name}
              {selectedProduct?.brand && (
                <span className="text-sm font-normal text-gray-500 ml-2">{selectedProduct.brand}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum histórico de preço disponível.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Preço</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={mergedChart}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} domain={["auto", "auto"]} />
                    <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, ""]} />
                    <Legend />
                    {marketNames.map((name, i) => (
                      <Line key={name} type="monotone" dataKey={name} stroke={MARKET_COLORS[i % MARKET_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {comparisonData.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparativo entre Mercados</h3>
                  <ResponsiveContainer width="100%" height={comparisonData.length * 50 + 20}>
                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 10, right: 40 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                      <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Preço"]} />
                      <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                        {comparisonData.map((entry, i) => (
                          <Cell key={entry.name} fill={i === 0 ? "#16a34a" : "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Últimos Preços</h3>
                <div className="space-y-1">
                  {history.slice(0, 15).map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <MarketBadge name={h.marketName} logoUrl={h.marketLogoUrl} size="sm" />
                        <span className="font-medium">{h.marketName}</span>
                        <Badge variant={h.source === "promo" ? "default" : "secondary"} className="text-xs">
                          {h.source === "promo" ? "encarte" : "nota"}
                        </Badge>
                        {h.priceType === "loyalty" && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">Cartão</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString("pt-BR")}</span>
                        <span className="font-bold text-green-600 min-w-[80px] text-right">R$ {parseFloat(h.price).toFixed(2)}</span>
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

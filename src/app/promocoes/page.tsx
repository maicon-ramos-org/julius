"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tag, Clock, CreditCard, Plus, Trash2 } from "lucide-react";
import { MarketBadge } from "@/components/MarketBadge";

interface Promo {
  id: number;
  price: string;
  source: string;
  priceType: string;
  normalizedPrice: string | null;
  normalizedUnit: string | null;
  promoValidUntil: string | null;
  createdAt: string;
  productName: string;
  productBrand: string | null;
  productCategory: string | null;
  productUnit: string | null;
  marketName: string;
  marketLogoUrl: string | null;
}

interface MarketOption {
  id: number;
  name: string;
}

const emptyForm = {
  productName: "",
  marketId: "",
  price: "",
  source: "promo",
  priceType: "regular",
  promoValidUntil: "",
};

export default function PromocoesPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "promo" | "receipt">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketsList, setMarketsList] = useState<MarketOption[]>([]);

  const fetchPromos = () => {
    fetch("/api/prices")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPromos(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPromos();
    // Fetch markets for the dropdown
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMarketsList(data.map((m: { id: number; name: string }) => ({ id: m.id, name: m.name })));
        }
      })
      .catch(console.error);
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const openNew = () => {
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.productName.trim() || !form.marketId || !form.price) return;
    setSaving(true);
    setError(null);

    const market = marketsList.find((m) => m.id === parseInt(form.marketId));

    const payload = {
      productName: form.productName.trim(),
      marketName: market?.name || "",
      price: parseFloat(form.price),
      source: form.source,
      priceType: form.priceType,
      promoValidUntil: form.promoValidUntil || null,
    };

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        fetchPromos();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
      }
    } catch (e) {
      console.error(e);
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/prices?id=${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchPromos();
  };

  const filtered = filter === "all" ? promos : promos.filter((p) => p.source === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promoções</h1>
          <p className="text-gray-500">Preços registrados nos últimos 7 dias</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter pills */}
          <div className="hidden sm:flex gap-1">
            {(["all", "promo", "receipt"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "Todos" : f === "promo" ? "Encartes" : "Notas"}
              </button>
            ))}
          </div>
          <Button onClick={openNew} size="sm">
            <Plus size={16} />
            <span className="hidden sm:inline">Registrar Preço</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma promoção recente.</p>
            <p className="text-sm text-gray-400 mt-1">
              Clique em &quot;Registrar Preço&quot; para adicionar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((promo) => (
            <Card key={promo.id} className={isExpired(promo.promoValidUntil) ? "opacity-60" : ""}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{promo.productName}</h3>
                      {promo.productBrand && (
                        <Badge variant="outline" className="text-xs">{promo.productBrand}</Badge>
                      )}
                      <Badge
                        variant={promo.source === "promo" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {promo.source === "promo" ? "encarte" : "nota"}
                      </Badge>
                      {promo.priceType === "loyalty" && (
                        <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 bg-amber-50">
                          <CreditCard size={10} />
                          Cartão
                        </Badge>
                      )}
                      {promo.priceType === "bulk" && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                          Atacado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <MarketBadge name={promo.marketName} logoUrl={promo.marketLogoUrl} size="sm" />
                        <span>{promo.marketName}</span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(promo.createdAt)}
                      </span>
                      {promo.promoValidUntil && (
                        <span className={isExpired(promo.promoValidUntil) ? "text-red-500" : "text-green-600"}>
                          {isExpired(promo.promoValidUntil)
                            ? "Expirada"
                            : `Válida até ${formatDate(promo.promoValidUntil)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        R$ {parseFloat(promo.price).toFixed(2)}
                      </p>
                      {promo.normalizedPrice && promo.normalizedUnit && (
                        <p className="text-xs text-gray-400">
                          R$ {parseFloat(promo.normalizedPrice).toFixed(2)}/{promo.normalizedUnit}
                        </p>
                      )}
                    </div>
                    {deleteConfirm === promo.id ? (
                      <div className="flex items-center gap-1">
                        <Button variant="destructive" size="xs" onClick={() => handleDelete(promo.id)}>Sim</Button>
                        <Button variant="ghost" size="xs" onClick={() => setDeleteConfirm(null)}>Não</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon-xs" onClick={() => setDeleteConfirm(promo.id)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de registro de preço */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Preço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700">Produto *</label>
              <Input
                placeholder="Ex: Cerveja Brahma Lata 350ml"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                Se não existir, será criado automaticamente
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Mercado *</label>
              <select
                value={form.marketId}
                onChange={(e) => setForm({ ...form, marketId: e.target.value })}
                className="w-full h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecione...</option>
                {marketsList.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Preço (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2.49"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Fonte</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="promo">Encarte</option>
                  <option value="receipt">Nota fiscal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Tipo de preço</label>
                <select
                  value={form.priceType}
                  onChange={(e) => setForm({ ...form, priceType: e.target.value })}
                  className="w-full h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="regular">Regular</option>
                  <option value="loyalty">Cartão fidelidade</option>
                  <option value="bulk">Atacado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Validade</label>
                <Input
                  type="date"
                  value={form.promoValidUntil}
                  onChange={(e) => setForm({ ...form, promoValidUntil: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !form.productName.trim() || !form.marketId || !form.price}
            >
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

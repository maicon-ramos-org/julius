"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Store, CreditCard, Package, Tag, DollarSign, Plus, Pencil, Trash2 } from "lucide-react";

interface MarketData {
  id: number;
  name: string;
  phone: string | null;
  hasLoyalty: boolean;
  loyaltyProgram: string | null;
  logoUrl: string | null;
  stats: {
    productsTracked: number;
    recentPromos7d: number;
    totalSpent30d: number;
    cheapestItem: { productName: string; price: string } | null;
  };
}

const emptyForm = {
  name: "",
  phone: "",
  loyaltyProgram: "",
  hasLoyalty: false,
  logoUrl: "",
};

export default function MercadosPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchMarkets = () => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMarkets(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (market: MarketData) => {
    setEditingId(market.id);
    setForm({
      name: market.name,
      phone: market.phone || "",
      loyaltyProgram: market.loyaltyProgram || "",
      hasLoyalty: market.hasLoyalty,
      logoUrl: market.logoUrl || "",
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      loyaltyProgram: form.loyaltyProgram.trim() || null,
      hasLoyalty: form.hasLoyalty,
      logoUrl: form.logoUrl.trim() || null,
    };

    try {
      const res = await fetch("/api/markets", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        setEditingId(null);
        fetchMarkets();
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
    try {
      const res = await fetch(`/api/markets?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao deletar");
      }
    } catch (e) {
      console.error(e);
    }
    setDeleteConfirm(null);
    fetchMarkets();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        setForm({ ...form, logoUrl: url });
      } else {
        const data = await res.json();
        setError(data.error || "Erro no upload");
      }
    } catch (e) {
      console.error(e);
      setError("Erro de conexão no upload");
    } finally {
      setUploading(false);
    }
  };

  // Generate color from name hash
  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 50%)`;
  };

  // Market Logo Component
  const MarketLogo = ({ name, logoUrl }: { name: string; logoUrl?: string | null }) => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={`Logo ${name}`}
          className="h-12 w-12 rounded-full object-cover"
        />
      );
    }

    const initials = name
      .split(" ")
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase())
      .join("");

    return (
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold"
        style={{ backgroundColor: getColorFromName(name) }}
      >
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mercados</h1>
          <p className="text-gray-500">Mercados monitorados em Hortolândia</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={16} />
          <span className="hidden sm:inline">Novo Mercado</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : markets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum mercado cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {markets.map((market) => (
            <Card key={market.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <MarketLogo name={market.name} logoUrl={market.logoUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{market.name}</h3>
                        {market.hasLoyalty && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <CreditCard size={10} />
                            {market.loyaltyProgram}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(market)}>
                          <Pencil size={14} />
                        </Button>
                        {deleteConfirm === market.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="destructive" size="xs" onClick={() => handleDelete(market.id)}>
                              Sim
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => setDeleteConfirm(null)}>
                              Não
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon-xs" onClick={() => setDeleteConfirm(market.id)}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {market.phone && (
                      <p className="text-xs text-gray-400 mt-0.5">{market.phone}</p>
                    )}

                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                          <Package size={12} />
                          <span className="text-xs">Produtos</span>
                        </div>
                        <p className="text-lg font-bold text-gray-700">
                          {market.stats.productsTracked}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                          <Tag size={12} />
                          <span className="text-xs">Promos 7d</span>
                        </div>
                        <p className="text-lg font-bold text-gray-700">
                          {market.stats.recentPromos7d}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                          <DollarSign size={12} />
                          <span className="text-xs">Gasto 30d</span>
                        </div>
                        <p className="text-lg font-bold text-gray-700">
                          {market.stats.totalSpent30d > 0
                            ? `R$ ${market.stats.totalSpent30d.toFixed(0)}`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {market.stats.cheapestItem && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                        Destaque: <span className="font-medium text-gray-700">{market.stats.cheapestItem.productName}</span>
                        {" "}por{" "}
                        <span className="font-bold text-green-600">
                          R$ {parseFloat(market.stats.cheapestItem.price).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Mercado" : "Novo Mercado"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700">Nome *</label>
              <Input
                placeholder="Ex: Atacadão"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Telefone</label>
              <Input
                placeholder="(19) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Logo</label>
              <div className="space-y-3">
                {form.logoUrl && (
                  <div className="flex items-center gap-3">
                    <img src={form.logoUrl} alt="Preview" className="h-10 w-10 rounded-full object-cover" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm({ ...form, logoUrl: "" })}
                    >
                      Remover
                    </Button>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <p className="text-xs text-gray-500">Fazendo upload...</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Programa de fidelidade</label>
              <Input
                placeholder="Ex: Cartão Atacadão, Passaí"
                value={form.loyaltyProgram}
                onChange={(e) => setForm({ ...form, loyaltyProgram: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.hasLoyalty}
                onCheckedChange={(checked) =>
                  setForm({ ...form, hasLoyalty: checked as boolean })
                }
              />
              <label className="text-sm text-gray-700">Tem programa de fidelidade</label>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              Cancelar
            </DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

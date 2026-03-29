"use client";

import { useEffect, useState } from "react";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Search,
  Bell,
  BellOff,
  BellRing,
  Bot,
} from "lucide-react";

interface Need {
  id: number;
  name: string;
  category: string | null;
  keywords: string[];
  preferred: string[] | null;
  targetPrice: string | null;
  targetUnit: string | null;
  alertMode: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
}

const ALERT_LABELS: Record<string, string> = {
  below_target: "Abaixo do alvo",
  always: "Sempre",
  never: "Nunca",
};

const ALERT_ICONS: Record<string, typeof Bell> = {
  below_target: Bell,
  always: BellRing,
  never: BellOff,
};

const emptyForm = {
  name: "",
  category: "",
  keywords: "",
  preferred: "",
  targetPrice: "",
  targetUnit: "",
  alertMode: "below_target",
  notes: "",
};

export default function NecessidadesPage() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchNeeds = () => {
    fetch("/api/needs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNeeds(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNeeds();
  }, []);

  const filtered = needs.filter(
    (n) =>
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      (n.category && n.category.toLowerCase().includes(search.toLowerCase())) ||
      n.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase()))
  );

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (need: Need) => {
    setEditingId(need.id);
    setForm({
      name: need.name,
      category: need.category || "",
      keywords: need.keywords.join(", "),
      preferred: need.preferred?.join(", ") || "",
      targetPrice: need.targetPrice || "",
      targetUnit: need.targetUnit || "",
      alertMode: need.alertMode,
      notes: need.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    const keywords = form.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const preferred = form.preferred
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      category: form.category.trim() || null,
      keywords,
      preferred,
      targetPrice: form.targetPrice || null,
      targetUnit: form.targetUnit.trim() || null,
      alertMode: form.alertMode,
      notes: form.notes.trim() || null,
    };

    try {
      const res = await fetch("/api/needs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm(emptyForm);
        setEditingId(null);
        fetchNeeds();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (need: Need) => {
    const newActive = !need.active;
    setNeeds((prev) =>
      prev.map((n) => (n.id === need.id ? { ...n, active: newActive } : n))
    );
    await fetch("/api/needs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: need.id, active: newActive }),
    }).catch(console.error);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/needs?id=${id}&hard=true`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchNeeds();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Necessidades</h1>
          <p className="text-gray-500">O que você precisa comprar</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={16} />
          <span className="hidden sm:inline">Nova Necessidade</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, categoria ou palavra-chave..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/3 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-100 rounded w-full mt-2" />
                <div className="h-4 bg-gray-100 rounded w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {needs.length === 0
                ? "Nenhuma necessidade cadastrada."
                : "Nenhuma necessidade encontrada."}
            </p>
            {needs.length === 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Clique em &quot;Nova Necessidade&quot; para começar.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((need) => {
            const AlertIcon = ALERT_ICONS[need.alertMode] || Bell;
            return (
              <Card
                key={need.id}
                className={`hover:shadow-md transition-shadow ${!need.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{need.name}</CardTitle>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {need.category && (
                          <Badge variant="secondary" className="text-xs">
                            {need.category}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-xs gap-1"
                        >
                          <AlertIcon size={10} />
                          {ALERT_LABELS[need.alertMode] || need.alertMode}
                        </Badge>
                        {need.notes === "Criado automaticamente a partir de nota fiscal" && (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 border-blue-300 text-blue-700 bg-blue-50"
                          >
                            <Bot size={10} />
                            Auto
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(need)}
                      >
                        <Pencil size={14} />
                      </Button>
                      {deleteConfirm === need.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => handleDelete(need.id)}
                          >
                            Sim
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            Não
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteConfirm(need.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Preço alvo */}
                  {need.targetPrice && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-green-600">
                        R$ {parseFloat(need.targetPrice).toFixed(2)}
                      </span>
                      {need.targetUnit && (
                        <span className="text-xs text-gray-500">
                          / {need.targetUnit}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Keywords */}
                  {need.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {need.keywords.map((kw, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 text-gray-500"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Marcas preferidas */}
                  {need.preferred && need.preferred.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Preferência: {need.preferred.join(", ")}
                    </p>
                  )}

                  {/* Notas */}
                  {need.notes && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {need.notes}
                    </p>
                  )}

                  {/* Toggle ativo */}
                  <div className="mt-3 pt-2 border-t">
                    <button
                      onClick={() => toggleActive(need)}
                      className={`text-xs font-medium ${
                        need.active
                          ? "text-green-600 hover:text-green-700"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {need.active ? "● Ativo" : "○ Inativo"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Necessidade" : "Nova Necessidade"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700">
                Nome *
              </label>
              <Input
                placeholder="Ex: Cerveja, Margarina..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">
                Categoria
              </label>
              <Input
                placeholder="Ex: Bebidas, Laticínios..."
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">
                Palavras-chave (separadas por vírgula)
              </label>
              <Input
                placeholder="Ex: cerveja, beer, cerva"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                Se vazio, usa o nome como palavra-chave
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">
                Marcas preferidas (separadas por vírgula)
              </label>
              <Input
                placeholder="Ex: Brahma, Skol"
                value={form.preferred}
                onChange={(e) => setForm({ ...form, preferred: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Preço alvo (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="3.50"
                  value={form.targetPrice}
                  onChange={(e) =>
                    setForm({ ...form, targetPrice: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Unidade
                </label>
                <Input
                  placeholder="Ex: lata 350ml"
                  value={form.targetUnit}
                  onChange={(e) =>
                    setForm({ ...form, targetUnit: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">
                Modo de alerta
              </label>
              <select
                value={form.alertMode}
                onChange={(e) =>
                  setForm({ ...form, alertMode: e.target.value })
                }
                className="w-full h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="below_target">Abaixo do alvo</option>
                <option value="always">Sempre</option>
                <option value="never">Nunca</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">
                Observações
              </label>
              <textarea
                placeholder="Ex: Qualquer marca serve"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="sm" />}
            >
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

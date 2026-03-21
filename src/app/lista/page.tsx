"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, MapPin, Plus, Trash2 } from "lucide-react";

interface ShoppingItem {
  id: number;
  quantity: string;
  notes: string | null;
  checked: boolean;
  product: {
    id: number;
    name: string;
    brand: string | null;
    unit: string | null;
  };
  bestPrice: {
    price: string;
    marketName: string;
  } | null;
}

export default function ListaPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [adding, setAdding] = useState(false);

  const fetchItems = () => {
    fetch("/api/shopping-list")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const toggleItem = async (id: number, checked: boolean) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item))
    );
    await fetch("/api/shopping-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, checked }),
    }).catch(console.error);
  };

  const addItem = async () => {
    if (!newItemName.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: newItemName.trim(),
          quantity: parseFloat(newItemQty) || 1,
        }),
      });
      setNewItemName("");
      setNewItemQty("1");
      fetchItems();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const deleteItem = async (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await fetch("/api/shopping-list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(console.error);
  };

  // Agrupar por melhor mercado
  const byMarket = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const market = item.bestPrice?.marketName || "Sem preço";
    if (!acc[market]) acc[market] = [];
    acc[market].push(item);
    return acc;
  }, {});

  const totalEstimate = items.reduce((sum, item) => {
    if (item.bestPrice) {
      return sum + parseFloat(item.bestPrice.price) * parseFloat(item.quantity);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lista de Compras</h1>
        <p className="text-gray-500">Itens organizados pelo melhor mercado</p>
      </div>

      {/* Adicionar item */}
      <Card>
        <CardContent className="py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Nome do produto..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="w-20"
            />
            <Button type="submit" disabled={adding || !newItemName.trim()}>
              <Plus size={16} className="mr-1" />
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Lista de compras vazia.</p>
            <p className="text-sm text-gray-400 mt-1">
              Adicione itens usando o campo acima.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estimativa total */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-green-800">Estimativa total</p>
                <p className="text-xl font-bold text-green-700">
                  R$ {totalEstimate.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Itens agrupados por mercado */}
          {Object.entries(byMarket).map(([marketName, marketItems]) => (
            <Card key={marketName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin size={16} className="text-green-600" />
                  {marketName}
                  <Badge variant="outline">{marketItems.length} itens</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-1"
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={(checked) =>
                          toggleItem(item.id, checked as boolean)
                        }
                      />
                      <div className={`flex-1 ${item.checked ? "line-through text-gray-400" : ""}`}>
                        <span className="text-sm font-medium">
                          {item.product.name}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          x{item.quantity}
                          {item.product.unit && ` ${item.product.unit}`}
                        </span>
                        {item.notes && (
                          <p className="text-xs text-gray-400">{item.notes}</p>
                        )}
                      </div>
                      {item.bestPrice && (
                        <span className="text-sm font-bold text-green-600">
                          R$ {(parseFloat(item.bestPrice.price) * parseFloat(item.quantity)).toFixed(2)}
                        </span>
                      )}
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

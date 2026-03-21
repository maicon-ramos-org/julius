"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, TrendingDown } from "lucide-react";

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

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <p className="text-gray-500">Todos os produtos com histórico de preços</p>
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
            <Card key={product.id} className="hover:shadow-md transition-shadow">
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
                  <div>
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
                    {product.bestPrice.source && (
                      <Badge
                        variant={product.bestPrice.source === "promo" ? "default" : "secondary"}
                        className="text-xs mt-1"
                      >
                        {product.bestPrice.source === "promo" ? "encarte" : "nota"}
                      </Badge>
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
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Clock, CreditCard, TrendingDown } from "lucide-react";

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
}

export default function PromocoesPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "promo" | "receipt">("all");

  useEffect(() => {
    fetch("/api/prices")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPromos(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const filtered = filter === "all" ? promos : promos.filter((p) => p.source === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promoções</h1>
          <p className="text-gray-500">Preços registrados nos últimos 7 dias</p>
        </div>
        {/* Filter pills */}
        <div className="flex gap-1">
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
              Envie encartes pelo agente para começar.
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
                        <Badge variant="outline" className="text-xs">
                          {promo.productBrand}
                        </Badge>
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
                      <span>📍 {promo.marketName}</span>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

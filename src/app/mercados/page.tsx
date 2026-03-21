"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, CreditCard, Package, Tag, DollarSign } from "lucide-react";

interface MarketData {
  id: number;
  name: string;
  phone: string | null;
  hasLoyalty: boolean;
  loyaltyProgram: string | null;
  stats: {
    productsTracked: number;
    recentPromos7d: number;
    totalSpent30d: number;
    cheapestItem: { productName: string; price: string } | null;
  };
}

export default function MercadosPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMarkets(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mercados</h1>
        <p className="text-gray-500">Mercados monitorados em Hortolândia</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {markets.map((market) => (
            <Card key={market.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Store className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{market.name}</h3>
                      {market.hasLoyalty && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <CreditCard size={10} />
                          {market.loyaltyProgram}
                        </Badge>
                      )}
                    </div>

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
    </div>
  );
}

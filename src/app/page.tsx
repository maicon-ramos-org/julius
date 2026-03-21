"use client";

import { useEffect, useState } from "react";
import { Package, Store, DollarSign, Tag, TrendingDown, Target } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { SpendingChart } from "@/components/spending-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  stats: {
    totalProducts: number;
    totalMarkets: number;
    totalSpent30d: string;
    activePromos7d: number;
  };
  spendingByMarket: Array<{ marketName: string; total: string; count: number }>;
  recentReceipts: Array<{ total: string; date: string; marketName: string }>;
  latestPrices: Array<{
    productName: string;
    marketName: string;
    price: string;
    source: string;
    createdAt: string;
  }>;
}

interface DealAlert {
  needName: string;
  targetPrice: number | null;
  deals: Array<{
    productName: string;
    currentPrice: number;
    marketName: string;
    percentBelowAvg: number | null;
    isGoodDeal: boolean;
    isBelowTarget: boolean;
    isPreferred: boolean;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [deals, setDeals] = useState<DealAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/alerts?onlyDeals=true").then((r) => r.json()).catch(() => []),
    ])
      .then(([dashData, dealsData]) => {
        setData(dashData);
        if (Array.isArray(dealsData)) setDeals(dealsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!data || data.stats === undefined) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-700">🔌 Conecte o banco de dados</h2>
        <p className="text-gray-500 mt-2">Configure DATABASE_URL no .env para começar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Visão geral dos seus gastos e preços</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Produtos"
          value={data.stats.totalProducts}
          icon={Package}
          description="cadastrados"
        />
        <StatCard
          title="Mercados"
          value={data.stats.totalMarkets}
          icon={Store}
          description="monitorados"
        />
        <StatCard
          title="Gasto (30d)"
          value={`R$ ${data.stats.totalSpent30d}`}
          icon={DollarSign}
          description="em notas fiscais"
        />
        <StatCard
          title="Promoções (7d)"
          value={data.stats.activePromos7d}
          icon={Tag}
          description="preços registrados"
        />
      </div>

      {/* Deals / Alerts */}
      {deals.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target size={20} className="text-green-600" />
              Ofertas para você
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deals.flatMap((deal) =>
                deal.deals.slice(0, 2).map((d, i) => (
                  <div
                    key={`${deal.needName}-${i}`}
                    className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{d.productName}</p>
                        {d.isGoodDeal && (
                          <Badge className="text-xs bg-green-600">
                            <TrendingDown size={10} className="mr-1" />
                            Bom preço
                          </Badge>
                        )}
                        {d.isPreferred && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                            Preferida
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        📍 {d.marketName} · Need: {deal.needName}
                        {deal.targetPrice && ` · Alvo: R$ ${deal.targetPrice.toFixed(2)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        R$ {d.currentPrice.toFixed(2)}
                      </p>
                      {d.percentBelowAvg !== null && d.percentBelowAvg > 0 && (
                        <p className="text-xs text-green-600">
                          {d.percentBelowAvg.toFixed(0)}% abaixo da média
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingChart data={data.spendingByMarket} />

        {/* Latest Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos Preços</CardTitle>
          </CardHeader>
          <CardContent>
            {data.latestPrices.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum preço registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {data.latestPrices.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.productName}</p>
                      <p className="text-xs text-gray-500">{p.marketName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        R$ {parseFloat(p.price).toFixed(2)}
                      </p>
                      <Badge variant={p.source === "promo" ? "default" : "secondary"} className="text-xs">
                        {p.source}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Receipts */}
      {data.recentReceipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compras Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentReceipts.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.marketName}</p>
                    <p className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <p className="font-bold">R$ {parseFloat(r.total).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

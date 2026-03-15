"use client";

import { useEffect, useState } from "react";
import { Package, Store, DollarSign, Tag } from "lucide-react";
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
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

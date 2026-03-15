"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SpendingData {
  marketName: string;
  total: string;
  count: number;
}

export function SpendingChart({ data }: { data: SpendingData[] }) {
  const chartData = data.map((d) => ({
    name: d.marketName,
    total: parseFloat(d.total),
    compras: d.count,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gastos por Mercado (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Nenhum dado ainda. Adicione notas fiscais para ver os gráficos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gastos por Mercado (30 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
            <Tooltip
              formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Total"]}
            />
            <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

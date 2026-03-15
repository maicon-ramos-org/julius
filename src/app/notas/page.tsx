"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Store } from "lucide-react";

interface ReceiptData {
  id: number;
  total: string;
  date: string;
  imageUrl: string | null;
  marketName: string;
  createdAt: string;
}

export default function NotasPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/receipts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReceipts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
        <p className="text-gray-500">Histórico de compras processadas</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma nota fiscal processada.</p>
            <p className="text-sm text-gray-400 mt-1">
              Use POST /api/receipts para enviar notas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                      <Store className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{receipt.marketName}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(receipt.date).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      R$ {parseFloat(receipt.total).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-green-800">
                  Total ({receipts.length} notas)
                </p>
                <p className="text-xl font-bold text-green-700">
                  R${" "}
                  {receipts
                    .reduce((sum, r) => sum + parseFloat(r.total), 0)
                    .toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

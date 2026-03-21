"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Store, ChevronDown, ChevronUp } from "lucide-react";

interface ReceiptItem {
  id: number;
  productName: string;
  productBrand: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

interface ReceiptData {
  id: number;
  total: string;
  date: string;
  imageUrl: string | null;
  marketName: string;
  createdAt: string;
  items: ReceiptItem[];
}

export default function NotasPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/receipts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReceipts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
              Envie notas fiscais pelo agente para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => {
            const isExpanded = expanded.has(receipt.id);
            return (
              <Card key={receipt.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <button
                    onClick={() => toggleExpanded(receipt.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                          <Store className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{receipt.marketName}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(receipt.date + "T12:00:00").toLocaleDateString("pt-BR", {
                              weekday: "long",
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            R$ {parseFloat(receipt.total).toFixed(2)}
                          </p>
                          {receipt.items.length > 0 && (
                            <p className="text-xs text-gray-400">
                              {receipt.items.length} itens
                            </p>
                          )}
                        </div>
                        {receipt.items.length > 0 && (
                          isExpanded
                            ? <ChevronUp size={18} className="text-gray-400" />
                            : <ChevronDown size={18} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Itens expandidos */}
                  {isExpanded && receipt.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="space-y-2">
                        {receipt.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <div className="flex-1">
                              <span className="font-medium">{item.productName}</span>
                              {item.productBrand && (
                                <span className="text-gray-400 ml-1">
                                  ({item.productBrand})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <span className="text-gray-500 text-xs">
                                {parseFloat(item.quantity) !== 1 && (
                                  <>{parseFloat(item.quantity).toFixed(item.quantity.includes('.') ? 3 : 0)} x </>
                                )}
                                R$ {parseFloat(item.unitPrice).toFixed(2)}
                              </span>
                              <span className="font-medium text-green-700 min-w-[80px]">
                                R$ {parseFloat(item.totalPrice).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

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

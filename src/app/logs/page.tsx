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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  Receipt,
  Package,
  Store,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  X,
} from "lucide-react";

interface InsertionLog {
  id: number;
  action: string;
  source: string;
  marketName: string | null;
  summary: string;
  details: any;
  itemCount: number;
  promoValidUntil: string | null;
  createdAt: string;
}

interface LogsPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const actionIcons = {
  price_insert: FileText,
  receipt_insert: Receipt,
  product_create: Package,
  market_create: Store,
  need_create: FileText,
};

const actionLabels = {
  price_insert: "Inserção de Preços",
  receipt_insert: "Nota Fiscal",
  product_create: "Criação de Produto",
  market_create: "Criação de Mercado",
  need_create: "Criação de Necessidade",
};

const sourceLabels = {
  api: "API",
  manual: "Manual",
  promo_scan: "Escaneamento de Encarte",
  receipt_scan: "Escaneamento de Nota",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<InsertionLog[]>([]);
  const [pagination, setPagination] = useState<LogsPagination>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    source: "",
    marketName: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<InsertionLog | null>(null);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add filters if they exist
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          searchParams.append(key, value);
        }
      });

      const response = await fetch(`/api/logs?${searchParams}`);
      const data = await response.json();

      if (data.logs) {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "price_insert": return "bg-blue-50 text-blue-700 border-blue-200";
      case "receipt_insert": return "bg-green-50 text-green-700 border-green-200";
      case "product_create": return "bg-purple-50 text-purple-700 border-purple-200";
      case "market_create": return "bg-orange-50 text-orange-700 border-orange-200";
      case "need_create": return "bg-pink-50 text-pink-700 border-pink-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "promo_scan": return "bg-amber-50 text-amber-700 border-amber-200";
      case "receipt_scan": return "bg-green-50 text-green-700 border-green-200";
      case "manual": return "bg-gray-50 text-gray-700 border-gray-200";
      case "api": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const clearFilters = () => {
    setFilters({
      action: "",
      source: "",
      marketName: "",
      startDate: "",
      endDate: "",
    });
    setShowFilters(false);
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs de Inserções</h1>
          <p className="text-gray-500">
            Histórico de atividades de entrada de dados no sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 px-1 text-xs">
                {Object.values(filters).filter(v => v).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Filtros</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                <X size={14} />
                Limpar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Ação</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Todas as ações</option>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Fonte</label>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  className="w-full h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Todas as fontes</option>
                  {Object.entries(sourceLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Mercado</label>
                <Input
                  placeholder="Ex: Atacadão"
                  value={filters.marketName}
                  onChange={(e) => setFilters({ ...filters, marketName: e.target.value })}
                  className="h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Data inicial</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Data final</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="h-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum log encontrado.</p>
            <p className="text-sm text-gray-400 mt-1">
              {hasActiveFilters
                ? "Tente ajustar os filtros aplicados."
                : "Logs serão criados automaticamente conforme os dados são inseridos no sistema."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Lista de logs */}
          <div className="space-y-3">
            {logs.map((log) => {
              const ActionIcon = actionIcons[log.action as keyof typeof actionIcons] || FileText;

              return (
                <Card key={log.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-gray-50 text-gray-700">
                          <ActionIcon size={20} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={`text-xs ${getActionColor(log.action)}`}>
                              {actionLabels[log.action as keyof typeof actionLabels] || log.action}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${getSourceColor(log.source)}`}>
                              {sourceLabels[log.source as keyof typeof sourceLabels] || log.source}
                            </Badge>
                            {log.itemCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {log.itemCount} {log.itemCount === 1 ? "item" : "itens"}
                              </Badge>
                            )}
                          </div>

                          <p className="font-medium text-gray-900 text-sm mb-1">
                            {log.summary}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDate(log.createdAt)}
                            </span>
                            {log.marketName && (
                              <span>📍 {log.marketName}</span>
                            )}
                            {log.promoValidUntil && (
                              <span className="text-green-600">
                                Válido até {formatDate(log.promoValidUntil)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="ml-2 flex-shrink-0"
                      >
                        <Eye size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.totalCount)} a{" "}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} de{" "}
                {pagination.totalCount} registros
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(pagination.page - 1)}
                  disabled={!pagination.hasPreviousPage}
                >
                  <ChevronLeft size={16} />
                  Anterior
                </Button>

                <span className="text-sm text-gray-500">
                  Página {pagination.page} de {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Próxima
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog de detalhes do log */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        {selectedLog && (
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const ActionIcon = actionIcons[selectedLog.action as keyof typeof actionIcons] || FileText;
                  return <ActionIcon size={20} />;
                })()}
                Detalhes do Log #{selectedLog.id}
              </DialogTitle>
              <DialogDescription>
                {actionLabels[selectedLog.action as keyof typeof actionLabels] || selectedLog.action} •{" "}
                {formatDate(selectedLog.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700">Ação</label>
                  <p className="text-sm text-gray-900">{actionLabels[selectedLog.action as keyof typeof actionLabels] || selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Fonte</label>
                  <p className="text-sm text-gray-900">{sourceLabels[selectedLog.source as keyof typeof sourceLabels] || selectedLog.source}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Mercado</label>
                  <p className="text-sm text-gray-900">{selectedLog.marketName || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Itens</label>
                  <p className="text-sm text-gray-900">{selectedLog.itemCount}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Resumo</label>
                <p className="text-sm text-gray-900 mt-1">{selectedLog.summary}</p>
              </div>

              {selectedLog.promoValidUntil && (
                <div>
                  <label className="text-xs font-medium text-gray-700">Validade da Promoção</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedLog.promoValidUntil)}</p>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <label className="text-xs font-medium text-gray-700">Detalhes Completos</label>
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg mt-1 overflow-x-auto">
                    {JSON.stringify(typeof selectedLog.details === 'string' ? JSON.parse(selectedLog.details) : selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
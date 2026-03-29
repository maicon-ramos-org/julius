"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketBadge } from "@/components/MarketBadge";
import { Flame, Tag, Clock, Filter } from "lucide-react";

interface Offer {
  id: number;
  productId: number;
  productName: string;
  productBrand: string | null;
  productCategory: string | null;
  marketName: string;
  marketLogoUrl: string | null;
  price: string;
  priceType: string;
  promoValidUntil: string | null;
  createdAt: string;
}

interface MarketOption {
  id: number;
  name: string;
  logoUrl: string | null;
}

export default function OfertasPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketFilter, setMarketFilter] = useState<string>("");

  const fetchOffers = () => {
    const params = new URLSearchParams();
    if (marketFilter) {
      params.set("market", marketFilter);
    }

    fetch(`/api/offers?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOffers(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchMarkets = () => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMarkets(data.map((m: any) => ({
            id: m.id,
            name: m.name,
            logoUrl: m.logoUrl,
          })));
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchOffers();
  }, [marketFilter]);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const getDaysUntilExpiry = (validUntil: string | null) => {
    if (!validUntil) return null;
    const now = new Date();
    const expiry = new Date(validUntil);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryColor = (days: number | null) => {
    if (days === null) return "gray";
    if (days < 3) return "red";
    if (days < 7) return "yellow";
    return "green";
  };

  const getExpiryText = (days: number | null) => {
    if (days === null) return "Sem prazo";
    if (days < 0) return "Expirada";
    if (days === 0) return "Expira hoje";
    if (days === 1) return "Expira amanhã";
    return `Expira em ${days}d`;
  };

  // Split offers: best deals are urgent (< 7 days) + high value items
  const bestOffers = offers.filter((offer) => {
    const days = getDaysUntilExpiry(offer.promoValidUntil);
    const isUrgent = days !== null && days < 7;
    const isHighValue = parseFloat(offer.price) >= 10; // Arbitrary threshold
    return isUrgent || isHighValue;
  }).slice(0, 8);

  const regularOffers = offers.filter((offer) => !bestOffers.includes(offer));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ofertas</h1>
          <p className="text-gray-500">Promoções válidas por mercado</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="h-8 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todos os mercados</option>
            {markets.map((market) => (
              <option key={market.id} value={market.name}>
                {market.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : (
        <>
          {/* ⭐ Melhores Ofertas */}
          {bestOffers.length > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-bold text-orange-900">⭐ Melhores Ofertas</h2>
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  {bestOffers.length} item{bestOffers.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {bestOffers.map((offer) => {
                  const days = getDaysUntilExpiry(offer.promoValidUntil);
                  const expiryColor = getExpiryColor(days);
                  const expiryText = getExpiryText(days);

                  return (
                    <Card key={offer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium text-sm leading-tight">{offer.productName}</h3>
                            {offer.productBrand && (
                              <Badge variant="outline" className="text-xs ml-1 flex-shrink-0">
                                {offer.productBrand}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <MarketBadge
                              name={offer.marketName}
                              logoUrl={offer.marketLogoUrl}
                              size="sm"
                            />
                            <span className="text-xs text-gray-600 truncate">
                              {offer.marketName}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-green-600">
                              R$ {parseFloat(offer.price).toFixed(2)}
                            </span>
                            {offer.promoValidUntil && (
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                expiryColor === "red"
                                  ? "bg-red-100 text-red-700"
                                  : expiryColor === "yellow"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}>
                                {expiryText}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Todas as Ofertas */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-bold text-gray-900">Todas as Ofertas</h2>
              <Badge variant="secondary">
                {offers.length} produto{offers.length > 1 ? "s" : ""}
              </Badge>
            </div>

            {offers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {marketFilter
                      ? `Nenhuma oferta encontrada em ${marketFilter}.`
                      : "Nenhuma oferta válida encontrada."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(bestOffers.length > 0 ? regularOffers : offers).map((offer) => {
                  const days = getDaysUntilExpiry(offer.promoValidUntil);
                  const expiryColor = getExpiryColor(days);
                  const expiryText = getExpiryText(days);

                  return (
                    <Card key={offer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <MarketBadge
                              name={offer.marketName}
                              logoUrl={offer.marketLogoUrl}
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium leading-tight">{offer.productName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {offer.productBrand && (
                                  <Badge variant="outline" className="text-xs">
                                    {offer.productBrand}
                                  </Badge>
                                )}
                                {offer.productCategory && (
                                  <Badge variant="secondary" className="text-xs">
                                    {offer.productCategory}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{offer.marketName}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-green-600">
                              R$ {parseFloat(offer.price).toFixed(2)}
                            </span>
                            {offer.priceType === "loyalty" && (
                              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                                Cartão
                              </Badge>
                            )}
                          </div>

                          {offer.promoValidUntil && (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className={`font-medium ${
                                expiryColor === "red"
                                  ? "text-red-600"
                                  : expiryColor === "yellow"
                                  ? "text-yellow-600"
                                  : "text-green-600"
                              }`}>
                                {expiryText}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
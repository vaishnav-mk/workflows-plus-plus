"use client";

import { Card, CardContent, Badge, CrossHatchBackground } from "@/components";
import { CLOUDFLARE_PRODUCTS } from "@/config/setup";

export function CloudflareProducts() {
  return (
    <Card className="bg-orange-50/30 border-orange-100 relative overflow-hidden">
      <CrossHatchBackground pattern="large" opacity={0.02} />
      <CardContent className="p-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {CLOUDFLARE_PRODUCTS.map((product, idx) => {
            const Icon = product.icon;
            return (
              <div
                key={product.name}
                className={`col-span-1 row-span-1 bg-white rounded-lg border border-orange-200 p-4 relative overflow-hidden ${product.comingSoon ? "opacity-75" : ""}`}
              >
                <CrossHatchBackground pattern="small" opacity={0.02} />
                <div className="flex items-center gap-3 relative z-10">
                  <div
                    className={`p-2.5 rounded-lg ${product.comingSoon ? "bg-gray-100" : "bg-orange-100"}`}
                  >
                    <Icon
                      className={`w-5 h-5 ${product.comingSoon ? "text-gray-500" : "text-orange-600"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`font-semibold text-sm ${product.comingSoon ? "text-gray-600" : "text-gray-900"}`}
                      >
                        {product.name}
                      </h4>
                      {product.comingSoon && (
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {product.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


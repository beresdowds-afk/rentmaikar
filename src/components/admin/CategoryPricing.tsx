import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DollarSign, Save, RefreshCw } from "lucide-react";

interface CategoryPrice {
  id: string;
  category: string;
  region: string;
  price: number;
  currency: string;
  updated_at: string;
}

const categoryLabels: Record<string, { title: string; description: string }> = {
  budget: {
    title: "The Smart Start",
    description: "2015-2016 vehicles - Entry tier for new drivers",
  },
  standard: {
    title: "The Profit Builder",
    description: "2017-2020 vehicles - Mid-tier for growing earnings",
  },
  premium: {
    title: "The Top Earner",
    description: "2021-2025 vehicles - Premium tier for maximum income",
  },
};

export function CategoryPricing() {
  const queryClient = useQueryClient();
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [activeRegion, setActiveRegion] = useState<"USA" | "NIGERIA">("USA");

  const { data: prices, isLoading } = useQuery({
    queryKey: ["category-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_category_prices")
        .select("*")
        .order("category");

      if (error) throw error;
      return data as CategoryPrice[];
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from("vehicle_category_prices")
        .update({ price })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-prices"] });
      toast.success("Price updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update price: ${error.message}`);
    },
  });

  const handlePriceChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedPrices((prev) => ({ ...prev, [id]: numValue }));
  };

  const handleSave = (id: string) => {
    const newPrice = editedPrices[id];
    if (newPrice !== undefined) {
      updatePriceMutation.mutate({ id, price: newPrice });
      setEditedPrices((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const handleSaveAll = () => {
    const regionPrices = prices?.filter((p) => p.region === activeRegion) || [];
    regionPrices.forEach((price) => {
      if (editedPrices[price.id] !== undefined) {
        updatePriceMutation.mutate({ id: price.id, price: editedPrices[price.id] });
      }
    });
    setEditedPrices({});
  };

  const getCurrencySymbol = (currency: string) => (currency === "NGN" ? "₦" : "$");

  const regionPrices = prices?.filter((p) => p.region === activeRegion) || [];
  const hasChanges = regionPrices.some((p) => editedPrices[p.id] !== undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Category Pricing</h2>
          <p className="text-muted-foreground">
            Manage advertised weekly prices for vehicle categories
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSaveAll} disabled={updatePriceMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save All Changes
          </Button>
        )}
      </div>

      <Tabs value={activeRegion} onValueChange={(v) => setActiveRegion(v as "USA" | "NIGERIA")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="USA">
            <span className="mr-2">🇺🇸</span> USA (USD)
          </TabsTrigger>
          <TabsTrigger value="NIGERIA">
            <span className="mr-2">🇳🇬</span> Nigeria (NGN)
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeRegion} className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {regionPrices.map((price) => {
              const label = categoryLabels[price.category];
              const currentValue = editedPrices[price.id] ?? price.price;
              const hasChange = editedPrices[price.id] !== undefined;

              return (
                <Card key={price.id} className={hasChange ? "ring-2 ring-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{label?.title}</CardTitle>
                      <Badge variant="outline" className="capitalize">
                        {price.category}
                      </Badge>
                    </div>
                    <CardDescription>{label?.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Weekly Price</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            value={currentValue}
                            onChange={(e) => handlePriceChange(price.id, e.target.value)}
                            className="pl-9"
                            min={0}
                          />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {price.currency}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Displayed as: From {getCurrencySymbol(price.currency)}
                        {currentValue.toLocaleString()}
                      </p>
                    </div>

                    {hasChange && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleSave(price.id)}
                        disabled={updatePriceMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Last updated:{" "}
                      {new Date(price.updated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

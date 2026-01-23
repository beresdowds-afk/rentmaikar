import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HelpCircle, Search, Globe } from "lucide-react";
import { useRegion } from "@/contexts/RegionContext";
import { useFAQ } from "@/hooks/useFAQ";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const FAQ = () => {
  const { country } = useRegion();
  const regionFilter = country === 'USA' ? 'USA' : 'Nigeria';
  const { categories, items, loading } = useFAQ(regionFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter items by search and category
  const filteredItems = useMemo(() => {
    let filtered = items;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category_id === selectedCategory);
    }
    
    return filtered;
  }, [items, searchQuery, selectedCategory]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    filteredItems.forEach(item => {
      const categoryId = item.category_id;
      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }
      groups[categoryId].push(item);
    });
    return groups;
  }, [filteredItems]);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about Rentmaikar's vehicle leasing and rental platform.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Showing content for {regionFilter === 'USA' ? 'United States' : 'Nigeria'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search FAQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Tabs */}
        {loading ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <Tabs
            value={selectedCategory || 'all'}
            onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}
            className="max-w-4xl mx-auto"
          >
            <TabsList className="flex flex-wrap justify-center gap-2 h-auto bg-transparent mb-8">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All
              </TabsTrigger>
              {categories.map(category => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* All items view */}
            <TabsContent value="all">
              {Object.keys(groupedItems).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? 'No results found for your search.' : 'No FAQ items available.'}
                </div>
              ) : (
                Object.entries(groupedItems).map(([categoryId, categoryItems]) => (
                  <div key={categoryId} className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      {getCategoryName(categoryId)}
                      <Badge variant="secondary">{categoryItems.length}</Badge>
                    </h2>
                    <Accordion type="single" collapsible className="space-y-2">
                      {categoryItems.map((item) => (
                        <AccordionItem
                          key={item.id}
                          value={item.id}
                          className="border rounded-lg px-4 bg-card"
                        >
                          <AccordionTrigger className="text-left hover:no-underline">
                            <span className="font-medium">{item.question}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {item.answer}
                            {item.region !== 'all' && (
                              <Badge variant="outline" className="ml-2 mt-2">
                                {item.region}
                              </Badge>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Category-specific views */}
            {categories.map(category => (
              <TabsContent key={category.id} value={category.id}>
                {category.description && (
                  <p className="text-muted-foreground mb-6">{category.description}</p>
                )}
                {groupedItems[category.id]?.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-2">
                    {groupedItems[category.id]?.map((item) => (
                      <AccordionItem
                        key={item.id}
                        value={item.id}
                        className="border rounded-lg px-4 bg-card"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          <span className="font-medium">{item.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.answer}
                          {item.region !== 'all' && (
                            <Badge variant="outline" className="ml-2 mt-2">
                              {item.region}
                            </Badge>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No FAQ items in this category.
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Legal Disclaimer */}
        <div className="max-w-4xl mx-auto mt-12 p-6 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Legal & Policy Disclaimers</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Rentmaikar operates as a technology-enabled marketplace and administrator. We are not the vehicle owner or the driver.</li>
            <li>• All rentals are subject to platform terms, regional laws, and compliance requirements.</li>
            <li>• Rentmaikar reserves the right to suspend or terminate accounts for violations, fraud, or safety concerns.</li>
            <li>• Fees, policies, and supported features may change with notice.</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4">Last updated: 2026</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;

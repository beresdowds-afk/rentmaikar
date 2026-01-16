import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RegionProvider } from "@/contexts/RegionContext";
import { UserTypeProvider } from "@/contexts/UserTypeContext";
import Index from "./pages/Index";
import DriverRegistration from "./pages/DriverRegistration";
import OwnerRegistration from "./pages/OwnerRegistration";
import DriverDashboard from "./pages/DriverDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import Catalogue from "./pages/Catalogue";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RegionProvider>
      <UserTypeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/driver/register" element={<DriverRegistration />} />
              <Route path="/driver/dashboard" element={<DriverDashboard />} />
              <Route path="/owner/register" element={<OwnerRegistration />} />
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />
              <Route path="/catalogue/:category" element={<Catalogue />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserTypeProvider>
    </RegionProvider>
  </QueryClientProvider>
);

export default App;

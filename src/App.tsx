import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RegionProvider } from "@/contexts/RegionContext";
import { UserTypeProvider } from "@/contexts/UserTypeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import MessageConsent from "@/components/MessageConsent";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import DriverRegistration from "./pages/DriverRegistration";
import OwnerRegistration from "./pages/OwnerRegistration";
import DriverDashboard from "./pages/DriverDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import Catalogue from "./pages/Catalogue";
import AdminDashboard from "./pages/AdminDashboard";
import ApiDocs from "./pages/ApiDocs";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import LegalSupportDashboard from "./pages/LegalSupportDashboard";
import IoTSupportDashboard from "./pages/IoTSupportDashboard";
import VehicleSupportDashboard from "./pages/VehicleSupportDashboard";
import DriverTraining from "./pages/DriverTraining";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RegionProvider>
        <UserTypeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <CookieConsent />
              <MessageConsent />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* Registration routes - protected, require account creation first */}
                <Route 
                  path="/driver/register" 
                  element={<DriverRegistration />} 
                />
                <Route 
                  path="/owner/register" 
                  element={<OwnerRegistration />} 
                />
                <Route 
                  path="/driver/registration" 
                  element={
                    <ProtectedRoute allowedRoles={['driver']}>
                      <DriverRegistration />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/owner/registration" 
                  element={
                    <ProtectedRoute allowedRoles={['owner']}>
                      <OwnerRegistration />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/driver/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['driver', 'admin']}>
                      <DriverDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/owner/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['owner', 'admin']}>
                      <OwnerDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/catalogue/:category" element={<Catalogue />} />
                <Route 
                  path="/api-docs" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ApiDocs />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/faq" element={<FAQ />} />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                {/* Support Dashboards */}
                <Route 
                  path="/support/legal" 
                  element={
                    <ProtectedRoute allowedRoles={['legal_support', 'admin']}>
                      <LegalSupportDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/support/iot" 
                  element={
                    <ProtectedRoute allowedRoles={['iot_support', 'admin']}>
                      <IoTSupportDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/support/vehicle" 
                  element={
                    <ProtectedRoute allowedRoles={['vehicle_support', 'admin']}>
                      <VehicleSupportDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/driver/training" 
                  element={
                    <ProtectedRoute allowedRoles={['driver', 'admin']}>
                      <DriverTraining />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </UserTypeProvider>
      </RegionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { lazy, Suspense } from "react";
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
import ErrorBoundary from "@/components/ErrorBoundary";
import PageSkeleton from "@/components/PageSkeleton";
import SkipToContent from "@/components/SkipToContent";
import LiveAnnouncer from "@/components/LiveAnnouncer";

// Lazy-loaded pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DriverRegistration = lazy(() => import("./pages/DriverRegistration"));
const OwnerRegistration = lazy(() => import("./pages/OwnerRegistration"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const Catalogue = lazy(() => import("./pages/Catalogue"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const FAQ = lazy(() => import("./pages/FAQ"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LegalSupportDashboard = lazy(() => import("./pages/LegalSupportDashboard"));
const IoTSupportDashboard = lazy(() => import("./pages/IoTSupportDashboard"));
const VehicleSupportDashboard = lazy(() => import("./pages/VehicleSupportDashboard"));
const DriverTraining = lazy(() => import("./pages/DriverTraining"));

const queryClient = new QueryClient();

const PageLoader = () => <PageSkeleton />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RegionProvider>
        <UserTypeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SkipToContent />
              <LiveAnnouncer />
              <CookieConsent />
              <MessageConsent />
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <main id="main-content">
                  <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/driver/register" element={<DriverRegistration />} />
                  <Route path="/owner/register" element={<OwnerRegistration />} />
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
                  </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </UserTypeProvider>
      </RegionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

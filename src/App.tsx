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
import MetaPixelRouteTracker from "@/components/MetaPixelRouteTracker";
import DocumentExpiryInAppNotifier from "@/components/notifications/DocumentExpiryInAppNotifier";

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
const AdminAssistantDashboard = lazy(() => import("./pages/AdminAssistantDashboard"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const FAQ = lazy(() => import("./pages/FAQ"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LegalSupportDashboard = lazy(() => import("./pages/LegalSupportDashboard"));
const IoTSupportDashboard = lazy(() => import("./pages/IoTSupportDashboard"));
const VehicleSupportDashboard = lazy(() => import("./pages/VehicleSupportDashboard"));
const DriverTraining = lazy(() => import("./pages/DriverTraining"));
const RefereeAttestation = lazy(() => import("./pages/RefereeAttestation"));
const MobileCallIn = lazy(() => import("./pages/MobileCallIn"));
const PaymentReceipt = lazy(() => import("./pages/PaymentReceipt"));
const ReconciliationLogsPage = lazy(() => import("./pages/admin/ReconciliationLogsPage"));
const AdminDocumentExportAuditPage = lazy(() => import("./pages/admin/AdminDocumentExportAuditPage"));
const AdminDocumentFailuresPage = lazy(() => import("./pages/admin/AdminDocumentFailuresPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const PaymentsViewerPage = lazy(() => import("./pages/admin/PaymentsViewerPage"));
const TourStepConfigPage = lazy(() => import("./pages/admin/TourStepConfigPage"));
const TourAnalyticsPage = lazy(() => import("./pages/admin/TourAnalyticsPage"));

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
              <MetaPixelRouteTracker />
              <DocumentExpiryInAppNotifier />
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
                  <Route path="/referee-attest" element={<RefereeAttestation />} />
                  <Route path="/m/call-in" element={<ProtectedRoute><MobileCallIn /></ProtectedRoute>} />
                  <Route path="/m/call-in/:type" element={<ProtectedRoute><MobileCallIn /></ProtectedRoute>} />
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
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin-assistant" 
                    element={
                      <ProtectedRoute allowedRoles={['admin_assistant', 'admin']}>
                        <AdminAssistantDashboard />
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
                  <Route
                    path="/rentals/:rentalId/payments/:paymentId"
                    element={
                      <ProtectedRoute allowedRoles={['driver', 'admin']}>
                        <PaymentReceipt />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/reconciliation"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ReconciliationLogsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/export-audit"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDocumentExportAuditPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/document-failures"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDocumentFailuresPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit-log"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AuditLogPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/payments"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PaymentsViewerPage />
                      </ProtectedRoute>
                    }
                  />



                  <Route path="*" element={<NotFound />} />
                  </Routes>
                  </main>
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

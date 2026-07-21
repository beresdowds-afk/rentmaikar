import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { RegionProvider } from "@/contexts/RegionContext";
import { UserTypeProvider } from "@/contexts/UserTypeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import MessageConsent from "@/components/MessageConsent";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageSkeleton from "@/components/PageSkeleton";
import SkipToContent from "@/components/SkipToContent";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useNativePush } from "@/hooks/useNativePush";
import { useEffect } from "react";
import { installOnboardingDeepLinkListener } from "@/lib/onboarding-deep-link";

// Global background worker: keeps PWA + native mobile builds in sync with the
// website by streaming DB changes and registering native push devices.
const AppLiveSync = () => {
  useRealtimeSync(true);
  useNativePush();
  return null;
};

// Native deep-link bridge: mounted inside <BrowserRouter> so it can navigate.
const NativeDeepLinkBridge = () => {
  const navigate = useNavigate();
  useEffect(() => {
    let cleanup = () => {};
    installOnboardingDeepLinkListener((p) => navigate(p)).then((fn) => {
      cleanup = fn;
    });
    return () => cleanup();
  }, [navigate]);
  return null;
};
import LiveAnnouncer from "@/components/LiveAnnouncer";
import MetaPixelRouteTracker from "@/components/MetaPixelRouteTracker";
import DocumentExpiryInAppNotifier from "@/components/notifications/DocumentExpiryInAppNotifier";
import AudioPermissionPrimer from "@/components/AudioPermissionPrimer";

// Lazy-loaded pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DriverRegistration = lazy(() => import("./pages/DriverRegistration"));
const OwnerRegistration = lazy(() => import("./pages/OwnerRegistration"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const DriverOnboarding = lazy(() => import("./pages/DriverOnboarding"));
const OwnerOnboarding = lazy(() => import("./pages/OwnerOnboarding"));
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
const BillingReconciliationPage = lazy(() => import("./pages/admin/BillingReconciliationPage"));
const AdminInvoiceStatusPage = lazy(() => import("./pages/admin/AdminInvoiceStatusPage"));
const AdminRentalReconciliationPage = lazy(() => import("./pages/admin/AdminRentalReconciliationPage"));
const AdminDocumentExportAuditPage = lazy(() => import("./pages/admin/AdminDocumentExportAuditPage"));
const AdminDocumentFailuresPage = lazy(() => import("./pages/admin/AdminDocumentFailuresPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const PaymentsViewerPage = lazy(() => import("./pages/admin/PaymentsViewerPage"));
const TourStepConfigPage = lazy(() => import("./pages/admin/TourStepConfigPage"));
const AdminLegalTemplatePreviewPage = lazy(() => import("./pages/admin/AdminLegalTemplatePreviewPage"));
const TourAnalyticsPage = lazy(() => import("./pages/admin/TourAnalyticsPage"));
const AdminVehicleCataloguePage = lazy(() => import("./pages/admin/AdminVehicleCataloguePage"));
const UserUuidAssignmentsPage = lazy(() => import("./pages/admin/UserUuidAssignmentsPage"));
const TraccarCommandAuditPage = lazy(() => import("./pages/admin/TraccarCommandAuditPage"));
const OnboardingDiagnosticsPage = lazy(() => import("./pages/admin/OnboardingDiagnosticsPage"));
const OnboardingAuditTimelinePage = lazy(() => import("./pages/admin/OnboardingAuditTimelinePage"));
const AdminImpersonateDashboardPage = lazy(() => import("./pages/admin/AdminImpersonateDashboardPage"));
const AdminPersonaInquiriesPage = lazy(() => import("./pages/admin/AdminPersonaInquiriesPage"));
const AdminPersonaTemplatesPage = lazy(() => import("./pages/admin/AdminPersonaTemplatesPage"));

const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const SubscriptionSuccessPage = lazy(() => import("./pages/SubscriptionSuccessPage"));
const ProxyConsentPage = lazy(() => import("./pages/ProxyConsentPage"));
const PortalRouteGuard = lazy(() => import("./components/onboarding/PortalRouteGuard"));
const OnboardingRedirect = lazy(() => import("./pages/OnboardingRedirect"));
const OnboardingLegalAgreement = lazy(() => import("./pages/OnboardingLegalAgreement"));
const ProfileSettingsPage = lazy(() => import("./pages/ProfileSettingsPage"));
import { OnboardingStageToaster } from "@/components/onboarding/OnboardingStageToaster";

const queryClient = new QueryClient();

const PageLoader = () => <PageSkeleton />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppLiveSync />


    <AuthProvider>
      <RegionProvider>
        <UserTypeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <MetaPixelRouteTracker />
              <NativeDeepLinkBridge />
              <DocumentExpiryInAppNotifier />
              <OnboardingStageToaster />
              <SkipToContent />
              <LiveAnnouncer />
              <CookieConsent />
              <MessageConsent />
              <AudioPermissionPrimer />
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <main id="main-content">
                  <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/referee-attest" element={<RefereeAttestation />} />
                  <Route path="/proxy/consent" element={<ProxyConsentPage />} />
                  <Route path="/m/call-in" element={<ProtectedRoute><MobileCallIn /></ProtectedRoute>} />
                  <Route path="/m/call-in/:type" element={<ProtectedRoute><MobileCallIn /></ProtectedRoute>} />
                  <Route path="/driver/register" element={<DriverRegistration />} />
                  <Route path="/owner/register" element={<OwnerRegistration />} />
                  <Route path="/register/driver" element={<Navigate to="/driver/register" replace />} />
                  <Route path="/register/owner" element={<Navigate to="/owner/register" replace />} />
                  <Route path="/driver/signup" element={<Navigate to="/driver/register" replace />} />
                  <Route path="/owner/signup" element={<Navigate to="/owner/register" replace />} />
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
                  <Route path="/driver/dashboard" element={<DriverDashboard />} />
                  <Route path="/driver/onboarding" element={<DriverOnboarding />} />
                  <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                  <Route path="/owner/onboarding" element={<OwnerOnboarding />} />
                  <Route path="/onboarding/legal-agreement" element={<OnboardingLegalAgreement />} />
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
                    path="/admin/billing-reconciliation"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <BillingReconciliationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/invoice-status"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminInvoiceStatusPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/rental-reconciliation"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminRentalReconciliationPage />
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
                  <Route
                    path="/admin/tour-config"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <TourStepConfigPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/legal-templates/preview"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLegalTemplatePreviewPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/tour-analytics"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <TourAnalyticsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/vehicle-catalogue"
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'admin_assistant']}>
                        <AdminVehicleCataloguePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/uuid-assignments"
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'admin_assistant']}>
                        <UserUuidAssignmentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/traccar-commands"
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'admin_assistant']}>
                        <TraccarCommandAuditPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/onboarding-diagnostics"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <OnboardingDiagnosticsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/onboarding-audit"
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'admin_assistant']}>
                        <OnboardingAuditTimelinePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/persona-inquiries"
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'admin_assistant']}>
                        <AdminPersonaInquiriesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/persona-templates"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminPersonaTemplatesPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/impersonate/:role/:userId"
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'admin_assistant']}>
                        <AdminImpersonateDashboardPage />
                      </ProtectedRoute>
                    }
                  />




                  <Route
                    path="/subscriptions"
                    element={
                      <ProtectedRoute>
                        <SubscriptionsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/subscriptions/success"
                    element={
                      <ProtectedRoute>
                        <SubscriptionSuccessPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="/driver/portal/:portalKey" element={<PortalRouteGuard role="driver" />} />
                  <Route path="/owner/portal/:portalKey" element={<PortalRouteGuard role="owner" />} />
                  <Route
                    path="/settings/profile"
                    element={
                      <ProtectedRoute>
                        <ProfileSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/onboarding-redirect" element={<OnboardingRedirect />} />
                  <Route path="/verify-email" element={<OnboardingRedirect />} />


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

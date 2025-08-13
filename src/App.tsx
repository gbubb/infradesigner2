import { useEffect, lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MinimalLoader } from "@/components/MinimalLoader";
// DnD temporarily removed
import { queryClient } from "@/utils/queryCache";

// Lazy load heavy panel components with prefetch hints
const ComparePanel = lazy(() => import(/* webpackPrefetch: true */ "@/components/compare/ComparePanel").then(m => ({ default: m.ComparePanel })));
const ComponentLibrary = lazy(() => import(/* webpackPrefetch: true */ "@/components/sidebar/ComponentLibrary").then(m => ({ default: m.ComponentLibrary })));
const ConfigurePanel = lazy(() => import(/* webpackPrefetch: true */ "@/components/configure/ConfigurePanel").then(m => ({ default: m.ConfigurePanel })));
const DatacenterPanel = lazy(() => import(/* webpackPrefetch: true */ "@/components/datacenter/DatacenterPanel").then(m => ({ default: m.DatacenterPanel })));
const DesignPanel = lazy(() => import(/* webpackPrefetch: true */ "@/components/design/DesignPanel").then(m => ({ default: m.DesignPanel })));
const ModelPanel = lazy(() => import(/* webpackPrefetch: true */ "@/components/model/ModelPanel"));
const ProcurePanel = lazy(() => import(/* webpackPrefetch: true */ "@/components/procure/ProcurePanel").then(m => ({ default: m.ProcurePanel })));
const RequirementsPanel = lazy(() => import(/* webpackPrefetch: true */ "@/components/requirements/RequirementsPanel").then(m => ({ default: m.RequirementsPanel })));
const ResultsPanel = lazy(() => import(/* webpackPrefetch: true */ "@/components/results/ResultsPanel").then(m => ({ default: m.ResultsPanel })));
import { ThemeProvider } from "./components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/useAuth";
import { useAuth } from "./hooks/useAuthHook";
import { initializeStore, useDesignStore } from "./store/designStore";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Import the purge script (makes it available in the console)
import "@/utils/purgeDesigns";

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const isInitializing = useDesignStore(state => state.isInitializing);
  
  // Initialize store data when the app starts
  useEffect(() => {
    initializeStore();
  }, []);
  
  // Show loading spinner while initializing
  if (isInitializing) {
    return <LoadingSpinner fullScreen text="Initializing application..." size="lg" />;
  }
  
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      {/* Use AppLayout for main pages */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Suspense fallback={<MinimalLoader />}><RequirementsPanel /></Suspense>} />
        <Route path="components" element={<Suspense fallback={<MinimalLoader />}><ComponentLibrary /></Suspense>} />
        <Route path="design" element={<ErrorBoundary componentName="Design Panel"><Suspense fallback={<MinimalLoader />}><DesignPanel /></Suspense></ErrorBoundary>} />
        <Route path="configure/*" element={<Suspense fallback={<MinimalLoader />}><ConfigurePanel /></Suspense>} />
        <Route path="datacenter" element={<Suspense fallback={<MinimalLoader />}><DatacenterPanel /></Suspense>} />
        <Route path="results" element={<ErrorBoundary componentName="Results Panel"><Suspense fallback={<MinimalLoader />}><ResultsPanel /></Suspense></ErrorBoundary>} />
        <Route path="procure" element={<Suspense fallback={<MinimalLoader />}><ProcurePanel /></Suspense>} />
        <Route path="compare" element={<Suspense fallback={<MinimalLoader />}><ComparePanel /></Suspense>} />
        <Route path="model" element={<ErrorBoundary componentName="Model Panel"><Suspense fallback={<MinimalLoader />}><ModelPanel /></Suspense></ErrorBoundary>} />
      </Route>
      <Route path="/designs/:sharingId" element={<Index />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary componentName="Application Root">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <BrowserRouter>
                <AuthProvider>
                  <Toaster />
                  <Sonner />
                  <AppRoutes />
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { useEffect, lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DndProvider } from './components/providers/DndProvider';
import { queryClient } from "@/utils/queryCache";

// Lazy load heavy panel components
const ComparePanel = lazy(() => import("@/components/compare/ComparePanel").then(m => ({ default: m.ComparePanel })));
const ComponentLibrary = lazy(() => import("@/components/sidebar/ComponentLibrary").then(m => ({ default: m.ComponentLibrary })));
const ConfigurePanel = lazy(() => import("@/components/configure/ConfigurePanel").then(m => ({ default: m.ConfigurePanel })));
const DatacenterPanel = lazy(() => import("@/components/datacenter/DatacenterPanel").then(m => ({ default: m.DatacenterPanel })));
const DesignPanel = lazy(() => import("@/components/design/DesignPanel").then(m => ({ default: m.DesignPanel })));
const ModelPanel = lazy(() => import("@/components/model/ModelPanel").then(m => ({ default: m.ModelPanel })));
const ProcurePanel = lazy(() => import("@/components/procure/ProcurePanel").then(m => ({ default: m.ProcurePanel })));
const RequirementsPanel = lazy(() => import("@/components/requirements/RequirementsPanel").then(m => ({ default: m.RequirementsPanel })));
const ResultsPanel = lazy(() => import("@/components/results/ResultsPanel").then(m => ({ default: m.ResultsPanel })));
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
        <Route index element={<Suspense fallback={<LoadingSpinner fullScreen text="Loading requirements..." />}><RequirementsPanel /></Suspense>} />
        <Route path="components" element={<Suspense fallback={<LoadingSpinner fullScreen text="Loading components..." />}><ComponentLibrary /></Suspense>} />
        <Route path="design" element={<ErrorBoundary componentName="Design Panel"><Suspense fallback={<LoadingSpinner fullScreen text="Loading design..." />}><DesignPanel /></Suspense></ErrorBoundary>} />
        <Route path="configure/*" element={<Suspense fallback={<LoadingSpinner fullScreen text="Loading configuration..." />}><ConfigurePanel /></Suspense>} />
        <Route path="datacenter" element={<Suspense fallback={<LoadingSpinner fullScreen text="Loading datacenter..." />}><DatacenterPanel /></Suspense>} />
        <Route path="results" element={<ErrorBoundary componentName="Results Panel"><Suspense fallback={<LoadingSpinner fullScreen text="Loading results..." />}><ResultsPanel /></Suspense></ErrorBoundary>} />
        <Route path="procure" element={<Suspense fallback={<LoadingSpinner fullScreen text="Loading procurement..." />}><ProcurePanel /></Suspense>} />
        <Route path="compare" element={<Suspense fallback={<LoadingSpinner fullScreen text="Loading comparison..." />}><ComparePanel /></Suspense>} />
        <Route path="model" element={<ErrorBoundary componentName="Model Panel"><Suspense fallback={<LoadingSpinner fullScreen text="Loading model..." />}><ModelPanel /></Suspense></ErrorBoundary>} />
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
      <DndProvider>
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
      </DndProvider>
    </ErrorBoundary>
  );
}

export default App;

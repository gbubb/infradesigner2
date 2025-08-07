import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ComparePanel } from "@/components/compare/ComparePanel";
import { ComponentLibrary } from "@/components/sidebar/ComponentLibrary";
import { ConfigurePanel } from "@/components/configure/ConfigurePanel";
import { DatacenterPanel } from "@/components/datacenter/DatacenterPanel";
import { DesignPanel } from "@/components/design/DesignPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ModelPanel } from "@/components/model/ModelPanel";
import { ProcurePanel } from "@/components/procure/ProcurePanel";
import { DndProvider } from './components/providers/DndProvider';
import { RequirementsPanel } from "@/components/requirements/RequirementsPanel";
import { ResultsPanel } from "@/components/results/ResultsPanel";
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

const queryClient = new QueryClient();

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
        <Route index element={<RequirementsPanel />} />
        <Route path="components" element={<ComponentLibrary />} />
        <Route path="design" element={<ErrorBoundary componentName="Design Panel"><DesignPanel /></ErrorBoundary>} />
        <Route path="configure/*" element={<ConfigurePanel />} />
        <Route path="datacenter" element={<DatacenterPanel />} />
        <Route path="results" element={<ErrorBoundary componentName="Results Panel"><ResultsPanel /></ErrorBoundary>} />
        <Route path="procure" element={<ProcurePanel />} />
        <Route path="compare" element={<ComparePanel />} />
        <Route path="model" element={<ErrorBoundary componentName="Model Panel"><ModelPanel /></ErrorBoundary>} />
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

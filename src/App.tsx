import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { initializeStore } from "./store/designStore";
import { AuthProvider, useAuth } from "./hooks/useAuth";
// Import the purge script (makes it available in the console)
import "@/utils/purgeDesigns";
import { ThemeProvider } from "./components/theme/theme-provider";
import { DndProvider } from './components/providers/DndProvider';
import { AppLayout } from "@/components/layout/AppLayout";
import { RequirementsPanel } from "@/components/requirements/RequirementsPanel";
import { ComponentLibrary } from "@/components/sidebar/ComponentLibrary";
import { DesignPanel } from "@/components/design/DesignPanel";
import { ConfigurePanel } from "@/components/configure/ConfigurePanel";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { ComparePanel } from "@/components/compare/ComparePanel";

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
  // Initialize store data when the app starts
  useEffect(() => {
    initializeStore();
  }, []);
  
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      {/* Use AppLayout for main pages */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<RequirementsPanel />} />
        <Route path="components" element={<ComponentLibrary />} />
        <Route path="design" element={<DesignPanel />} />
        <Route path="configure/*" element={<ConfigurePanel />} />
        <Route path="results" element={<ResultsPanel />} />
        <Route path="compare" element={<ComparePanel />} />
      </Route>
      <Route path="/designs/:sharingId" element={<Index />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
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
  );
}

export default App;

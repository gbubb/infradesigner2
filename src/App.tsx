
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { DndProvider } from '@/components/providers/DndProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import RequirementsPanel from '@/components/requirements/RequirementsPanel';
import { ComponentLibrary } from '@/components/sidebar/ComponentLibrary';
import { DesignPanel } from '@/components/design/DesignPanel';
import ConfigurePanel from '@/components/configure/ConfigurePanel';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { ComparePanel } from '@/components/compare/ComparePanel';
import ModelPanel from '@/components/model/ModelPanel';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';
import { SharedDesignLoader } from '@/components/layout/SharedDesignLoader';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <DndProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/shared/:sharingId" element={<SharedDesignLoader />} />
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<RequirementsPanel />} />
                  <Route path="components" element={<ComponentLibrary />} />
                  <Route path="design" element={<DesignPanel />} />
                  <Route path="configure" element={<ConfigurePanel />} />
                  <Route path="results" element={<ResultsPanel />} />
                  <Route path="compare" element={<ComparePanel />} />
                  <Route path="model" element={<ModelPanel />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </div>
          </Router>
        </DndProvider>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

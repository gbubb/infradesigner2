
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { initializeStore } from '../store/designStore';
import { SharedDesignLoader } from '../components/layout/SharedDesignLoader';
import { useAuth } from '../hooks/useAuth';

const Index = () => {
  const { sharingId } = useParams<{ sharingId: string }>();
  const { isLoading } = useAuth();

  useEffect(() => {
    initializeStore();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppLayout />
      {sharingId && <SharedDesignLoader />}
    </>
  );
};

export default Index;

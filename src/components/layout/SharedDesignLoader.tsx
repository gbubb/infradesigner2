
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDesignStore } from '@/store/designStore';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Copy, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuthHook';

export const SharedDesignLoader: React.FC = () => {
  const { sharingId } = useParams<{ sharingId: string }>();
  const { loadSharedDesign, activeDesign } = useDesignStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    const loadDesign = async () => {
      if (!sharingId) {
        setError("No design ID provided");
        setIsLoading(false);
        return;
      }
      
      try {
        const success = await loadSharedDesign(sharingId);
        if (!success) {
          setError("This design doesn't exist or is not shared publicly");
        }
      } catch (err) {
        console.error("Error loading shared design:", err);
        setError("Failed to load the shared design");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDesign();
  }, [sharingId, loadSharedDesign]);
  
  const handleGoBack = () => {
    navigate('/');
  };
  
  const handleCopyDesign = async () => {
    if (!activeDesign || !user) return;
    
    try {
      const { createNewDesign } = useDesignStore.getState();
      const newName = `Copy of ${activeDesign.name}`;
      
      createNewDesign(newName, activeDesign.description, activeDesign);
      toast.success(`Created a copy of design: ${activeDesign.name}`);
      navigate('/');
    } catch (err) {
      console.error("Error copying design:", err);
      toast.error("Failed to create a copy of this design");
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading shared design...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle>Design Not Available</CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>The design you're looking for either doesn't exist or is not shared publicly.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGoBack} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (!activeDesign) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Viewing Shared Design</CardTitle>
          <CardDescription className="text-sm">
            {activeDesign.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm pb-2">
          <p>You are viewing a shared read-only design.</p>
        </CardContent>
        <CardFooter className="pt-0">
          {user ? (
            <Button onClick={handleCopyDesign} className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              Copy to My Designs
            </Button>
          ) : (
            <div className="space-y-2 w-full">
              <Button onClick={handleGoBack} variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Sign In to Copy
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

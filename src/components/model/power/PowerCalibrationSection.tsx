import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PowerCalibrationSectionProps } from '../power-calibration/PowerCalibrationTypes';
import { ProfileSelector } from '../power-calibration/shared/ProfileSelector';
import { CPUCalibrationTab } from '../power-calibration/tabs/CPUCalibrationTab';
import { MemoryCalibrationTab } from '../power-calibration/tabs/MemoryCalibrationTab';
import { StorageCalibrationTab } from '../power-calibration/tabs/StorageCalibrationTab';
import { NetworkCalibrationTab } from '../power-calibration/tabs/NetworkCalibrationTab';
import { SystemCalibrationTab } from '../power-calibration/tabs/SystemCalibrationTab';
import { ValidationTab } from '../power-calibration/tabs/ValidationTab';
import { useCalibrationProfiles } from '@/hooks/power-calibration/useCalibrationProfiles';

export const PowerCalibrationSection: React.FC<PowerCalibrationSectionProps> = ({ onCalibrationChange }) => {
  const {
    profiles,
    activeProfileId,
    editingProfile,
    showSaveSuccess,
    handleCreateNew,
    handleCloneProfile,
    handleSaveProfile,
    handleDeleteProfile,
    handleSelectProfile,
    updateProfile,
    updateNestedValue
  } = useCalibrationProfiles(onCalibrationChange);
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Power Calculation Calibration</CardTitle>
        <CardDescription>
          Fine-tune power calculation parameters to match real-world observations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Management */}
        <ProfileSelector
          profiles={profiles}
          activeProfileId={activeProfileId}
          editingProfile={editingProfile}
          showSaveSuccess={showSaveSuccess}
          onSelectProfile={handleSelectProfile}
          onCreateNew={handleCreateNew}
          onCloneProfile={handleCloneProfile}
          onSaveProfile={handleSaveProfile}
          onDeleteProfile={handleDeleteProfile}
          onUpdateProfileName={(name) => updateProfile({ name })}
          onUpdateProfileDescription={(description) => updateProfile({ description })}
        />
        
        {editingProfile && (
          <Tabs defaultValue="cpu" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="cpu">CPU</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cpu">
              <CPUCalibrationTab
                profile={editingProfile}
                updateProfile={updateProfile}
                updateNestedValue={updateNestedValue}
              />
            </TabsContent>
            
            <TabsContent value="memory">
              <MemoryCalibrationTab
                profile={editingProfile}
                updateProfile={updateProfile}
                updateNestedValue={updateNestedValue}
              />
            </TabsContent>
            
            <TabsContent value="storage">
              <StorageCalibrationTab
                profile={editingProfile}
                updateProfile={updateProfile}
                updateNestedValue={updateNestedValue}
              />
            </TabsContent>
            
            <TabsContent value="network">
              <NetworkCalibrationTab
                profile={editingProfile}
                updateNestedValue={updateNestedValue}
              />
            </TabsContent>
            
            <TabsContent value="system">
              <SystemCalibrationTab
                profile={editingProfile}
                updateProfile={updateProfile}
                updateNestedValue={updateNestedValue}
              />
            </TabsContent>
            
            <TabsContent value="validation">
              <ValidationTab profile={editingProfile} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
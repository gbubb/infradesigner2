import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Copy, Save, Trash2, Check } from 'lucide-react';
import { PowerCalibrationProfile } from '../PowerCalibrationTypes';

interface ProfileSelectorProps {
  profiles: PowerCalibrationProfile[];
  activeProfileId: string | null;
  editingProfile: PowerCalibrationProfile | null;
  showSaveSuccess: boolean;
  onSelectProfile: (id: string) => void;
  onCreateNew: () => void;
  onCloneProfile: () => void;
  onSaveProfile: () => void;
  onDeleteProfile: (id: string) => void;
  onUpdateProfileName: (name: string) => void;
  onUpdateProfileDescription: (description: string) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  activeProfileId,
  editingProfile,
  showSaveSuccess,
  onSelectProfile,
  onCreateNew,
  onCloneProfile,
  onSaveProfile,
  onDeleteProfile,
  onUpdateProfileName,
  onUpdateProfileDescription
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Power Calculation Calibration</h3>
        {showSaveSuccess && (
          <span className="text-sm font-normal text-green-600 flex items-center">
            <Check className="h-4 w-4 mr-1" />
            Profile saved successfully
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="profile-select">Calibration Profile</Label>
          <Select value={activeProfileId || 'none'} onValueChange={onSelectProfile}>
            <SelectTrigger id="profile-select">
              <SelectValue placeholder="Select a calibration profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Default (No Calibration)</SelectItem>
              {profiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 mt-6">
          <Button size="sm" variant="outline" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
          {editingProfile && (
            <>
              <Button size="sm" variant="outline" onClick={onCloneProfile}>
                <Copy className="h-4 w-4 mr-1" />
                Clone
              </Button>
              <Button size="sm" onClick={onSaveProfile}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              {editingProfile.id && profiles.some(p => p.id === editingProfile.id) && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onDeleteProfile(editingProfile.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {editingProfile && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="profile-name">Profile Name</Label>
            <Input
              id="profile-name"
              value={editingProfile.name}
              onChange={(e) => onUpdateProfileName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="profile-desc">Description</Label>
            <Input
              id="profile-desc"
              value={editingProfile.description || ''}
              onChange={(e) => onUpdateProfileDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </div>
      )}
    </div>
  );
};
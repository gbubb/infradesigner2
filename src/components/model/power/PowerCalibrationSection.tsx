import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Save, Trash2, Plus, Copy, Check, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  PowerCalibrationProfile, 
  DEFAULT_CALIBRATION_PROFILE,
  saveCalibrationProfile,
  getCalibrationProfiles,
  deleteCalibrationProfile,
  getActiveCalibrationProfile,
  setActiveCalibrationProfile
} from './powerCalibration';

interface PowerCalibrationSectionProps {
  onCalibrationChange: (profile: PowerCalibrationProfile | null) => void;
}

export const PowerCalibrationSection: React.FC<PowerCalibrationSectionProps> = ({ onCalibrationChange }) => {
  const [profiles, setProfiles] = useState<PowerCalibrationProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<PowerCalibrationProfile | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Load profiles on mount
  useEffect(() => {
    const loadedProfiles = getCalibrationProfiles();
    setProfiles(loadedProfiles);
    
    const activeProfile = getActiveCalibrationProfile();
    if (activeProfile) {
      setActiveProfileId(activeProfile.id);
      setEditingProfile(activeProfile);
      onCalibrationChange(activeProfile);
    }
  }, []);
  
  const handleCreateNew = () => {
    const newProfile: PowerCalibrationProfile = {
      ...DEFAULT_CALIBRATION_PROFILE,
      id: uuidv4(),
      name: `Custom Profile ${profiles.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingProfile(newProfile);
  };
  
  const handleCloneProfile = () => {
    if (!editingProfile) return;
    
    const clonedProfile: PowerCalibrationProfile = {
      ...editingProfile,
      id: uuidv4(),
      name: `${editingProfile.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingProfile(clonedProfile);
  };
  
  const handleSaveProfile = () => {
    if (!editingProfile) return;
    
    saveCalibrationProfile(editingProfile);
    const updatedProfiles = getCalibrationProfiles();
    setProfiles(updatedProfiles);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };
  
  const handleDeleteProfile = (id: string) => {
    deleteCalibrationProfile(id);
    const updatedProfiles = getCalibrationProfiles();
    setProfiles(updatedProfiles);
    
    if (activeProfileId === id) {
      setActiveProfileId(null);
      setEditingProfile(null);
      setActiveCalibrationProfile(null);
      onCalibrationChange(null);
    }
  };
  
  const handleSelectProfile = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setActiveProfileId(id);
      setEditingProfile(profile);
      setActiveCalibrationProfile(id);
      onCalibrationChange(profile);
    }
  };
  
  const updateProfile = (updates: Partial<PowerCalibrationProfile>) => {
    if (!editingProfile) return;
    setEditingProfile({ ...editingProfile, ...updates });
  };
  
  const updateNestedValue = (path: string[], value: any) => {
    if (!editingProfile) return;
    
    const newProfile = { ...editingProfile };
    let current: any = newProfile;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current)) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setEditingProfile(newProfile);
  };
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Power Calculation Calibration</span>
          {showSaveSuccess && (
            <span className="text-sm font-normal text-green-600 flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Profile saved successfully
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Fine-tune power calculation parameters to match real-world observations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Management */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="profile-select">Calibration Profile</Label>
              <Select value={activeProfileId || ''} onValueChange={handleSelectProfile}>
                <SelectTrigger id="profile-select">
                  <SelectValue placeholder="Select a calibration profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default (No Calibration)</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 mt-6">
              <Button size="sm" variant="outline" onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              {editingProfile && (
                <>
                  <Button size="sm" variant="outline" onClick={handleCloneProfile}>
                    <Copy className="h-4 w-4 mr-1" />
                    Clone
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  {editingProfile.id && profiles.some(p => p.id === editingProfile.id) && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteProfile(editingProfile.id)}
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
                  onChange={(e) => updateProfile({ name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="profile-desc">Description</Label>
                <Input
                  id="profile-desc"
                  value={editingProfile.description || ''}
                  onChange={(e) => updateProfile({ description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </div>
          )}
        </div>
        
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
            
            <TabsContent value="cpu" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Adjust CPU power calculation parameters. Default values are based on industry research.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CPU Idle Multiplier (% of TDP)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProfile.cpuIdleMultiplier}
                    onChange={(e) => updateProfile({ cpuIdleMultiplier: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 0.15 (15% of TDP)</p>
                </div>
                <div>
                  <Label>Turbo Boost Multiplier</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProfile.cpuTurboMultiplier}
                    onChange={(e) => updateProfile({ cpuTurboMultiplier: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 0.3 (30% above TDP)</p>
                </div>
                <div>
                  <Label>Turbo Probability</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={editingProfile.cpuTurboProbability}
                    onChange={(e) => updateProfile({ cpuTurboProbability: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 0.5 (50% chance)</p>
                </div>
                <div>
                  <Label>Multicore Efficiency Base</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProfile.cpuMulticoreEfficiencyBase}
                    onChange={(e) => updateProfile({ cpuMulticoreEfficiencyBase: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 0.95</p>
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">Dynamic Power Coefficients (u + u² + u³)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Linear (u)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProfile.cpuDynamicCoefficients.linear}
                      onChange={(e) => updateNestedValue(['cpuDynamicCoefficients', 'linear'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 0.4</p>
                  </div>
                  <div>
                    <Label className="text-sm">Quadratic (u²)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProfile.cpuDynamicCoefficients.quadratic}
                      onChange={(e) => updateNestedValue(['cpuDynamicCoefficients', 'quadratic'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 0.5</p>
                  </div>
                  <div>
                    <Label className="text-sm">Cubic (u³)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProfile.cpuDynamicCoefficients.cubic}
                      onChange={(e) => updateNestedValue(['cpuDynamicCoefficients', 'cubic'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 0.1</p>
                  </div>
                </div>
              </div>
              
              <Accordion type="single" collapsible>
                <AccordionItem value="arch">
                  <AccordionTrigger>Architecture-Specific Multipliers</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {Object.entries(editingProfile.cpuArchitectureMultipliers).map(([arch, multipliers]) => (
                        <div key={arch} className="grid grid-cols-3 gap-2 items-center">
                          <Label className="text-sm">{arch}</Label>
                          <div>
                            <Input
                              type="number"
                              step="0.01"
                              value={multipliers.idle}
                              onChange={(e) => updateNestedValue(['cpuArchitectureMultipliers', arch, 'idle'], parseFloat(e.target.value))}
                              placeholder="Idle"
                            />
                            <p className="text-xs text-muted-foreground">Idle</p>
                          </div>
                          <div>
                            <Input
                              type="number"
                              step="0.01"
                              value={multipliers.peak}
                              onChange={(e) => updateNestedValue(['cpuArchitectureMultipliers', arch, 'peak'], parseFloat(e.target.value))}
                              placeholder="Peak"
                            />
                            <p className="text-xs text-muted-foreground">Peak</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
            
            <TabsContent value="memory" className="space-y-4">
              <div>
                <Label className="mb-2 block">Base Power per 8GB DIMM (Watts)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">DDR3</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingProfile.memoryBasePower.DDR3}
                      onChange={(e) => updateNestedValue(['memoryBasePower', 'DDR3'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 4.0W</p>
                  </div>
                  <div>
                    <Label className="text-sm">DDR4</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingProfile.memoryBasePower.DDR4}
                      onChange={(e) => updateNestedValue(['memoryBasePower', 'DDR4'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 3.0W</p>
                  </div>
                  <div>
                    <Label className="text-sm">DDR5</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingProfile.memoryBasePower.DDR5}
                      onChange={(e) => updateNestedValue(['memoryBasePower', 'DDR5'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 2.4W</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Speed Scaling Factor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProfile.memorySpeedScaling}
                    onChange={(e) => updateProfile({ memorySpeedScaling: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 0.15</p>
                </div>
                <div>
                  <Label>Conservative Power per DIMM</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editingProfile.memoryConservativeMultiplier}
                    onChange={(e) => updateProfile({ memoryConservativeMultiplier: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 5W (for planning)</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="storage" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">HDD Parameters</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Base Power (W)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editingProfile.storageBasePower.hddBase}
                        onChange={(e) => updateNestedValue(['storageBasePower', 'hddBase'], parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Default: 6W</p>
                    </div>
                    <div>
                      <Label className="text-sm">Power per TB</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingProfile.storageBasePower.hddCapacityScaling}
                        onChange={(e) => updateNestedValue(['storageBasePower', 'hddCapacityScaling'], parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Default: 0.25W/TB</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block">SSD Parameters</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">SATA SSD Base (W)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editingProfile.storageBasePower.ssdSataBase}
                        onChange={(e) => updateNestedValue(['storageBasePower', 'ssdSataBase'], parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Default: 3W</p>
                    </div>
                    <div>
                      <Label className="text-sm">NVMe Base (W)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editingProfile.storageBasePower.nvmeBase}
                        onChange={(e) => updateNestedValue(['storageBasePower', 'nvmeBase'], parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Default: 5W</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block">RAID Controller Power</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Idle (W)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={editingProfile.raidControllerPower.idle}
                        onChange={(e) => updateNestedValue(['raidControllerPower', 'idle'], parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Average (W)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={editingProfile.raidControllerPower.average}
                        onChange={(e) => updateNestedValue(['raidControllerPower', 'average'], parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Peak (W)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={editingProfile.raidControllerPower.peak}
                        onChange={(e) => updateNestedValue(['raidControllerPower', 'peak'], parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="network" className="space-y-4">
              <div>
                <Label className="mb-2 block">Network Port Power by Speed (Watts)</Label>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(editingProfile.networkPowerBySpeed).map(([speed, power]) => (
                    <div key={speed}>
                      <Label className="text-sm">{speed} GbE</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={power}
                        onChange={(e) => updateNestedValue(['networkPowerBySpeed', speed], parseFloat(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="system" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>BMC/Management Power (W)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editingProfile.bmcPower}
                    onChange={(e) => updateProfile({ bmcPower: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 6W</p>
                </div>
                <div>
                  <Label>Safety Margin (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={editingProfile.safetyMarginPercent}
                    onChange={(e) => updateProfile({ safetyMarginPercent: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 15%</p>
                </div>
                <div>
                  <Label>Temperature Coefficient</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editingProfile.tempCoefficientPerDegree}
                    onChange={(e) => updateProfile({ tempCoefficientPerDegree: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 0.004 per °C</p>
                </div>
                <div>
                  <Label>Temperature Baseline (°C)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={editingProfile.tempBaselineC}
                    onChange={(e) => updateProfile({ tempBaselineC: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 20°C</p>
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">Motherboard Base Power by Form Factor</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">1U (W)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={editingProfile.motherboardBasePower['1U']}
                      onChange={(e) => updateNestedValue(['motherboardBasePower', '1U'], parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">2U (W)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={editingProfile.motherboardBasePower['2U']}
                      onChange={(e) => updateNestedValue(['motherboardBasePower', '2U'], parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">4U (W)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={editingProfile.motherboardBasePower['4U']}
                      onChange={(e) => updateNestedValue(['motherboardBasePower', '4U'], parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">Fan Power Factors (% of Total DC)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Idle</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProfile.fanPowerFactors.idle}
                      onChange={(e) => updateNestedValue(['fanPowerFactors', 'idle'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 0.05 (5%)</p>
                  </div>
                  <div>
                    <Label className="text-sm">Average</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProfile.fanPowerFactors.average}
                      onChange={(e) => updateNestedValue(['fanPowerFactors', 'average'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 0.10 (10%)</p>
                  </div>
                  <div>
                    <Label className="text-sm">Peak</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProfile.fanPowerFactors.peak}
                      onChange={(e) => updateNestedValue(['fanPowerFactors', 'peak'], parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: 0.15 (15%)</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="validation" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Track how well your calibrated predictions match real-world observations.
                  This data helps validate and refine your calibration parameters.
                </AlertDescription>
              </Alert>
              
              {editingProfile.validationData && editingProfile.validationData.length > 0 ? (
                <div className="space-y-2">
                  {editingProfile.validationData.map((validation, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="font-medium">{validation.serverModel}</p>
                            <p className="text-muted-foreground">Server Model</p>
                          </div>
                          <div>
                            <p>Idle: {validation.observedPower.idle}W / {validation.predictedPower.idle}W</p>
                            <p className="text-muted-foreground">Observed / Predicted</p>
                          </div>
                          <div>
                            <p>Avg: {validation.observedPower.average}W / {validation.predictedPower.average}W</p>
                            <p className="text-muted-foreground">Observed / Predicted</p>
                          </div>
                          <div>
                            <p className={`font-medium ${validation.accuracy.average > 95 ? 'text-green-600' : validation.accuracy.average > 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {validation.accuracy.average.toFixed(1)}% Accuracy
                            </p>
                            <p className="text-muted-foreground">Average Power</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>No validation data yet.</p>
                    <p className="text-sm mt-2">Run predictions and compare with real measurements to build validation data.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
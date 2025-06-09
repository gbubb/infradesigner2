import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { PowerCalibrationProfile } from '../PowerCalibrationTypes';

interface ValidationTabProps {
  profile: PowerCalibrationProfile;
}

export const ValidationTab: React.FC<ValidationTabProps> = ({ profile }) => {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Track how well your calibrated predictions match real-world observations.
          This data helps validate and refine your calibration parameters.
        </AlertDescription>
      </Alert>
      
      {profile.validationData && profile.validationData.length > 0 ? (
        <div className="space-y-2">
          {profile.validationData.map((validation, index) => (
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
    </div>
  );
};
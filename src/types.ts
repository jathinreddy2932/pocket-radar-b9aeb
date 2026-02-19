export enum RiskLevel {
  SAFE = 'SAFE',
  CAUTION = 'CAUTION',
  HIGH_RISK = 'HIGH_RISK',
}

export interface SensorData {
  location: {
    latitude: number | null;
    longitude: number | null;
    speed: number | null;
    accuracy: number | null;
  };
  ambientNoise: number; // in dB or relative scale 0-100
  deviceDensity: number; // count of nearby signals
  timestamp: number;
}

export interface RiskScore {
  total: number;
  level: RiskLevel;
  factors: {
    time: number;
    density: number;
    noise: number;
    movement: number;
  };
}

export interface SOSState {
  isActive: boolean;
  triggeredAt: number | null;
  location: { lat: number; lng: number } | null;
}

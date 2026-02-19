import { RiskLevel, RiskScore, SensorData } from './types';

export function calculateRisk(data: SensorData): RiskScore {
  const now = new Date(data.timestamp);
  const hour = now.getHours();

  // 1. Time Risk
  // 6 AM – 7 PM: 0
  // 7 PM – 10 PM: 1
  // 10 PM – 5 AM: 2
  let timeRisk = 0;
  if (hour >= 22 || hour < 5) {
    timeRisk = 2;
  } else if (hour >= 19) {
    timeRisk = 1;
  }

  // 2. Density Risk
  // 10+ devices: 0
  // 5–10: 1
  // <5: 2
  let densityRisk = 0;
  if (data.deviceDensity < 5) {
    densityRisk = 2;
  } else if (data.deviceDensity < 10) {
    densityRisk = 1;
  }

  // 3. Noise Risk
  // Loud (>60): 0
  // Moderate (30-60): 1
  // Quiet (<30): 2
  let noiseRisk = 0;
  if (data.ambientNoise < 20) {
    noiseRisk = 2;
  } else if (data.ambientNoise < 45) {
    noiseRisk = 1;
  }

  // 4. Movement Risk
  // Stopped in isolated zone: 1
  // Moving normally: 0
  let movementRisk = 0;
  const isIsolated = densityRisk === 2 && noiseRisk === 2;
  const isStopped = (data.location.speed || 0) < 0.5; // less than 0.5 m/s
  if (isIsolated && isStopped) {
    movementRisk = 1;
  }

  const total = timeRisk + densityRisk + noiseRisk + movementRisk;

  let level = RiskLevel.SAFE;
  if (total >= 5) {
    level = RiskLevel.HIGH_RISK;
  } else if (total >= 3) {
    level = RiskLevel.CAUTION;
  }

  return {
    total,
    level,
    factors: {
      time: timeRisk,
      density: densityRisk,
      noise: noiseRisk,
      movement: movementRisk,
    },
  };
}

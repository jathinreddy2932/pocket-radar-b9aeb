/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Radio, 
  Mic, 
  Users, 
  Clock, 
  Navigation, 
  AlertTriangle,
  Bell,
  Volume2,
  Settings,
  Info,
  MapPin
} from 'lucide-react';
import { useLocation, useAmbientNoise, useShakeDetection } from './hooks/useSensors';
import { calculateRisk } from './riskEngine';
import { RiskLevel, SensorData, RiskScore, SOSState } from './types';

export default function App() {
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [simulatedDensity, setSimulatedDensity] = useState(12);
  const [sosState, setSosState] = useState<SOSState>({
    isActive: false,
    triggeredAt: null,
    location: null,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [shakeSensitivity, setShakeSensitivity] = useState(15);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: 'Emergency Services', number: '911' },
    { name: 'Family Member', number: '+1 234 567 890' }
  ]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', number: '' });

  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pocket_radar_onboarded') !== 'true';
    }
    return true;
  });
  const [onboardingStep, setOnboardingStep] = useState(0);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('pocket_radar_onboarded', 'true');
  }, []);

  const onboardingData = [
    {
      title: "Intelligent Awareness",
      description: "PocketRadar monitors your environment using offline sensors to keep you aware of isolation risks.",
      icon: <Shield className="w-12 h-12 text-accent" />
    },
    {
      title: "Privacy First",
      description: "All detection happens locally on your device. No audio is recorded, and no location data leaves your phone.",
      icon: <ShieldCheck className="w-12 h-12 text-emerald-500" />
    },
    {
      title: "Emergency Network",
      description: "Set up emergency contacts to be notified instantly if you trigger an SOS signal.",
      icon: <Users className="w-12 h-12 text-rose-500" />
    }
  ];

  const location = useLocation();
  const { noiseLevel, startMonitoring, stopMonitoring } = useAmbientNoise();

  // Apply theme to body
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Shake detection for SOS
  const handleShake = useCallback(() => {
    if (!sosState.isActive && isRadarActive) {
      triggerSOS();
    }
  }, [sosState.isActive, isRadarActive]);

  useShakeDetection(handleShake, shakeSensitivity);

  useEffect(() => {
    if (isRadarActive) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    return () => stopMonitoring();
  }, [isRadarActive, startMonitoring, stopMonitoring]);

  const sensorData: SensorData = useMemo(() => ({
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
      accuracy: location.accuracy,
    },
    ambientNoise: noiseLevel,
    deviceDensity: simulatedDensity,
    timestamp: Date.now(),
  }), [location, noiseLevel, simulatedDensity]);

  const risk = useMemo(() => calculateRisk(sensorData), [sensorData]);

  const triggerSOS = () => {
    setSosState({
      isActive: true,
      triggeredAt: Date.now(),
      location: location.latitude && location.longitude ? { lat: location.latitude, lng: location.longitude } : null,
    });
    
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  };

  const cancelSOS = () => {
    setSosState({ isActive: false, triggeredAt: null, location: null });
  };

  const addContact = () => {
    if (newContact.name && newContact.number) {
      setEmergencyContacts([...emergencyContacts, newContact]);
      setNewContact({ name: '', number: '' });
      setIsAddingContact(false);
    }
  };

  const removeContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const [timelineEvents, setTimelineEvents] = useState<Array<{
    id: string;
    icon: React.ReactNode;
    label: string;
    description: string;
    time: string;
    status: 'success' | 'warning' | 'info';
  }>>([]);

  const addTimelineEvent = useCallback((label: string, description: string, status: 'success' | 'warning' | 'info', icon: React.ReactNode) => {
    setTimelineEvents(prev => {
      const newEvent = {
        id: Math.random().toString(36).substr(2, 9),
        icon,
        label,
        description,
        time: 'Just now',
        status
      };
      // Keep only last 5 events
      return [newEvent, ...prev.slice(0, 4)];
    });
  }, []);

  // Initial event when radar starts
  useEffect(() => {
    if (isRadarActive) {
      addTimelineEvent("System Integrity Verified", "All offline sensors are operational.", "success", <ShieldCheck className="w-3 h-3 text-emerald-500" />);
    } else {
      setTimelineEvents([]);
    }
  }, [isRadarActive, addTimelineEvent]);

  // Monitor Risk Level Changes
  const lastRiskLevel = useRef<RiskLevel | null>(null);
  useEffect(() => {
    if (!isRadarActive) return;
    if (lastRiskLevel.current !== risk.level) {
      const label = `Risk Level: ${risk.level.replace('_', ' ')}`;
      const description = risk.level === RiskLevel.SAFE 
        ? "Environment status is optimal." 
        : risk.level === RiskLevel.CAUTION 
          ? "Low activity area detected. Stay alert." 
          : "Isolated zone detected. Exercise caution.";
      const status = risk.level === RiskLevel.SAFE ? 'success' : risk.level === RiskLevel.CAUTION ? 'info' : 'warning';
      const icon = risk.level === RiskLevel.SAFE 
        ? <ShieldCheck className="w-3 h-3 text-emerald-500" /> 
        : <AlertTriangle className="w-3 h-3 text-amber-500" />;
      
      addTimelineEvent(label, description, status, icon);
      lastRiskLevel.current = risk.level;
    }
  }, [risk.level, isRadarActive, addTimelineEvent]);

  // Monitor Speed Changes
  const lastSpeed = useRef<number | null>(null);
  useEffect(() => {
    if (!isRadarActive || location.speed === null) return;
    const currentSpeed = Math.round(location.speed * 3.6);
    if (lastSpeed.current !== null && Math.abs(currentSpeed - lastSpeed.current) > 5) {
      addTimelineEvent("Movement Detected", `Speed changed to ${currentSpeed} km/h.`, "info", <Navigation className="w-3 h-3 text-accent" />);
      lastSpeed.current = currentSpeed;
    } else if (lastSpeed.current === null) {
      lastSpeed.current = currentSpeed;
    }
  }, [location.speed, isRadarActive, addTimelineEvent]);

  // Monitor Noise Spikes
  const lastNoise = useRef<number>(0);
  useEffect(() => {
    if (!isRadarActive) return;
    if (Math.abs(noiseLevel - lastNoise.current) > 30) {
      addTimelineEvent("Acoustic Shift", `Ambient noise level changed to ${noiseLevel}%.`, "info", <Mic className="w-3 h-3 text-zinc-500" />);
      lastNoise.current = noiseLevel;
    }
  }, [noiseLevel, isRadarActive, addTimelineEvent]);

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.SAFE: return 'text-emerald-500';
      case RiskLevel.CAUTION: return 'text-amber-500';
      case RiskLevel.HIGH_RISK: return 'text-rose-500';
      default: return 'text-zinc-400';
    }
  };

  const getRiskBg = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.SAFE: return theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 bg-emerald-100';
      case RiskLevel.CAUTION: return theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 bg-amber-100';
      case RiskLevel.HIGH_RISK: return theme === 'dark' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 bg-rose-100';
      default: return theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-100 border-zinc-200';
    }
  };

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto overflow-hidden relative transition-all duration-700 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      
      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[200] flex flex-col p-8 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'}`}
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
              <motion.div 
                key={onboardingStep}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-8 rounded-5xl bg-zinc-900/5 border border-white/5 flex items-center justify-center"
              >
                {onboardingData[onboardingStep].icon}
              </motion.div>
              
              <div className="space-y-4 max-w-xs">
                <motion.h2 
                  key={`t-${onboardingStep}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-3xl font-extrabold tracking-tight"
                >
                  {onboardingData[onboardingStep].title}
                </motion.h2>
                <motion.p 
                  key={`d-${onboardingStep}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-zinc-500 leading-relaxed"
                >
                  {onboardingData[onboardingStep].description}
                </motion.p>
              </div>

              <div className="flex gap-2">
                {onboardingData.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${onboardingStep === i ? 'w-8 bg-accent' : 'w-1.5 bg-zinc-800'}`} 
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => {
                  if (onboardingStep < onboardingData.length - 1) {
                    setOnboardingStep(onboardingStep + 1);
                  } else {
                    completeOnboarding();
                  }
                }}
                className="w-full py-5 rounded-3xl bg-primary text-white font-bold shadow-xl active:scale-95 transition-all"
              >
                {onboardingStep === onboardingData.length - 1 ? 'Get Started' : 'Continue'}
              </button>
              {onboardingStep < onboardingData.length - 1 && (
                <button 
                  onClick={completeOnboarding}
                  className="w-full py-2 text-zinc-500 font-medium text-sm"
                >
                  Skip
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`p-6 flex justify-between items-center border-b z-20 sticky top-0 ${theme === 'dark' ? 'border-white/5 bg-zinc-950/80' : 'border-black/5 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight leading-none">PocketRadar</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-bold">
                {isRadarActive ? 'Monitoring Active' : 'System Standby'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className={`p-2.5 rounded-xl transition-all active:scale-90 ${theme === 'dark' ? 'bg-white/5 text-zinc-400' : 'bg-black/5 text-zinc-600'}`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        
        {/* Radar Visualization */}
        <div className="relative aspect-square flex items-center justify-center py-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="radar-circle w-72 h-72" />
            <div className="radar-circle w-52 h-52" />
            <div className="radar-circle w-32 h-32" />
            
            {isRadarActive && (
              <>
                <motion.div 
                  className="scan-indicator"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    x: [0, 10, -10, 0],
                    y: [0, -10, 10, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                  className="radar-marker top-[25%] left-[35%]" 
                />
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    x: [0, -15, 15, 0],
                    y: [0, 15, -15, 0]
                  }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1.2 }}
                  className="radar-marker top-[65%] left-[60%]" 
                />
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    x: [0, 20, -20, 0],
                    y: [0, 20, -20, 0]
                  }}
                  transition={{ duration: 6, repeat: Infinity, delay: 2.5 }}
                  className="radar-marker top-[40%] left-[75%]" 
                />
              </>
            )}
          </div>

          <div className="z-20 text-center">
            <AnimatePresence mode="wait">
              {!isRadarActive ? (
                <motion.button
                  key="start"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setIsRadarActive(true)}
                  className="w-40 h-40 rounded-full bg-primary hover:bg-zinc-800 flex flex-col items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 group"
                >
                  <Radio className="w-10 h-10 text-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Activate</span>
                </motion.button>
              ) : (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className={`p-6 rounded-4xl premium-card`}>
                    {risk.level === RiskLevel.SAFE ? (
                      <ShieldCheck className={`w-16 h-16 ${getRiskColor(risk.level)}`} />
                    ) : risk.level === RiskLevel.CAUTION ? (
                      <AlertTriangle className={`w-16 h-16 ${getRiskColor(risk.level)}`} />
                    ) : (
                      <ShieldAlert className={`w-16 h-16 ${getRiskColor(risk.level)}`} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className={`text-4xl font-black uppercase tracking-tighter ${getRiskColor(risk.level)}`}>
                      {risk.level.replace('_', ' ')}
                    </p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 text-zinc-500' : 'bg-black/5 text-zinc-400'}`}>
                      Risk Score: {risk.total}/7
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sensor Grid */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-2 gap-4"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <SensorCard 
              theme={theme}
              icon={<Users className="w-4 h-4" />} 
              label="Crowd Density" 
              value={`${simulatedDensity} signals`}
              status={risk.factors.density === 0 ? 'Optimal' : risk.factors.density === 1 ? 'Low' : 'Critical'}
              color={risk.factors.density === 0 ? 'text-emerald-500' : risk.factors.density === 1 ? 'text-amber-500' : 'text-rose-500'}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <SensorCard 
              theme={theme}
              icon={<Volume2 className="w-4 h-4" />} 
              label="Ambient Noise" 
              value={`${noiseLevel}% Level`}
              status={risk.factors.noise === 0 ? 'Normal' : risk.factors.noise === 1 ? 'Quiet' : 'Isolated'}
              color={risk.factors.noise === 0 ? 'text-emerald-500' : risk.factors.noise === 1 ? 'text-amber-500' : 'text-rose-500'}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <SensorCard 
              theme={theme}
              icon={<Clock className="w-4 h-4" />} 
              label="Time Factor" 
              value={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              status={risk.factors.time === 0 ? 'Safe' : risk.factors.time === 1 ? 'Caution' : 'High Risk'}
              color={risk.factors.time === 0 ? 'text-emerald-500' : risk.factors.time === 1 ? 'text-amber-500' : 'text-rose-500'}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <SensorCard 
              theme={theme}
              icon={<Navigation className="w-4 h-4" />} 
              label="Movement" 
              value={location.speed ? `${(location.speed * 3.6).toFixed(1)} km/h` : 'Stopped'}
              status={risk.factors.movement === 0 ? 'Active' : 'Stationary'}
              color={risk.factors.movement === 0 ? 'text-emerald-500' : 'text-rose-500'}
            />
          </motion.div>
        </motion.div>

        {/* Activity Timeline */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Live Analysis</h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Active Scan</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div className={`p-4 rounded-2xl premium-card flex items-center justify-between group transition-all hover:bg-zinc-900/10`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                  <Mic className="w-4 h-4 text-zinc-500" />
                </div>
                <span className="text-sm font-bold">Acoustic Monitoring</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{isRadarActive ? 'Active' : 'Standby'}</span>
                <div className="flex gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-emerald-500/40' : 'bg-zinc-700'}`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-emerald-500/20' : 'bg-zinc-700'}`} />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl premium-card flex items-center justify-between group transition-all hover:bg-zinc-900/10`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm font-bold">Location Engine</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{location.latitude ? 'Synced' : 'Searching'}</span>
                <div className="flex gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${location.latitude ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${location.latitude ? 'bg-emerald-500/40' : 'bg-zinc-700'}`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${location.latitude ? 'bg-emerald-500/20' : 'bg-zinc-700'}`} />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl premium-card flex items-center justify-between group transition-all hover:bg-zinc-900/10`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-sm font-bold">Risk Processor</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{isRadarActive ? 'Active' : 'Standby'}</span>
                <div className="flex gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-emerald-500/40' : 'bg-zinc-700'}`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-emerald-500/20' : 'bg-zinc-700'}`} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Guard Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Privacy Guard</h3>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Encrypted</span>
          </div>
          <div className={`p-4 rounded-3xl premium-card relative overflow-hidden h-24 flex items-center justify-center`}>
            <div className="absolute inset-0 bg-zinc-900/20 backdrop-blur-md z-10" />
            <div className="flex flex-col items-center gap-1 relative z-20">
              <Shield className="w-6 h-6 text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Identity Masked</span>
            </div>
            {/* Simulated Blurred Content */}
            <div className="flex gap-4 opacity-20">
              <div className="w-12 h-12 rounded-full bg-zinc-500" />
              <div className="w-24 h-4 rounded-full bg-zinc-500 mt-4" />
            </div>
          </div>
        </section>

        {/* Tip Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-4xl premium-card flex items-start gap-5 relative overflow-hidden`}
        >
          <div className="p-3 rounded-2xl bg-accent/10 text-accent shrink-0 relative z-10">
            <Info className="w-5 h-5" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5">Safety Intelligence</p>
            <p className={`text-sm leading-relaxed font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {risk.level === RiskLevel.SAFE 
                ? "Environment status is optimal. Your safety radar is monitoring for subtle changes in isolation patterns." 
                : "High isolation detected. We recommend moving towards a higher density zone immediately."}
            </p>
          </div>
        </motion.div>
      </main>

      {/* Bottom Actions */}
      <div className={`absolute bottom-0 left-0 right-0 p-8 pt-16 pointer-events-none z-30 ${theme === 'dark' ? 'bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent' : 'bg-gradient-to-t from-zinc-50 via-zinc-50/80 to-transparent'}`}>
        <div className="flex gap-4 pointer-events-auto max-w-sm mx-auto">
          <button 
            onClick={() => setIsRadarActive(!isRadarActive)}
            className={`flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 ${
              isRadarActive 
                ? (theme === 'dark' ? 'bg-zinc-900 text-zinc-400 border border-white/5' : 'bg-white border border-black/5 text-zinc-500 shadow-sm')
                : 'bg-primary text-white shadow-lg hover:bg-zinc-800'
            }`}
          >
            {isRadarActive ? (
              <><Radio className="w-4 h-4" /> Standby</>
            ) : (
              <><Radio className="w-4 h-4" /> Activate</>
            )}
          </button>
          <button 
            onClick={triggerSOS}
            className="w-24 h-16 rounded-3xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all group"
          >
            <ShieldAlert className="w-8 h-8 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-50 flex flex-col ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}
          >
            <header className={`p-6 flex items-center gap-4 border-b sticky top-0 z-10 ${theme === 'dark' ? 'border-white/5 bg-zinc-950/80 backdrop-blur-xl' : 'border-black/5 bg-white/80 backdrop-blur-xl'}`}>
              <button onClick={() => setShowSettings(false)} className={`p-2.5 -ml-2 rounded-xl transition-all active:scale-90 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                <Navigation className="w-5 h-5 -rotate-90" />
              </button>
              <h2 className="font-extrabold text-2xl tracking-tight">System Settings</h2>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-32">
              
              {/* Appearance Section */}
              <SettingsSection title="Appearance">
                <div className={`p-5 rounded-3xl premium-card flex items-center justify-between`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-white/5 text-accent' : 'bg-black/5 text-accent'}`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Dark Interface</p>
                      <p className="text-xs text-zinc-500">Optimized for low-light environments</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-accent' : 'bg-zinc-300'}`}
                  >
                    <motion.div 
                      animate={{ x: theme === 'dark' ? 26 : 4 }}
                      className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-md"
                    />
                  </button>
                </div>
              </SettingsSection>

              {/* Safety Sensors Section */}
              <SettingsSection title="Safety Intelligence">
                <div className={`p-6 rounded-3xl premium-card space-y-8`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="font-bold text-sm">Shake-to-SOS</p>
                        <p className="text-xs text-zinc-500">Trigger emergency mode by shaking</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-white/5 text-accent' : 'bg-black/5 text-accent'}`}>
                        {shakeSensitivity < 10 ? 'High' : shakeSensitivity < 20 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="30" 
                      step="5"
                      value={shakeSensitivity} 
                      onChange={(e) => setShakeSensitivity(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>
                  
                  <div className={`h-px w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`} />

                  <div className="flex items-center justify-between opacity-50">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Acoustic Monitoring</p>
                      <p className="text-xs text-zinc-500">Continuous noise level analysis</p>
                    </div>
                    <div className="w-10 h-5 rounded-full bg-emerald-500/20 relative">
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </SettingsSection>

              {/* Emergency Contacts Section */}
              <SettingsSection 
                title="Emergency Network" 
                action={
                  <button 
                    onClick={() => setIsAddingContact(true)}
                    className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                  >
                    Add Contact
                  </button>
                }
              >
                <div className="space-y-3">
                  {emergencyContacts.map((contact, i) => (
                    <motion.div 
                      layout
                      key={i} 
                      className={`p-4 rounded-2xl premium-card flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${theme === 'dark' ? 'bg-white/5 text-zinc-400' : 'bg-black/5 text-zinc-600'}`}>
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{contact.name}</p>
                          <p className="text-xs text-zinc-500 font-mono tracking-tighter">{contact.number}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeContact(i)}
                        className="p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors active:scale-90"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </SettingsSection>

              {/* Privacy Section */}
              <SettingsSection title="Privacy & Data">
                <div className={`p-6 rounded-3xl premium-card space-y-6`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Local Processing</p>
                      <p className="text-xs text-zinc-500">All data stays on your device</p>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className={`h-px w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`} />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Incognito Mode</p>
                      <p className="text-xs text-zinc-500">Disable activity logging</p>
                    </div>
                    <button 
                      onClick={() => setIsIncognito(!isIncognito)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${isIncognito ? 'bg-accent' : 'bg-zinc-800'}`}
                    >
                      <motion.div 
                        animate={{ x: isIncognito ? 26 : 4 }}
                        className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-md"
                      />
                    </button>
                  </div>
                  <div className={`h-px w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`} />
                  <button 
                    onClick={() => {
                      localStorage.removeItem('pocket_radar_onboarded');
                      window.location.reload();
                    }}
                    className="w-full py-3 rounded-xl border border-rose-500/20 text-rose-500 text-xs font-bold uppercase tracking-widest hover:bg-rose-500/5 transition-colors"
                  >
                    Reset Onboarding
                  </button>
                </div>
              </SettingsSection>

              {/* Debug Section */}
              <section className="pt-10 border-t border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Developer Console</h3>
                  <button 
                    onClick={() => setIsDebugMode(!isDebugMode)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isDebugMode ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-zinc-800 text-zinc-500'}`}
                  >
                    {isDebugMode ? 'Active' : 'Disabled'}
                  </button>
                </div>
                
                {isDebugMode && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-6 rounded-3xl premium-card space-y-6`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span>Simulate Crowd Density</span>
                        <span className="text-accent">{simulatedDensity} signals</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="20" 
                        value={simulatedDensity} 
                        onChange={(e) => setSimulatedDensity(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                    </div>
                  </motion.div>
                )}
                <div className="text-center space-y-1 mt-8">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">PocketRadar v1.2.0</p>
                  <p className="text-[10px] text-zinc-700">Encrypted & Secure Environment</p>
                </div>
              </section>
            </div>

            <footer className={`p-6 border-t sticky bottom-0 z-10 ${theme === 'dark' ? 'border-white/5 bg-zinc-950/80 backdrop-blur-xl' : 'border-black/5 bg-white/80 backdrop-blur-xl'}`}>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-5 rounded-3xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
              >
                Save Configuration
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {isAddingContact && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`w-full max-w-sm rounded-3xl p-6 space-y-6 ${theme === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`}
            >
              <h3 className="text-xl font-bold">Add Contact</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Name</label>
                  <input 
                    type="text" 
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="e.g. Mom"
                    className={`w-full p-3 rounded-xl border outline-none focus:border-emerald-500 transition-colors ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Phone Number</label>
                  <input 
                    type="tel" 
                    value={newContact.number}
                    onChange={(e) => setNewContact({ ...newContact, number: e.target.value })}
                    placeholder="+1 234..."
                    className={`w-full p-3 rounded-xl border outline-none focus:border-emerald-500 transition-colors ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAddingContact(false)}
                  className={`flex-1 py-3 rounded-xl font-bold ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={addContact}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Overlay */}
      <AnimatePresence>
        {sosState.isActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-rose-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center overflow-hidden"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-32 h-32 rounded-full bg-rose-600 flex items-center justify-center mb-8 shadow-2xl relative z-10"
            >
              <ShieldAlert className="w-16 h-16 text-white" />
            </motion.div>
            
            <div className="relative z-10 space-y-3 mb-12">
              <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">Emergency</h2>
              <p className="text-rose-200 font-medium tracking-wide">
                SOS signal active. Sharing location with emergency network.
              </p>
            </div>

            <div className="w-full space-y-4 relative z-10 max-w-sm">
              <a 
                href="tel:911"
                className="w-full py-6 rounded-3xl bg-white text-rose-900 font-black text-2xl flex items-center justify-center gap-4 shadow-xl"
              >
                <Bell className="w-8 h-8" />
                CALL 911
              </a>

              <div className="grid grid-cols-2 gap-4">
                {emergencyContacts.filter(c => c.number !== '911').slice(0, 2).map((contact, i) => (
                  <a 
                    key={i}
                    href={`tel:${contact.number}`}
                    className="p-5 rounded-3xl bg-white/10 border border-white/10 text-white flex flex-col items-center gap-2"
                  >
                    <Users className="w-5 h-5 text-rose-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest truncate w-full">{contact.name}</span>
                  </a>
                ))}
              </div>
              
              <button 
                onClick={cancelSOS}
                className="w-full py-5 rounded-3xl bg-transparent border-2 border-white/20 text-white font-black text-xs uppercase tracking-widest transition-all mt-6 active:scale-95"
              >
                Cancel SOS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Alerts */}
      <AnimatePresence>
        {isRadarActive && risk.level === RiskLevel.HIGH_RISK && !sosState.isActive && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-28 left-6 right-6 z-40 p-4 rounded-2xl bg-rose-600 text-white shadow-2xl shadow-rose-900/40 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">High Risk Detected</p>
              <p className="text-xs text-rose-100">You are in an isolated zone. Consider moving to a safer area.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SensorCard({ icon, label, value, status, color, theme }: { icon: React.ReactNode, label: string, value: string, status: string, color: string, theme: 'dark' | 'light' }) {
  return (
    <div className={`p-5 rounded-3xl premium-card transition-all duration-300 hover:scale-[1.02]`}>
      <div className={`flex items-center gap-2.5 mb-3 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
          {icon}
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest">{label}</span>
      </div>
      <div>
        <p className="text-lg font-bold tracking-tight mb-0.5">{value}</p>
        <div className="flex items-center gap-1.5">
          <div className={`w-1 h-1 rounded-full ${color.replace('text', 'bg')}`} />
          <p className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{status}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ icon, label, description, time, status, theme }: { icon: React.ReactNode, label: string, description: string, time: string, status: 'success' | 'warning' | 'info', theme: 'dark' | 'light' }) {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-accent';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="relative pl-10 pb-8 last:pb-0 group">
      {/* Status Dot */}
      <div className={`absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full border-4 ${theme === 'dark' ? 'border-zinc-950 bg-zinc-900' : 'border-zinc-50 bg-white'} flex items-center justify-center z-10 transition-transform group-hover:scale-110`}>
        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold tracking-tight">{label}</span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{time}</span>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SettingsSection({ title, children, action }: { title: string, children: React.ReactNode, action?: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

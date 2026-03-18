import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { generateFakePayload, parsePayload, SensorData } from '../services/simulatorService';

const HISTORY_LIMIT = 60;
const INTERVAL_MS   = 1000;

export type AlertType = 'fall' | 'sos' | 'hr_high' | 'hr_low' | 'temp_high';

export type ActiveAlert = {
  id:                string;
  type:              AlertType;
  title:             string;           // NO emoji — plain text only
  detail:            string;
  smsSentByBracelet: boolean | null;
  timestamp:         number;
};

export type EmergencyContact = { name: string; phone: string };

const HR_HIGH   = 110;
const HR_LOW    = 50;
const TEMP_HIGH = 38.5;

const COOLDOWN: Record<AlertType, number> = {
  fall: 0, sos: 0,
  hr_high: 30_000, hr_low: 30_000, temp_high: 60_000,
};

// Plain text titles — no emoji (Android Text renders them as ? boxes)
const TITLES: Record<AlertType, string> = {
  fall:      'FALL DETECTED',
  sos:       'SOS ACTIVATED',
  hr_high:   'HIGH HEART RATE',
  hr_low:    'LOW HEART RATE',
  temp_high: 'HIGH TEMPERATURE',
};

function buildDetail(type: AlertType, data: SensorData): string {
  switch (type) {
    case 'fall':
      return 'A fall was detected. Your emergency contact is being notified via SMS by the bracelet.';
    case 'sos':
      return 'SOS activated. Your emergency contact is being notified via SMS by the bracelet.';
    case 'hr_high':
      return `Heart rate reached ${data.hr} BPM — above the safe limit of ${HR_HIGH} BPM. Please rest and seek help if needed.`;
    case 'hr_low':
      return `Heart rate dropped to ${data.hr} BPM — below the safe limit of ${HR_LOW} BPM. Please seek medical attention.`;
    case 'temp_high':
      return `Body temperature is ${data.temp}°C — possible fever. Please rest and consult a doctor.`;
  }
}

type SensorContextType = {
  current:              SensorData | null;
  history:              SensorData[];
  connected:            boolean;
  alert:                ActiveAlert | null;
  dismissAlert:         () => void;
  emergencyContact:     EmergencyContact;
  setEmergencyContact:  (c: EmergencyContact) => void;
};

const DEFAULT_CONTACT: EmergencyContact = { name: '', phone: '' };

const SensorContext = createContext<SensorContextType>({
  current: null, history: [], connected: false,
  alert: null, dismissAlert: () => {},
  emergencyContact: DEFAULT_CONTACT, setEmergencyContact: () => {},
});

export function SensorProvider({ children }: { children: React.ReactNode }) {
  const [current,   setCurrent]   = useState<SensorData | null>(null);
  const [history,   setHistory]   = useState<SensorData[]>([]);
  const [connected, setConnected] = useState(false);
  const [alert,     setAlert]     = useState<ActiveAlert | null>(null);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>(DEFAULT_CONTACT);

  const alertRef     = useRef(alert);
  alertRef.current   = alert;
  const lastFiredRef = useRef<Partial<Record<AlertType, number>>>({});

  function tryFire(type: AlertType, data: SensorData, smsSentByBracelet: boolean | null) {
    if (alertRef.current) return;
    const now = Date.now();
    if (now - (lastFiredRef.current[type] ?? 0) < COOLDOWN[type]) return;
    lastFiredRef.current[type] = now;
    setAlert({
      id: `${type}-${now}`, type,
      title: TITLES[type],
      detail: buildDetail(type, data),
      smsSentByBracelet, timestamp: now,
    });
  }

  useEffect(() => {
    const connectTimer = setTimeout(() => setConnected(true), 1500);
    const interval = setInterval(() => {
      const data = parsePayload(generateFakePayload());
      if (!data) return;
      setCurrent(data);
      setHistory(prev => {
        const next = [...prev, data];
        return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
      });
      if      (data.fall)              tryFire('fall',      data, data.smsSent);
      else if (data.sos)               tryFire('sos',       data, data.smsSent);
      else if (data.hr > HR_HIGH)      tryFire('hr_high',   data, false);
      else if (data.hr < HR_LOW && data.hr > 0) tryFire('hr_low', data, false);
      else if (data.temp > TEMP_HIGH)  tryFire('temp_high', data, false);
    }, INTERVAL_MS);
    return () => { clearTimeout(connectTimer); clearInterval(interval); };
  }, []);

  return (
    <SensorContext.Provider value={{
      current, history, connected,
      alert, dismissAlert: () => setAlert(null),
      emergencyContact, setEmergencyContact,
    }}>
      {children}
    </SensorContext.Provider>
  );
}

export const useSensor = () => useContext(SensorContext);
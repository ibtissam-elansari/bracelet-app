import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { MqttStatus, TOPICS, mqttService } from '../services/mqttService';
import { SensorData, generateFakePayload, parsePayload } from '../services/simulatorService';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AlertType = 'fall' | 'sos' | 'hr_high' | 'hr_low' | 'temp_high';

export type AlertRecord = {
  id:                string;
  type:              AlertType;
  title:             string;
  detail:            string;
  smsSentByBracelet: boolean | null;
  timestamp:         number;
  acknowledged:      boolean;
};

export type EmergencyContact = { name: string; phone: string };
export type BrokerConfig     = { host: string; port: number };

// ─── Thresholds ───────────────────────────────────────────────────────────────
const HR_HIGH   = 110;
const HR_LOW    = 50;
const TEMP_HIGH = 38.5;

const COOLDOWN: Record<AlertType, number> = {
  fall: 0, sos: 0,
  hr_high: 30_000, hr_low: 30_000, temp_high: 60_000,
};

const TITLES: Record<AlertType, string> = {
  fall:      'FALL DETECTED',
  sos:       'SOS ACTIVATED',
  hr_high:   'HIGH HEART RATE',
  hr_low:    'LOW HEART RATE',
  temp_high: 'HIGH TEMPERATURE',
};

function buildDetail(type: AlertType, data: SensorData): string {
  switch (type) {
    case 'fall':      return 'A fall was detected. The bracelet is notifying your emergency contact via SMS.';
    case 'sos':       return 'SOS activated. The bracelet is notifying your emergency contact via SMS.';
    case 'hr_high':   return `Heart rate is ${data.hr} BPM — above the safe threshold of ${HR_HIGH} BPM. Please rest.`;
    case 'hr_low':    return `Heart rate is ${data.hr} BPM — below the safe threshold of ${HR_LOW} BPM. Seek medical help.`;
    case 'temp_high': return `Body temperature is ${data.temp}°C — possible fever. Please consult a doctor.`;
  }
}

// ─── Context type ─────────────────────────────────────────────────────────────
const HISTORY_LIMIT   = 60;
const TRAIL_LIMIT     = 30;   // GPS trail points shown on map
const ALERT_LOG_LIMIT = 20;

type SensorContextType = {
  current:             SensorData | null;
  history:             SensorData[];
  gpsTrail:            Array<{ lat: number; lon: number }>;
  connected:           boolean;
  mqttStatus:          MqttStatus;
  usingSimulator:      boolean;
  activeAlert:         AlertRecord | null;
  alertLog:            AlertRecord[];
  unreadAlertCount:    number;
  dismissAlert:        () => void;
  clearUnreadAlerts:   () => void;
  emergencyContact:    EmergencyContact;
  setEmergencyContact: (c: EmergencyContact) => void;
  brokerConfig:        BrokerConfig;
  setBrokerConfig:     (c: BrokerConfig) => void;
  reconnect:           () => void;
};

const DEFAULT_BROKER:  BrokerConfig     = { host: '192.168.1.10', port: 9001 };
const DEFAULT_CONTACT: EmergencyContact = { name: '', phone: '' };

const Ctx = createContext<SensorContextType>({} as SensorContextType);

// ─── Storage keys ─────────────────────────────────────────────────────────────
const KEY_CONTACT = 'vitals:emergency_contact';
const KEY_BROKER  = 'vitals:broker_config';

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SensorProvider({ children }: { children: React.ReactNode }) {
  const [current,        setCurrent]        = useState<SensorData | null>(null);
  const [history,        setHistory]        = useState<SensorData[]>([]);
  const [gpsTrail,       setGpsTrail]       = useState<Array<{ lat: number; lon: number }>>([]);
  const [mqttStatus,     setMqttStatus]     = useState<MqttStatus>('disconnected');
  const [usingSimulator, setUsingSimulator] = useState(true);
  const [activeAlert,    setActiveAlert]    = useState<AlertRecord | null>(null);
  const [alertLog,       setAlertLog]       = useState<AlertRecord[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [emergencyContact, setEmergencyContactState] = useState<EmergencyContact>(DEFAULT_CONTACT);
  const [brokerConfig,   setBrokerConfigState] = useState<BrokerConfig>(DEFAULT_BROKER);

  const activeAlertRef  = useRef(activeAlert);
  activeAlertRef.current = activeAlert;
  const lastFiredRef    = useRef<Partial<Record<AlertType, number>>>({});
  const simRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const brokerRef       = useRef(brokerConfig);
  brokerRef.current     = brokerConfig;

  // ── Load persisted data ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([
          AsyncStorage.getItem(KEY_CONTACT),
          AsyncStorage.getItem(KEY_BROKER),
        ]);
        if (c) setEmergencyContactState(JSON.parse(c));
        if (b) setBrokerConfigState(JSON.parse(b));
      } catch {}
    })();
  }, []);

  // ── Persist emergency contact ─────────────────────────────────────────────
  const setEmergencyContact = useCallback(async (c: EmergencyContact) => {
    setEmergencyContactState(c);
    await AsyncStorage.setItem(KEY_CONTACT, JSON.stringify(c)).catch(() => {});
  }, []);

  // ── Persist broker config and reconnect ───────────────────────────────────
  const setBrokerConfig = useCallback(async (c: BrokerConfig) => {
    setBrokerConfigState(c);
    await AsyncStorage.setItem(KEY_BROKER, JSON.stringify(c)).catch(() => {});
    // Reconnect with new config
    mqttService.disconnect();
    stopSimulator();
    startConnect(c);
  }, []);

  // ── Data ingestion ─────────────────────────────────────────────────────────
  function ingest(data: SensorData) {
    setCurrent(data);
    setHistory(prev => {
      const next = [...prev, data];
      return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    });
    if (data.lat && data.lon) {
      setGpsTrail(prev => {
        const next = [...prev, { lat: data.lat, lon: data.lon }];
        return next.length > TRAIL_LIMIT ? next.slice(-TRAIL_LIMIT) : next;
      });
    }
    checkAlerts(data);
  }

  function checkAlerts(data: SensorData) {
    if      (data.fall)                        fire('fall',      data, data.smsSent);
    else if (data.sos)                         fire('sos',       data, data.smsSent);
    else if (data.hr > HR_HIGH)                fire('hr_high',   data, false);
    else if (data.hr < HR_LOW && data.hr > 0)  fire('hr_low',    data, false);
    else if (data.temp > TEMP_HIGH)            fire('temp_high', data, false);
  }

  function fire(type: AlertType, data: SensorData, smsSentByBracelet: boolean | null) {
    if (activeAlertRef.current) return;
    const now = Date.now();
    if (now - (lastFiredRef.current[type] ?? 0) < COOLDOWN[type]) return;
    lastFiredRef.current[type] = now;

    const record: AlertRecord = {
      id: `${type}-${now}`, type,
      title: TITLES[type],
      detail: buildDetail(type, data),
      smsSentByBracelet, timestamp: now,
      acknowledged: false,
    };
    setActiveAlert(record);
    setAlertLog(prev => {
      const next = [record, ...prev];
      return next.length > ALERT_LOG_LIMIT ? next.slice(0, ALERT_LOG_LIMIT) : next;
    });
    setUnreadAlertCount(n => n + 1);
  }

  // ── Simulator ─────────────────────────────────────────────────────────────
  function startSimulator() {
    if (simRef.current) return;
    setUsingSimulator(true);
    simRef.current = setInterval(() => {
      const d = parsePayload(generateFakePayload());
      if (d) ingest(d);
    }, 1000);
  }

  function stopSimulator() {
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
    setUsingSimulator(false);
  }

  // ── MQTT ──────────────────────────────────────────────────────────────────
  function startConnect(cfg: BrokerConfig) {
    startSimulator(); // always show data while connecting
    mqttService.connect(
      cfg.host, cfg.port,
      (topic, payload) => {
        if (topic === TOPICS.sensors) {
          const d = parsePayload(payload);
          if (d) ingest(d);
        }
      },
      (status) => {
        setMqttStatus(status);
        if (status === 'connected') stopSimulator();
        else if (status === 'disconnected' || status === 'error') startSimulator();
      }
    );
  }

  const reconnect = useCallback(() => {
    mqttService.disconnect();
    stopSimulator();
    startConnect(brokerRef.current);
  }, []);

  useEffect(() => {
    startConnect(brokerRef.current);
    return () => { mqttService.disconnect(); stopSimulator(); };
  }, []);

  const dismissAlert = () => {
    setActiveAlert(prev => prev ? { ...prev, acknowledged: true } : null);
    setActiveAlert(null);
  };

  const clearUnreadAlerts = () => setUnreadAlertCount(0);

  return (
    <Ctx.Provider value={{
      current, history, gpsTrail,
      connected: mqttStatus === 'connected',
      mqttStatus, usingSimulator,
      activeAlert, alertLog, unreadAlertCount,
      dismissAlert, clearUnreadAlerts,
      emergencyContact, setEmergencyContact,
      brokerConfig, setBrokerConfig, reconnect,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSensor = () => useContext(Ctx);